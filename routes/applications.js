// routes/applications.js

const express = require('express');
const router = express.Router();
const { attemptAutofill } = require('../services/tracker');

// POST route to trigger autofill for a specific job
router.post('/autofill/:applicationId', async (req, res) => {
    const applicationId = req.params.applicationId;
    
    // ⚠️ FUTURE: Fetch job URL and user profile data from DB based on applicationId

    // For now, use mock data:
    const jobUrl = 'https://mockjobboard.com/apply/' + applicationId; 
    const profileData = { name: 'SoloDev', email: process.env.RECIPIENT_EMAIL };

    try {
        const result = await attemptAutofill(jobUrl, profileData);
        
        // ⚠️ FUTURE: Update DB status to 'Applied' or 'Autofill Failed'

        res.json({
            status: 'success',
            data: result
        });
    } catch (error) {
        console.error('Autofill error:', error);
        res.status(500).json({ status: 'error', message: 'Autofill service failed.' });
    }
});

module.exports = router;