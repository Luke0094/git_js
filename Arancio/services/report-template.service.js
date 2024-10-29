// services/report-template.service.js
const mongoose = require('mongoose');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const logger = require('../config/logger');

class ReportTemplateService {
    constructor() {
        this.templatesPath = path.join(__dirname, '../templates');
        this.compiledTemplates = new Map();
        this.helpers = new Map();

        this.registerDefaultHelpers();
        this.loadTemplates();
    }

    // Inizializzazione template predefiniti
    async loadTemplates() {
        try {
            // Carica template da filesystem
            const templates = await fs.readdir(this.templatesPath);
            
            for (const template of templates) {
                const templateContent = await fs.readFile(
                    path.join(this.templatesPath, template),
                    'utf8'
                );
                
                const templateConfig = this.parseTemplateConfig(templateContent);
                await this.registerTemplate(
                    path.parse(template).name,
                    templateContent,
                    templateConfig
                );
            }

            // Carica template dal database
            const dbTemplates = await mongoose.model('ReportTemplate').find({});
            for (const template of dbTemplates) {
                await this.registerTemplate(
                    template.name,
                    template.content,
                    template.config
                );
            }
        } catch (error) {
            logger.error('Errore nel caricamento dei template', error);
            throw error;
        }
    }

    // Registrazione helpers predefiniti
    registerDefaultHelpers() {
        // Formattazione date
        this.registerHelper('formatDate', (date, format) => {
            return moment(date).format(format);
        });

        // Operazioni matematiche
        this.registerHelper('math', (value1, operator, value2) => {
            switch (operator) {
                case '+': return value1 + value2;
                case '-': return value1 - value2;
                case '*': return value1 * value2;
                case '/': return value1 / value2;
                default: return value1;
            }
        });

        // Formattazione numeri
        this.registerHelper('formatNumber', (number, decimals = 2) => {
            return Number(number).toFixed(decimals);
        });

        // Operazioni array
        this.registerHelper('arrayOperation', (array, operation) => {
            switch (operation) {
                case 'sum':
                    return array.reduce((a, b) => a + b, 0);
                case 'avg':
                    return array.reduce((a, b) => a + b, 0) / array.length;
                case 'min':
                    return Math.min(...array);
                case 'max':
                    return Math.max(...array);
                default:
                    return array;
            }
        });

        // Condizioni avanzate
        this.registerHelper('ifCond', function(v1, operator, v2, options) {
            switch (operator) {
                case '==': return (v1 == v2) ? options.fn(this) : options.inverse(this);
                case '===': return (v1 === v2) ? options.fn(this) : options.inverse(this);
                case '!=': return (v1 != v2) ? options.fn(this) : options.inverse(this);
                case '!==': return (v1 !== v2) ? options.fn(this) : options.inverse(this);
                case '<': return (v1 < v2) ? options.fn(this) : options.inverse(this);
                case '<=': return (v1 <= v2) ? options.fn(this) : options.inverse(this);
                case '>': return (v1 > v2) ? options.fn(this) : options.inverse(this);
                case '>=': return (v1 >= v2) ? options.fn(this) : options.inverse(this);
                case '&&': return (v1 && v2) ? options.fn(this) : options.inverse(this);
                case '||': return (v1 || v2) ? options.fn(this) : options.inverse(this);
                default: return options.inverse(this);
            }
        });
    }

    // Registrazione nuovo template
    async registerTemplate(name, content, config) {
        try {
            // Valida configurazione
            this.validateTemplateConfig(config);

            // Compila template
            const compiled = handlebars.compile(content);
            
            // Salva in memoria
            this.compiledTemplates.set(name, {
                compiled,
                config,
                lastUpdated: new Date()
            });

            // Salva nel database
            await mongoose.model('ReportTemplate').findOneAndUpdate(
                { name },
                {
                    content,
                    config,
                    lastUpdated: new Date()
                },
                { upsert: true }
            );

            return true;
        } catch (error) {
            logger.error(`Errore nella registrazione del template ${name}`, error);
            throw error;
        }
    }

    // Generazione report da template
    async generateReport(templateName, data, options = {}) {
        try {
            const template = this.compiledTemplates.get(templateName);
            if (!template) {
                throw new Error(`Template non trovato: ${templateName}`);
            }

            // Valida dati contro schema
            this.validateData(data, template.config.schema);

            // Preprocessa i dati
            const processedData = await this.preprocessData(data, template.config);

            // Applica il template
            const rendered = template.compiled(processedData);

            // Postprocessing
            const finalReport = await this.postprocessReport(
                rendered,
                template.config,
                options
            );

            return finalReport;
        } catch (error) {
            logger.error(`Errore nella generazione del report ${templateName}`, error);
            throw error;
        }
    }

    // Validazione dati
    validateData(data, schema) {
        const validate = ajv.compile(schema);
        const valid = validate(data);
        
        if (!valid) {
            throw new Error(
                `Validazione dati fallita: ${JSON.stringify(validate.errors)}`
            );
        }
    }

    // Preprocessing dati
    async preprocessData(data, config) {
        let processed = { ...data };

        // Applica trasformazioni configurate
        if (config.transformations) {
            for (const transform of config.transformations) {
                processed = await this.applyTransformation(processed, transform);
            }
        }

        // Aggiungi metadati
        processed._metadata = {
            generatedAt: new Date().toISOString(),
            version: config.version,
            template: config.name
        };

        return processed;
    }

    // Applicazione trasformazioni
    async applyTransformation(data, transform) {
        switch (transform.type) {
            case 'aggregate':
                return this.aggregateData(data, transform.config);
            case 'filter':
                return this.filterData(data, transform.config);
            case 'sort':
                return this.sortData(data, transform.config);
            case 'enrich':
                return await this.enrichData(data, transform.config);
            default:
                throw new Error(`Trasformazione non supportata: ${transform.type}`);
        }
    }

    // Postprocessing report
    async postprocessReport(report, config, options) {
        let processed = report;

        // Applica formattazione
        if (config.formatting) {
            processed = await this.applyFormatting(processed, config.formatting);
        }

        // Aggiungi risorse (immagini, etc.)
        if (config.resources) {
            processed = await this.embedResources(processed, config.resources);
        }

        // Ottimizzazioni
        if (options.optimize) {
            processed = await this.optimizeOutput(processed, options.optimize);
        }

        return processed;
    }

    // Registrazione helper personalizzato
    registerHelper(name, fn) {
        if (this.helpers.has(name)) {
            throw new Error(`Helper ${name} già registrato`);
        }

        this.helpers.set(name, fn);
        handlebars.registerHelper(name, fn);
    }

    // Parsing configurazione template
    parseTemplateConfig(content) {
        const configMatch = content.match(/---\n([\s\S]*?)\n---/);
        if (!configMatch) {
            return {};
        }

        try {
            return yaml.load(configMatch[1]);
        } catch (error) {
            throw new Error('Errore nel parsing della configurazione template');
        }
    }

    // Validazione configurazione template
    validateTemplateConfig(config) {
        const requiredFields = ['name', 'version', 'schema'];
        const missingFields = requiredFields.filter(field => !(field in config));

        if (missingFields.length > 0) {
            throw new Error(
                `Campi mancanti nella configurazione: ${missingFields.join(', ')}`
            );
        }

        return true;
    }
}

module.exports = new ReportTemplateService();