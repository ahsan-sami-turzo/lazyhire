// routes/index.js (CORRECTED VERSION)

const express = require('express');

// Export a function that accepts dependencies
module.exports = ({ Application, ai, upload, fs, runScraper, sendDailyDigest }) => {
    const router = express.Router();
    
    // Helper function used in dashboard route
    const getAllStatuses = () => ['New', 'Applied', 'Interview Scheduled', 'Rejected', 'Offer'];


    // -----------------------------------------------------------------
    // 🏠 DASHBOARD / APPLICATION TRACKER ROUTES (FIXED CRUD)
    // -----------------------------------------------------------------

    // GET: Dashboard / List all Applications
    router.get('/', async (req, res) => { // <-- Made async
        try {
            // FIX: Use Sequelize Application Model
            const jobs = await Application.findAll({ 
                order: [['id', 'DESC']],
                raw: true // Return plain objects for EJS
            }); 

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
        } catch (err) {
            console.error('Sequelize Dashboard Error:', err.message);
            return res.status(500).send("Database Error: " + err.message);
        }
    });

    // GET: Form to add a new application
    router.get('/add', (req, res) => {
        res.render('add-application', { 
            pageTitle: 'Add New Application',
            user: 'SoloDev'
        });
    });

    // POST: Handle form submission to add new application (CREATE)
    router.post('/add', async (req, res) => { // <-- Made async
        const { title, company, location, notes, date_applied } = req.body;
        
        try {
            // FIX: Use Sequelize Application Model
            await Application.create({ title, company, location, notes, date_applied });
            res.redirect('/');
        } catch (err) {
            console.error('Sequelize Create Error:', err.message);
            return res.status(500).send('Error adding application.');
        }
    });

    // POST: Update application status (UPDATE)
    router.post('/update/:id', async (req, res) => { // <-- Made async
        const { status } = req.body;
        const id = req.params.id;
        
        try {
            // FIX: Use Sequelize Application Model
            await Application.update({ status: status }, { where: { id: id } });
            res.redirect('/');
        } catch (err) {
            console.error('Sequelize Update Error:', err.message);
            return res.status(500).send('Error updating status.');
        }
    });


    // -----------------------------------------------------------------
    // 📄 AI UTILITIES ROUTES (No changes needed, already uses 'ai')
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
    // ⚙️ SCRAPER / API ROUTES (No changes needed)
    // -----------------------------------------------------------------

    // Manual Scraper Trigger
    router.post('/api/scrape', (req, res) => {
        console.log('Manual scraper triggered by user...');
        res.json({ message: 'Scraping started. Results will appear shortly.' });

        runScraper()
            .then(count => console.log(`Manual scrape successful. Inserted ${count} jobs.`))
            .catch(err => console.error('Manual scrape failed:', err.message));
    });
    
    // Autofill foundation route
    router.post('/applications/autofill/:applicationId', (req, res) => {
        res.json({ status: 'info', message: 'Autofill feature is active but currently simulated.' });
    });


    return router;
};