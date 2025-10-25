// routes/index.js (CORRECTED VERSION)

const express = require('express');
const path = require('path');
const sanitize = (name) => name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

// Export a function that accepts dependencies
module.exports = ({ Application, Profile, ai, upload, fs, runScraper, sendDailyDigest }) => {
    const router = express.Router();
    
    // Helper function used in dashboard route
    const getAllStatuses = () => ['New', 'Applied', 'Interview Scheduled', 'Rejected', 'Offer'];

    // -----------------------------------------------------------------
    // --- AUTHENTICATION ---
    // -----------------------------------------------------------------
    router.get('/login', (req, res) => {
        // Bypass requireLogin check if this route is hit
        if (req.session.isAuthenticated) return res.redirect('/');
        res.render('login', { layout: 'login-layout', error: null });
    });

    router.post('/login', (req, res) => {
        const { username, password } = req.body;
        // 1. Simple .env based authentication check
        if (username === process.env.LOGIN_USERNAME && password === process.env.LOGIN_PASSWORD) {
            req.session.isAuthenticated = true;
            req.session.username = username;
            return res.redirect('/');
        }
        res.render('login', { layout: 'login-layout', error: 'Invalid username or password' });
    });

    router.post('/logout', (req, res) => {
        req.session.destroy(err => {
            if (err) console.error(err);
            res.redirect('/login');
        });
    });

    // -----------------------------------------------------------------
    // 🏠 DASHBOARD / APPLICATION TRACKER ROUTES
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
                user: req.session.username,
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


    // -----------------------------------------------------------------
    // ⚙️ PROFILE ROUTES
    // -----------------------------------------------------------------
    
    // --- HELPER FUNCTION TO LOAD INITIAL PROFILE DATA ---
    const loadInitialProfileData = () => {
        const filePath = path.join(__dirname, '..', 'profile_data.json');
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            const profile = JSON.parse(data);
            
            // Convert array fields back to JSON strings for Sequelize storage
            profile.experience = JSON.stringify(profile.experience);
            profile.education = JSON.stringify(profile.education);
            profile.skills = JSON.stringify(profile.skills);

            return profile;
        } catch (error) {
            console.error("CRITICAL: Failed to load or parse profile_data.json:", error.message);
            // Return minimal fallback data if file read fails
            return { full_name: "Fallback User", job_title: "Developer", summary: "Default profile.", skills: "[]", experience: "[]", education: "[]" };
        }
    };

    router.get('/profile', async (req, res) => {
        try {
            let profile = await Profile.findByPk(1, { raw: true });

            if (!profile) {
                // Load data from file when creating the initial record
                const initialDataFromFile = loadInitialProfileData();

                // Create initial data if not found (simulating first login/CV import)
                profile = await Profile.create({ 
                    id: 1, 
                    full_name: req.session.username, 
                    ...initialDataFromFile 
                }, { raw: true });
            }
            
            // Ensure complex fields are parsed for the view if they are stored as strings
            if (typeof profile.skills === 'string') {
                profile.skills = JSON.parse(profile.skills);
            }

            res.render('profile', { 
                pageTitle: 'My Profile', 
                user: req.session.username, 
                profile: profile,                
                query: req.query 
            });
        } catch (error) {
            console.error('Profile Load Error:', error);
            res.status(500).send('Could not load profile.');
        }
    });

    router.post('/profile', async (req, res) => {
        // Data cleansing needed here (e.g., converting array/tag inputs back to JSON string if necessary)
        try {
            const updateData = {
                ...req.body,
                // Convert skills back to JSON string for database storage
                skills: JSON.stringify(req.body.skills ? req.body.skills.split(',').map(s => s.trim()) : []),
                // Assume other complex fields are handled client-side or omitted for simplicity
            };

            await Profile.update(updateData, { where: { id: 1 } });
            res.redirect('/profile?saved=true');
        } catch (error) {
            console.error('Profile Save Error:', error);
            res.status(500).send('Could not save profile.');
        }
    });

    // POST: Create CV template file (Step 4)
    router.post('/profile/create-cv', async (req, res) => {
        try {
            const profile = await Profile.findByPk(1, { raw: true });
            
            const cvContent = `
                # ${profile.full_name}
                ${profile.job_title} | ${profile.contact_email} | ${profile.phone} | ${profile.linkedin_url || ''}

                ## Summary
                ${profile.summary}

                ## Skills
                ${(profile.skills ? JSON.parse(profile.skills) : []).map(s => `- ${s}`).join('\n')}

                ## Experience
                ${JSON.stringify(profile.experience, null, 2)}

                ## Education
                ${JSON.stringify(profile.education, null, 2)}
            `;
            
            const dir = path.join(__dirname, '..', 'documents');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir);
            
            const filePath = path.join(dir, 'base_template_cv.md');
            fs.writeFileSync(filePath, cvContent);

            res.redirect('/profile?cv_created=true');

        } catch (error) {
            console.error('CV Creation Error:', error);
            res.status(500).send('Failed to create CV template.');
        }
    });


    // -----------------------------------------------------------------
    // JOB DETAILS ROUTES
    // -----------------------------------------------------------------

    // --- Job Details Page  ---
    router.get('/details/:id', async (req, res) => {
        const id = req.params.id;
        try {
            const job = await Application.findByPk(id, { raw: true });
            if (!job) return res.status(404).send('Job not found.');
            
            // --- Step 8: Create Directory and Copy CV Template ---
            const companyDir = sanitize(job.company);
            const jobTitleDir = sanitize(job.title);
            const jobDir = path.join(__dirname, '..', 'documents', 'job-description', companyDir, jobTitleDir);

            // Ensure directory exists
            if (!fs.existsSync(jobDir)) {
                fs.mkdirSync(jobDir, { recursive: true });
            }

            // Copy latest base template CV
            const baseCvPath = path.join(__dirname, '..', 'documents', 'base_template_cv.md');
            const targetCvPath = path.join(jobDir, 'base_cv_copy.md');
            
            if (fs.existsSync(baseCvPath) && !fs.existsSync(targetCvPath)) {
                fs.copyFileSync(baseCvPath, targetCvPath);
            }
            
            // Render details page
            res.render('job-details', { 
                pageTitle: `Details: ${job.title}`, 
                user: req.session.username, 
                job: job, 
                jobDir: jobDir 
            });

        } catch (error) {
            console.error('Job Details Error:', error);
            res.status(500).send('Error loading job details or file system.');
        }
    });

    // --- Actions from Job Details Page  ---

    // 1. Delete Job
    router.post('/details/delete/:id', async (req, res) => {
        const id = req.params.id;
        try {
            const job = await Application.findByPk(id, { raw: true });
            if (!job) return res.redirect('/');
            
            // 1. Delete associated directory
            const companyDir = sanitize(job.company);
            const jobTitleDir = sanitize(job.title);
            const jobDir = path.join(__dirname, '..', 'documents', 'job-description', companyDir, jobTitleDir);
            if (fs.existsSync(jobDir)) {
                fs.rmSync(jobDir, { recursive: true, force: true });
            }
            
            // 2. Delete database entry
            await Application.destroy({ where: { id: id } });
            
            res.redirect('/');
        } catch (error) {
            console.error('Job Deletion Error:', error);
            res.status(500).send('Failed to delete job.');
        }
    });

    // 2. Create CV (Step 14)
    router.post('/details/create-cv/:id', async (req, res) => {
        const id = req.params.id;
        try {
            const job = await Application.findByPk(id, { raw: true });
            const profile = await Profile.findByPk(1, { raw: true });
            if (!job || !profile) return res.status(404).send('Resource not found.');

            const jobDir = path.join(__dirname, '..', 'documents', 'job-description', sanitize(job.company), sanitize(job.title));

            // Generate the tailored CV content (using Gemini API call logic from /tailor)
            const prompt = `You are an expert resume writer. Given the following job description and candidate profile, generate a highly tailored CV (in Markdown format) focusing on maximizing keyword relevance. The job is: ${JSON.stringify(job)} and the profile is: ${JSON.stringify(profile)}.`;
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                config: { temperature: 0.2 },
            });

            const cvContent = response.text.trim();
            const cvFilePath = path.join(jobDir, `tailored_cv_${job.company}.md`);
            fs.writeFileSync(cvFilePath, cvContent);

            // Update database status
            await Application.update({ cv_created: true }, { where: { id: id } });

            res.redirect(`/details/${id}`);
        } catch (error) {
            console.error('Create CV Error:', error);
            res.status(500).send('Failed to create tailored CV via AI.');
        }
    });

    // 3. Create Cover Letter (Step 14)
    router.post('/details/create-cl/:id', async (req, res) => {
        const id = req.params.id;
        try {
            const job = await Application.findByPk(id, { raw: true });
            const profile = await Profile.findByPk(1, { raw: true });
            if (!job || !profile) return res.status(404).send('Resource not found.');

            const jobDir = path.join(__dirname, '..', 'documents', 'job-description', sanitize(job.company), sanitize(job.title));

            // Generate the cover letter content (using Gemini API call logic from /cover-letter)
            const prompt = `Write a concise, compelling cover letter (in Markdown format) for the job: ${JSON.stringify(job)} using the candidate's summary: ${profile.summary}.`;
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                config: { temperature: 0.5 },
            });

            const clContent = response.text.trim();
            const clFilePath = path.join(jobDir, `cover_letter_${job.company}.md`);
            fs.writeFileSync(clFilePath, clContent);

            // Update database status
            await Application.update({ cover_letter_created: true }, { where: { id: id } });

            res.redirect(`/details/${id}`);
        } catch (error) {
            console.error('Create CL Error:', error);
            res.status(500).send('Failed to create cover letter via AI.');
        }
    });

    return router;
};