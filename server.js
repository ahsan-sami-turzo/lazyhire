require('dotenv').config();
const { OpenAI } = require('openai');
const { GoogleGenAI } = require('@google/genai');
const multer = require('multer'); 
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const expressLayouts = require('express-ejs-layouts');
const cron = require('node-cron');
const { runScraper } = require('./services/scraper-runner');

// --- App Setup ---
const app = express();
const port = 3000;

// --- AI Setup ---
// OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
// Gemini (Google GenAI)
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

// --- File Upload Setup (Multer) ---
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// --- Express Middleware ---
app.use(express.urlencoded({ extended: true })); // Handle standard HTML forms
app.use(express.json()); // Handle JSON data

// --- EJS Setup ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts); // Enable EJS layouts
app.set('layout', 'layout'); // Set 'layout.ejs' as the default layout

// --- Serve static files ---
app.use(express.static(path.join(__dirname, 'public')));

// --- SQLite Database Initialization ---
const dbPath = path.join(__dirname, 'db', 'lazyhire.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // --- Jobs Table Creation (New/Updated Table) ---
        db.run(`CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            company TEXT,
            location TEXT,
            salary TEXT,
            date_posted TEXT,
            description TEXT
        )`);
        console.log('Jobs table ensured.');

        // --- Job Applications Table Creation (New/Updated Table) ---
        db.run(`CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            company TEXT NOT NULL,
            location TEXT,
            status TEXT DEFAULT 'New',
            notes TEXT,
            date_applied TEXT
        )`);
        console.log('Applications table ensured.');
    }
});



// --- Routes ---
// GET: Dashboard / List all Applications
app.get('/', (req, res) => {
    // Fetch all applications from the DB
    db.all('SELECT * FROM applications ORDER BY id DESC', [], (err, jobs) => {
        if (err) {
            return res.status(500).send("Database Error: " + err.message);
        }
        res.render('dashboard', { 
            pageTitle: 'Application Dashboard',
            jobs: jobs,
            user: 'SoloDev',
            jobCount: jobs.length
        });
    });
});

// GET: Form to add a new application
app.get('/add', (req, res) => {
    res.render('add-application', { 
        pageTitle: 'Add New Application',
        user: 'SoloDev'
    });
});

// POST: Handle form submission to add new application (CREATE)
app.post('/add', (req, res) => {
    const { title, company, location, notes, date_applied } = req.body;
    const sql = `INSERT INTO applications (title, company, location, notes, date_applied) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [title, company, location, notes, date_applied], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Error adding application.');
        }
        console.log(`A new application has been added with ID ${this.lastID}`);
        res.redirect('/'); // Redirect back to the dashboard list
    });
});

// POST: Update application status (UPDATE)
app.post('/update/:id', (req, res) => {
    const { status } = req.body;
    const id = req.params.id;
    const sql = `UPDATE applications SET status = ? WHERE id = ?`;

    db.run(sql, [status, id], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Error updating status.');
        }
        res.redirect('/');
    });
});


// =========================================================
// RESUME TAILORING
// =========================================================

// GET: Resume Tailor Form
app.get('/tailor', (req, res) => {
    res.render('resume-tailor', { 
        pageTitle: 'AI Resume Tailor',
        user: 'SoloDev',
        tailoredResume: null,
        error: null
    });
});

// POST: Handle Tailoring Request
// Use upload.single() middleware to handle one file upload ('resumeFile')
app.post('/tailor', upload.single('resumeFile'), async (req, res) => {
    const { jobDescription } = req.body;
    const filePath = req.file ? req.file.path : null;

    if (!filePath) {
        return res.render('resume-tailor', { pageTitle: 'AI Resume Tailor', user: 'SoloDev', error: 'Please upload a resume file.' });
    }

    try {
        // --- 1. Read Resume Content ---
        const fs = require('fs');
        const baseResume = fs.readFileSync(filePath, 'utf8');

        // --- 2. Construct AI Prompt ---
        const prompt = `You are an expert resume writer. Tailor the following base resume to strongly match the provided job description. Focus on maximizing keyword relevance while maintaining professional integrity. Only return the modified resume text.
        
        --- JOB DESCRIPTION ---
        ${jobDescription}
        
        --- BASE RESUME ---
        ${baseResume}`;

        // --- 3. Call OpenAI API ---
        // const completion = await openai.chat.completions.create({
        //     model: "gpt-3.5-turbo", // Fast and capable model for text transformation
        //     messages: [{ role: "user", content: prompt }],
        //     temperature: 0.2, // Keep creativity low for factual tailoring
        // });
        
        // Extract the text content from the OpenAI response
        // const tailoredResume = completion.choices[0].message.content.trim();

        // --- 3. Call Gemini API (Updated) ---
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // Fast and capable model for text transformation
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                // Ensure deterministic output for tailoring
                temperature: 0.2, 
            },
        });
        
        // Extract the text content from the Gemini response
        const tailoredResume = response.text.trim();

        // --- 4. Clean Up Temporary File ---
        fs.unlinkSync(filePath);

        // --- 5. Render Result ---
        res.render('resume-tailor', { 
            pageTitle: 'AI Resume Tailor',
            user: 'SoloDev',
            tailoredResume: tailoredResume,
            error: null
        });

    } catch (error) {
        console.error('OpenAI or File System Error:', error);
        if (req.file) { // Attempt to clean up even on error
            try {
                fs.unlinkSync(filePath);
            } catch (cleanupError) {
                console.error("Failed to clean up file:", cleanupError);
            }
        }
        res.render('resume-tailor', { 
            pageTitle: 'AI Resume Tailor', 
            user: 'turzo', 
            tailoredResume: null, 
            error: 'An error occurred during AI processing. Check API key and console logs.' 
        });
    }
});


// =========================================================
// 📄 SCRAPER
// =========================================================

// Manual Scraper Trigger
app.post('/api/scrape', (req, res) => {
    console.log('Manual scraper triggered by user...');
    
    // Send immediate response to avoid browser timeout, then run the scraper asynchronously
    res.json({ message: 'Scraping started. Results will appear shortly.' });

    runScraper()
        .then(count => console.log(`Manual scrape successful. Inserted ${count} jobs.`))
        .catch(err => console.error('Manual scrape failed:', err.message));
});


// --- AUTOMATION: CRON JOB SCHEDULER ---
cron.schedule('0 0 * * *', () => {
    console.log('Scheduled daily job scraper...');
    runScraper(false) // Run silently (false for logToConsole)
        .then(count => console.log(`✅ Scheduled scrape finished. Inserted ${count} jobs.`))
        .catch(err => console.error('❌ Scheduled scrape failed:', err.message));
});

// Server Start
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});