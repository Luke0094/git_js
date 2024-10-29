// server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const session = require('express-session');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const winston = require('winston');
const sanitize = require('sanitize-filename');
const validator = require('validator');
const cors = require('cors');

const app = express();

// Configurazione Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Middleware di logging
const loggerMiddleware = (req, res, next) => {
    logger.info({
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });
    next();
};

// Configurazione rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 100, // limite di 100 richieste per finestra
    message: { message: 'Troppe richieste, riprova più tardi' },
    standardHeaders: true,
    legacyHeaders: false
});

const loginLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 ora
    max: 5, // limite di 5 tentativi di login falliti
    message: { message: 'Troppi tentativi di login, riprova più tardi' },
    standardHeaders: true,
    legacyHeaders: false
});

// Configurazione CORS
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200
};

// Configurazione middleware
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json({ limit: '10kb' })); // Limita la dimensione del body JSON
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(loggerMiddleware);
app.use(limiter);

// Configurazione session con store sicuro per produzione
if (process.env.NODE_ENV === 'production') {
    const RedisStore = require('connect-redis').default;
    const { createClient } = require('redis');
    const redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.connect().catch(console.error);

    app.use(session({
        store: new RedisStore({ client: redisClient }),
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: true,
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 ore
        }
    }));
} else {
    app.use(session({
        secret: process.env.SESSION_SECRET || 'your_secret_key',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false }
    }));
}

// CSRF protection dopo session middleware
app.use(csrf({
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    }
}));

// Middleware per inviare token CSRF al client
app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// Configurazione Multer con validazione aggiuntiva
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const folder = file.fieldname === 'documento' ? 'documenti' : 'codici-fiscali';
        const uploadPath = path.join(__dirname, 'uploads', folder);
        
        try {
            await fs.mkdir(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (err) {
            logger.error('Errore creazione directory:', err);
            cb(err);
        }
    },
    filename: function (req, file, cb) {
        const sanitizedName = sanitize(file.originalname);
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `${path.parse(sanitizedName).name}-${uniqueSuffix}${path.extname(sanitizedName)}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error('Tipo di file non supportato'), false);
    }

    if (file.size > maxSize) {
        return cb(new Error('File troppo grande'), false);
    }

    cb(null, true);
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 2
    }
});

// Funzioni di utilità con gestione errori migliorata
async function readJsonFile(filename) {
    try {
        const filePath = path.join(__dirname, 'data', filename);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        logger.error(`Errore nella lettura del file ${filename}:`, error);
        throw new Error('Errore nella lettura dei dati');
    }
}

async function writeJsonFile(filename, data) {
    try {
        const filePath = path.join(__dirname, 'data', filename);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        logger.error(`Errore nella scrittura del file ${filename}:`, error);
        throw new Error('Errore nel salvataggio dei dati');
    }
}

// Middleware di validazione dati
const validateRegistrationData = (req, res, next) => {
    const { personalInfo, corsiSelezionati } = req.body;

    if (!personalInfo || !corsiSelezionati) {
        return res.status(400).json({ message: 'Dati mancanti' });
    }

    // Validazione email
    if (!validator.isEmail(personalInfo.email)) {
        return res.status(400).json({ message: 'Email non valida' });
    }

    // Validazione telefono
    if (!validator.isMobilePhone(personalInfo.telefono, 'it-IT')) {
        return res.status(400).json({ message: 'Numero di telefono non valido' });
    }

    // Sanitizzazione input
    req.body.personalInfo = {
        nome: validator.escape(personalInfo.nome),
        cognome: validator.escape(personalInfo.cognome),
        email: validator.normalizeEmail(personalInfo.email),
        telefono: personalInfo.telefono,
        indirizzo: validator.escape(personalInfo.indirizzo)
    };

    next();
};

// Middleware di autenticazione potenziato
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        logger.warn(`Tentativo di accesso non autorizzato: ${req.ip}`);
        return res.status(401).json({ message: 'Non autorizzato' });
    }

    // Verifica se la sessione è scaduta
    const sessionAge = Date.now() - req.session.lastAccess;
    if (sessionAge > 24 * 60 * 60 * 1000) { // 24 ore
        req.session.destroy();
        logger.info(`Sessione scaduta per l'utente: ${req.session.user.id}`);
        return res.status(401).json({ message: 'Sessione scaduta' });
    }

    req.session.lastAccess = Date.now();
    next();
};

// Endpoints
app.post('/api/auth/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Credenziali mancanti' });
        }

        const userData = await readJsonFile('login_access.json');
        const user = userData.users.find(u => u.username === username);

        if (!user) {
            logger.warn(`Tentativo di login fallito per l'username: ${username}`);
            return res.status(401).json({ message: 'Credenziali non valide' });
        }

        // In produzione, usare bcrypt.compare
        if (user.password === password) {
            req.session.user = {
                id: user.id,
                username: user.username,
                accountInfo: user.accountInfo,
                lastAccess: Date.now()
            };

            logger.info(`Login effettuato con successo: ${user.id}`);
            res.json({
                id: user.id,
                username: user.username,
                accountInfo: user.accountInfo
            });
        } else {
            logger.warn(`Password errata per l'username: ${username}`);
            res.status(401).json({ message: 'Credenziali non valide' });
        }
    } catch (error) {
        logger.error('Errore durante il login:', error);
        res.status(500).json({ message: 'Errore del server' });
    }
});

// ... [altri endpoint rimangono simili ma con logging e validazione aggiunti]

// Gestore errori centralizzato
app.use((err, req, res, next) => {
    logger.error('Errore non gestito:', err);

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File troppo grande' });
    }

    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({ message: 'Token CSRF non valido' });
    }

    res.status(500).json({ 
        message: process.env.NODE_ENV === 'production' 
            ? 'Si è verificato un errore interno' 
            : err.message 
    });
});

// Gestione shutdown graceful
process.on('SIGTERM', () => {
    logger.info('SIGTERM ricevuto. Chiusura server...');
    server.close(() => {
        logger.info('Server chiuso');
        process.exit(0);
    });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    logger.info(`Server in ascolto sulla porta ${PORT}`);
});