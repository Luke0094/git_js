// services/realtime-visualization.service.js
const WebSocket = require('ws');
const Redis = require('ioredis');
const logger = require('../config/logger');

class RealtimeVisualizationService {
    constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST,
            password: process.env.REDIS_PASSWORD
        });

        this.wss = new WebSocket.Server({ 
            port: process.env.WS_PORT || 8080 
        });

        this.metrics = new Map();
        this.clients = new Set();
        
        this.initializeWebSocket();
        this.startMetricsCollection();
    }

    // Inizializzazione WebSocket
    initializeWebSocket() {
        this.wss.on('connection', (ws) => {
            this.handleNewConnection(ws);
        });

        // Heartbeat
        setInterval(() => {
            this.wss.clients.forEach((ws) => {
                if (ws.isAlive === false) return ws.terminate();
                ws.isAlive = false;
                ws.ping();
            });
        }, 30000);
    }

    // Gestione nuove connessioni
    handleNewConnection(ws) {
        ws.isAlive = true;
        this.clients.add(ws);

        // Heartbeat response
        ws.on('pong', () => {
            ws.isAlive = true;
        });

        // Gestione messaggi client
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                this.handleClientMessage(ws, data);
            } catch (error) {
                logger.error('Errore nella gestione del messaggio WebSocket', error);
            }
        });

        // Cleanup alla disconnessione
        ws.on('close', () => {
            this.clients.delete(ws);
        });

        // Invia dati iniziali
        this.sendInitialData(ws);
    }

    // Invio dati in tempo reale
    broadcast(data) {
        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    }

    // Raccolta metriche
    startMetricsCollection() {
        setInterval(async () => {
            try {
                const metrics = await this.collectMetrics();
                this.broadcast({
                    type: 'metrics',
                    data: metrics
                });
            } catch (error) {
                logger.error('Errore nella raccolta metriche', error);
            }
        }, 1000);
    }

    // Raccolta metriche di sistema
    async collectMetrics() {
        return {
            timestamp: new Date().toISOString(),
            system: await this.getSystemMetrics(),
            security: await this.getSecurityMetrics(),
            performance: await this.getPerformanceMetrics()
        };
    }

    // Invio dati iniziali
    async sendInitialData(ws) {
        try {
            const initialData = {
                metrics: await this.collectMetrics(),
                configuration: await this.getConfiguration(),
                alerts: await this.getRecentAlerts()
            };

            ws.send(JSON.stringify({
                type: 'initial',
                data: initialData
            }));
        } catch (error) {
            logger.error('Errore nell\'invio dei dati iniziali', error);
        }
    }

    // Gestione messaggi client
    async handleFilter(ws, filters) {
        try {
            const clientId = ws.clientId;
            await this.redis.hset(
                `client:filters:${clientId}`,
                'filters',
                JSON.stringify(filters)
            );

            // Applica i filtri ai dati correnti
            const filteredData = await this.applyFilters(
                await this.collectMetrics(),
                filters
            );

            // Invia i dati filtrati
            ws.send(JSON.stringify({
                type: 'filtered_data',
                data: filteredData
            }));
        } catch (error) {
            logger.error('Errore nella gestione dei filtri', error);
            ws.send(JSON.stringify({
                type: 'error',
                error: 'Errore nell\'applicazione dei filtri'
            }));
        }
    }

    // Applicazione filtri
    async applyFilters(data, filters) {
        const filteredData = { ...data };

        for (const [key, filter] of Object.entries(filters)) {
            if (filter.type === 'threshold') {
                filteredData[key] = this.applyThresholdFilter(
                    filteredData[key],
                    filter.value
                );
            } else if (filter.type === 'pattern') {
                filteredData[key] = this.applyPatternFilter(
                    filteredData[key],
                    filter.pattern
                );
            }
        }

        return filteredData;
    }

    // Generazione visualizzazioni
    async generateVisualization(data, type) {
        switch (type) {
            case 'timeseriesChart':
                return this.generateTimeseriesChart(data);
            case 'heatmap':
                return this.generateHeatmap(data);
            case 'networkGraph':
                return this.generateNetworkGraph(data);
            default:
                throw new Error(`Tipo di visualizzazione non supportato: ${type}`);
        }
    }

    // Generazione grafico timeseries
    generateTimeseriesChart(data) {
        return {
            type: 'timeseries',
            data: {
                labels: data.timestamps,
                datasets: data.metrics.map(metric => ({
                    label: metric.name,
                    data: metric.values,
                    borderColor: this.getColorForMetric(metric.name),
                    fill: false
                }))
            },
            options: {
                responsive: true,
                animation: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'minute'
                        }
                    }
                }
            }
        };
    }

    // Generazione heatmap
    generateHeatmap(data) {
        const heatmapData = data.values.map((row, i) => 
            row.map((value, j) => ({
                x: data.xLabels[j],
                y: data.yLabels[i],
                value
            }))
        ).flat();

        return {
            type: 'heatmap',
            data: heatmapData,
            options: {
                colorScale: {
                    min: Math.min(...heatmapData.map(d => d.value)),
                    max: Math.max(...heatmapData.map(d => d.value))
                }
            }
        };
    }

    // Generazione grafico rete
    generateNetworkGraph(data) {
        return {
            type: 'network',
            data: {
                nodes: data.nodes.map(node => ({
                    id: node.id,
                    label: node.label,
                    size: this.calculateNodeSize(node),
                    color: this.getNodeColor(node)
                })),
                edges: data.edges.map(edge => ({
                    from: edge.source,
                    to: edge.target,
                    value: edge.weight
                }))
            },
            options: {
                physics: {
                    stabilization: false,
                    barnesHut: {
                        gravitationalConstant: -80000,
                        springLength: 250,
                        springConstant: 0.001
                    }
                }
            }
        };
    }

    // Aggiornamento in tempo reale delle visualizzazioni
    async updateVisualizations() {
        const metrics = await this.collectMetrics();
        
        this.clients.forEach(async client => {
            try {
                const filters = await this.getClientFilters(client.clientId);
                const filteredData = await this.applyFilters(metrics, filters);
                
                // Genera visualizzazioni per ogni tipo richiesto
                const visualizations = {};
                for (const type of client.subscribedTypes) {
                    visualizations[type] = await this.generateVisualization(
                        filteredData,
                        type
                    );
                }

                client.send(JSON.stringify({
                    type: 'visualization_update',
                    data: visualizations
                }));
            } catch (error) {
                logger.error(
                    'Errore nell\'aggiornamento delle visualizzazioni',
                    error
                );
            }
        });
    }

    // Gestione animazioni e transizioni
    animateTransition(oldData, newData, duration = 1000) {
        const steps = 60;
        const interval = duration / steps;
        let currentStep = 0;

        const animation = setInterval(() => {
            if (currentStep >= steps) {
                clearInterval(animation);
                return;
            }

            const progress = currentStep / steps;
            const interpolatedData = this.interpolateData(
                oldData,
                newData,
                progress
            );

            this.broadcast({
                type: 'animation_frame',
                data: interpolatedData
            });

            currentStep++;
        }, interval);
    }

    // Interpolazione dati per animazioni fluide
    interpolateData(start, end, progress) {
        if (Array.isArray(start)) {
            return start.map((value, index) => 
                this.interpolateValue(value, end[index], progress)
            );
        } else if (typeof start === 'object') {
            const result = {};
            for (const key in start) {
                result[key] = this.interpolateData(
                    start[key],
                    end[key],
                    progress
                );
            }
            return result;
        } else if (typeof start === 'number') {
            return this.interpolateValue(start, end, progress);
        }
        return end;
    }

    // Calcolo valore interpolato
    interpolateValue(start, end, progress) {
        return start + (end - start) * progress;
    }

    // Ottimizzazione performance
    optimizeDataTransfer(data) {
        // Compressione dati
        const compressed = this.compressData(data);
        
        // Rimuovi dati duplicati
        const deduplicated = this.deduplicateData(compressed);
        
        // Aggrega dati se necessario
        const aggregated = this.aggregateDataIfNeeded(deduplicated);
        
        return aggregated;
    }

    // Compressione dati
    compressData(data) {
        // Implementa la logica di compressione
        return data;
    }

    // Deduplicazione dati
    deduplicateData(data) {
        const seen = new Set();
        return data.filter(item => {
            const key = JSON.stringify(item);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    // Aggregazione dati
    aggregateDataIfNeeded(data) {
        const threshold = 1000; // Soglia per l'aggregazione
        if (data.length <= threshold) return data;

        // Implementa logica di aggregazione
        return data;
    }

    // Utilità colori
    getColorForMetric(metricName) {
        const colors = {
            cpu: '#FF6B6B',
            memory: '#4ECDC4',
            network: '#45B7D1',
            disk: '#96CEB4'
        };
        return colors[metricName] || '#666666';
    }

    // Calcolo dimensione nodi
    calculateNodeSize(node) {
        const baseSize = 10;
        const factor = Math.log(node.weight + 1);
        return baseSize * factor;
    }

    // Colore nodi
    getNodeColor(node) {
        const statusColors = {
            active: '#4CAF50',
            warning: '#FFC107',
            error: '#F44336',
            inactive: '#9E9E9E'
        };
        return statusColors[node.status] || '#9E9E9E';
    }
}

module.exports = new RealtimeVisualizationService();