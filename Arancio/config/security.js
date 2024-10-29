// config/security.js
const crypto = require('crypto');
const argon2 = require('argon2');
const ms = require('ms');

module.exports = {
    hash: {
        // Configurazione Argon2 per l'hashing delle password
        argon2: {
            type: argon2.argon2id,
            memoryCost: 2 ** 16,
            timeCost: 3,
            parallelism: 1
        }
    },
    session: {
        // Configurazione sessione
        secret: process.env.SESSION_SECRET,
        name: '_secure_session_id',
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            sameSite: 'strict',
            maxAge: ms('1d'),
            path: '/',
            domain: process.env.COOKIE_DOMAIN
        },
        resave: false,
        saveUninitialized: false,
        rolling: true
    },
    cors: {
        // Configurazione CORS avanzata
        origin: process.env.ALLOWED_ORIGINS?.split(','),
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
        credentials: true,
        maxAge: 600,
        exposedHeaders: ['X-Rate-Limit-Remaining']
    },
    rateLimit: {
        // Configurazioni rate limit
        global: {
            windowMs: ms('15m'),
            max: 100
        },
        login: {
            windowMs: ms('1h'),
            max: 5
        },
        upload: {
            windowMs: ms('1h'),
            max: 10
        }
    },
    jwt: {
        // Configurazione JWT per 2FA
        secret: process.env.JWT_SECRET,
        expiresIn: '15m'
    },
    encryption: {
        // Configurazione cifratura per dati sensibili
        algorithm: 'aes-256-gcm',
        keyLength: 32,
        ivLength: 16,
        tagLength: 16,
        salt: crypto.randomBytes(16)
    },
    security: {
        // Configurazioni di sicurezza generali
        passwordMinLength: 12,
        passwordMaxLength: 128,
        requireNumbers: true,
        requireSpecialChars: true,
        requireUppercase: true,
        requireLowercase: true,
        maxFailedAttempts: 5,
        lockoutDuration: ms('1h'),
        twoFactorEnabled: true
    }
};