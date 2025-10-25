// services/scraper-runner.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { scrapeJobs } = require('./scraper');

// Database setup
const dbPath = path.join(__dirname, '..', 'db', 'lazyhire.sqlite');

/**
 * Executes the scraping process and inserts new jobs into the database.
 * @param {boolean} logToConsole - Flag to enable console logging.
 * @returns {Promise<number>} - Resolves with the number of jobs inserted.
 */
function runScraper(logToConsole = true) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
            if (err) {
                if (logToConsole) console.error('Database connection error:', err.message);
                return reject(err);
            }
            if (logToConsole) console.log('Database connected for scraping run.');

            const newJobs = scrapeJobs();
            const jobsToInsert = newJobs.length;
            
            if (jobsToInsert === 0) {
                if (logToConsole) console.log('No new jobs found to insert.');
                db.close(() => resolve(0));
                return;
            }

            const sql = `INSERT INTO applications (title, company, location, status, notes, date_applied) VALUES (?, ?, ?, ?, ?, ?)`;
            let insertedCount = 0;
            
            db.serialize(() => {
                db.run('BEGIN TRANSACTION;');
                newJobs.forEach(job => {
                    db.run(sql, [
                        job.title,
                        job.company,
                        job.location,
                        job.status,
                        job.notes,
                        job.date_applied
                    ], function(err) {
                        if (err) {
                            if (logToConsole) console.error(`Error inserting job: ${job.title}`, err.message);
                        } else {
                            insertedCount++;
                            if (logToConsole) console.log(`[SUCCESS] Inserted job: ${job.title}`);
                        }
                    });
                });
                
                db.run('COMMIT;', (commitErr) => {
                    db.close((closeErr) => {
                        if (closeErr) console.error('Database closing error:', closeErr.message);
                        if (commitErr) {
                            if (logToConsole) console.error('Transaction commit error:', commitErr.message);
                            return reject(commitErr);
                        }
                        if (logToConsole) console.log(`\n✅ Finished job insertion. Total jobs inserted: ${insertedCount}`);
                        resolve(insertedCount);
                    });
                });
            });
        });
    });
}

// Modify the old run-scraper.js to use this new module (Optional: for cleaner CLI)
if (require.main === module) {
    runScraper().catch(err => {
        console.error('Scraper failed:', err);
        process.exit(1);
    });
}

module.exports = { runScraper };