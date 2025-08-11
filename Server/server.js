// server.js - Express Backend with MongoDB for FCR Generator
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// app.use(cors({
//     origin: process.env.CLIENT_URL || 'http://localhost:3000',
//     credentials: true
// }));

app.use(cors({
    origin: '*' // Only for development!
}));


app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


// MongoDB Connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fcr_generator', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// FCR Project Schema
const fcrProjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxLength: 100
    },
    description: {
        type: String,
        maxLength: 500,
        default: ''
    },
    year: {
        type: String,
        maxLength: 500,

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
    },
    copyHistory: [{
        type: String
    }],
    totalBoxes: {
        type: Number,
        default: 0
    },
    copiedCount: {
        type: Number,
        default: 0
    },
    completionPercentage: {
        type: Number,
        default: 0
    },
    tags: [{
        type: String,
        trim: true
    }],
    isArchived: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: String,
        default: 'system'
    },
    lastExportDate: {
        type: Date
    },
    exportCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for calculating completion percentage
fcrProjectSchema.virtual('calculatedCompletionPercentage').get(function () {
    if (!this.processedData || this.processedData.length === 0) return 0;
    const copiedCount = Object.keys(this.copiedBoxes || {}).length;
    return Math.round((copiedCount / this.processedData.length) * 100);
});

// Pre-save middleware to update statistics
fcrProjectSchema.pre('save', function (next) {
    if (this.processedData) {
        this.totalBoxes = this.processedData.length;
        this.copiedCount = Object.keys(this.copiedBoxes || {}).length;
        this.completionPercentage = this.totalBoxes > 0
            ? Math.round((this.copiedCount / this.totalBoxes) * 100)
            : 0;
    }
    next();
});

// Index for better query performance
fcrProjectSchema.index({ name: 1, createdBy: 1 });
fcrProjectSchema.index({ createdAt: -1 });
fcrProjectSchema.index({ updatedAt: -1 });
fcrProjectSchema.index({ isArchived: 1 });

const FCRProject = mongoose.model('FCRProject', fcrProjectSchema);

// Routes

// GET /api/projects - Get all projects
app.get('/api/projects', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            sortBy = 'updatedAt',
            sortOrder = 'desc',
            isArchived = false,
            createdBy
        } = req.query;

        const filter = { isArchived: isArchived === 'true' };

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        if (createdBy) {
            filter.createdBy = createdBy;
        }

        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const projects = await FCRProject.find(filter)
            .select('name description totalBoxes copiedCount completionPercentage tags createdBy createdAt updatedAt lastExportDate exportCount')
            .sort(sort)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        const total = await FCRProject.countDocuments(filter);

        res.json({
            projects,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
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
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid project ID' });
        }
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

// POST /api/projects - Create new project
app.post('/api/projects', async (req, res) => {
    try {
        const {
            name,
            description,
            processedData,
            copiedBoxes,
            copyHistory,
            tags,
            createdBy
        } = req.body;

        // Validation
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Project name is required' });
        }

        if (!processedData || !Array.isArray(processedData) || processedData.length === 0) {
            return res.status(400).json({ error: 'Processed data is required' });
        }

        // Check for duplicate name
        const existingProject = await FCRProject.findOne({
            name: name.trim(),
            isArchived: false
        });

        if (existingProject) {
            return res.status(409).json({ error: 'Project with this name already exists' });
        }

        const project = new FCRProject({
            name: name.trim(),
            description: description?.trim() || '',
            processedData,
            copiedBoxes: copiedBoxes || {},
            copyHistory: copyHistory || [],
            tags: tags || [],
            createdBy: createdBy || 'system'
        });

        const savedProject = await project.save();
        res.status(201).json(savedProject);
    } catch (error) {
        console.error('Error creating project:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// PUT /api/projects/:id - Update project
app.put('/api/projects/:id', async (req, res) => {
    try {
        const {
            name,
            description,
            processedData,
            copiedBoxes,
            copyHistory,
            tags
        } = req.body;

        const updateData = {
            updatedAt: new Date()
        };

        if (name && name.trim()) {
            // Check for duplicate name (excluding current project)
            const existingProject = await FCRProject.findOne({
                name: name.trim(),
                _id: { $ne: req.params.id },
                isArchived: false
            });

            if (existingProject) {
                return res.status(409).json({ error: 'Project with this name already exists' });
            }
            updateData.name = name.trim();
        }

        if (description !== undefined) {
            updateData.description = description.trim();
        }

        if (processedData) {
            updateData.processedData = processedData;
        }

        if (copiedBoxes !== undefined) {
            updateData.copiedBoxes = copiedBoxes;
        }

        if (copyHistory) {
            updateData.copyHistory = copyHistory;
        }

        if (tags) {
            updateData.tags = tags;
        }

        const project = await FCRProject.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json(project);
    } catch (error) {
        console.error('Error updating project:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid project ID' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to update project' });
    }
});

// PUT /api/projects/:projectId/copy-status
app.put('/api/projects/:projectId/copy-status', async (req, res) => {
    const { projectId } = req.params;
    const { boxId, isCopied } = req.body;

    try {
        // Update the copiedBoxes field in MongoDB
        const updateQuery = {};

        if (isCopied) {
            // Set boxId to true
            updateQuery[`copiedBoxes.${boxId}`] = true;
        } else {
            // Remove boxId from copiedBoxes
            updateQuery = {
                $unset: { [`copiedBoxes.${boxId}`]: "" },
                $set: { updatedAt: new Date() }
            };
        }

        const project = await Project.findByIdAndUpdate(
            projectId,
            isCopied ? {
                $set: {
                    [`copiedBoxes.${boxId}`]: true,
                    updatedAt: new Date()
                }
            } : updateQuery,
            { new: true }
        );

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({
            success: true,
            copiedBoxes: project.copiedBoxes
        });

    } catch (error) {
        console.error('Error updating copy status:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/projects/:id - Delete project
app.delete('/api/projects/:id', async (req, res) => {
    try {
        const { permanent } = req.query;

        if (permanent === 'true') {
            // Permanently delete
            const project = await FCRProject.findByIdAndDelete(req.params.id);
            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }
            res.json({ message: 'Project permanently deleted' });
        } else {
            // Archive project
            const project = await FCRProject.findByIdAndUpdate(
                req.params.id,
                { isArchived: true, updatedAt: new Date() },
                { new: true }
            );

            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            res.json({ message: 'Project archived', project });
        }
    } catch (error) {
        console.error('Error deleting project:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid project ID' });
        }
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

// POST /api/projects/:id/restore - Restore archived project
app.post('/api/projects/:id/restore', async (req, res) => {
    try {
        const project = await FCRProject.findByIdAndUpdate(
            req.params.id,
            { isArchived: false, updatedAt: new Date() },
            { new: true }
        );

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({ message: 'Project restored', project });
    } catch (error) {
        console.error('Error restoring project:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid project ID' });
        }
        res.status(500).json({ error: 'Failed to restore project' });
    }
});

// POST /api/projects/:id/export - Track export
app.post('/api/projects/:id/export', async (req, res) => {
    try {
        const project = await FCRProject.findByIdAndUpdate(
            req.params.id,
            {
                lastExportDate: new Date(),
                $inc: { exportCount: 1 },
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({ message: 'Export tracked', project });
    } catch (error) {
        console.error('Error tracking export:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid project ID' });
        }
        res.status(500).json({ error: 'Failed to track export' });
    }
});

// GET /api/projects/:id/statistics - Get project statistics
app.get('/api/projects/:id/statistics', async (req, res) => {
    try {
        const project = await FCRProject.findById(req.params.id).select(
            'name totalBoxes copiedCount completionPercentage exportCount lastExportDate createdAt updatedAt processedData copiedBoxes'
        );

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Calculate additional statistics
        const statistics = {
            projectName: project.name,
            totalBoxes: project.totalBoxes,
            copiedCount: project.copiedCount,
            remainingCount: project.totalBoxes - project.copiedCount,
            completionPercentage: project.completionPercentage,
            exportCount: project.exportCount,
            lastExportDate: project.lastExportDate,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            daysSinceCreation: Math.floor((new Date() - project.createdAt) / (1000 * 60 * 60 * 24)),
            daysSinceLastUpdate: Math.floor((new Date() - project.updatedAt) / (1000 * 60 * 60 * 24))
        };

        // Calculate progress trend (if processedData exists)
        if (project.processedData && project.processedData.length > 0) {
            const recentlyCopied = project.copyHistory ? project.copyHistory.slice(-10) : [];
            statistics.recentActivity = recentlyCopied.length;
        }

        res.json(statistics);
    } catch (error) {
        console.error('Error fetching statistics:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid project ID' });
        }
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// GET /api/dashboard - Dashboard statistics
app.get('/api/dashboard', async (req, res) => {
    try {
        const [
            totalProjects,
            archivedProjects,
            totalBoxes,
            totalCopiedBoxes,
            recentProjects
        ] = await Promise.all([
            FCRProject.countDocuments({ isArchived: false }),
            FCRProject.countDocuments({ isArchived: true }),
            FCRProject.aggregate([
                { $match: { isArchived: false } },
                { $group: { _id: null, total: { $sum: '$totalBoxes' } } }
            ]),
            FCRProject.aggregate([
                { $match: { isArchived: false } },
                { $group: { _id: null, total: { $sum: '$copiedCount' } } }
            ]),
            FCRProject.find({ isArchived: false })
                .sort({ updatedAt: -1 })
                .limit(5)
                .select('name completionPercentage totalBoxes copiedCount updatedAt')
        ]);

        const dashboard = {
            totalProjects,
            archivedProjects,
            activeProjects: totalProjects,
            totalBoxes: totalBoxes[0]?.total || 0,
            totalCopiedBoxes: totalCopiedBoxes[0]?.total || 0,
            overallCompletionPercentage: totalBoxes[0]?.total > 0
                ? Math.round(((totalCopiedBoxes[0]?.total || 0) / totalBoxes[0].total) * 100)
                : 0,
            recentProjects
        };

        res.json(dashboard);
    } catch (error) {
        console.error('Error fetching dashboard:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
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