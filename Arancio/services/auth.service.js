// services/auth.service.js
const argon2 = require('argon2');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const config = require('../config/security');
const logger = require('../config/logger');
const redis = require('../config/redis');

class AuthService {
    constructor() {
        this.failedAttempts = new Map();
    }

    async hashPassword(password) {
        return argon2.hash(password, config.hash.argon2);
    }

    async verifyPassword(hashedPassword, password) {
        return argon2.verify(hashedPassword, password);
    }

    async generateTwoFactorSecret() {
        return authenticator.generateSecret();
    }

    verifyTwoFactorToken(secret, token) {
        return authenticator.verify({ token, secret });
    }

    async handleLoginAttempt(username, success) {
        const key = `login:${username}`;
        
        if (success) {
            await redis.del(key);
            return true;
        }

        const attempts = (await redis.incr(key)) || 1;
        await redis.expire(key, config.security.lockoutDuration / 1000);

        if (attempts >= config.security.maxFailedAttempts) {
            logger.warn('Account locked due to too many failed attempts', { username });
            await redis.setex(
                `lockout:${username}`, 
                config.security.lockoutDuration / 1000,
                'locked'
            );
            return false;
        }

        return true;
    }

    async isAccountLocked(username) {
        const locked = await redis.get(`lockout:${username}`);
        return !!locked;
    }

    generateSessionToken(user) {
        return jwt.sign(
            { 
                id: user.id,
                type: '2fa'
            },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );
    }

    // Cifratura dati sensibili
    encryptSensitiveData(data) {
        const iv = crypto.randomBytes(config.encryption.ivLength);
        const key = crypto.scryptSync(
            config.jwt.secret,
            config.encryption.salt,
            config.encryption.keyLength
        );
        
        const cipher = crypto.createCipheriv(
            config.encryption.algorithm,
            key,
            iv
        );
        
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const tag = cipher.getAuthTag();

        return {
            encrypted,
            iv: iv.toString('hex'),
            tag: tag.toString('hex')
        };
    }

    // Decifratura dati sensibili
    decryptSensitiveData(encrypted, iv, tag) {
        const key = crypto.scryptSync(
            config.jwt.secret,
            config.encryption.salt,
            config.encryption.keyLength
        );
        
        const decipher = crypto.createDecipheriv(
            config.encryption.algorithm,
            key,
            Buffer.from(iv, 'hex')
        );
        
        decipher.setAuthTag(Buffer.from(tag, 'hex'));
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    // Validazione password
    validatePassword(password) {
        const checks = [
            {
                test: password.length >= config.security.passwordMinLength,
                message: `Password must be at least ${config.security.passwordMinLength} characters long`
            },
            {
                test: password.length <= config.security.passwordMaxLength,
                message: `Password must be at most ${config.security.passwordMaxLength} characters long`
            },
            {
                test: config.security.requireNumbers ? /\d/.test(password) : true,
                message: 'Password must contain at least one number'
            },
            {
                test: config.security.requireSpecialChars ? /[!@#$%^&*]/.test(password) : true,
                message: 'Password must contain at least one special character'
            },
            {
                test: config.security.requireUppercase ? /[A-Z]/.test(password) : true,
                message: 'Password must contain at least one uppercase letter'
            },
            {
                test: config.security.requireLowercase ? /[a-z]/.test(password) : true,
                message: 'Password must contain at least one lowercase letter'
            }
        ];

        const failures = checks
            .filter(check => !check.test)
            .map(check => check.message);

        return {
            isValid: failures.length === 0,
            errors: failures
        };
    }
}

module.exports = new AuthService();