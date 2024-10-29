// middleware/security.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const hpp = require('hpp');
const toobusy = require('toobusy-js');
const config = require('../config/security');
const logger = require('../config/logger');

// Middleware per protezione DoS
const dosProtection = (req, res, next) => {
    if (toobusy()) {
        logger.warn('Server too busy', { ip: req.ip });
        return res.status(503).json({ 
            message: 'Server is too busy, please try again later' 
        });
    }
    next();
};

// Middleware per rilevamento attacchi
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: true,
    expectCt: {
        enforce: true,
        maxAge: 30,
    },
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true
});

// Rate limiter avanzato con tracking IP
const createRateLimiter = (options) => {
    return rateLimit({
        ...options,
        handler: (req, res) => {
            logger.warn('Rate limit exceeded', {
                ip: req.ip,
                path: req.path,
                userAgent: req.headers['user-agent']
            });
            res.status(429).json({
                message: 'Too many requests, please try again later',
                retryAfter: Math.ceil(options.windowMs / 1000)
            });
        },
        keyGenerator: (req) => {
            // Usa una combinazione di IP e User-Agent per il tracking
            return `${req.ip}-${req.headers['user-agent']}`;
        }
    });
};

// Speed Limiter per prevenire brute force
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minuti
    delayAfter: 100, // inizia a rallentare dopo 100 richieste
    delayMs: (hits) => hits * 100, // aumenta il delay di 100ms per ogni richiesta
    maxDelayMs: 10000 // massimo delay di 10 secondi
});

// Middleware per sanitizzazione parametri
const sanitizeParams = hpp({
    whitelist: [
        // Lista di parametri permessi in array
        'sort', 'fields', 'page', 'limit'
    ]
});

// Middleware per validazione input
const validateInput = (schema) => async (req, res, next) => {
    try {
        await schema.validateAsync(req.body, { abortEarly: false });
        next();
    } catch (error) {
        logger.warn('Input validation failed', {
            error: error.details,
            body: req.body,
            ip: req.ip
        });
        res.status(400).json({
            message: 'Validation error',
            errors: error.details.map(detail => detail.message)
        });
    }
};

module.exports = {
    dosProtection,
    securityHeaders,
    createRateLimiter,
    speedLimiter,
    sanitizeParams,
    validateInput,
    globalSecurityMiddleware: [
        dosProtection,
        securityHeaders,
        speedLimiter,
        sanitizeParams,
        createRateLimiter(config.rateLimit.global)
    ]
};