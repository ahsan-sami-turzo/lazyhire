// services/scraper.js

/**
 * MOCK function to simulate fetching and parsing job data from an external source.
 * In a real scenario, this would use Playwright/Puppeteer.
 * @returns {Array<Object>} An array of job objects.
 */
function scrapeJobs() {
    console.log("... Running MOCK job scraper (simulating a 5-second fetch) ...");
    
    // Simulate complex scraping and parsing
    const newJobs = [
        {
            title: 'Frontend Engineer',
            company: 'Visma Oy',
            location: 'Finland (Remote)',
            status: 'New', // Default status for scraped jobs
            notes: 'High priority match due to React/Vue experience.',
            date_applied: new Date().toISOString().split('T')[0]
        },
        {
            title: 'Node.js Backend Developer',
            company: 'ABB Oy',
            location: 'Tampere, Finland',
            status: 'New', // Default status for scraped jobs
            notes: 'Strong Express and SQLite knowledge required.',
            date_applied: new Date().toISOString().split('T')[0]
        }
    ];

    return newJobs;
}

module.exports = {
    scrapeJobs
};