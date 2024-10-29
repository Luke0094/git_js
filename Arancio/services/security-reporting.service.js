// services/security-reporting.service.js
const fs = require('fs').promises;
const path = require('path');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const nodemailer = require('nodemailer');
const chart = require('chart.js');
const logger = require('../config/logger');

class SecurityReportingService {
    constructor() {
        this.reportPath = path.join(__dirname, '../reports/security');
        this.emailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    // Generazione report sicurezza
    async generateSecurityReport(startDate, endDate) {
        try {
            const reportData = await this.collectReportData(startDate, endDate);
            
            // Genera report in diversi formati
            await Promise.all([
                this.generatePDFReport(reportData),
                this.generateExcelReport(reportData),
                this.generateJSONReport(reportData)
            ]);

            // Invia notifiche
            await this.distributeReport(reportData);

            return {
                success: true,
                reportId: reportData.id,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Errore durante la generazione del report', error);
            throw error;
        }
    }

    // Raccolta dati report
    async collectReportData(startDate, endDate) {
        return {
            id: crypto.randomUUID(),
            period: { startDate, endDate },
            summary: await this.generateSummary(startDate, endDate),
            threats: await this.collectThreatData(startDate, endDate),
            quarantine: await this.collectQuarantineData(startDate, endDate),
            access: await this.collectAccessLogs(startDate, endDate),
            system: await this.collectSystemMetrics(startDate, endDate)
        };
    }

    // Generazione PDF
    async generatePDFReport(data) {
        const doc = new PDFDocument();
        const outputPath = path.join(
            this.reportPath, 
            `security-report-${data.id}.pdf`
        );

        return new Promise((resolve, reject) => {
            const stream = fs.createWriteStream(outputPath);
            
            doc.pipe(stream);

            // Header
            doc.fontSize(25).text('Report Sicurezza', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Periodo: ${data.period.startDate} - ${data.period.endDate}`);
            doc.moveDown();

            // Sommario
            doc.fontSize(16).text('Sommario');
            doc.fontSize(12).text(`Totale minacce rilevate: ${data.summary.totalThreats}`);
            doc.text(`File in quarantena: ${data.summary.quarantinedFiles}`);
            doc.text(`Tentativi di accesso bloccati: ${data.summary.blockedAccess}`);
            doc.moveDown();

            // Dettagli minacce
            doc.fontSize(16).text('Dettaglio Minacce');
            data.threats.forEach(threat => {
                doc.fontSize(12).text(`Tipo: ${threat.type}`);
                doc.text(`Severità: ${threat.severity}`);
                doc.text(`Timestamp: ${threat.timestamp}`);
                doc.moveDown();
            });

            // Grafici
            this.addChartsToReport(doc, data);

            doc.end();

            stream.on('finish', resolve);
            stream.on('error', reject);
        });
    }

    // Aggiunta grafici al report
    async addChartsToReport(doc, data) {
        // Crea grafico minacce per tipo
        const threatsByType = await chart.generateChart({
            type: 'pie',
            data: {
                labels: Object.keys(data.summary.threatsByType),
                datasets: [{
                    data: Object.values(data.summary.threatsByType)
                }]
            }
        });

        // Aggiungi al PDF
        doc.image(threatsByType, {
            fit: [500, 300],
            align: 'center'
        });

        // Timeline attività sospette
        const timeline = await chart.generateChart({
            type: 'line',
            data: {
                labels: data.threats.map(t => t.timestamp),
                datasets: [{
                    label: 'Attività Sospette',
                    data: data.threats.map(t => t.severity === 'high' ? 1 : 0)
                }]
            }
        });

        doc.addPage();
        doc.image(timeline, {
            fit: [500, 300],
            align: 'center'
        });
    }

    // Generazione Excel
    async generateExcelReport(data) {
        const workbook = new ExcelJS.Workbook();
        
        // Foglio sommario
        const summarySheet = workbook.addWorksheet('Sommario');
        summarySheet.addRow(['Report Sicurezza']);
        summarySheet.addRow([`Periodo: ${data.period.startDate} - ${data.period.endDate}`]);
        summarySheet.addRow(['']);
        summarySheet.addRow(['Metriche', 'Valore']);
        summarySheet.addRow(['Totale minacce', data.summary.totalThreats]);
        summarySheet.addRow(['File in quarantena', data.summary.quarantinedFiles]);
        summarySheet.addRow(['Accessi bloccati', data.summary.blockedAccess]);

        // Foglio minacce
        const threatsSheet = workbook.addWorksheet('Minacce');
        threatsSheet.addRow(['Tipo', 'Severità', 'Timestamp', 'Dettagli']);
        data.threats.forEach(threat => {
            threatsSheet.addRow([
                threat.type,
                threat.severity,
                threat.timestamp,
                JSON.stringify(threat.details)
            ]);
        });

        // Foglio accessi
        const accessSheet = workbook.addWorksheet('Log Accessi');
        accessSheet.addRow(['Timestamp', 'IP', 'Utente', 'Azione', 'Risultato']);
        data.access.forEach(log => {
            accessSheet.addRow([
                log.timestamp,
                log.ip,
                log.user,
                log.action,
                log.result
            ]);
        });

        // Foglio metriche sistema
        const systemSheet = workbook.addWorksheet('Metriche Sistema');
        systemSheet.addRow(['Metrica', 'Valore', 'Timestamp']);
        Object.entries(data.system).forEach(([metric, value]) => {
            systemSheet.addRow([metric, value, new Date().toISOString()]);
        });

        // Formattazione
        ['Sommario', 'Minacce', 'Log Accessi', 'Metriche Sistema'].forEach(sheetName => {
            const sheet = workbook.getWorksheet(sheetName);
            sheet.getRow(1).font = { bold: true };
            sheet.columns.forEach(column => {
                column.width = 20;
            });
        });

        // Salva il workbook
        const outputPath = path.join(
            this.reportPath, 
            `security-report-${data.id}.xlsx`
        );
        await workbook.xlsx.writeFile(outputPath);
    }

    // Distribuzione report
    async distributeReport(data) {
        try {
            // Prepara gli allegati
            const attachments = [
                {
                    filename: `security-report-${data.id}.pdf`,
                    path: path.join(this.reportPath, `security-report-${data.id}.pdf`)
                },
                {
                    filename: `security-report-${data.id}.xlsx`,
                    path: path.join(this.reportPath, `security-report-${data.id}.xlsx`)
                }
            ];

            // Invia email con report
            await this.emailTransporter.sendMail({
                from: process.env.SECURITY_EMAIL_FROM,
                to: process.env.SECURITY_EMAIL_TO,
                subject: `Report Sicurezza - ${new Date().toISOString().split('T')[0]}`,
                html: this.generateReportEmailTemplate(data),
                attachments
            });

            // Archivia report
            await this.archiveReport(data.id);

            logger.info('Report distribuito con successo', { reportId: data.id });
        } catch (error) {
            logger.error('Errore durante la distribuzione del report', error);
            throw error;
        }
    }

    // Template email report
    generateReportEmailTemplate(data) {
        return `
            <h2>Report Sicurezza</h2>
            <p>Periodo: ${data.period.startDate} - ${data.period.endDate}</p>
            
            <h3>Sommario</h3>
            <ul>
                <li>Totale minacce rilevate: ${data.summary.totalThreats}</li>
                <li>File in quarantena: ${data.summary.quarantinedFiles}</li>
                <li>Tentativi di accesso bloccati: ${data.summary.blockedAccess}</li>
            </ul>

            <h3>Minacce ad Alta Priorità</h3>
            <ul>
                ${data.threats
                    .filter(t => t.severity === 'high')
                    .map(t => `<li>${t.type} - ${t.timestamp}</li>`)
                    .join('')}
            </ul>

            <p>Per maggiori dettagli, consultare gli allegati.</p>
        `;
    }

    // Archiviazione report
    async archiveReport(reportId) {
        const archivePath = path.join(this.reportPath, 'archive');
        await fs.mkdir(archivePath, { recursive: true });

        // Sposta i file nel archivio
        const files = [
            `security-report-${reportId}.pdf`,
            `security-report-${reportId}.xlsx`,
            `security-report-${reportId}.json`
        ];

        for (const file of files) {
            const source = path.join(this.reportPath, file);
            const dest = path.join(archivePath, file);
            await fs.rename(source, dest);
        }
    }
}

module.exports = new SecurityReportingService();