// services/monitoring.service.js
const nodemailer = require('nodemailer');
const Slack = require('@slack/webhook');
const axios = require('axios');
const clamav = require('clamav.js');
const fileType = require('file-type');
const logger = require('../config/logger');
const config = require('../config/security');

class SecurityMonitoring {
    constructor() {
        this.suspiciousActivities = new Map();
        this.slack = new Slack.IncomingWebhook(process.env.SLACK_WEBHOOK_URL);
        this.emailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        
        // Inizializza ClamAV
        this.clamav = clamav.createScanner({
            removeInfected: true,
            quarantinePath: './quarantine',
            debugMode: false
        });
    }

    // Monitoraggio attività sospette
    async trackActivity(activity) {
        const {
            type,      // tipo di attività (login, upload, etc.)
            userId,    // ID utente
            ip,        // IP dell'utente
            details,   // dettagli dell'attività
            severity   // livello di gravità
        } = activity;

        const activityLog = {
            timestamp: new Date(),
            type,
            userId,
            ip,
            details,
            severity
        };

        // Salva l'attività nel database
        await this.logActivity(activityLog);

        // Controlla se l'attività è sospetta
        if (await this.isSuspiciousActivity(activityLog)) {
            await this.handleSuspiciousActivity(activityLog);
        }
    }

    // Verifica se un'attività è sospetta
    async isSuspiciousActivity(activity) {
        const rules = [
            // Login da IP sospetto
            async () => {
                if (activity.type === 'login') {
                    const ipInfo = await this.checkIP(activity.ip);
                    return ipInfo.threat_level === 'high';
                }
                return false;
            },
            
            // Multiple richieste fallite
            () => {
                const key = `${activity.type}:${activity.ip}`;
                const attempts = this.suspiciousActivities.get(key) || 0;
                this.suspiciousActivities.set(key, attempts + 1);
                return attempts >= config.security.maxFailedAttempts;
            },
            
            // Upload file sospetti
            async () => {
                if (activity.type === 'upload' && activity.details.file) {
                    const fileAnalysis = await this.analyzeFile(activity.details.file);
                    return fileAnalysis.isSuspicious;
                }
                return false;
            },
            
            // Pattern di accesso anomali
            () => {
                if (activity.type === 'login') {
                    return this.detectAnomalousPattern(activity);
                }
                return false;
            }
        ];

        // Esegui tutte le regole
        const results = await Promise.all(rules.map(rule => rule()));
        return results.some(result => result === true);
    }

    // Gestione delle attività sospette
    async handleSuspiciousActivity(activity) {
        // Log dettagliato
        logger.warn('Attività sospetta rilevata', {
            ...activity,
            handler: 'SecurityMonitoring'
        });

        // Notifiche
        await Promise.all([
            this.sendEmailAlert(activity),
            this.sendSlackAlert(activity),
            this.triggerSecurityMeasures(activity)
        ]);
    }

    // Analisi approfondita dei file
    async analyzeFile(file) {
        try {
            const results = {
                isSuspicious: false,
                threats: []
            };

            // Verifica tipo file
            const fileInfo = await fileType.fromFile(file.path);
            if (!fileInfo || !config.security.allowedMimeTypes.includes(fileInfo.mime)) {
                results.isSuspicious = true;
                results.threats.push('INVALID_MIME_TYPE');
            }

            // Scansione virus
            const scanResult = await this.clamav.scanFile(file.path);
            if (scanResult.isInfected) {
                results.isSuspicious = true;
                results.threats.push('MALWARE_DETECTED');
            }

            // Analisi contenuto per file specifici
            if (fileInfo && fileInfo.mime === 'application/pdf') {
                const contentThreats = await this.analyzePDFContent(file.path);
                if (contentThreats.length > 0) {
                    results.isSuspicious = true;
                    results.threats.push(...contentThreats);
                }
            }

            return results;
        } catch (error) {
            logger.error('Errore durante l\'analisi del file', error);
            return { isSuspicious: true, threats: ['ANALYSIS_ERROR'] };
        }
    }

    // Invio notifiche email
    async sendEmailAlert(activity) {
        const emailOptions = {
            from: process.env.ALERT_EMAIL_FROM,
            to: process.env.ALERT_EMAIL_TO,
            subject: `🚨 Allerta Sicurezza: ${activity.type}`,
            html: this.generateAlertEmail(activity)
        };

        await this.emailTransporter.sendMail(emailOptions);
    }

    // Invio notifiche Slack
    async sendSlackAlert(activity) {
        await this.slack.send({
            text: '🚨 Allerta Sicurezza',
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Attività Sospetta Rilevata*\nTipo: ${activity.type}\nIP: ${activity.ip}\nUtente: ${activity.userId}\nSeverità: ${activity.severity}`
                    }
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Dettagli:*\n\`\`\`${JSON.stringify(activity.details, null, 2)}\`\`\``
                    }
                }
            ]
        });
    }

    // Implementazione misure di sicurezza automatiche
    async triggerSecurityMeasures(activity) {
        switch (activity.severity) {
            case 'high':
                // Blocco immediato dell'account
                await this.blockAccount(activity.userId);
                // Blocco dell'IP
                await this.blockIP(activity.ip);
                break;
            
            case 'medium':
                // Richiedi 2FA aggiuntiva
                await this.enforce2FA(activity.userId);
                break;
            
            case 'low':
                // Incrementa monitoraggio
                await this.increaseSurveillance(activity.userId);
                break;
        }
    }

    // Verifiche IP tramite servizi esterni
    async checkIP(ip) {
        try {
            const response = await axios.get(`${process.env.IP_CHECK_SERVICE}/check/${ip}`);
            return response.data;
        } catch (error) {
            logger.error('Errore durante il controllo IP', error);
            return { threat_level: 'unknown' };
        }
    }

    // Rilevamento pattern anomali
    detectAnomalousPattern(activity) {
        const patterns = {
            rapidRequests: this.checkRapidRequests(activity),
            unusualTiming: this.checkUnusualTiming(activity),
            geographicalAnomalies: this.checkGeographicalAnomalies(activity)
        };

        return Object.values(patterns).some(result => result === true);
    }

    // Generazione report di sicurezza
    async generateSecurityReport() {
        const report = {
            timestamp: new Date(),
            summary: {
                totalIncidents: 0,
                severityBreakdown: {},
                topThreats: [],
                blockedIPs: []
            },
            details: []
        };

        // Popola il report con i dati raccolti
        await this.populateSecurityReport(report);

        return report;
    }
}

module.exports = new SecurityMonitoring();