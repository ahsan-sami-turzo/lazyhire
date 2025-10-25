const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const expressLayouts = require('express-ejs-layouts'); // <-- New Import

const app = express();
const port = 3000;

// --- EJS Setup ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts); // Enable EJS layouts
app.set('layout', 'layout'); // Set 'layout.ejs' as the default layout

// Serve static files (e.g., Bootstrap CSS)
app.use(express.static(path.join(__dirname, 'public')));

// --- SQLite Database Initialization ---
// The path to your SQLite database file
const dbPath = path.join(__dirname, 'db', 'lazyhire.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create table if it doesn't exist
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
    }
});

// Mock Data for testing the EJS view
const mockJobs = [
    { id: 1, title: 'Node.js Developer', company: 'TechCorp', location: 'Remote', status: 'New' },
    { id: 2, title: 'Express Engineer', company: 'AppGen', location: 'NYC', status: 'Reviewed' },
    { id: 3, title: 'AI Prompt Engineer', company: 'InnoLabs', location: 'Finland', status: 'Applied' },
];

// --- Routes ---
app.get('/', (req, res) => {
    res.render('dashboard', { 
        pageTitle: 'Dashboard',
        jobs: mockJobs, // Pass mock data to the view
        user: 'SoloDev',
        jobCount: mockJobs.length
    });
});

// Server Start
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});