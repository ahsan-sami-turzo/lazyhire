// services/mailer.js

const nodemailer = require('nodemailer');

// 1. Create the transporter using environment variables
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SMTP_HOST,
    port: parseInt(process.env.EMAIL_SMTP_PORT),
    secure: process.env.EMAIL_SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Sends a daily digest email listing new job applications.
 * @param {Array<Object>} newJobs - List of jobs to include in the email.
 * @returns {Promise<void>}
 */
async function sendDailyDigest(newJobs) {
    if (!newJobs || newJobs.length === 0) {
        console.log("Mailer: No new jobs to send.");
        return;
    }

    const jobListHtml = newJobs.map(job => `
        <li>
            <strong>${job.title}</strong> at ${job.company} (${job.location})
            <br><small>Notes: ${job.notes || 'N/A'}</small>
        </li>
    `).join('');

    const mailOptions = {
        from: `LazyHire Digest <${process.env.EMAIL_USER}>`,
        to: process.env.RECIPIENT_EMAIL,
        subject: `[LazyHire Daily Digest] ${newJobs.length} New Job Opportunities`,
        html: `
            <p>Hello,</p>
            <p>Your scheduled job scrape found <strong>${newJobs.length} new opportunities</strong> today. Review them on your dashboard:</p>
            
            <a href="http://localhost:3000" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0;">Go to Dashboard</a>
            
            <h3>New Jobs:</h3>
            <ul style="list-style-type: none; padding-left: 0;">
                ${jobListHtml}
            </ul>
            
            <p>Happy job hunting!</p>
        `,
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log(`Mailer: Digest email sent successfully to ${process.env.RECIPIENT_EMAIL}. Message ID: ${info.messageId}`);
    } catch (error) {
        console.error('Mailer: Error sending email:', error);
        throw new Error("Failed to send daily digest email.");
    }
}

module.exports = {
    sendDailyDigest
};