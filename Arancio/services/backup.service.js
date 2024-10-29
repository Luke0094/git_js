// services/backup.service.js
const { S3 } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');
const logger = require('../config/logger');

const gzip = promisify(zlib.gzip);

class BackupService {
    constructor() {
        this.s3 = new S3({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });
        
        this.backupConfig = {
            bucket: process.env.BACKUP_BUCKET,
            frequency: process.env.BACKUP_FREQUENCY || '1h',
            retention: process.env.BACKUP_RETENTION || '30d',
            encrypt: true
        };
    }

    // Inizia il backup automatico
    async startAutomaticBackup() {
        setInterval(async () => {
            try {
                await this.performBackup();
            } catch (error) {
                logger.error('Errore durante il backup automatico', error);
                await this.notifyBackupFailure(error);
            }
        }, this.parseTimeInterval(this.backupConfig.frequency));
    }

    // Esegue il backup
    async performBackup() {
        const timestamp = new Date().toISOString();
        const backupId = crypto.randomUUID();

        logger.info('Avvio backup', { backupId, timestamp });

        // Backup dei file
        const filesBackup = await this.backupFiles(backupId);
        
        // Backup del database
        const dbBackup = await this.backupDatabase(backupId);

        // Crittografia e compressione
        const encryptedBackup = await this.encryptAndCompress({
            files: filesBackup,
            database: dbBackup
        });

        // Upload su S3
        await this.uploadToS3(encryptedBackup, backupId);

        // Pulizia backup vecchi
        await this.cleanOldBackups();

        logger.info('Backup completato con successo', { backupId });
    }

    // Backup dei file
    async backupFiles(backupId) {
        const uploadDirs = ['documenti', 'codici-fiscali'];
        const backups = [];

        for (const dir of uploadDirs) {
            const dirPath = path.join(__dirname, '..', 'uploads', dir);
            const files = await fs.readdir(dirPath);

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stat = await fs.stat(filePath);

                if (stat.isFile()) {
                    const fileContent = await fs.readFile(filePath);
                    const hash = crypto
                        .createHash('sha256')
                        .update(fileContent)
                        .digest('hex');

                    backups.push({
                        path: path.relative(process.cwd(), filePath),
                        content: fileContent,
                        hash,
                        metadata: {
                            size: stat.size,
                            created: stat.birthtime,
                            modified: stat.mtime
                        }
                    });
                }
            }
        }

        return backups;
    }

    // Crittografia e compressione
    async encryptAndCompress(data) {
        // Comprimi i dati
        const compressed = await gzip(Buffer.from(JSON.stringify(data)));

        // Genera chiave e IV
        const key = crypto.randomBytes(32);
        const iv = crypto.randomBytes(16);

        // Cifra i dati compressi
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        let encrypted = cipher.update(compressed);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const authTag = cipher.getAuthTag();

        // Salva le chiavi di cifratura (in un posto sicuro)
        await this.storeEncryptionKeys(key, iv, authTag);

        return {
            data: encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    // Upload su S3
    async uploadToS3(data, backupId) {
        const key = `backups/${backupId}/${new Date().toISOString()}.enc`;

        const upload = new Upload({
            client: this.s3,
            params: {
                Bucket: this.backupConfig.bucket,
                Key: key,
                Body: data.data,
                Metadata: {
                    'x-amz-iv': data.iv,
                    'x-amz-auth-tag': data.authTag,
                    'x-amz-backup-id': backupId
                },
                ServerSideEncryption: 'AES256'
            }
        });

        try {
            await upload.done();
            logger.info('Backup caricato su S3', { backupId, key });
        } catch (error) {
            logger.error('Errore durante l\'upload su S3', error);
            throw error;
        }
    }

    // Pulizia backup vecchi
    async cleanOldBackups() {
        const retentionMs = this.parseTimeInterval(this.backupConfig.retention);
        const cutoffDate = new Date(Date.now() - retentionMs);

        try {
            const objects = await this.s3.listObjectsV2({
                Bucket: this.backupConfig.bucket,
                Prefix: 'backups/'
            });

            const oldObjects = objects.Contents.filter(obj => 
                new Date(obj.LastModified) < cutoffDate
            );

            if (oldObjects.length > 0) {
                await this.s3.deleteObjects({
                    Bucket: this.backupConfig.bucket,
                    Delete: {
                        Objects: oldObjects.map(obj => ({ Key: obj.Key }))
                    }
                });

                logger.info('Backup vecchi eliminati', { 
                    count: oldObjects.length 
                });
            }
        } catch (error) {
            logger.error('Errore durante la pulizia dei backup', error);
            throw error;
        }
    }

    // Utility per parsing intervalli di tempo
    parseTimeInterval(interval) {
        const unit = interval.slice(-1);
        const value = parseInt(interval.slice(0, -1));

        switch (unit) {
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            case 'w': return value * 7 * 24 * 60 * 60 * 1000;
            default: throw new Error('Intervallo di tempo non valido');
        }
    }

    // Ripristino backup
    async restoreBackup(backupId) {
        logger.info('Inizio ripristino backup', { backupId });

        try {
            // Recupera il backup da S3
            const backup = await this.getBackupFromS3(backupId);
            
            // Decrittografa e decomprimi
            const decryptedData = await this.decryptAndDecompress(backup);
            
            // Ripristina i file
            await this.restoreFiles(decryptedData.files);
            
            // Ripristina il database
            await this.restoreDatabase(decryptedData.database);

            logger.info('Ripristino backup completato', { backupId });
        } catch (error) {
            logger.error('Errore durante il ripristino del backup', error);
            throw error;
        }
    }

    // Verifica integrità backup
    async verifyBackupIntegrity(backupId) {
        try {
            const backup = await this.getBackupFromS3(backupId);
            const decryptedData = await this.decryptAndDecompress(backup);

            // Verifica hash dei file
            for (const file of decryptedData.files) {
                const calculatedHash = crypto
                    .createHash('sha256')
                    .update(file.content)
                    .digest('hex');

                if (calculatedHash !== file.hash) {
                    throw new Error(`Integrità del file compromessa: ${file.path}`);
                }
            }

            return true;
        } catch (error) {
            logger.error('Errore durante la verifica del backup', error);
            return false;
        }
    }

    // Notifica errori backup
    async notifyBackupFailure(error) {
        // Invia email
        await this.emailTransporter.sendMail({
            from: process.env.ALERT_EMAIL_FROM,
            to: process.env.ALERT_EMAIL_TO,
            subject: '🚨 Errore Backup',
            html: `
                <h2>Errore durante il backup</h2>
                <p>Si è verificato un errore durante il processo di backup:</p>
                <pre>${error.message}</pre>
                <p>Stack trace:</p>
                <pre>${error.stack}</pre>
            `
        });

        // Invia notifica Slack
        await this.slack.send({
            text: '🚨 Errore Backup',
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Errore durante il backup*\n\`\`\`${error.message}\`\`\``
                    }
                }
            ]
        });
    }
}

module.exports = new BackupService();