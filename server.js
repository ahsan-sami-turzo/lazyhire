// server.js

// --- Core Imports & Configuration ---
require('dotenv').config();
const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const cron = require('node-cron');
const session = require('express-session'); // <-- ADDED
const { GoogleGenAI } = require('@google/genai');
const multer = require('multer'); 
const fs = require('fs');

// --- Service Imports ---
const initializeDatabase = require('./db/sequelize'); 
const applicationsRouter = require('./routes/index'); 
const { runScraper } = require('./services/scraper-runner');
const { sendDailyDigest } = require('./services/mailer');

// --- App Setup ---
const app = express();
const port = 3000;

// --- Global Utility Initialization ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// --- Authentication Middleware ---
// Must be defined globally to apply to all routes
function requireLogin(req, res, next) {
    if (req.path === '/login' || req.session.isAuthenticated) {
        // Pass session username to response locals for access in EJS layouts/views
        if (req.session.isAuthenticated) {
            res.locals.user = req.session.username;
        }
        return next();
    }
    res.redirect('/login');
}

// --- Main Application Setup Function ---
async function startServer() {
    // 1. Initialize Database (Crucial Step)
    const { Application, Profile } = await initializeDatabase();
    console.log('Database initialized successfully.');
    
    // 2. Express Middleware
    app.use(express.urlencoded({ extended: true })); 
    app.use(express.json()); 

    // Configure Session (Must be before requireLogin)
    app.use(session({
        secret: 'a-super-secret-key-for-session', 
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false } 
    }));

    // Apply Auth Middleware
    app.use(requireLogin);

    // 3. EJS Setup
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.use(expressLayouts); 
    app.set('layout', 'layout'); 
    app.use(express.static(path.join(__dirname, 'public')));

    // 4. CRON Job Scheduler (Unchanged)
    cron.schedule('0 0 * * *', () => {
        console.log('Scheduled daily job scraper...');
        runScraper(false)
            .then(newJobs => {
                console.log(`✅ Scrape finished. Inserted ${newJobs.length} jobs.`);
                if (newJobs.length > 0) {
                    return sendDailyDigest(newJobs);
                }
            })
            .catch(err => console.error('❌ Scheduled automation failed:', err.message));
    });
    console.log('Cron job for daily scraping and digest email scheduled (Midnight).');

    // 5. Route Handler (Mount all routes here)
    // Pass the Sequelize Model instead of the raw db object
    app.use('/', applicationsRouter({ Application, Profile, ai, upload, fs, runScraper, sendDailyDigest }));
    
    // 6. Server Start
    app.listen(port, () => {
        console.log(`Server listening at http://localhost:${port}`);
    });
}

// Execute the main setup function and catch errors
startServer().catch(err => {
    console.error('Failed to start server due to initialization error:', err);
    process.exit(1);
});