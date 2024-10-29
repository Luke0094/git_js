// services/report-scheduler.service.js
const cron = require('node-cron');
const mongoose = require('mongoose');
const { CloudStorageService } = require('./cloud-storage.service');
const { ReportTemplateService } = require('./report-template.service');
const logger = require('../config/logger');

class ReportSchedulerService {
    constructor() {
        this.scheduledJobs = new Map();
        this.cloudStorage = new CloudStorageService();
        this.templates = ReportTemplateService;
        
        this.initialize();
    }

    // Inizializzazione scheduler
    async initialize() {
        try {
            // Carica job schedulati dal database
            const scheduledReports = await mongoose.model('ScheduledReport').find({
                active: true
            });

            // Avvia i job
            for (const report of scheduledReports) {
                await this.scheduleReport(report);
            }

            logger.info(`Inizializzati ${scheduledReports.length} report schedulati`);
        } catch (error) {
            logger.error('Errore nell\'inizializzazione dello scheduler', error);
            throw error;
        }
    }

    // Scheduling nuovo report
    async scheduleReport(config) {
        try {
            // Valida configurazione
            this.validateScheduleConfig(config);

            // Crea il job
            const job = cron.schedule(config.schedule, async () => {
                try {
                    await this.executeScheduledReport(config);
                } catch (error) {
                    logger.error(
                        `Errore nell'esecuzione del report schedulato ${config.name}`,
                        error
                    );
                    await this.handleJobError(config, error);
                }
            }, {
                scheduled: true,
                timezone: config.timezone || 'UTC'
            });

            // Salva il job
            this.scheduledJobs.set(config.id, {
                job,
                config,
                lastRun: null,
                status: 'scheduled'
            });

            // Aggiorna database
            await mongoose.model('ScheduledReport').findByIdAndUpdate(
                config.id,
                { status: 'scheduled', lastUpdated: new Date() }
            );

            return true;
        } catch (error) {
            logger.error(`Errore nello scheduling del report ${config.name}`, error);
            throw error;
        }
    }

    // Esecuzione report schedulato
    async executeScheduledReport(config) {
        logger.info(`Avvio esecuzione report schedulato: ${config.name}`);

        try {
            // Raccogli dati
            const data = await this.collectReportData(config);

            // Genera report
            const report = await this.templates.generateReport(
                config.template,
                data,
                config.options
            );

            // Salva report
            const saved = await this.saveReport(report, config);

            // Upload su cloud se configurato
            if (config.storage?.cloud) {
                await this.uploadToCloud(saved, config);
            }

            // Invia notifiche
            await this.sendNotifications(config, {
                status: 'success',
                reportUrl: saved.url
            });

            // Aggiorna stato
            await this.updateJobStatus(config.id, {
                lastRun: new Date(),
                status: 'completed',
                lastRunStatus: 'success'
            });

            logger.info(`Report schedulato completato: ${config.name}`);
        } catch (error) {
            logger.error(`Errore nell'esecuzione del report ${config.name}`, error);
            await this.handleJobError(config, error);
            throw error;
        }
    }

    // Upload su cloud
    async uploadToCloud(report, config) {
        const storage = config.storage.cloud;
        const path = this.generateCloudPath(config);

        switch (storage.provider) {
            case 's3':
                return await this.cloudStorage.uploadToS3(report, path, storage.config);
            case 'gcs':
                return await this.cloudStorage.uploadToGCS(report, path, storage.config);
            case 'azure':
                return await this.cloudStorage.uploadToAzure(report, path, storage.config);
            default:
                throw new Error(`Provider cloud non supportato: ${storage.provider}`);
        }
    }

    // Gestione errori
    async handleJobError(config, error) {
        // Aggiorna stato
        await this.updateJobStatus(config.id, {
            lastRun: new Date(),
            status: 'error',
            lastRunStatus: 'failed',
            lastError: error.message
        });

        // Notifica errore
        await this.sendNotifications(config, {
            status: 'error',
            error: error.message
        });

        // Retry se configurato
        if (config.retry && config.retry.attempts > 0) {
            await this.scheduleRetry(config);
        }
    }

    // Scheduling retry
    async scheduleRetry(config) {
        const retryCount = (config.retry.current || 0) + 1;
        const delay = this.calculateRetryDelay(retryCount, config.retry.backoff);

        if (retryCount <= config.retry.attempts) {
            setTimeout(async () => {
                try {
                    await this.executeScheduledReport({
                        ...config,
                        retry: {
                            ...config.retry,
                            current: retryCount
                        }
                    });
                } catch (error) {
                    logger.error(
                        `Retry ${retryCount} fallito per ${config.name}`,
                        error
                    );
                }
            }, delay);
        }
    }

    // Calcolo delay retry
    calculateRetryDelay(attempt, backoff) {
        switch (backoff.type) {
            case 'fixed':
                return backoff.delay;
            case 'exponential':
                return backoff.baseDelay * Math.pow(2, attempt - 1);
            case 'linear':
                return backoff.baseDelay * attempt;
            default:
                return 60000; // Default 1 minuto
        }
    }

    // Validazione configurazione scheduling
    validateScheduleConfig(config) {
        const requiredFields = ['name', 'template', 'schedule'];
        const missingFields = requiredFields.filter(field => !(field in config));

        if (missingFields.length > 0) {
            throw new Error(
                `Campi mancanti nella configurazione: ${missingFields.join(', ')}`
            );
        }

        // Valida espressione cron
        if (!cron.validate(config.schedule)) {
            throw new Error(`Espressione cron non valida: ${config.schedule}`);
        }

        return true;
    }

    // Gestione notifiche
    async sendNotifications(config, status) {
        if (!config.notifications) return;

        const notifications = Array.isArray(config.notifications) 
            ? config.notifications 
            : [config.notifications];

        for (const notification of notifications) {
            try {
                await this.sendNotification(notification, status, config);
            } catch (error) {
                logger.error(
                    `Errore nell'invio della notifica ${notification.type}`,
                    error
                );
            }
        }
    }

    // Invio notifica specifica
    async sendNotification(notification, status, config) {
        const message = this.formatNotificationMessage(notification, status, config);

        switch (notification.type) {
            case 'email':
                await this.sendEmailNotification(notification, message);
                break;
            case 'slack':
                await this.sendSlackNotification(notification, message);
                break;
            case 'webhook':
                await this.sendWebhookNotification(notification, message);
                break;
            default:
                throw new Error(`Tipo notifica non supportato: ${notification.type}`);
        }
    }

    // Aggiornamento stato job
    async updateJobStatus(jobId, status) {
        // Aggiorna stato in memoria
        const job = this.scheduledJobs.get(jobId);
        if (job) {
            Object.assign(job, status);
        }

        // Aggiorna database
        await mongoose.model('ScheduledReport').findByIdAndUpdate(jobId, {
            ...status,
            lastUpdated: new Date()
        });
    }

    // Pausa job
    async pauseJob(jobId) {
        const job = this.scheduledJobs.get(jobId);
        if (!job) {
            throw new Error(`Job non trovato: ${jobId}`);
        }

        job.job.stop();
        await this.updateJobStatus(jobId, { status: 'paused' });

        return true;
    }

    // Ripresa job
    async resumeJob(jobId) {
        const job = this.scheduledJobs.get(jobId);
        if (!job) {
            throw new Error(`Job non trovato: ${jobId}`);
        }

        job.job.start();
        await this.updateJobStatus(jobId, { status: 'scheduled' });

        return true;
    }

    // Cancellazione job
    async deleteJob(jobId) {
        const job = this.scheduledJobs.get(jobId);
        if (!job) {
            throw new Error(`Job non trovato: ${jobId}`);
        }

        job.job.stop();
        this.scheduledJobs.delete(jobId);

        await mongoose.model('ScheduledReport').findByIdAndDelete(jobId);

        return true;
    }
}

module.exports = new ReportSchedulerService();