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
}, {
    tableName: 'applications', // Maps to the existing table name
    timestamps: false // Assuming you don't need 'createdAt' and 'updatedAt' columns
});

// --- 3. Synchronization and Export ---
async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');
        
        // This command creates the table if it doesn't exist.
        await Application.sync({ force: false }); 
        console.log('Applications table synced (ensured).');
        
        return { sequelize, Application };
    } catch (err) {
        console.error('Database setup failed:', err);
        // Throw the error to be handled by server.js (e.g., stopping the app)
        throw err;
    }
}

// Export the initialization function
module.exports = initializeDatabase;