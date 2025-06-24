const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/auth/model');
const Project = require('../src/project/model');

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Add any initial data here
        console.log('Database seeded successfully');

        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seedDatabase();