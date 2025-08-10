const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Import the schema (you'll need to extract it to a separate models file)
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
    timestamps: true
});

// Pre-save middleware
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

const FCRProject = mongoose.model('FCRProject', fcrProjectSchema);

// Sample data for seeding
const sampleProjects = [
    {
        name: "Sample FCR Project 1",
        description: "This is a sample FCR project for testing purposes",
        processedData: [
            {
                id: "box_0",
                index: 1,
                description: "Sample Description 1",
                poNumbers: "PO-001",
                goods: "Ceramic Products",
                invoiceNo: "INV001",
                invoiceDate: "01-01-2024",
                adCode: "12345",
                expSerial: "000001",
                expYear: "2024",
                entryDate: "02-01-2024",
                lcContact: "LC-001",
                contactDate: "03-01-2024",
                countryCode: "US",
                formattedText: `Sample Description 1
ORDER NO. : PO-001
DESCRIPTION OF GOODS. : Ceramic Products
INVOICE NO. : INV001
DATE: 01-01-2024
EXP NO. : 12345/000001/2024
DATE: 02-01-2024
CONTRACT NO. : LC-001
DATE: 03-01-2024
H. S. CODE: 6911.10.00
COUNTRY: US`
            },
            {
                id: "box_1",
                index: 2,
                description: "Sample Description 2",
                poNumbers: "PO-002",
                goods: "Porcelain Items",
                invoiceNo: "INV002",
                invoiceDate: "05-01-2024",
                adCode: "12346",
                expSerial: "000002",
                expYear: "2024",
                entryDate: "06-01-2024",
                lcContact: "LC-002",
                contactDate: "07-01-2024",
                countryCode: "UK",
                formattedText: `Sample Description 2
ORDER NO. : PO-002
DESCRIPTION OF GOODS. : Porcelain Items
INVOICE NO. : INV002
DATE: 05-01-2024
EXP NO. : 12346/000002/2024
DATE: 06-01-2024
CONTRACT NO. : LC-002
DATE: 07-01-2024
H. S. CODE: 6911.10.00
COUNTRY: UK`
            }
        ],
        copiedBoxes: {
            "box_0": true
        },
        copyHistory: ["box_0"],
        tags: ["sample", "test", "ceramics"],
        createdBy: "seed_script"
    },
    {
        name: "Sample FCR Project 2",
        description: "Another sample project with different data",
        processedData: [
            {
                id: "box_0",
                index: 1,
                description: "Export Sample 1",
                poNumbers: "PO-100",
                goods: "Tableware",
                invoiceNo: "INV100",
                invoiceDate: "10-01-2024",
                adCode: "54321",
                expSerial: "000100",
                expYear: "2024",
                entryDate: "11-01-2024",
                lcContact: "LC-100",
                contactDate: "12-01-2024",
                countryCode: "DE",
                formattedText: `Export Sample 1
ORDER NO. : PO-100
DESCRIPTION OF GOODS. : Tableware
INVOICE NO. : INV100
DATE: 10-01-2024
EXP NO. : 54321/000100/2024
DATE: 11-01-2024
CONTRACT NO. : LC-100
DATE: 12-01-2024
H. S. CODE: 6911.10.00
COUNTRY: DE`
            }
        ],
        copiedBoxes: {},
        copyHistory: [],
        tags: ["export", "tableware"],
        createdBy: "seed_script"
    }
];

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fcr_generator');
        console.log('Connected to MongoDB');

        // Clear existing data
        await FCRProject.deleteMany({});
        console.log('Cleared existing projects');

        // Insert sample data
        const projects = await FCRProject.insertMany(sampleProjects);
        console.log(`Seeded ${projects.length} sample projects`);

        console.log('Database seeding completed successfully!');
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

// Run seeding if this script is called directly
if (require.main === module) {
    seedDatabase();
}

module.exports = { seedDatabase };
