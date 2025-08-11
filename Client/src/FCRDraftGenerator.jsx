import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Download, Search, X, RotateCcw, Save, Eye, FileText, AlertCircle, CheckCircle, Loader, Database, Copy, Check, Calendar } from 'lucide-react';
import Papa from 'papaparse';

const FCRDraftGenerator = () => {
    const [inputData, setInputData] = useState(null);
    const [processedData, setProcessedData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState([]);
    const [copiedBoxes, setCopiedBoxes] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [currentFilter, setCurrentFilter] = useState('all');
    const [lastCopiedBoxId, setLastCopiedBoxId] = useState(null);
    const [projectName, setProjectName] = useState('');
    const [projectYear, setProjectYear] = useState(new Date().getFullYear().toString());
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [savedProjects, setSavedProjects] = useState([]);
    const [currentProject, setCurrentProject] = useState(null);
    const [notification, setNotification] = useState(null);
    const searchInputRef = useRef(null);

    // API endpoints - adjust these to match your backend URL
    const API_BASE = 'https://demco-fcr-server.vercel.app/api';

    // Required columns for FCR data
    const requiredColumns = [
        'EXP Serial', 'Invoice Date', 'Entry Date', 'Date of Contact',
        'Description', 'PO Numbers', 'Invoice No', 'AD Code', 'EXP Year',
        'Lc Contact', 'Country short code', 'Goods'
    ];

    // Notification system (SweetAlert-like)
    const showNotification = (message, type = 'info', duration = 5000) => {
        const id = Date.now();
        const newNotification = { id, message, type };
        setNotification(newNotification);

        setTimeout(() => {
            setNotification(null);
        }, duration);
    };

    const addLog = useCallback((message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { message, type, timestamp }]);
    }, []);

    // Formatting functions
    const formatExpSerial = (expSerial) => {
        try {
            const cleanSerial = parseInt(parseFloat(expSerial), 10);
            return cleanSerial.toString().padStart(6, '0');
        } catch {
            return String(expSerial || '');
        }
    };

    const formatDate = (dateStr) => {
        try {
            if (!dateStr || dateStr === '') return '';
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return String(dateStr);

            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        } catch {
            return String(dateStr || '');
        }
    };

    const formatNumber = (value) => {
        try {
            if (!value || value === '') return '';
            const num = parseFloat(value);
            if (isNaN(num)) return String(value);
            return Number.isInteger(num) ? num.toString() : num.toString();
        } catch {
            return String(value || '');
        }
    };

    // Load saved projects from MongoDB
    const loadProjects = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE}/projects`);
            if (response.ok) {
                const projects = await response.json();
                setSavedProjects(projects);
            }
        } catch (error) {
            addLog('Failed to load saved projects', 'error');
            showNotification('Failed to load saved projects', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Save project to MongoDB
    const saveProjectToMongoDB = async () => {
        if (!processedData || !projectName.trim()) {
            const errorMsg = 'Please enter a project name and process data first';
            addLog(errorMsg, 'error');
            showNotification(errorMsg, 'error');
            return;
        }

        try {
            setIsSaving(true);
            const projectData = {
                name: projectName.trim(),
                year: parseInt(projectYear), // Ensure year is saved as number
                processedData,
                copiedBoxes,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const response = await fetch(`${API_BASE}/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(projectData)
            });

            if (response.ok) {
                const savedProject = await response.json();
                setCurrentProject(savedProject);
                const successMsg = `Project "${projectName}" (${projectYear}) saved successfully!`;
                addLog(successMsg, 'success');
                showNotification(successMsg, 'success');
                loadProjects(); // Refresh the projects list
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Failed to save project');
            }
        } catch (error) {
            const errorMsg = `Failed to save project: ${error.message}`;
            addLog(errorMsg, 'error');
            showNotification(errorMsg, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Update project in MongoDB
    const updateProject = async () => {
        if (!currentProject) {
            await saveProjectToMongoDB();
            return;
        }

        try {
            setIsSaving(true);
            const updateData = {
                name: projectName.trim(),
                year: parseInt(projectYear), // Ensure year is saved as number
                processedData,
                copiedBoxes,
                updatedAt: new Date()
            };

            const response = await fetch(`${API_BASE}/projects/${currentProject._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                const updatedProject = await response.json();
                setCurrentProject(updatedProject);
                const successMsg = `Project "${projectName}" (${projectYear}) updated successfully!`;
                addLog(successMsg, 'success');
                showNotification(successMsg, 'success');
                loadProjects(); // Refresh the projects list
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Failed to update project');
            }
        } catch (error) {
            const errorMsg = `Failed to update project: ${error.message}`;
            addLog(errorMsg, 'error');
            showNotification(errorMsg, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Load projects on component mount
    useEffect(() => {
        loadProjects();
    }, []);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            setLogs([]);
            addLog(`Reading file: ${file.name}`);

            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: false,
                delimiter: "",
                delimitersToGuess: [',', ';', '\t', '|'],
                complete: (results) => {
                    try {
                        if (!results.data || results.data.length === 0) {
                            throw new Error('No valid data found in file');
                        }

                        const headers = results.meta.fields || [];
                        const missingColumns = requiredColumns.filter(col => !headers.includes(col));

                        if (missingColumns.length > 0) {
                            throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
                        }

                        addLog(`Successfully loaded ${results.data.length} records`);
                        showNotification(`Successfully loaded ${results.data.length} records`, 'success');
                        setInputData(results.data);

                        // Auto-set project name from filename if not already set
                        if (!projectName) {
                            const fileName = file.name.replace(/\.[^/.]+$/, "");
                            setProjectName(fileName);
                        }

                    } catch (error) {
                        addLog(`Error: ${error.message}`, 'error');
                        showNotification(`Error: ${error.message}`, 'error');
                    }
                },
                error: (error) => {
                    const errorMsg = `Failed to parse file: ${error.message}`;
                    addLog(errorMsg, 'error');
                    showNotification(errorMsg, 'error');
                }
            });

        } catch (error) {
            const errorMsg = `Error loading file: ${error.message}`;
            addLog(errorMsg, 'error');
            showNotification(errorMsg, 'error');
        }
    };

    const processData = () => {
        if (!inputData) {
            const errorMsg = 'Please upload a data file first';
            addLog(errorMsg, 'error');
            showNotification(errorMsg, 'error');
            return;
        }

        setIsProcessing(true);
        addLog('Starting FCR data processing');

        try {
            const processed = inputData.map((row, index) => {
                const expSerial = formatExpSerial(row['EXP Serial']);
                const invoiceDate = formatDate(row['Invoice Date']);
                const entryDate = formatDate(row['Entry Date']);
                const contactDate = formatDate(row['Date of Contact']);
                const invoiceNo = formatNumber(row['Invoice No']);
                const adCode = formatNumber(row['AD Code']);
                const expYear = formatNumber(row['EXP Year']);

                const boxId = `box_${index}`;

                return {
                    id: boxId,
                    index: index + 1,
                    description: row['Description'] || '',
                    poNumbers: row['PO Numbers'] || '',
                    goods: row['Goods'] || '',
                    invoiceNo,
                    invoiceDate,
                    adCode,
                    expSerial,
                    expYear,
                    entryDate,
                    lcContact: row['Lc Contact'] || '',
                    contactDate,
                    countryCode: row['Country short code'] || '',
                    formattedText: `100% PORCELAIN TABLEWARE
ORDER NO. : ${row['PO Numbers'] || ''}
DESCRIPTION OF GOODS. : ${row['Goods'] || ''}
INVOICE NO. : ${invoiceNo}
DATE: ${invoiceDate}
EXP NO. : ${adCode}/${expSerial}/${expYear}
DATE: ${entryDate}
CONTRACT NO. : ${row['Lc Contact'] || ''}
DATE: ${contactDate}
H. S. CODE: 6911.10.00
COUNTRY: ${row['Country short code'] || ''}`
                };
            });

            setProcessedData(processed);
            const successMsg = `Successfully processed ${processed.length} records`;
            addLog(successMsg, 'success');
            showNotification(successMsg, 'success');
            addLog('Processing completed successfully', 'success');

        } catch (error) {
            const errorMsg = `Processing failed: ${error.message}`;
            addLog(errorMsg, 'error');
            showNotification(errorMsg, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const copyToClipboard = async (boxId, content) => {
        try {
            await navigator.clipboard.writeText(content);
            setCopiedBoxes(prev => ({ ...prev, [boxId]: true }));
            setLastCopiedBoxId(boxId);
            addLog('Box content copied to clipboard!', 'success');
            showNotification('Content copied to clipboard!', 'success', 2000);
        } catch (error) {
            const errorMsg = 'Failed to copy to clipboard';
            addLog(errorMsg, 'error');
            showNotification(errorMsg, 'error');
        }
    };

    const undoCopy = (boxId) => {
        setCopiedBoxes(prev => {
            const updated = { ...prev };
            delete updated[boxId];
            return updated;
        });

        if (lastCopiedBoxId === boxId) {
            setLastCopiedBoxId(null);
        }

        addLog('Copied status removed!', 'success');
        showNotification('Copied status removed!', 'success', 2000);
    };

    const undoLastCopy = () => {
        if (lastCopiedBoxId && copiedBoxes[lastCopiedBoxId]) {
            undoCopy(lastCopiedBoxId);
            addLog('Last copy action undone!', 'success');
            showNotification('Last copy action undone!', 'success', 2000);
        } else {
            const errorMsg = 'No recent copy action to undo!';
            addLog(errorMsg, 'error');
            showNotification(errorMsg, 'error');
        }
    };

    const resetAllCopied = () => {
        setCopiedBoxes({});
        setLastCopiedBoxId(null);
        addLog('All copied status has been reset!', 'success');
        showNotification('All copied status has been reset!', 'success');
    };

    const getFilteredData = () => {
        if (!processedData) return [];

        let filtered = processedData;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(item =>
                item.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply copy status filter
        if (currentFilter === 'copied') {
            filtered = filtered.filter(item => copiedBoxes[item.id]);
        } else if (currentFilter === 'not-copied') {
            filtered = filtered.filter(item => !copiedBoxes[item.id]);
        }

        return filtered;
    };

    // Improved Export to DOC with better formatting
    const exportToDOC = () => {
        if (!processedData) return;

        const filteredData = getFilteredData();
        const copiedCount = filteredData.filter(item => copiedBoxes[item.id]).length;

        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FCR Export - ${projectName} ${projectYear}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .header {
            background: white;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header h1 {
            color: #2563eb;
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .header p {
            color: #6b7280;
            font-size: 1.1rem;
            margin-bottom: 5px;
        }
        
        .stats {
            display: flex;
            justify-content: center;
            gap: 40px;
            margin: 20px 0;
        }
        
        .stat-item {
            text-align: center;
        }
        
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: #059669;
        }
        
        .stat-label {
            font-size: 0.9rem;
            color: #6b7280;
        }
        
        .progress-bar {
            width: 100%;
            height: 12px;
            background: #e5e7eb;
            border-radius: 6px;
            overflow: hidden;
            margin: 20px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981, #059669);
            transition: width 0.3s ease;
        }
        
        .boxes-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
        }
        
        .fcr-box {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 25px;
            position: relative;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        }
        
        .fcr-box.copied {
            border-color: #fbbf24;
            background: #fffbeb;
        }
        
        .box-number {
            position: absolute;
            top: -12px;
            left: -12px;
            width: 32px;
            height: 32px;
            background: #1f2937;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 0.9rem;
        }
        
        .copied-badge {
            position: absolute;
            top: -8px;
            right: -8px;
            background: #10b981;
            color: white;
            font-size: 0.75rem;
            font-weight: bold;
            padding: 4px 8px;
            border-radius: 12px;
        }
        
        .box-header {
            border-bottom: 2px solid #1f2937;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        
        .box-header h3 {
            font-size: 1.2rem;
            font-weight: bold;
        }
        
        .box-content {
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            line-height: 1.5;
            white-space: pre-line;
            color: #374151;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #6b7280;
            font-size: 0.9rem;
            padding: 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .fcr-box {
                page-break-inside: avoid;
                margin-bottom: 20px;
            }
            
            .header {
                page-break-after: avoid;
            }
        }
        
        @media (max-width: 768px) {
            .stats {
                flex-direction: column;
                gap: 20px;
            }
            
            .boxes-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>FCR Export Report</h1>
            <p><strong>${projectName} - ${projectYear}</strong></p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-number">${filteredData.length}</div>
                    <div class="stat-label">Total Boxes</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${copiedCount}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${filteredData.length - copiedCount}</div>
                    <div class="stat-label">Remaining</div>
                </div>
            </div>
            
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${((copiedCount / filteredData.length) * 100).toFixed(1)}%"></div>
            </div>
            <p><strong>Progress: ${((copiedCount / filteredData.length) * 100).toFixed(1)}% Complete</strong></p>
        </div>
        
        <div class="boxes-grid">
            ${filteredData.map((item) => `
                <div class="fcr-box ${copiedBoxes[item.id] ? 'copied' : ''}">
                    <div class="box-number">${item.index}</div>
                    ${copiedBoxes[item.id] ? '<div class="copied-badge">✓ COMPLETED</div>' : ''}
                    
                    <div class="box-header">
                        <h3>Invoice No.: ${item.invoiceNo}</h3>
                    </div>
                    
                    <div class="box-content">${item.formattedText}</div>
                </div>
            `).join('')}
        </div>
        
        <div class="footer">
            <p><strong>FCR Draft Generator</strong> by Mahabubul Alam Arif | GitHub: arif547</p>
            <p>Export completed at ${new Date().toLocaleString()}</p>
            <p>Total Records: ${filteredData.length} | Completed: ${copiedCount} | Progress: ${((copiedCount / filteredData.length) * 100).toFixed(1)}%</p>
        </div>
    </div>
</body>
</html>`;

        const blob = new Blob([htmlContent], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `FCR_${projectName.replace(/[^a-z0-9]/gi, '_')}_${projectYear}_${new Date().toISOString().split('T')[0]}.doc`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        addLog('FCR data exported to DOC file successfully!', 'success');
        showNotification('FCR data exported successfully!', 'success');
    };

    const copiedCount = Object.keys(copiedBoxes).length;
    const totalCount = processedData?.length || 0;
    const progressPercent = totalCount > 0 ? (copiedCount / totalCount) * 100 : 0;
    const filteredData = getFilteredData();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Notification System */}
            {notification && (
                <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-lg shadow-lg border-l-4 ${notification.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' :
                    notification.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
                        'bg-blue-50 border-blue-500 text-blue-800'
                    } flex items-center space-x-2 min-w-80 max-w-md`}>
                    {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                    {notification.type === 'info' && <FileText className="w-5 h-5 text-blue-500" />}
                    <span className="font-medium">{notification.message}</span>
                    <button
                        onClick={() => setNotification(null)}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Fixed toolbar */}
            <div className="fixed top-4 right-4 z-40 bg-white rounded-lg shadow-lg p-3 flex gap-2">
                <button
                    onClick={updateProject}
                    disabled={isSaving}
                    className="p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                    title="Save to MongoDB"
                >
                    {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                </button>
                <button
                    onClick={undoLastCopy}
                    className="p-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                    title="Undo Last Copy"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
                <button
                    onClick={resetAllCopied}
                    className="p-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    title="Reset All"
                >
                    <X className="w-4 h-4" />
                </button>
                <button
                    onClick={exportToDOC}
                    disabled={!processedData}
                    className="p-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
                    title="Export to DOC"
                >
                    <Download className="w-4 h-4" />
                </button>
            </div>

            {/* Progress indicator */}
            {totalCount > 0 && (
                <div className="fixed bottom-4 left-4 z-40 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg">
                    Progress: {copiedCount} / {totalCount} ({progressPercent.toFixed(1)}%)
                </div>
            )}

            {/* Progress bar */}
            <div className="fixed bottom-0 left-0 w-full h-1 bg-gray-200 z-30">
                <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            <div className="container mx-auto px-6 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <FileText className="w-12 h-12 text-indigo-600 mr-3" />
                        <h1 className="text-4xl font-bold text-gray-800">FCR Draft Generator</h1>
                    </div>
                    <p className="text-lg text-gray-600">Interactive FCR document generator with MongoDB storage</p>
                    <p className="text-sm text-gray-500 mt-2">by Mahabubul Alam Arif | GitHub: arif547</p>
                </div>

                {/* Project Management Section */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
                    <div className="flex items-center mb-4">
                        <Database className="w-6 h-6 text-blue-600 mr-2" />
                        <h3 className="text-xl font-semibold text-gray-800">Project Management</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Project Name Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
                            <input
                                type="text"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                placeholder="Enter project name..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Project Year Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                Project Year
                            </label>
                            <input
                                type="number"
                                value={projectYear}
                                onChange={(e) => setProjectYear(e.target.value)}
                                placeholder="Enter project year..."
                                min="2000"
                                max="2099"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Save Button */}
                        <div className="flex items-end">
                            <button
                                onClick={updateProject}
                                disabled={isSaving || !processedData}
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : currentProject ? (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Update Project
                                    </>
                                ) : (
                                    <>
                                        <Database className="w-4 h-4 mr-2" />
                                        Save New Project
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {currentProject && (
                        <div className="mt-4 p-3 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-800">
                                <CheckCircle className="w-4 h-4 inline mr-1" />
                                Currently working on: <strong>{currentProject.name} ({currentProject.year})</strong>
                                <span className="ml-2 text-green-600">
                                    (Last updated: {new Date(currentProject.updatedAt).toLocaleString()})
                                </span>
                            </p>
                        </div>
                    )}

                    {/* Saved Projects List */}
                    {savedProjects.length > 0 && (
                        <div className="mt-6">
                            <h4 className="text-lg font-medium text-gray-700 mb-3">Recent Projects</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-40 overflow-y-auto">
                                {savedProjects
                                    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                                    .slice(0, 6)
                                    .map((project) => (
                                        <div
                                            key={project._id}
                                            className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${currentProject?._id === project._id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                                                }`}
                                            onClick={() => {
                                                setCurrentProject(project);
                                                setProjectName(project.name);
                                                setProjectYear(project.year.toString());
                                                if (project.processedData) {
                                                    setProcessedData(project.processedData);
                                                    setCopiedBoxes(project.copiedBoxes || {});
                                                    showNotification(`Loaded project: ${project.name} (${project.year})`, 'success');
                                                }
                                            }}
                                        >
                                            <p className="font-medium text-sm text-gray-800">{project.name}</p>
                                            <p className="text-xs text-gray-500">Year: {project.year}</p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(project.updatedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* File upload section */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-dashed border-blue-300 hover:border-blue-400 transition-colors">
                        <div className="text-center">
                            <Upload className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">Upload FCR Data File</h3>
                            <p className="text-gray-600 mb-4">Upload CSV file with FCR data</p>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {inputData && (
                                <div className="mt-3 flex items-center justify-center text-green-600">
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    <span className="text-sm font-medium">{inputData.length} records loaded</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Process button */}
                    <div className="text-center mt-8">
                        <button
                            onClick={processData}
                            disabled={!inputData || isProcessing}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-8 rounded-xl text-lg shadow-lg transform hover:scale-105 disabled:hover:scale-100 transition-all duration-200 disabled:cursor-not-allowed flex items-center mx-auto"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader className="w-6 h-6 mr-3 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Eye className="w-6 h-6 mr-3" />
                                    Process Data
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Search and filter controls */}
                {processedData && (
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Search className="w-5 h-5 text-gray-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search by Invoice Number or Description..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="p-2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-2">
                                {['all', 'copied', 'not-copied'].map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => setCurrentFilter(filter)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${currentFilter === filter
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                    >
                                        {filter === 'all' ? 'All' : filter === 'copied' ? 'Copied' : 'Not Copied'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {filteredData.length > 0 && (
                            <div className="mt-4 text-sm text-gray-600">
                                Showing {filteredData.length} of {processedData.length} boxes
                            </div>
                        )}
                    </div>
                )}

                {/* FCR Boxes Grid */}
                {filteredData.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {filteredData.map((item) => (
                            <div
                                key={item.id}
                                className={`relative bg-white border-2 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer transform hover:-translate-y-1 ${copiedBoxes[item.id]
                                    ? 'border-amber-400 bg-yellow-50'
                                    : 'border-gray-300 hover:border-blue-400'
                                    }`}
                                onClick={() => copyToClipboard(item.id, item.formattedText)}
                            >
                                {/* Box number */}
                                <div className="absolute -top-3 -left-3 w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                    {item.index}
                                </div>

                                {/* Copied indicator */}
                                {copiedBoxes[item.id] && (
                                    <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-2">
                                        <Check className="w-4 h-4" />
                                    </div>
                                )}

                                {/* Undo button for copied boxes */}
                                {copiedBoxes[item.id] && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            undoCopy(item.id);
                                        }}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                        title="Remove copied status"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}

                                {/* Header */}
                                <div className="border-b-2 border-gray-800 pb-2 mb-4">
                                    <h3 className="font-bold text-lg">Invoice No.: {item.invoiceNo}</h3>
                                </div>

                                {/* Content */}
                                <div className="space-y-1 text-sm font-mono leading-relaxed whitespace-pre-line">
                                    {item.formattedText}
                                </div>

                                {/* Copy button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(item.id, item.formattedText);
                                    }}
                                    className="absolute bottom-3 right-3 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Copy content"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Logs section */}
                {logs.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Processing Log</h3>
                            <button
                                onClick={() => setLogs([])}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                Clear Log
                            </button>
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-2">
                            {logs.map((log, index) => (
                                <div
                                    key={index}
                                    className={`flex items-center text-sm p-2 rounded ${log.type === 'error'
                                        ? 'bg-red-100 text-red-800'
                                        : log.type === 'success'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-blue-100 text-blue-800'
                                        }`}
                                >
                                    {log.type === 'error' ? (
                                        <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                                    ) : log.type === 'success' ? (
                                        <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                                    ) : (
                                        <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                                    )}
                                    <span className="text-xs text-gray-500 mr-3">{log.timestamp}</span>
                                    <span>{log.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Instructions */}
                {!processedData && (
                    <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                        <div className="max-w-2xl mx-auto">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">How It Works</h2>
                            <div className="text-left space-y-3 text-gray-600">
                                <p>1. Upload a CSV file containing FCR data with the required columns</p>
                                <p>2. Enter project name and year for easy identification</p>
                                <p>3. Click "Process Data" to format and generate interactive FCR boxes</p>
                                <p>4. Click "Save Project" to store your work in MongoDB for future access</p>
                                <p>5. Click on any box to copy its entire content to clipboard</p>
                                <p>6. Copied boxes are highlighted in yellow with a checkmark</p>
                                <p>7. Use search and filters to find specific invoices or descriptions</p>
                                <p>8. Export your data as DOC file with professional styling</p>
                                <p>9. Your progress is automatically saved to MongoDB with project year</p>
                                <p>10. Use the toolbar buttons for quick actions: Save, Undo, Reset, Export</p>
                                <p>11. Load previous projects from the Recent Projects section</p>
                                <p>12. Get instant feedback with SweetAlert-style notifications</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FCRDraftGenerator;