// services/advanced-alerting.service.js
const EventEmitter = require('events');
const Redis = require('ioredis');
const { WebClient } = require('@slack/web-api');
const nodemailer = require('nodemailer');
const PushNotifications = require('@pusher/push-notifications-server');
const logger = require('../config/logger');

class AdvancedAlertingService extends EventEmitter {
    constructor() {
        super();
        
        // Inizializza Redis per stato e caching
        this.redis = new Redis({
            host: process.env.REDIS_HOST,
            password: process.env.REDIS_PASSWORD
        });

        // Inizializza client per notifiche
        this.slack = new WebClient(process.env.SLACK_TOKEN);
        this.pushNotifications = new PushNotifications({
            instanceId: process.env.PUSHER_INSTANCE_ID,
            secretKey: process.env.PUSHER_SECRET_KEY
        });

        // Configurazione email
        this.emailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        // Regole di alert predefinite
        this.defaultRules = {
            securityIncident: {
                condition: (event) => event.severity === 'high',
                throttle: '1h',
                channels: ['email', 'slack', 'push']
            },
            systemHealth: {
                condition: (metrics) => metrics.cpu > 90 || metrics.memory > 90,
                throttle: '15m',
                channels: ['email', 'slack']
            },
            dataLeak: {
                condition: (event) => event.type === 'data_exposure',
                throttle: '1m',
                channels: ['email', 'slack', 'push', 'phone']
            }
        };

        // Stato degli alert
        this.alertState = new Map();
        
        // Cache per deduplicazione
        this.deduplicationCache = new Map();

        // Inizializza gestione escalation
        this.initializeEscalationHandlers();
    }

    // Configurazione regole personalizzate
    async setAlertRule(name, rule) {
        try {
            const fullRule = {
                ...rule,
                created: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            };

            await this.redis.hset('alert:rules', name, JSON.stringify(fullRule));
            return fullRule;
        } catch (error) {
            logger.error('Errore nella configurazione della regola di alert', error);
            throw error;
        }
    }

    // Processo di alerting principale
    async processAlert(data) {
        try {
            // Deduplicazione
            if (this.isDuplicate(data)) {
                logger.debug('Alert duplicato ignorato', { data });
                return;
            }

            // Arricchimento dati
            const enrichedData = await this.enrichAlertData(data);

            // Valutazione regole
            const matchedRules = await this.evaluateRules(enrichedData);

            // Gestione notifiche per ogni regola
            for (const rule of matchedRules) {
                if (await this.shouldSendAlert(rule, enrichedData)) {
                    await this.sendAlerts(rule, enrichedData);
                }
            }

            // Aggiorna stato
            await this.updateAlertState(enrichedData, matchedRules);

            // Verifica escalation
            await this.checkEscalation(enrichedData, matchedRules);

        } catch (error) {
            logger.error('Errore nel processo di alerting', error);
            throw error;
        }
    }

    // Arricchimento dati alert
    async enrichAlertData(data) {
        const enriched = { ...data };

        // Aggiungi contesto
        enriched.context = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            correlationId: data.correlationId || this.generateCorrelationId(),
        };

        // Aggiungi dati storici
        if (data.sourceId) {
            const history = await this.redis.lrange(
                `alert:history:${data.sourceId}`,
                0,
                -1
            );
            enriched.history = history.map(JSON.parse);
        }

        // Aggiungi metriche correlate
        if (data.metricType) {
            enriched.metrics = await this.getRelatedMetrics(data.metricType);
        }

        return enriched;
    }

    // Valutazione regole
    async evaluateRules(data) {
        const matchedRules = [];
        
        // Recupera tutte le regole
        const rules = {
            ...this.defaultRules,
            ...(await this.getCustomRules())
        };

        for (const [name, rule] of Object.entries(rules)) {
            try {
                if (rule.condition(data)) {
                    matchedRules.push({
                        name,
                        ...rule,
                        matchTime: new Date().toISOString()
                    });
                }
            } catch (error) {
                logger.error(`Errore nella valutazione della regola ${name}`, error);
            }
        }

        return matchedRules;
    }

    // Invio notifiche
    async sendAlerts(rule, data) {
        const notifications = rule.channels.map(channel => {
            switch (channel) {
                case 'email':
                    return this.sendEmailAlert(rule, data);
                case 'slack':
                    return this.sendSlackAlert(rule, data);
                case 'push':
                    return this.sendPushNotification(rule, data);
                case 'phone':
                    return this.sendPhoneAlert(rule, data);
                default:
                    logger.warn(`Canale di notifica non supportato: ${channel}`);
                    return Promise.resolve();
            }
        });

        await Promise.allSettled(notifications);
    }

    // Invio alert email
    async sendEmailAlert(rule, data) {
        const template = this.generateEmailTemplate(rule, data);
        
        await this.emailTransporter.sendMail({
            from: process.env.ALERT_EMAIL_FROM,
            to: this.getRecipients(rule, data),
            subject: template.subject,
            html: template.html,
            attachments: template.attachments
        });
    }

    // Invio alert Slack
    async sendSlackAlert(rule, data) {
        const blocks = this.generateSlackBlocks(rule, data);

        await this.slack.chat.postMessage({
            channel: rule.slackChannel,
            text: `Alert: ${rule.name}`,
            blocks
        });
    }

    // Invio notifica push
    async sendPushNotification(rule, data) {
        await this.pushNotifications.publish({
            interests: [rule.pushGroup],
            web: {
                notification: {
                    title: `Alert: ${rule.name}`,
                    body: this.generateAlertMessage(rule, data),
                    icon: 'path/to/icon.png',
                    data: {
                        alertId: data.id,
                        ruleId: rule.id
                    }
                }
            }
        });
    }

    // Gestione escalation
    initializeEscalationHandlers() {
        this.escalationLevels = {
            1: {
                delay: 5 * 60 * 1000, // 5 minuti
                action: this.levelOneEscalation.bind(this)
            },
            2: {
                delay: 15 * 60 * 1000, // 15 minuti
                action: this.levelTwoEscalation.bind(this)
            },
            3: {
                delay: 30 * 60 * 1000, // 30 minuti
                action: this.levelThreeEscalation.bind(this)
            }
        };
    }

    async checkEscalation(data, matchedRules) {
        for (const rule of matchedRules) {
            if (rule.requiresEscalation) {
                const escalationKey = `escalation:${data.id}`;
                const currentLevel = await this.redis.get(escalationKey) || 0;

                if (currentLevel < 3) {
                    const nextLevel = parseInt(currentLevel) + 1;
                    const escalation = this.escalationLevels[nextLevel];

                    setTimeout(async () => {
                        const resolved = await this.redis.get(`resolved:${data.id}`);
                        if (!resolved) {
                            await escalation.action(data, rule);
                            await this.redis.set(escalationKey, nextLevel);
                        }
                    }, escalation.delay);
                }
            }
        }
    }

    // Template generator
    generateEmailTemplate(rule, data) {
        return {
            subject: `[${data.severity.toUpperCase()}] Alert: ${rule.name}`,
            html: `
                <h2>Alert Notification</h2>
                <p><strong>Rule:</strong> ${rule.name}</p>
                <p><strong>Severity:</strong> ${data.severity}</p>
                <p><strong>Timestamp:</strong> ${data.context.timestamp}</p>
                <p><strong>Details:</strong></p>
                <pre>${JSON.stringify(data, null, 2)}</pre>
                <p><strong>Actions Required:</strong></p>
                <ul>
                    ${rule.actions.map(action => `<li>${action}</li>`).join('')}
                </ul>
            `,
            attachments: this.generateAttachments(rule, data)
        };
    }

    // Generazione blocchi Slack
    generateSlackBlocks(rule, data) {
        return [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `🚨 Alert: ${rule.name}`
                }
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Severity:*\n${data.severity}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Time:*\n${data.context.timestamp}`
                    }
                ]
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Details:*\n\`\`\`${JSON.stringify(data, null, 2)}\`\`\``
                }
            },
            {
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: 'View Details'
                        },
                        url: `${process.env.DASHBOARD_URL}/alerts/${data.id}`
                    }
                ]
            }
        ];
    }
}

module.exports = new AdvancedAlertingService();