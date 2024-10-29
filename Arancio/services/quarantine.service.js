// services/quarantine.service.js
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const tar = require('tar');
const logger = require('../config/logger');
const { S3 } = require('@aws-sdk/client-s3');
const VirusTotal = require('virustotal-api');

class QuarantineService {
    constructor() {
        this.quarantinePath = path.join(__dirname, '../quarantine');
        this.s3 = new S3({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });
        this.virusTotal = new VirusTotal(process.env.VIRUSTOTAL_API_KEY);
        this.threatDatabase = new Map();
    }

    // Inizializzazione quarantena
    async initialize() {
        await fs.mkdir(this.quarantinePath, { recursive: true });
        await this.createQuarantineStructure();
        await this.loadThreatDatabase();
    }

    // Isolamento file sospetto
    async quarantineFile(filePath, reason) {
        try {
            const fileId = crypto.randomUUID();
            const quarantineEntry = {
                id: fileId,
                originalPath: filePath,
                timestamp: new Date().toISOString(),
                reason,
                status: 'quarantined',
                analyses: []
            };

            // Crea container isolato
            const containerPath = path.join(this.quarantinePath, fileId);
            await fs.mkdir(containerPath);

            // Cifra e sposta il file
            const encryptedPath = await this.encryptFile(filePath, containerPath);
            
            // Metadata del file
            const metadata = await this.extractFileMetadata(filePath);
            quarantineEntry.metadata = metadata;

            // Salva informazioni quarantena
            await this.saveQuarantineInfo(quarantineEntry);

            // Avvia analisi approfondita
            await this.analyzeQuarantinedFile(fileId);

            return quarantineEntry;
        } catch (error) {
            logger.error('Errore durante la quarantena del file', error);
            throw error;
        }
    }

    // Cifratura file in quarantena
    async encryptFile(sourcePath, containerPath) {
        const key = crypto.randomBytes(32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        
        const sourceStream = await fs.readFile(sourcePath);
        const encrypted = Buffer.concat([
            cipher.update(sourceStream),
            cipher.final()
        ]);
        const authTag = cipher.getAuthTag();

        // Salva file cifrato
        const encryptedPath = path.join(containerPath, 'encrypted');
        await fs.writeFile(encryptedPath, encrypted);

        // Salva chiavi di cifratura in modo sicuro
        await this.storeEncryptionKeys(containerPath, {
            key: key.toString('hex'),
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        });

        return encryptedPath;
    }

    // Analisi file in quarantena
    async analyzeQuarantinedFile(fileId) {
        const entry = await this.getQuarantineEntry(fileId);
        const analyses = [];

        // Analisi locale
        const localScan = await this.performLocalScan(entry.originalPath);
        analyses.push(localScan);

        // Analisi VirusTotal
        const vtScan = await this.scanWithVirusTotal(entry.originalPath);
        analyses.push(vtScan);

        // Analisi comportamentale
        const behaviorScan = await this.performBehavioralAnalysis(entry.originalPath);
        analyses.push(behaviorScan);

        // Aggiorna stato quarantena
        entry.analyses = analyses;
        entry.threatLevel = this.calculateThreatLevel(analyses);
        
        await this.updateQuarantineEntry(entry);

        // Notifica se necessario
        if (entry.threatLevel >= 'high') {
            await this.notifySecurityTeam(entry);
        }

        return analyses;
    }

    // Scansione con VirusTotal
    async scanWithVirusTotal(filePath) {
        try {
            const fileBuffer = await fs.readFile(filePath);
            const fileHash = crypto
                .createHash('sha256')
                .update(fileBuffer)
                .digest('hex');

            // Controlla risultati esistenti
            let results = await this.virusTotal.fileReport(fileHash);
            
            // Se non esistono, invia il file
            if (!results.found) {
                const scan = await this.virusTotal.scanFile(fileBuffer);
                // Attendi il completamento della scansione
                results = await this.pollScanResults(scan.scan_id);
            }

            return {
                type: 'virustotal',
                timestamp: new Date().toISOString(),
                results: results.scans,
                positives: results.positives,
                total: results.total
            };
        } catch (error) {
            logger.error('Errore durante la scansione VirusTotal', error);
            return {
                type: 'virustotal',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Analisi comportamentale
    async performBehavioralAnalysis(filePath) {
        try {
            const sandbox = require('./sandbox.service');
            const results = await sandbox.analyze(filePath, {
                timeout: 300000, // 5 minuti
                monitoring: {
                    filesystem: true,
                    network: true,
                    processes: true,
                    registry: true
                }
            });

            return {
                type: 'behavioral',
                timestamp: new Date().toISOString(),
                results: results,
                suspicious: results.suspiciousActivities,
                verdict: results.verdict
            };
        } catch (error) {
            logger.error('Errore durante l\'analisi comportamentale', error);
            return {
                type: 'behavioral',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Gestione rilascio file
    async releaseFile(fileId, approver) {
        try {
            const entry = await this.getQuarantineEntry(fileId);
            if (entry.threatLevel === 'high') {
                throw new Error('Non è possibile rilasciare file ad alto rischio');
            }

            // Decifra il file
            const decryptedPath = await this.decryptFile(fileId);
            
            // Registra il rilascio
            entry.status = 'released';
            entry.releaseInfo = {
                timestamp: new Date().toISOString(),
                approver,
                reason: 'manual_approval'
            };

            await this.updateQuarantineEntry(entry);
            
            // Notifica il rilascio
            await this.notifyFileRelease(entry);

            return decryptedPath;
        } catch (error) {
            logger.error('Errore durante il rilascio del file', error);
            throw error;
        }
    }

    // Eliminazione sicura
    async secureDelete(fileId) {
        try {
            const entry = await this.getQuarantineEntry(fileId);
            const containerPath = path.join(this.quarantinePath, fileId);

            // Sovrascrivi il file con dati casuali
            await this.multipassOverwrite(containerPath);
            
            // Elimina il container
            await fs.rm(containerPath, { recursive: true, force: true });

            // Aggiorna il database
            entry.status = 'deleted';
            entry.deletionInfo = {
                timestamp: new Date().toISOString(),
                method: 'secure_multipass'
            };

            await this.updateQuarantineEntry(entry);
            
            return true;
        } catch (error) {
            logger.error('Errore durante l\'eliminazione sicura', error);
            throw error;
        }
    }

    // Sovrascrittura multipass
    async multipassOverwrite(filePath) {
        const patterns = [
            Buffer.alloc(1024, 0x00), // Tutti zero
            Buffer.alloc(1024, 0xFF), // Tutti uno
            crypto.randomBytes(1024)  // Random
        ];

        const fileHandle = await fs.open(filePath, 'r+');
        const stats = await fs.stat(filePath);

        try {
            for (const pattern of patterns) {
                let position = 0;
                while (position < stats.size) {
                    await fileHandle.write(pattern, 0, pattern.length, position);
                    position += pattern.length;
                }
                await fileHandle.sync();
            }
        } finally {
            await fileHandle.close();
        }
    }
}

module.exports = new QuarantineService();