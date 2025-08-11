// server.js - Simplified Express Backend with MongoDB for FCR Generator
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*' })); // Only for development!
app.use(express.json({ limit: '50mb' }));

// MongoDB Connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fcr_generator');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// Simplified FCR Project Schema
const fcrProjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    year: {
        type: Number,
        required: true
    },
    processedData: [{
        id: String,
        index: Number,
        description: String,
        poNumbers: String,
        goods: String,
        invoiceNo: String,
        invoiceDate: String,
        adCode: String,
        expSerial: String,
        expYear: String,
        entryDate: String,
        lcContact: String,
        contactDate: String,
        countryCode: String,
        formattedText: String
    }],
    copiedBoxes: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

const FCRProject = mongoose.model('FCRProject', fcrProjectSchema);

// Routes

// GET /api/projects - Get all projects
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await FCRProject.find()
            .sort({ updatedAt: -1 })
            .select('name year createdAt updatedAt')
            .lean();

        res.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// GET /api/projects/:id - Get project by ID
app.get('/api/projects/:id', async (req, res) => {
    try {
        const project = await FCRProject.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json(project);
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

// POST /api/projects - Create new project
app.post('/api/projects', async (req, res) => {
    try {
        const { name, year, processedData, copiedBoxes } = req.body;

        // Validation
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Project name is required' });
        }

        if (!year) {
            return res.status(400).json({ error: 'Project year is required' });
        }

        if (!processedData || !Array.isArray(processedData) || processedData.length === 0) {
            return res.status(400).json({ error: 'Processed data is required' });
        }

        // Check for duplicate name and year combination
        const existingProject = await FCRProject.findOne({
            name: name.trim(),
            year: parseInt(year)
        });

        if (existingProject) {
            return res.status(409).json({ error: 'Project with this name and year already exists' });
        }

        const project = new FCRProject({
            name: name.trim(),
            year: parseInt(year),
            processedData,
            copiedBoxes: copiedBoxes || {}
        });

        const savedProject = await project.save();
        console.log('Project created:', savedProject.name, savedProject.year);
        res.status(201).json(savedProject);
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// PUT /api/projects/:id - Update project
app.put('/api/projects/:id', async (req, res) => {
    try {
        const { name, year, processedData, copiedBoxes } = req.body;

        // Build update object
        const updateData = {};

        if (name && name.trim()) {
            updateData.name = name.trim();
        }

        if (year) {
            updateData.year = parseInt(year);
        }

        if (processedData) {
            updateData.processedData = processedData;
        }

        if (copiedBoxes !== undefined) {
            updateData.copiedBoxes = copiedBoxes;
        }

        // Always update the timestamp
        updateData.updatedAt = new Date();

        console.log('Updating project with:', updateData);

        const project = await FCRProject.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        console.log('Project updated:', project.name, project.year);
        res.json(project);
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

// DELETE /api/projects/:id - Delete project
app.delete('/api/projects/:id', async (req, res) => {
    try {
        const project = await FCRProject.findByIdAndDelete(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Connect to MongoDB and start server
const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
};

startServer().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});