// services/cloud-storage.service.js
const { S3 } = require('@aws-sdk/client-s3');
const { Storage } = require('@google-cloud/storage');
const { BlobServiceClient } = require('@azure/storage-blob');
const path = require('path');
const crypto = require('crypto');
const logger = require('../config/logger');

class CloudStorageService {
    constructor() {
        this.providers = new Map();
        this.initializeProviders();
    }

    // Inizializzazione provider cloud
    initializeProviders() {
        // AWS S3
        if (process.env.AWS_ACCESS_KEY_ID) {
            this.providers.set('s3', new S3({
                region: process.env.AWS_REGION,
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
                }
            }));
        }

        // Google Cloud Storage
        if (process.env.GOOGLE_CLOUD_PROJECT) {
            this.providers.set('gcs', new Storage({
                projectId: process.env.GOOGLE_CLOUD_PROJECT,
                keyFilename: process.env.GOOGLE_CLOUD_KEYFILE
            }));
        }

        // Azure Blob Storage
        if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
            this.providers.set('azure', BlobServiceClient.fromConnectionString(
                process.env.AZURE_STORAGE_CONNECTION_STRING
            ));
        }
    }

    // Upload su S3
    async uploadToS3(file, path, config) {
        try {
            const s3 = this.providers.get('s3');
            if (!s3) throw new Error('Provider S3 non inizializzato');

            const uploadParams = {
                Bucket: config.bucket,
                Key: path,
                Body: file.content,
                ContentType: file.mimetype,
                Metadata: {
                    'original-filename': file.filename,
                    'upload-date': new Date().toISOString(),
                    ...file.metadata
                }
            };

            // Aggiungi crittografia se configurata
            if (config.encryption) {
                uploadParams.ServerSideEncryption = 'AES256';
            }

            // Imposta ACL se specificato
            if (config.acl) {
                uploadParams.ACL = config.acl;
            }

            const result = await s3.putObject(uploadParams);

            return {
                provider: 's3',
                bucket: config.bucket,
                path: path,
                eTag: result.ETag,
                url: `https://${config.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${path}`
            };
        } catch (error) {
            logger.error('Errore durante l\'upload su S3', error);
            throw error;
        }
    }

    // Upload su Google Cloud Storage
    async uploadToGCS(file, path, config) {
        try {
            const storage = this.providers.get('gcs');
            if (!storage) throw new Error('Provider GCS non inizializzato');

            const bucket = storage.bucket(config.bucket);
            const blob = bucket.file(path);

            const blobStream = blob.createWriteStream({
                metadata: {
                    contentType: file.mimetype,
                    metadata: {
                        originalFilename: file.filename,
                        uploadDate: new Date().toISOString(),
                        ...file.metadata
                    }
                },
                resumable: file.size > 5 * 1024 * 1024 // Resumable per file > 5MB
            });

            return new Promise((resolve, reject) => {
                blobStream.on('error', reject);
                blobStream.on('finish', async () => {
                    // Imposta ACL se necessario
                    if (config.publicAccess) {
                        await blob.makePublic();
                    }

                    resolve({
                        provider: 'gcs',
                        bucket: config.bucket,
                        path: path,
                        url: `https://storage.googleapis.com/${config.bucket}/${path}`
                    });
                });

                blobStream.end(file.content);
            });
        } catch (error) {
            logger.error('Errore durante l\'upload su GCS', error);
            throw error;
        }
    }

    // Upload su Azure Blob Storage
    async uploadToAzure(file, path, config) {
        try {
            const blobService = this.providers.get('azure');
            if (!blobService) throw new Error('Provider Azure non inizializzato');

            const containerClient = blobService.getContainerClient(config.container);
            const blockBlobClient = containerClient.getBlockBlobClient(path);

            const options = {
                metadata: {
                    originalFilename: file.filename,
                    uploadDate: new Date().toISOString(),
                    ...file.metadata
                },
                blobHTTPHeaders: {
                    blobContentType: file.mimetype
                }
            };

            await blockBlobClient.upload(file.content, file.size, options);

            return {
                provider: 'azure',
                container: config.container,
                path: path,
                url: blockBlobClient.url
            };
        } catch (error) {
            logger.error('Errore durante l\'upload su Azure', error);
            throw error;
        }
    }

    // Generazione path sicuro
    generateSecurePath(originalPath) {
        const ext = path.extname(originalPath);
        const hash = crypto
            .createHash('sha256')
            .update(originalPath + Date.now())
            .digest('hex')
            .substring(0, 8);
        
        return `${path.basename(originalPath, ext)}-${hash}${ext}`;
    }

    // Download da cloud
    async downloadFromCloud(provider, location) {
        switch (provider) {
            case 's3':
                return await this.downloadFromS3(location);
            case 'gcs':
                return await this.downloadFromGCS(location);
            case 'azure':
                return await this.downloadFromAzure(location);
            default:
                throw new Error(`Provider non supportato: ${provider}`);
        }
    }

    // Download da ogni provider...
    async downloadFromS3(location) {
        try {
            const s3 = this.providers.get('s3');
            const result = await s3.getObject({
                Bucket: location.bucket,
                Key: location.path
            });

            return {
                content: await result.Body.transformToBuffer(),
                metadata: result.Metadata,
                contentType: result.ContentType
            };
        } catch (error) {
            logger.error('Errore durante il download da S3', error);
            throw error;
        }
    }

    // Gestione cache
    async cacheFileLocally(file, provider, location) {
        // Implementa caching locale per migliorare performance
    }

    // Pulizia file vecchi
    async cleanupOldFiles(provider, config) {
        // Implementa pulizia automatica dei file vecchi
    }
}

module.exports = new CloudStorageService();