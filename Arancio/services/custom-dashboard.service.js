// services/custom-dashboard.service.js
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const logger = require('../config/logger');

class CustomDashboardService {
    constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST,
            password: process.env.REDIS_PASSWORD
        });

        this.defaultLayouts = {
            security: {
                name: 'Security Overview',
                widgets: [
                    {
                        type: 'alertsTimeline',
                        size: { w: 12, h: 4 },
                        position: { x: 0, y: 0 }
                    },
                    {
                        type: 'threatMap',
                        size: { w: 6, h: 4 },
                        position: { x: 0, y: 4 }
                    },
                    {
                        type: 'securityMetrics',
                        size: { w: 6, h: 4 },
                        position: { x: 6, y: 4 }
                    }
                ]
            },
            performance: {
                name: 'Performance Monitoring',
                widgets: [
                    {
                        type: 'systemMetrics',
                        size: { w: 8, h: 4 },
                        position: { x: 0, y: 0 }
                    },
                    {
                        type: 'resourceUsage',
                        size: { w: 4, h: 4 },
                        position: { x: 8, y: 0 }
                    }
                ]
            }
        };
    }

    // Creazione dashboard personalizzata
    async createDashboard(userId, config) {
        try {
            const dashboardId = uuidv4();
            const dashboard = {
                id: dashboardId,
                userId,
                name: config.name,
                layout: config.layout || this.defaultLayouts.security,
                created: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                widgets: config.widgets || [],
                settings: config.settings || {}
            };

            await this.saveDashboard(dashboard);
            await this.initializeDashboardData(dashboard);

            return dashboard;
        } catch (error) {
            logger.error('Errore nella creazione dashboard', error);
            throw error;
        }
    }

    // Salvataggio dashboard
    async saveDashboard(dashboard) {
        await mongoose.model('Dashboard').create(dashboard);
        await this.redis.set(
            `dashboard:${dashboard.id}`,
            JSON.stringify(dashboard),
            'EX',
            3600
        );
    }

    // Inizializzazione dati dashboard
    async initializeDashboardData(dashboard) {
        const initPromises = dashboard.widgets.map(widget =>
            this.initializeWidgetData(dashboard.id, widget)
        );

        await Promise.all(initPromises);
    }

    // Aggiornamento dashboard
    async updateDashboard(dashboardId, updates) {
        const dashboard = await this.getDashboard(dashboardId);
        if (!dashboard) {
            throw new Error('Dashboard non trovata');
        }

        const updatedDashboard = {
            ...dashboard,
            ...updates,
            lastModified: new Date().toISOString()
        };

        await this.saveDashboard(updatedDashboard);
        return updatedDashboard;
    }

    // Aggiunta widget
    async addWidget(dashboardId, widget) {
        const dashboard = await this.getDashboard(dashboardId);
        
        widget.id = uuidv4();
        dashboard.widgets.push(widget);
        
        await this.updateDashboard(dashboardId, {
            widgets: dashboard.widgets
        });
        
        await this.initializeWidgetData(dashboardId, widget);
        
        return widget;
    }

    // Configurazione widget
    async configureWidget(dashboardId, widgetId, config) {
        const dashboard = await this.getDashboard(dashboardId);
        const widget = dashboard.widgets.find(w => w.id === widgetId);
        
        if (!widget) {
            throw new Error('Widget non trovato');
        }

        Object.assign(widget, config);
        await this.updateDashboard(dashboardId, {
            widgets: dashboard.widgets
        });

        return widget;
    }

    // Export dashboard
    async exportDashboard(dashboardId, format) {
        const dashboard = await this.getDashboard(dashboardId);
        const data = await this.collectDashboardData(dashboard);

        switch (format.toLowerCase()) {
            case 'pdf':
                return this.exportToPDF(dashboard, data);
            case 'excel':
                return this.exportToExcel(dashboard, data);
            case 'json':
                return this.exportToJSON(dashboard, data);
            default:
                throw new Error(`Formato non supportato: ${format}`);
        }
    }

    // Export in PDF
    async exportToPDF(dashboard, data) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument();
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Header
            doc.fontSize(25)
               .text(dashboard.name, { align: 'center' })
               .moveDown();

            // Metadata
            doc.fontSize(12)
               .text(`Generated: ${new Date().toISOString()}`)
               .text(`Dashboard ID: ${dashboard.id}`)
               .moveDown();

            // Widgets
            dashboard.widgets.forEach(widget => {
                doc.fontSize(16)
                   .text(widget.name)
                   .moveDown();

                const widgetData = data[widget.id];
                this.renderWidgetPDF(doc, widget, widgetData);
                doc.moveDown();
            });

            doc.end();
        });
    }

    // Export in Excel
    async exportToExcel(dashboard, data) {
        const workbook = new ExcelJS.Workbook();
        
        // Overview sheet
        const overviewSheet = workbook.addWorksheet('Overview');
        this.addOverviewSheet(overviewSheet, dashboard);

        // Widget sheets
        for (const widget of dashboard.widgets) {
            const sheet = workbook.addWorksheet(widget.name);
            await this.addWidgetSheet(sheet, widget, data[widget.id]);
        }

        // Formattazione
        this.formatExcelWorkbook(workbook);

        return workbook;
    }

    // Export in JSON
    exportToJSON(dashboard, data) {
        return {
            dashboard: {
                id: dashboard.id,
                name: dashboard.name,
                created: dashboard.created,
                lastModified: dashboard.lastModified,
                settings: dashboard.settings
            },
            widgets: dashboard.widgets.map(widget => ({
                id: widget.id,
                name: widget.name,
                type: widget.type,
                data: data[widget.id]
            })),
            exportDate: new Date().toISOString()
        };
    }

    // Rendering widget in PDF
    renderWidgetPDF(doc, widget, data) {
        switch (widget.type) {
            case 'chart':
                this.renderChartPDF(doc, widget, data);
                break;
            case 'table':
                this.renderTablePDF(doc, widget, data);
                break;
            case 'metrics':
                this.renderMetricsPDF(doc, widget, data);
                break;
            case 'alerts':
                this.renderAlertsPDF(doc, widget, data);
                break;
            default:
                doc.text('Widget type not supported in PDF export');
        }
    }

    // Aggiunta sheet overview Excel
    addOverviewSheet(sheet, dashboard) {
        sheet.addRow(['Dashboard Overview']);
        sheet.addRow(['Name', dashboard.name]);
        sheet.addRow(['Created', dashboard.created]);
        sheet.addRow(['Last Modified', dashboard.lastModified]);
        sheet.addRow([]);
        sheet.addRow(['Widgets Overview']);
        
        const headers = ['Name', 'Type', 'Last Updated'];
        sheet.addRow(headers);

        dashboard.widgets.forEach(widget => {
            sheet.addRow([
                widget.name,
                widget.type,
                widget.lastUpdated || 'N/A'
            ]);
        });
    }

    // Aggiunta sheet widget Excel
    async addWidgetSheet(sheet, widget, data) {
        sheet.addRow([widget.name]);
        sheet.addRow(['Type:', widget.type]);
        sheet.addRow(['Last Updated:', widget.lastUpdated || 'N/A']);
        sheet.addRow([]);

        switch (widget.type) {
            case 'table':
                this.addTableData(sheet, data);
                break;
            case 'chart':
                this.addChartData(sheet, data);
                break;
            case 'metrics':
                this.addMetricsData(sheet, data);
                break;
            default:
                sheet.addRow(['Data format not supported in Excel export']);
        }
    }

    // Formattazione workbook Excel
    formatExcelWorkbook(workbook) {
        workbook.eachSheet(sheet => {
            // Stile intestazione
            sheet.getRow(1).font = { bold: true, size: 14 };
            
            // Larghezza colonne
            sheet.columns.forEach(column => {
                column.width = 15;
            });

            // Bordi
            sheet.eachRow(row => {
                row.eachCell(cell => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            });
        });
    }
}

module.exports = new CustomDashboardService();