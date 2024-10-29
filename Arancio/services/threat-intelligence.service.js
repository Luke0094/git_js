// services/threat-intelligence.service.js
const axios = require('axios');
const Redis = require('ioredis');
const logger = require('../config/logger');

class ThreatIntelligenceService {
    constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT,
            password: process.env.REDIS_PASSWORD
        });

        this.providers = {
            alienvault: {
                baseUrl: 'https://otx.alienvault.com/api/v1',
                apiKey: process.env.ALIENVAULT_API_KEY
            },
            threatStream: {
                baseUrl: 'https://api.threatstream.com/api/v1',
                apiKey: process.env.THREATSTREAM_API_KEY
            },
            abuseIPDB: {
                baseUrl: 'https://api.abuseipdb.com/api/v2',
                apiKey: process.env.ABUSEIPDB_API_KEY
            }
        };

        this.cacheTTL = 3600; // 1 ora
    }

    // Verifica IP contro database threat intelligence
    async checkIP(ip) {
        try {
            // Controlla cache
            const cached = await this.redis.get(`tip:ip:${ip}`);
            if (cached) {
                return JSON.parse(cached);
            }

            // Interroga tutti i provider
            const results = await Promise.allSettled([
                this.checkAlienVault(ip),
                this.checkThreatStream(ip),
                this.checkAbuseIPDB(ip)
            ]);

            // Aggregazione risultati
            const analysis = this.aggregateResults(results, ip);
            
            // Salva in cache
            await this.redis.setex(
                `tip:ip:${ip}`,
                this.cacheTTL,
                JSON.stringify(analysis)
            );

            return analysis;
        } catch (error) {
            logger.error('Errore durante la verifica IP', error);
            throw error;
        }
    }

    // Controlla dominio
    async checkDomain(domain) {
        try {
            const cached = await this.redis.get(`tip:domain:${domain}`);
            if (cached) {
                return JSON.parse(cached);
            }

            const results = await Promise.allSettled([
                this.checkAlienVaultDomain(domain),
                this.checkThreatStreamDomain(domain)
            ]);

            const analysis = this.aggregateDomainResults(results, domain);
            
            await this.redis.setex(
                `tip:domain:${domain}`,
                this.cacheTTL,
                JSON.stringify(analysis)
            );

            return analysis;
        } catch (error) {
            logger.error('Errore durante la verifica dominio', error);
            throw error;
        }
    }

    // Verifica hash file
    async checkFileHash(hash) {
        try {
            const cached = await this.redis.get(`tip:hash:${hash}`);
            if (cached) {
                return JSON.parse(cached);
            }

            const results = await Promise.allSettled([
                this.checkAlienVaultHash(hash),
                this.checkThreatStreamHash(hash)
            ]);

            const analysis = this.aggregateHashResults(results, hash);
            
            await this.redis.setex(
                `tip:hash:${hash}`,
                this.cacheTTL,
                JSON.stringify(analysis)
            );

            return analysis;
        } catch (error) {
            logger.error('Errore durante la verifica hash', error);
            throw error;
        }
    }

    // Provider-specific checks...
    async checkAlienVault(ip) {
        const response = await axios.get(
            `${this.providers.alienvault.baseUrl}/indicators/IP/${ip}/reputation`,
            {
                headers: { 'X-OTX-API-KEY': this.providers.alienvault.apiKey }
            }
        );
        return {
            provider: 'alienvault',
            data: response.data,
            timestamp: new Date().toISOString()
        };
    }

    // Altri metodi di check per provider specifici...

    // Aggregazione risultati
    aggregateResults(results, indicator) {
        const analysis = {
            indicator,
            timestamp: new Date().toISOString(),
            riskScore: 0,
            confidence: 0,
            reports: [],
            categories: new Set(),
            recommendations: []
        };

        results.forEach(result => {
            if (result.status === 'fulfilled') {
                const data = result.value;
                analysis.reports.push(data);
                
                // Aggiorna risk score
                this.updateRiskScore(analysis, data);
                
                // Aggiungi categorie
                if (data.categories) {
                    data.categories.forEach(cat => analysis.categories.add(cat));
                }
            }
        });

        // Calcola score finale
        analysis.riskScore = analysis.riskScore / results.length;
        analysis.riskLevel = this.calculateRiskLevel(analysis.riskScore);

        // Genera raccomandazioni
        analysis.recommendations = this.generateRecommendations(analysis);

        return analysis;
    }

    // Genera raccomandazioni basate sull'analisi
    generateRecommendations(analysis) {
        const recommendations = [];

        if (analysis.riskScore > 0.8) {
            recommendations.push(
                'Bloccare immediatamente questo indicatore',
                'Investigare le attività correlate',
                'Aggiornare le regole del firewall'
            );
        } else if (analysis.riskScore > 0.5) {
            recommendations.push(
                'Monitorare attentamente le attività',
                'Considerare restrizioni aggiuntive',
                'Verificare la legittimità delle operazioni'
            );
        }

        return recommendations;
    }
}

module.exports = new ThreatIntelligenceService();