const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const expressLayouts = require('express-ejs-layouts');

const app = express();
const port = 3000;

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

// Server Start
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});