// services/run-scraper.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { scrapeJobs } = require('./scraper');

// Database setup
const dbPath = path.join(__dirname, '..', 'db', 'lazyhire.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
        process.exit(1);
    }
});

// Function to insert jobs into the database
function insertJobs(jobs) {
    const sql = `INSERT INTO applications (title, company, location, status, notes, date_applied) VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION;');
        jobs.forEach(job => {
            db.run(sql, [
                job.title,
                job.company,
                job.location,
                job.status,
                job.notes,
                job.date_applied
            ], function(err) {
                if (err) {
                    console.error(`Error inserting job: ${job.title}`, err.message);
                } else {
                    console.log(`[SUCCESS] Inserted job: ${job.title}`);
                }
            });
        });
        db.run('COMMIT;', (commitErr) => {
            if (commitErr) {
                console.error('Transaction commit error:', commitErr.message);
            } else {
                console.log(`\n✅ Finished job insertion. Total jobs inserted: ${jobs.length}`);
            }
        });
    });
}

// Main execution function
function main() {
    console.log('🤖 Starting LazyHire Job Aggregation...');
    const newJobs = scrapeJobs();
    
    if (newJobs.length > 0) {
        insertJobs(newJobs);
    } else {
        console.log('No new jobs found to insert.');
    }

    // Close the database connection after all operations are complete
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed.');
    });
}

main();