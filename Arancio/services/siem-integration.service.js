// services/siem-integration.service.js
const { Client } = require('@elastic/elasticsearch');
const winston = require('winston');
const { format } = require('date-fns');
const Splunk = require('splunk-logging');
const logger = require('../config/logger');

class SIEMIntegrationService {
    constructor() {
        // Inizializzazione client Elasticsearch
        this.elasticClient = new Client({
            node: process.env.ELASTICSEARCH_URL,
            auth: {
                username: process.env.ELASTICSEARCH_USERNAME,
                password: process.env.ELASTICSEARCH_PASSWORD
            }
        });

        // Inizializzazione client Splunk
        this.splunkLogger = new Splunk.Logger({
            token: process.env.SPLUNK_TOKEN,
            url: process.env.SPLUNK_URL
        });

        // Configurazione indici
        this.indices = {
            security: 'security-events',
            access: 'access-logs',
            system: 'system-metrics',
            audit: 'audit-trail'
        };

        // Inizializza buffer per batch processing
        this.eventBuffer = {
            security: [],
            access: [],
            system: [],
            audit: []
        };

        this.bufferLimit = 100;
        this.flushInterval = 5000; // 5 secondi

        // Avvia flush periodico
        setInterval(() => this.flushBuffers(), this.flushInterval);
    }

    // Invio evento al SIEM
    async sendEvent(eventType, eventData) {
        try {
            const enrichedEvent = this.enrichEvent(eventType, eventData);
            
            // Aggiungi al buffer
            this.eventBuffer[eventType].push(enrichedEvent);

            // Se il buffer è pieno, esegui flush
            if (this.eventBuffer[eventType].length >= this.bufferLimit) {
                await this.flushBuffer(eventType);
            }

            // Se è un evento critico, invia immediatamente
            if (eventData.severity === 'critical') {
                await this.sendImmediately(enrichedEvent);
            }

            return true;
        } catch (error) {
            logger.error('Errore nell\'invio evento al SIEM', error);
            throw error;
        }
    }

    // Arricchimento eventi
    enrichEvent(eventType, eventData) {
        return {
            ...eventData,
            '@timestamp': new Date().toISOString(),
            event_type: eventType,
            environment: process.env.NODE_ENV,
            application: 'security-platform',
            host: process.env.HOST_NAME,
            correlation_id: this.generateCorrelationId(eventData),
            metadata: {
                version: process.env.APP_VERSION,
                processed_at: new Date().toISOString()
            }
        };
    }

    // Flush dei buffer
    async flushBuffers() {
        await Promise.all(
            Object.keys(this.eventBuffer).map(type => this.flushBuffer(type))
        );
    }

    // Flush buffer specifico
    async flushBuffer(eventType) {
        if (this.eventBuffer[eventType].length === 0) return;

        const events = [...this.eventBuffer[eventType]];
        this.eventBuffer[eventType] = [];

        try {
            // Invia a Elasticsearch
            const body = events.flatMap(event => [
                { index: { _index: this.indices[eventType] } },
                event
            ]);

            await this.elasticClient.bulk({ body });

            // Invia a Splunk
            await Promise.all(
                events.map(event =>
                    new Promise((resolve, reject) => {
                        this.splunkLogger.send({
                            message: event,
                            severity: event.severity || 'info',
                            source: eventType
                        }, (err, resp) => {
                            if (err) reject(err);
                            else resolve(resp);
                        });
                    })
                )
            );

        } catch (error) {
            logger.error(`Errore durante il flush del buffer ${eventType}`, error);
            // Recupera gli eventi
            this.eventBuffer[eventType].unshift(...events);
        }
    }

    // Invio immediato per eventi critici
    async sendImmediately(event) {
        try {
            // Invia a Elasticsearch
            await this.elasticClient.index({
                index: this.indices[event.event_type],
                body: event
            });

            // Invia a Splunk
            await new Promise((resolve, reject) => {
                this.splunkLogger.send({
                    message: event,
                    severity: event.severity,
                    source: event.event_type
                }, (err, resp) => {
                    if (err) reject(err);
                    else resolve(resp);
                });
            });

            return true;
        } catch (error) {
            logger.error('Errore nell\'invio immediato dell\'evento', error);
            throw error;
        }
    }

    // Query eventi dal SIEM
    async queryEvents(params) {
        try {
            const { index, query, timeRange, size = 100 } = params;

            const searchQuery = {
                index: this.indices[index],
                body: {
                    query: {
                        bool: {
                            must: [
                                query,
                                {
                                    range: {
                                        '@timestamp': {
                                            gte: timeRange.start,
                                            lte: timeRange.end
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    size,
                    sort: [{ '@timestamp': 'desc' }]
                }
            };

            const response = await this.elasticClient.search(searchQuery);
            return response.body.hits.hits.map(hit => hit._source);
        } catch (error) {
            logger.error('Errore nella query eventi', error);
            throw error;
        }
    }

    // Creazione dashboard
    async createDashboard(name, panels) {
        try {
            const dashboard = {
                name,
                timestamp: new Date().toISOString(),
                panels,
                metadata: {
                    created_by: process.env.SERVICE_NAME,
                    version: '1.0'
                }
            };

            await this.elasticClient.index({
                index: 'security-dashboards',
                body: dashboard
            });

            return dashboard;
        } catch (error) {
            logger.error('Errore nella creazione dashboard', error);
            throw error;
        }
    }

    // Generazione report SIEM
    async generateSIEMReport(params) {
        try {
            const { startDate, endDate, eventTypes } = params;

            const reports = await Promise.all(
                eventTypes.map(async type => {
                    const events = await this.queryEvents({
                        index: type,
                        timeRange: { start: startDate, end: endDate },
                        query: { match_all: {} }
                    });

                    return {
                        type,
                        count: events.length,
                        severity: this.analyzeSeverity(events),
                        trends: this.analyzeTrends(events),
                        topSources: this.analyzeTopSources(events)
                    };
                })
            );

            return {
                timestamp: new Date().toISOString(),
                period: { startDate, endDate },
                summary: this.summarizeReports(reports),
                details: reports
            };
        } catch (error) {
            logger.error('Errore nella generazione report SIEM', error);
            throw error;
        }
    }

    // Analisi severità eventi
    analyzeSeverity(events) {
        return events.reduce((acc, event) => {
            acc[event.severity] = (acc[event.severity] || 0) + 1;
            return acc;
        }, {});
    }

    // Analisi trend
    analyzeTrends(events) {
        // Raggruppa eventi per ora
        const hourlyGroups = events.reduce((acc, event) => {
            const hour = format(new Date(event['@timestamp']), 'yyyy-MM-dd HH:00');
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
        }, {});

        // Calcola trend
        return Object.entries(hourlyGroups)
            .map(([hour, count]) => ({ hour, count }))
            .sort((a, b) => new Date(a.hour) - new Date(b.hour));
    }

    // Analisi sorgenti più comuni
    analyzeTopSources(events) {
        const sources = events.reduce((acc, event) => {
            const source = event.source || 'unknown';
            acc[source] = (acc[source] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(sources)
            .map(([source, count]) => ({ source, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }

    // Riepilogo report
    summarizeReports(reports) {
        return {
            totalEvents: reports.reduce((sum, r) => sum + r.count, 0),
            severityDistribution: reports.reduce((acc, r) => {
                Object.entries(r.severity).forEach(([sev, count]) => {
                    acc[sev] = (acc[sev] || 0) + count;
                });
                return acc;
            }, {}),
            eventTypeDistribution: reports.reduce((acc, r) => {
                acc[r.type] = r.count;
                return acc;
            }, {})
        };
    }

    // Generazione ID correlazione
    generateCorrelationId(eventData) {
        return crypto
            .createHash('sha256')
            .update(JSON.stringify(eventData) + Date.now())
            .digest('hex');
    }
}

module.exports = new SIEMIntegrationService();