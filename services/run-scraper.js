// services/run-scraper.js

const { runScraper } = require('./scraper-runner'); 

// The actual logic is now in scraper-runner.js
runScraper().catch(err => {
    console.error('Scraper execution failed:', err);
    process.exit(1);
});