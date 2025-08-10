
// -----------------------------------------------------------
// scripts/resetDb.js - Database reset script

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function resetDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fcr_generator');
        console.log('Connected to MongoDB');

        // Drop the entire database
        await mongoose.connection.db.dropDatabase();
        console.log('Database reset completed - all collections dropped');

    } catch (error) {
        console.error('Error resetting database:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

// Run reset if this script is called directly
if (require.main === module) {
    console.log('⚠️  WARNING: This will delete ALL data in the database!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');

    setTimeout(resetDatabase, 5000);
}

module.exports = { resetDatabase };

