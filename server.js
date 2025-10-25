// server.js

// --- Core Imports ---
require('dotenv').config();
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const expressLayouts = require('express-ejs-layouts');
const cron = require('node-cron');

// --- Service/Utility Imports (Required for initialization/cron) ---
const { GoogleGenAI } = require('@google/genai');
const multer = require('multer'); 
const { runScraper } = require('./services/scraper-runner');
const { sendDailyDigest } = require('./services/mailer');
const applicationsRouter = require('./routes/index'); // <-- NEW ROUTER IMPORT

// --- App Setup ---
const app = express();
const port = 3000;

// --- Global Utility Initialization ---
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});
const upload = multer({ dest: path.join(__dirname, 'uploads/') });
const fs = require('fs'); // Used by multer in the router

// --- Express Middleware ---
app.use(express.urlencoded({ extended: true })); 
app.use(express.json()); 

// --- EJS Setup ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts); 
app.set('layout', 'layout'); 

// --- Serve static files ---
app.use(express.static(path.join(__dirname, 'public')));

// --- SQLite Database Initialization ---
const dbPath = path.join(__dirname, 'db', 'lazyhire.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to the SQLite database.');

        // 1. Ensure the 'jobs' placeholder table is created correctly
        db.run(`CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            company TEXT,
            location TEXT,
            salary TEXT,
            date_posted TEXT,
            description TEXT
        )`, (runErr) => {
            if (runErr) console.error('Error creating jobs table:', runErr.message);
            else console.log('Jobs table ensured.');
        });
        
        // 2. Ensure the main 'applications' table is created correctly
        db.run(`CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            company TEXT NOT NULL,
            location TEXT,
            status TEXT DEFAULT 'New',
            notes TEXT,
            date_applied TEXT
        )`, (runErr) => {
            if (runErr) console.error('Error creating applications table:', runErr.message);
            else console.log('Applications table ensured.');
        });
    }
});

// =========================================================
// 🔄 AUTOMATION: CRON JOB SCHEDULER
// =========================================================

// Schedule the scraper to run every day at 00:01
cron.schedule('0 0 * * *', () => {
    console.log('Scheduled daily job scraper...');
    runScraper(false)
        .then(newJobs => {
            console.log(`✅ Scheduled scrape finished. Inserted ${newJobs.length} jobs.`);
            if (newJobs.length > 0) {
                return sendDailyDigest(newJobs);
            }
            return Promise.resolve();
        })
        .catch(err => console.error('❌ Scheduled automation failed:', err.message));
});
console.log('Cron job for daily scraping and digest email scheduled (Midnight).');

// =========================================================
// 🚀 ROUTE HANDLER (Mount all routes here)
// =========================================================

// Pass utilities/dependencies needed by the routes
app.use('/', applicationsRouter({ db, ai, upload, fs, runScraper, sendDailyDigest })); 


// Server Start
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});