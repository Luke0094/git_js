// services/ml-anomaly-detection.service.js
const tf = require('@tensorflow/tfjs-node');
const natural = require('natural');
const { StandardScaler } = require('sklearn-like-js');
const logger = require('../config/logger');

class MLAnomalyDetection {
    constructor() {
        this.model = null;
        this.scaler = new StandardScaler();
        this.tokenizer = new natural.WordTokenizer();
        this.features = [
            'accessPatterns',
            'fileOperations',
            'networkActivity',
            'systemResources'
        ];
        
        this.thresholds = {
            anomalyScore: 0.8,
            confidenceLevel: 0.75
        };
    }

    // Inizializzazione e training del modello
    async initialize() {
        try {
            // Carica dati storici
            const historicalData = await this.loadHistoricalData();
            
            // Preprocessing dei dati
            const processedData = this.preprocessData(historicalData);
            
            // Crea e addestra il modello
            await this.trainModel(processedData);
            
            logger.info('Modello ML inizializzato con successo');
        } catch (error) {
            logger.error('Errore durante l\'inizializzazione del modello ML', error);
            throw error;
        }
    }

    // Creazione del modello autoencoder
    createModel(inputDim) {
        const model = tf.sequential();
        
        // Encoder
        model.add(tf.layers.dense({
            units: 64,
            activation: 'relu',
            inputShape: [inputDim]
        }));
        model.add(tf.layers.dropout({ rate: 0.2 }));
        model.add(tf.layers.dense({
            units: 32,
            activation: 'relu'
        }));
        
        // Bottleneck layer
        model.add(tf.layers.dense({
            units: 16,
            activation: 'relu'
        }));
        
        // Decoder
        model.add(tf.layers.dense({
            units: 32,
            activation: 'relu'
        }));
        model.add(tf.layers.dropout({ rate: 0.2 }));
        model.add(tf.layers.dense({
            units: 64,
            activation: 'relu'
        }));
        model.add(tf.layers.dense({
            units: inputDim,
            activation: 'sigmoid'
        }));

        model.compile({
            optimizer: 'adam',
            loss: 'meanSquaredError'
        });

        return model;
    }

    // Training del modello
    async trainModel(data) {
        const { features, labels } = data;
        
        this.model = this.createModel(features[0].length);
        
        await this.model.fit(
            tf.tensor2d(features),
            tf.tensor2d(features), // Autoencoder usa gli stessi dati per input e output
            {
                epochs: 50,
                batchSize: 32,
                validationSplit: 0.2,
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        logger.info(`Epoch ${epoch}: loss = ${logs.loss}`);
                    }
                }
            }
        );
    }

    // Rilevamento anomalie in tempo reale
    async detectAnomalies(activityData) {
        try {
            const processedData = this.preprocessActivityData(activityData);
            const tensor = tf.tensor2d([processedData]);
            
            // Predizione
            const prediction = this.model.predict(tensor);
            const reconstructionError = tf.metrics.meanSquaredError(
                tensor,
                prediction
            ).dataSync()[0];

            // Calcola score anomalia
            const anomalyScore = this.calculateAnomalyScore(reconstructionError);
            
            // Analisi dettagliata
            const analysis = this.analyzeAnomaly(
                activityData,
                anomalyScore,
                reconstructionError
            );

            return {
                isAnomaly: anomalyScore > this.thresholds.anomalyScore,
                score: anomalyScore,
                confidence: analysis.confidence,
                details: analysis.details,
                recommendations: analysis.recommendations
            };
        } catch (error) {
            logger.error('Errore durante il rilevamento anomalie', error);
            throw error;
        }
    }

    // Preprocessing dei dati di attività
    preprocessActivityData(activity) {
        const features = [];

        // Access patterns
        features.push(
            activity.frequency || 0,
            activity.timeDelta || 0,
            activity.geoDistance || 0
        );

        // File operations
        features.push(
            activity.fileSize || 0,
            activity.fileCount || 0,
            activity.operationType === 'write' ? 1 : 0
        );

        // Network activity
        features.push(
            activity.bytesTransferred || 0,
            activity.connectionCount || 0,
            activity.protocolType === 'https' ? 1 : 0
        );

        // System resources
        features.push(
            activity.cpuUsage || 0,
            activity.memoryUsage || 0,
            activity.diskIO || 0
        );

        // Normalizza i dati
        return this.scaler.transform([features])[0];
    }

    // Analisi dettagliata delle anomalie
    analyzeAnomaly(activity, anomalyScore, reconstructionError) {
        const analysis = {
            confidence: this.calculateConfidence(anomalyScore, reconstructionError),
            details: {},
            recommendations: []
        };

        // Analisi per categoria
        const categories = {
            access: this.analyzeAccessPatterns(activity),
            files: this.analyzeFileOperations(activity),
            network: this.analyzeNetworkActivity(activity),
            system: this.analyzeSystemResources(activity)
        };

        // Aggregazione risultati
        Object.entries(categories).forEach(([category, result]) => {
            if (result.isAnomaly) {
                analysis.details[category] = result.details;
                analysis.recommendations.push(...result.recommendations);
            }
        });

        return analysis;
    }

    // Analisi pattern di accesso
    analyzeAccessPatterns(activity) {
        const patterns = {
            isAnomaly: false,
            details: {},
            recommendations: []
        };

        // Verifica accessi inusuali
        if (activity.frequency > this.thresholds.accessFrequency) {
            patterns.isAnomaly = true;
            patterns.details.highFrequency = true;
            patterns.recommendations.push(
                'Implementare rate limiting più restrittivo'
            );
        }

        // Verifica accessi geografici sospetti
        if (activity.geoDistance > this.thresholds.maxGeoDistance) {
            patterns.isAnomaly = true;
            patterns.details.suspiciousLocation = true;
            patterns.recommendations.push(
                'Verificare l\'autenticità degli accessi da località inusuali'
            );
        }

        return patterns;
    }

    // Calcolo confidence level
    calculateConfidence(anomalyScore, reconstructionError) {
        const baseConfidence = anomalyScore * 0.7 + 
            (1 - Math.min(1, reconstructionError)) * 0.3;
        
        return Math.min(1, Math.max(0, baseConfidence));
    }

    // Transfer learning per adattamento
    async adaptToNewPatterns(newData) {
        try {
            // Prepara i nuovi dati
            const processedNewData = this.preprocessData(newData);
            
            // Fine-tuning del modello
            await this.model.fit(
                tf.tensor2d(processedNewData.features),
                tf.tensor2d(processedNewData.features),
                {
                    epochs: 10,
                    batchSize: 16,
                    validationSplit: 0.1
                }
            );

            logger.info('Modello adattato ai nuovi pattern');
        } catch (error) {
            logger.error('Errore durante l\'adattamento del modello', error);
            throw error;
        }
    }
}

module.exports = new MLAnomalyDetection();