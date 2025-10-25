// db/sequelize.js

const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// --- 1. Configure Sequelize ---
const sequelize = new Sequelize({
    dialect: 'sqlite',
    // Uses a relative path from the project root (where server.js is run)
    storage: path.join(__dirname, 'lazyhire.sqlite'), 
    logging: false, // Set to true for debugging SQL queries
});

// --- 2. Define the Model (Application) ---
const Application = sequelize.define('Application', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    title: { type: DataTypes.TEXT, allowNull: false },
    company: { type: DataTypes.TEXT, allowNull: false },
    location: { type: DataTypes.TEXT },
    status: { type: DataTypes.TEXT, defaultValue: 'New' },
    notes: { type: DataTypes.TEXT },
    date_applied: { type: DataTypes.TEXT },

    application_url: { type: DataTypes.TEXT }, 
    contact_name: { type: DataTypes.TEXT },    
    contact_phone: { type: DataTypes.TEXT },   
    contact_email: { type: DataTypes.TEXT },   
    cv_created: { type: DataTypes.BOOLEAN, defaultValue: false },
    cover_letter_created: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
    tableName: 'applications',
    timestamps: true 
});


// --- 3. Define the Model (Profile) ---
const Profile = sequelize.define('Profile', {
    // We use a fixed ID since we only support one user from .env for now
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        defaultValue: 1, 
    },
    full_name: { type: DataTypes.TEXT, allowNull: false },
    job_title: { type: DataTypes.TEXT },
    linkedin_url: { type: DataTypes.TEXT },
    contact_email: { type: DataTypes.TEXT },
    phone: { type: DataTypes.TEXT },
    summary: { type: DataTypes.TEXT },
    experience: { type: DataTypes.JSON }, // Store complex data as JSON
    education: { type: DataTypes.JSON },
    skills: { type: DataTypes.JSON },
    // Add other fields as detailed as your CV
}, {
    tableName: 'profile',
    timestamps: false
});

// --- 4. Synchronization and Export ---
async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');
        
        // This command creates the table if it doesn't exist.
        await Application.sync({ force: false }); 
        await Profile.sync({ force: false });
        console.log('Applications and Profile table synced.');
        
        return { sequelize, Application, Profile };
    } catch (err) {
        console.error('Database setup failed:', err);
        // Throw the error to be handled by server.js (e.g., stopping the app)
        throw err;
    }
}

// Export the initialization function
module.exports = initializeDatabase;