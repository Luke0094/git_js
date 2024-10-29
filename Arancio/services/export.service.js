// services/export.service.js
const archiver = require('archiver');
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-writer').createObjectCsvWriter;
const logger = require('../config/logger');

class ExportService {
    constructor() {
        this.exportPath = path.join(__dirname, '../exports');
        this.formats = ['csv', 'json', 'excel', 'pdf'];
        this.compressionTypes = ['zip', 'gz'];
    }

    // Export dati con formato specificato
    async exportData(data, options) {
        try {
            const {
                format = 'json',
                compression,
                fileName,
                filters = {}
            } = options;

            // Validazione formato
            if (!this.formats.includes(format)) {
                throw new Error(`Formato non supportato: ${format}`);
            }

            // Applica filtri
            const filteredData = this.applyFilters(data, filters);

            // Genera file di export
            const exportedFile = await this.generateExport(
                filteredData,
                format,
                fileName
            );

            // Comprimi se richiesto
            if (compression) {
                return await this.compressFile(exportedFile, compression);
            }

            return exportedFile;
        } catch (error) {
            logger.error('Errore durante l\'export dei dati', error);
            throw error;
        }
    }

    // Generazione export
    async generateExport(data, format, fileName) {
        const exportFileName = fileName || `export_${Date.now()}`;
        const exportFilePath = path.join(
            this.exportPath,
            `${exportFileName}.${format}`
        );

        switch (format) {
            case 'csv':
                await this.exportToCSV(data, exportFilePath);
                break;
            case 'json':
                await this.exportToJSON(data, exportFilePath);
                break;
            case 'excel':
                await this.exportToExcel(data, exportFilePath);
                break;
            case 'pdf':
                await this.exportToPDF(data, exportFilePath);
                break;
        }

        return exportFilePath;
    }

    // Compressione file
    async compressFile(filePath, type) {
        if (!this.compressionTypes.includes(type)) {
            throw new Error(`Tipo di compressione non supportato: ${type}`);
        }

        const compressedPath = `${filePath}.${type}`;
        const output = fs.createWriteStream(compressedPath);
        const archive = archiver(type, {
            zlib: { level: 9 }
        });

        return new Promise((resolve, reject) => {
            output.on('close', () => resolve(compressedPath));
            archive.on('error', reject);

            archive.pipe(output);
            archive.file(filePath, { name: path.basename(filePath) });
            archive.finalize();
        });
    }

    // Export specifici per formato...
    async exportToCSV(data, filePath) {
        const headers = this.extractHeaders(data);
        const csvWriter = csv({
            path: filePath,
            header: headers.map(h => ({ id: h, title: h }))
        });

        await csvWriter.writeRecords(this.flattenData(data));
    }

    // Utility
    extractHeaders(data) {
        if (Array.isArray(data)) {
            const allKeys = new Set();
            data.forEach(item => {
                Object.keys(this.flattenObject(item)).forEach(key => 
                    allKeys.add(key)
                );
            });
            return Array.from(allKeys);
        }
        return Object.keys(this.flattenObject(data));
    }

    flattenObject(obj, prefix = '') {
        return Object.keys(obj).reduce((acc, k) => {
            const pre = prefix.length ? prefix + '.' : '';
            if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
                Object.assign(acc, this.flattenObject(obj[k], pre + k));
            } else {
                acc[pre + k] = obj[k];
            }
            return acc;
        }, {});
    }

    flattenData(data) {
        if (Array.isArray(data)) {
            return data.map(item => this.flattenObject(item));
        }
        return [this.flattenObject(data)];
    }

    // Applicazione filtri
    applyFilters(data, filters) {
        let filteredData = JSON.parse(JSON.stringify(data));

        Object.entries(filters).forEach(([field, filter]) => {
            if (typeof filter === 'function') {
                filteredData = filteredData.filter(filter);
            } else if (filter instanceof Object) {
                filteredData = filteredData.filter(item => {
                    const value = field.split('.').reduce((obj, key) => 
                        obj && obj[key], item
                    );

                    if ('eq' in filter) return value === filter.eq;
                    if ('ne' in filter) return value !== filter.ne;
                    if ('gt' in filter) return value > filter.gt;
                    if ('lt' in filter) return value < filter.lt;
                    if ('gte' in filter) return value >= filter.gte;
                    if ('lte' in filter) return value <= filter.lte;
                    if ('in' in filter) return filter.in.includes(value);
                    if ('nin' in filter) return !filter.nin.includes(value);
                    if ('regex' in filter) return new RegExp(filter.regex).test(value);
                    if ('exists' in filter) return (value !== undefined) === filter.exists;
                    
                    return true;
                });
            }
        });

        return filteredData;
    }

    // Export in formato Excel avanzato
    async exportToExcel(data, filePath) {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Data');

        // Aggiungi stili
        const headerStyle = {
            font: { bold: true, color: { argb: 'FFFFFFFF' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } },
            border: {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            }
        };

        // Configurazione colonne
        const headers = this.extractHeaders(data);
        const columns = headers.map(header => ({
            header,
            key: header,
            width: this.calculateColumnWidth(data, header)
        }));

        sheet.columns = columns;
        
        // Applica stili alle intestazioni
        sheet.getRow(1).eachCell((cell) => {
            Object.assign(cell, headerStyle);
        });

        // Aggiungi dati
        const rows = this.flattenData(data);
        rows.forEach(row => {
            sheet.addRow(row);
        });

        // Formattazione condizionale
        this.addConditionalFormatting(sheet, data);

        // Aggiungi grafici riassuntivi
        await this.addSummaryCharts(workbook, data);

        // Salva il file
        await workbook.xlsx.writeFile(filePath);
    }

    // Calcolo larghezza colonne
    calculateColumnWidth(data, header) {
        const maxLength = data.reduce((max, item) => {
            const value = String(item[header] || '');
            return Math.max(max, value.length);
        }, header.length);

        return Math.min(Math.max(maxLength + 2, 10), 50);
    }

    // Aggiunta formattazione condizionale
    addConditionalFormatting(sheet, data) {
        const numericColumns = this.getNumericColumns(data);

        numericColumns.forEach(column => {
            const values = data.map(row => row[column]).filter(v => !isNaN(v));
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            const stdDev = Math.sqrt(
                values.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / values.length
            );

            sheet.addConditionalFormatting({
                ref: `${column}2:${column}${data.length + 1}`,
                rules: [
                    {
                        type: 'colorScale',
                        cfvo: [
                            { type: 'min' },
                            { type: 'percentile', value: 50 },
                            { type: 'max' }
                        ],
                        color: [
                            { argb: 'FFF8696B' },
                            { argb: 'FFFFEB84' },
                            { argb: 'FF63BE7B' }
                        ]
                    }
                ]
            });
        });
    }

    // Aggiunta grafici riassuntivi
    async addSummaryCharts(workbook, data) {
        const summarySheet = workbook.addWorksheet('Summary');
        
        // Grafici per colonne numeriche
        const numericColumns = this.getNumericColumns(data);
        let currentRow = 1;

        for (const column of numericColumns) {
            // Statistiche descrittive
            const stats = this.calculateStats(data, column);
            
            summarySheet.addRow([`Statistics for ${column}`]);
            Object.entries(stats).forEach(([stat, value]) => {
                summarySheet.addRow([stat, value]);
            });

            // Aggiunta grafico
            const chartData = this.prepareChartData(data, column);
            const chart = workbook.addChart(this.determineChartType(chartData));
            
            chart.addSeries({
                name: column,
                categories: chartData.categories,
                values: chartData.values
            });

            chart.setTitle({ name: `${column} Distribution` });
            chart.setPosition(`E${currentRow}`, `L${currentRow + 15}`);
            summarySheet.addImage(chart);

            currentRow += 20;
        }
    }

    // Preparazione dati per grafici
    prepareChartData(data, column) {
        const values = data.map(row => row[column]).filter(v => !isNaN(v));
        
        // Per dati continui, crea un istogramma
        if (this.isContinuous(values)) {
            const bins = this.createHistogramBins(values);
            return {
                type: 'histogram',
                categories: bins.map(bin => `${bin.start}-${bin.end}`),
                values: bins.map(bin => bin.count)
            };
        }

        // Per dati discreti, usa conteggi diretti
        const counts = values.reduce((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
        }, {});

        return {
            type: 'bar',
            categories: Object.keys(counts),
            values: Object.values(counts)
        };
    }

    // Calcolo statistiche descrittive
    calculateStats(data, column) {
        const values = data.map(row => row[column]).filter(v => !isNaN(v));
        const sorted = [...values].sort((a, b) => a - b);

        return {
            count: values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            mean: values.reduce((a, b) => a + b, 0) / values.length,
            median: sorted[Math.floor(sorted.length / 2)],
            stdDev: Math.sqrt(
                values.reduce((sq, n) => 
                    sq + Math.pow(n - (values.reduce((a, b) => a + b, 0) / values.length), 2), 
                0) / values.length
            )
        };
    }

    // Determinazione tipo di grafico ottimale
    determineChartType(chartData) {
        if (chartData.type === 'histogram') {
            return {
                type: 'column',
                options: {
                    bar: { grouping: false },
                    chartArea: { border: { color: '#666666' } }
                }
            };
        }

        // Analisi distribuzione dei dati
        const uniqueValues = new Set(chartData.values).size;
        const totalValues = chartData.values.length;

        if (uniqueValues / totalValues < 0.1) {
            return { type: 'pie' };
        } else if (this.hasTimePattern(chartData.categories)) {
            return { type: 'line' };
        }

        return { type: 'column' };
    }

    // Utility per l'analisi dei dati
    isContinuous(values) {
        const uniqueValues = new Set(values);
        return uniqueValues.size > values.length * 0.5;
    }

    createHistogramBins(values) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const binCount = Math.ceil(Math.sqrt(values.length));
        const binSize = (max - min) / binCount;

        const bins = Array(binCount).fill(0).map((_, i) => ({
            start: min + i * binSize,
            end: min + (i + 1) * binSize,
            count: 0
        }));

        values.forEach(value => {
            const binIndex = Math.min(
                Math.floor((value - min) / binSize),
                binCount - 1
            );
            bins[binIndex].count++;
        });

        return bins;
    }

    hasTimePattern(categories) {
        return categories.every(cat => !isNaN(Date.parse(cat)));
    }

    getNumericColumns(data) {
        const sample = data[0];
        return Object.keys(sample).filter(key => 
            typeof sample[key] === 'number' ||
            !isNaN(parseFloat(sample[key]))
        );
    }
}

module.exports = new ExportService();