// services/file-validation.service.js
const fileType = require('file-type');
const pdf = require('pdf-parse');
const imageSize = require('image-size');
const crypto = require('crypto');
const fs = require('fs').promises;
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const logger = require('../config/logger');

class FileValidationService {
    constructor() {
        this.validationRules = {
            'application/pdf': {
                maxSize: 10 * 1024 * 1024, // 10MB
                maxPages: 50,
                requiresOCR: true,
                allowedLanguages: ['it', 'en']
            },
            'image/jpeg': {
                maxSize: 5 * 1024 * 1024, // 5MB
                maxDimensions: {
                    width: 4096,
                    height: 4096
                },
                minDimensions: {
                    width: 100,
                    height: 100
                }
            },
            'image/png': {
                maxSize: 5 * 1024 * 1024,
                maxDimensions: {
                    width: 4096,
                    height: 4096
                },
                minDimensions: {
                    width: 100,
                    height: 100
                }
            }
        };
    }

    // Validazione principale
    async validateFile(filePath, expectedType) {
        try {
            // Verifica esistenza file
            await fs.access(filePath);

            // Verifica tipo file
            const fileInfo = await fileType.fromFile(filePath);
            if (!fileInfo || fileInfo.mime !== expectedType) {
                throw new Error('Tipo file non valido');
            }

            // Verifica dimensione
            const stats = await fs.stat(filePath);
            if (stats.size > this.validationRules[expectedType].maxSize) {
                throw new Error('File troppo grande');
            }

            // Calcola hash
            const hash = await this.calculateFileHash(filePath);

            // Validazione specifica per tipo
            switch (expectedType) {
                case 'application/pdf':
                    await this.validatePDF(filePath);
                    break;
                case 'image/jpeg':
                case 'image/png':
                    await this.validateImage(filePath, expectedType);
                    break;
            }

            // Scansione malware
            await this.scanForMalware(filePath);

            return {
                isValid: true,
                hash,
                metadata: {
                    size: stats.size,
                    type: fileInfo.mime,
                    lastModified: stats.mtime
                }
            };

        } catch (error) {
            logger.error('Errore validazione file', error);
            return {
                isValid: false,
                error: error.message
            };
        }
    }

    // Validazione PDF
    async validatePDF(filePath) {
        const data = await fs.readFile(filePath);
        const result = await pdf(data);

        // Verifica numero pagine
        if (result.numpages > this.validationRules['application/pdf'].maxPages) {
            throw new Error('Troppo pagine nel PDF');
        }

        // Verifica contenuto testo
        if (this.validationRules['application/pdf'].requiresOCR && !result.text.trim()) {
            throw new Error('PDF richiede OCR');
        }

        // Verifica macro e JavaScript
        if (result.text.includes('/JS') || result.text.includes('/JavaScript')) {
            throw new Error('PDF contiene JavaScript non consentito');
        }

        // Analisi lingua
        const detectedLanguage = await this.detectLanguage(result.text);
        if (!this.validationRules['application/pdf'].allowedLanguages.includes(detectedLanguage)) {
            throw new Error('Lingua non supportata');
        }

        return true;
    }

    // Validazione immagini
    async validateImage(filePath, type) {
        const dimensions = imageSize(filePath);
        const rules = this.validationRules[type];

        // Verifica dimensioni
        if (dimensions.width > rules.maxDimensions.width ||
            dimensions.height > rules.maxDimensions.height) {
            throw new Error('Immagine troppo grande');
        }

        if (dimensions.width < rules.minDimensions.width ||
            dimensions.height < rules.minDimensions.height) {
            throw new Error('Immagine troppo piccola');
        }

        // Verifica metadati EXIF
        await this.sanitizeImageMetadata(filePath);

        return true;
    }

    // Scansione malware
    async scanForMalware(filePath) {
        try {
            // Usa ClamAV per la scansione
            const { stdout } = await exec(`clamscan ${filePath}`);
            
            if (stdout.includes('FOUND')) {
                throw new Error('Malware rilevato');
            }

            return true;
        } catch (error) {
            if (error.message.includes('FOUND')) {
                throw new Error('Malware rilevato');
            }
            logger.error('Errore durante la scansione malware', error);
            throw error;
        }
    }

    // Calcolo hash file
    async calculateFileHash(filePath) {
        const hash = crypto.createHash('sha256');
        const data = await fs.readFile(filePath);
        hash.update(data);
        return hash.digest('hex');
    }

    // Rilevamento lingua
    async detectLanguage(text) {
        const franc = require('franc');
        return franc(text);
    }

    // Sanitizzazione metadati immagine
    async sanitizeImageMetadata(filePath) {
        try {
            // Usa ExifTool per rimuovere i metadati
            await exec(`exiftool -all= ${filePath}`);
            return true;
        } catch (error) {
            logger.error('Errore durante la sanitizzazione metadati', error);
            throw error;
        }
    }

    // Validazione contenuto sensibile
    async checkForSensitiveContent(filePath) {
        const text = await this.extractText(filePath);
        const patterns = {
            creditCard: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/,
            ssn: /\b\d{3}-\d{2}-\d{4}\b/,
            email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
            fiscalCode: /[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/
        };

        const findings = {};
        for (const [type, pattern] of Object.entries(patterns)) {
            if (pattern.test(text)) {
                findings[type] = true;
            }
        }

        return Object.keys(findings).length > 0 ? findings : false;
    }
}

module.exports = new FileValidationService();