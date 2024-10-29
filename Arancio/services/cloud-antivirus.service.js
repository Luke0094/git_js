// services/cloud-antivirus.service.js
const axios = require('axios');
const fs = require('fs').promises;
const crypto = require('crypto');
const logger = require('../config/logger');

class CloudAntivirusService {
    constructor() {
        this.providers = {
            virusTotal: {
                apiKey: process.env.VIRUSTOTAL_API_KEY,
                baseUrl: 'https://www.virustotal.com/vtapi/v3',
                maxSize: 32 * 1024 * 1024 // 32MB
            },
            cloudmersive: {
                apiKey: process.env.CLOUDMERSIVE_API_KEY,
                baseUrl: 'https://api.cloudmersive.com/virus/scan',
                maxSize: 50 * 1024 * 1024 // 50MB
            },
            sophos: {
                apiKey: process.env.SOPHOS_API_KEY,
                baseUrl: 'https://api.sophos.com/scan/v1',
                maxSize: 100 * 1024 * 1024 // 100MB
            }
        };

        this.scanCache = new Map();
        this.CACHE_TTL = 24 * 60 * 60 * 1000; // 24 ore
    }

    // Scansione multi-provider
    async scanFile(filePath) {
        try {
            // Calcola hash del file
            const fileHash = await this.calculateFileHash(filePath);
            
            // Controlla cache
            const cachedResult = this.getCachedResult(fileHash);
            if (cachedResult) {
                logger.info('Risultato trovato in cache', { fileHash });
                return cachedResult;
            }

            // Scansione parallela con tutti i provider
            const scanPromises = Object.entries(this.providers).map(([provider, config]) =>
                this.scanWithProvider(provider, filePath, fileHash)
            );

            const results = await Promise.allSettled(scanPromises);
            
            // Aggregazione risultati
            const aggregatedResult = this.aggregateResults(results, fileHash);
            
            // Salva in cache
            this.cacheResult(fileHash, aggregatedResult);

            return aggregatedResult;
        } catch (error) {
            logger.error('Errore durante la scansione cloud', error);
            throw error;
        }
    }

    // Scansione con provider specifico
    async scanWithProvider(provider, filePath, fileHash) {
        const config = this.providers[provider];
        
        try {
            const stats = await fs.stat(filePath);
            if (stats.size > config.maxSize) {
                throw new Error(`File troppo grande per ${provider}`);
            }

            switch (provider) {
                case 'virusTotal':
                    return await this.scanWithVirusTotal(filePath, fileHash, config);
                case 'cloudmersive':
                    return await this.scanWithCloudmersive(filePath, config);
                case 'sophos':
                    return await this.scanWithSophos(filePath, config);
                default:
                    throw new Error(`Provider ${provider} non supportato`);
            }
        } catch (error) {
            logger.error(`Errore scansione con ${provider}`, error);
            return {
                provider,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Scansione VirusTotal
    async scanWithVirusTotal(filePath, fileHash, config) {
        // Prima controlla se il file è già stato analizzato
        const existingReport = await axios.get(
            `${config.baseUrl}/files/${fileHash}`,
            { headers: { 'x-apikey': config.apiKey } }
        );

        if (existingReport.data.data) {
            return {
                provider: 'virusTotal',
                timestamp: new Date().toISOString(),
                results: existingReport.data.data.attributes.last_analysis_results,
                stats: existingReport.data.data.attributes.last_analysis_stats
            };
        }

        // Se non esiste, carica il file per l'analisi
        const uploadUrl = await this.getVirusTotalUploadUrl(config);
        const fileBuffer = await fs.readFile(filePath);
        
        await axios.post(uploadUrl, fileBuffer, {
            headers: {
                'x-apikey': config.apiKey,
                'Content-Type': 'application/octet-stream'
            }
        });

        // Attendi il completamento dell'analisi
        const maxAttempts = 10;
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, 15000)); // 15 secondi
            
            const analysisResult = await axios.get(
                `${config.baseUrl}/files/${fileHash}`,
                { headers: { 'x-apikey': config.apiKey } }
            );

            if (analysisResult.data.data.attributes.status === 'completed') {
                return {
                    provider: 'virusTotal',
                    timestamp: new Date().toISOString(),
                    results: analysisResult.data.data.attributes.last_analysis_results,
                    stats: analysisResult.data.data.attributes.last_analysis_stats
                };
            }
        }

        throw new Error('Timeout durante l\'analisi VirusTotal');
    }

    // Scansione Cloudmersive
    async scanWithCloudmersive(filePath, config) {
        const formData = new FormData();
        formData.append('file', await fs.readFile(filePath));

        const response = await axios.post(config.baseUrl, formData, {
            headers: {
                'Apikey': config.apiKey,
                'Content-Type': 'multipart/form-data'
            }
        });

        return {
            provider: 'cloudmersive',
            timestamp: new Date().toISOString(),
            results: response.data,
            cleanResult: response.data.CleanResult
        };
    }

    // Scansione Sophos
    async scanWithSophos(filePath, config) {
        const fileBuffer = await fs.readFile(filePath);
        
        const response = await axios.post(
            `${config.baseUrl}/file`,
            fileBuffer,
            {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/octet-stream'
                }
            }
        );

        return {
            provider: 'sophos',
            timestamp: new Date().toISOString(),
            results: response.data,
            threats: response.data.detections
        };
    }

    // Aggregazione risultati
    aggregateResults(results, fileHash) {
        const aggregated = {
            fileHash,
            timestamp: new Date().toISOString(),
            overallVerdict: 'clean',
            detections: [],
            providerResults: {},
            errorCount: 0
        };

        results.forEach(result => {
            if (result.status === 'fulfilled') {
                const scan = result.value;
                aggregated.providerResults[scan.provider] = scan;

                if (scan.results?.threats?.length > 0 || 
                    scan.results?.CleanResult === false ||
                    (scan.stats?.malicious > 0)) {
                    aggregated.overallVerdict = 'infected';
                    aggregated.detections.push({
                        provider: scan.provider,
                        threats: scan.results.threats || scan.results.detections
                    });
                }
            } else {
                aggregated.errorCount++;
            }
        });

        // Se troppi provider falliscono, marca come non conclusivo
        if (aggregated.errorCount > Object.keys(this.providers).length / 2) {
            aggregated.overallVerdict = 'inconclusive';
        }

        return aggregated;
    }

    // Gestione cache
    getCachedResult(fileHash) {
        const cached = this.scanCache.get(fileHash);
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
            return cached.result;
        }
        return null;
    }

    cacheResult(fileHash, result) {
        this.scanCache.set(fileHash, {
            timestamp: Date.now(),
            result
        });

        // Pulizia cache vecchia
        this.cleanCache();
    }

    cleanCache() {
        const now = Date.now();
        for (const [hash, data] of this.scanCache.entries()) {
            if (now - data.timestamp > this.CACHE_TTL) {
                this.scanCache.delete(hash);
            }
        }
    }

    // Utility
    async calculateFileHash(filePath) {
        const fileBuffer = await fs.readFile(filePath);
        return crypto
            .createHash('sha256')
            .update(fileBuffer)
            .digest('hex');
    }
}

module.exports = new CloudAntivirusService();