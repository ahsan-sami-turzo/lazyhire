// routes/index.js

const express = require('express');

// Export a function that accepts dependencies
module.exports = ({ db, ai, upload, fs, runScraper, sendDailyDigest }) => {
    const router = express.Router();
    
    // Helper function used in dashboard route
    const getAllStatuses = () => ['New', 'Applied', 'Interview Scheduled', 'Rejected', 'Offer'];


    // -----------------------------------------------------------------
    // 🏠 DASHBOARD / APPLICATION TRACKER ROUTES
    // -----------------------------------------------------------------

    // GET: Dashboard / List all Applications
    router.get('/', (req, res) => {
        db.all('SELECT * FROM applications ORDER BY id DESC', [], (err, jobs) => {
            if (err) {
                return res.status(500).send("Database Error: " + err.message);
            }

            const statusCounts = jobs.reduce((acc, job) => {
                const status = job.status || 'New';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});
            
            const finalStatusCounts = {};
            getAllStatuses().forEach(s => {
                finalStatusCounts[s] = statusCounts[s] || 0;
            });

            res.render('dashboard', { 
                pageTitle: 'Application Dashboard',
                jobs: jobs,
                user: 'SoloDev',
                jobCount: jobs.length,
                statusCounts: finalStatusCounts,
            });
        });
    });

    // GET: Form to add a new application
    router.get('/add', (req, res) => {
        res.render('add-application', { 
            pageTitle: 'Add New Application',
            user: 'SoloDev'
        });
    });

    // POST: Handle form submission to add new application (CREATE)
    router.post('/add', (req, res) => {
        const { title, company, location, notes, date_applied } = req.body;
        const sql = `INSERT INTO applications (title, company, location, notes, date_applied) VALUES (?, ?, ?, ?, ?)`;
        
        db.run(sql, [title, company, location, notes, date_applied], function(err) {
            if (err) {
                console.error(err.message);
                return res.status(500).send('Error adding application.');
            }
            res.redirect('/');
        });
    });

    // POST: Update application status (UPDATE)
    router.post('/update/:id', (req, res) => {
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


    // -----------------------------------------------------------------
    // 📄 AI UTILITIES ROUTES
    // -----------------------------------------------------------------

    // GET: Resume Tailor Form
    router.get('/tailor', (req, res) => {
        res.render('resume-tailor', { pageTitle: 'AI Resume Tailor', user: 'SoloDev', tailoredResume: null, error: null });
    });

    // POST: Handle Tailoring Request
    router.post('/tailor', upload.single('resumeFile'), async (req, res) => {
        const { jobDescription } = req.body;
        const filePath = req.file ? req.file.path : null;

        if (!filePath) {
            return res.render('resume-tailor', { pageTitle: 'AI Resume Tailor', user: 'SoloDev', error: 'Please upload a resume file.' });
        }

        try {
            const baseResume = fs.readFileSync(filePath, 'utf8');
            const prompt = `You are an expert resume writer. Tailor the following base resume to strongly match the provided job description...`; // Abbreviated
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                config: { temperature: 0.2 },
            });
            
            const tailoredResume = response.text.trim();
            fs.unlinkSync(filePath); // Clean up temp file

            res.render('resume-tailor', { pageTitle: 'AI Resume Tailor', user: 'SoloDev', tailoredResume: tailoredResume, error: null });

        } catch (error) {
            console.error('Gemini API or File System Error:', error);
            if (req.file) { try { fs.unlinkSync(filePath); } catch (e) {} }
            res.render('resume-tailor', { pageTitle: 'AI Resume Tailor', user: 'SoloDev', tailoredResume: null, error: `An error occurred during AI processing. Error: ${error.message}` });
        }
    });

    // GET & POST: Cover Letter Generator
    router.get('/cover-letter', (req, res) => {
        res.render('cover-letter-generator', { pageTitle: 'AI Cover Letter Generator', user: 'SoloDev', generatedText: null, error: null });
    });

    router.post('/cover-letter', async (req, res) => {
        const { jobDescription, yourProfileSummary } = req.body;
        // ... (Gemini API logic for Cover Letter) ...
        try {
            const prompt = `You are a professional hiring manager. Write a concise, compelling cover letter...`;
            const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: [{ role: "user", parts: [{ text: prompt }] }], config: { temperature: 0.5 } });
            const generatedText = response.text.trim();
            res.render('cover-letter-generator', { pageTitle: 'AI Cover Letter Generator', user: 'SoloDev', generatedText, error: null });
        } catch (error) {
            console.error('Gemini API Error (Cover Letter):', error);
            res.render('cover-letter-generator', { pageTitle: 'AI Cover Letter Generator', user: 'SoloDev', generatedText: null, error: `An error occurred during API processing. Error: ${error.message}` });
        }
    });

    // GET & POST: Interview Prep Assistant
    router.get('/interview-prep', (req, res) => {
        res.render('interview-prep', { pageTitle: 'AI Interview Prep', user: 'SoloDev', generatedText: null, error: null });
    });

    router.post('/interview-prep', async (req, res) => {
        const { jobDescription, resumeSummary } = req.body;
        // ... (Gemini API logic for Interview Prep) ...
        try {
            const prompt = `You are an expert interview coach. Analyze the following job description and candidate resume summary...`;
            const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: [{ role: "user", parts: [{ text: prompt }] }], config: { temperature: 0.1 } });
            const generatedText = response.text.trim();
            res.render('interview-prep', { pageTitle: 'AI Interview Prep', user: 'SoloDev', generatedText, error: null });
        } catch (error) {
            console.error('Gemini API Error (Interview Prep):', error);
            res.render('interview-prep', { pageTitle: 'AI Interview Prep', user: 'SoloDev', generatedText: null, error: `An error occurred during API processing. Error: ${error.message}` });
        }
    });


    // -----------------------------------------------------------------
    // ⚙️ SCRAPER / API ROUTES
    // -----------------------------------------------------------------

    // Manual Scraper Trigger
    router.post('/api/scrape', (req, res) => {
        console.log('Manual scraper triggered by user...');
        res.json({ message: 'Scraping started. Results will appear shortly.' });

        runScraper()
            .then(count => console.log(`Manual scrape successful. Inserted ${count} jobs.`))
            .catch(err => console.error('Manual scrape failed:', err.message));
    });
    
    // Autofill foundation route (uses dependency injection, but logic is simplified here)
    router.post('/applications/autofill/:applicationId', (req, res) => {
        // Placeholder for future logic that will use Puppeteer/Playwright
        res.json({ status: 'info', message: 'Autofill feature is active but currently simulated.' });
    });


    return router;
};