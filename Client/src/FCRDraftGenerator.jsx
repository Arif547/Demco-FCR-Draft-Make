import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Download, Search, Filter, Copy, Check, X, RotateCcw, Save, Eye, FileText, AlertCircle, CheckCircle, Loader, Database, Cloud } from 'lucide-react';
import Papa from 'papaparse';

const FCRDraftGenerator = () => {
    const [inputData, setInputData] = useState(null);
    const [processedData, setProcessedData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState([]);
    const [copiedBoxes, setCopiedBoxes] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [currentFilter, setCurrentFilter] = useState('all');
    const [showShortcuts, setShowShortcuts] = useState(true);
    const [lastCopiedBoxId, setLastCopiedBoxId] = useState(null);
    const [copyHistory, setCopyHistory] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [savedProjects, setSavedProjects] = useState([]);
    const [currentProject, setCurrentProject] = useState(null);
    const [projectName, setProjectName] = useState('');
    const searchInputRef = useRef(null);
    

    // API endpoints - adjust these to match your backend URL
    const API_BASE = 'http://localhost:5000/api';

    // Required columns for FCR data
    const requiredColumns = [
        'EXP Serial', 'Invoice Date', 'Entry Date', 'Date of Contact',
        'Description', 'PO Numbers', 'Invoice No', 'AD Code', 'EXP Year',
        'Lc Contact', 'Country short code', 'Goods'
    ];

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
        } finally {
            setIsLoading(false);
        }
    };

    // Save project to MongoDB
    const saveProjectToMongoDB = async () => {
        if (!processedData || !projectName.trim()) {
            addLog('Please enter a project name and process data first', 'error');
            return;
        }

        try {
            setIsSaving(true);
            const projectData = {
                name: projectName.trim(),
                processedData,
                copiedBoxes,
                copyHistory,
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
                addLog(`Project "${projectName}" saved successfully!`, 'success');
                loadProjects(); // Refresh the projects list
            } else {
                throw new Error('Failed to save project');
            }
        } catch (error) {
            addLog(`Failed to save project: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Load project from MongoDB
    const loadProject = async (projectId) => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE}/projects/${projectId}`);
            if (response.ok) {
                const project = await response.json();
                setProcessedData(project.processedData);
                setCopiedBoxes(project.copiedBoxes || {});
                setCopyHistory(project.copyHistory || []);
                setCurrentProject(project);
                setProjectName(project.name);
                addLog(`Project "${project.name}" loaded successfully!`, 'success');
            }
        } catch (error) {
            addLog('Failed to load project', 'error');
        } finally {
            setIsLoading(false);
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
                processedData,
                copiedBoxes,
                copyHistory,
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
                addLog('Project updated successfully!', 'success');
            } else {
                throw new Error('Failed to update project');
            }
        } catch (error) {
            addLog(`Failed to update project: ${error.message}`, 'error');
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

                        addLog(`Detected delimiter: '${results.meta.delimiter}'`);
                        addLog(`Successfully loaded ${results.data.length} records`);
                        setInputData(results.data);

                    } catch (error) {
                        addLog(`Error: ${error.message}`, 'error');
                    }
                },
                error: (error) => {
                    addLog(`Failed to parse file: ${error.message}`, 'error');
                }
            });

        } catch (error) {
            addLog(`Error loading file: ${error.message}`, 'error');
        }
    };

    const processData = () => {
        if (!inputData) {
            addLog('Please upload a data file first', 'error');
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
                    formattedText: `${row['Description'] || ''}
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
            addLog(`Successfully processed ${processed.length} records`, 'success');
            addLog('Processing completed successfully', 'success');

        } catch (error) {
            addLog(`Processing failed: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const copyToClipboard = async (boxId, content) => {
        try {
            await navigator.clipboard.writeText(content);

            setCopiedBoxes(prev => ({ ...prev, [boxId]: true }));
            setCopyHistory(prev => [...prev.filter(id => id !== boxId), boxId]);
            setLastCopiedBoxId(boxId);

            addLog('Box content copied to clipboard!', 'success');
        } catch (error) {
            addLog('Failed to copy to clipboard', 'error');
        }
    };

    const undoCopy = (boxId) => {
        setCopiedBoxes(prev => {
            const updated = { ...prev };
            delete updated[boxId];
            return updated;
        });

        setCopyHistory(prev => prev.filter(id => id !== boxId));

        if (lastCopiedBoxId === boxId) {
            setLastCopiedBoxId(null);
        }

        addLog('Copied status removed!', 'success');
    };

    const undoLastCopy = () => {
        if (lastCopiedBoxId && copiedBoxes[lastCopiedBoxId]) {
            undoCopy(lastCopiedBoxId);
            addLog('Last copy action undone!', 'success');
        } else {
            addLog('No recent copy action to undo!', 'error');
        }
    };

    const resetAllCopied = () => {
        setCopiedBoxes({});
        setCopyHistory([]);
        setLastCopiedBoxId(null);
        addLog('All copied status has been reset!', 'success');
    };

    const getFilteredData = () => {
        if (!processedData) return [];

        let filtered = processedData;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(item =>
                item.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase())
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

    // Export to DOC with box format
    const exportToDOC = () => {
        if (!processedData) return;

        const filteredData = getFilteredData();

        // Create HTML content with proper box formatting
        const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>FCR Export - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .fcr-box { 
            border: 2px solid black; 
            margin: 20px 0; 
            padding: 15px; 
            page-break-inside: avoid;
            min-height: 200px;
          }
          .box-header { 
            font-weight: bold; 
            font-size: 16px; 
            margin-bottom: 10px; 
            border-bottom: 2px solid black;
            padding-bottom: 5px;
          }
          .box-content { 
            line-height: 1.6; 
            white-space: pre-line;
            font-size: 14px;
          }
          .box-number {
            position: absolute;
            top: -10px;
            left: -10px;
            background: black;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
          }
          .fcr-container {
            position: relative;
          }
          .copied-indicator {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #10B981;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
          }
          @media print {
            .fcr-box { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>FCR Export Report - ${new Date().toLocaleDateString()}</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <p>Total Boxes: ${filteredData.length}</p>
        <p>Copied Boxes: ${filteredData.filter(item => copiedBoxes[item.id]).length}</p>
        <hr style="margin: 30px 0;">
        
        ${filteredData.map((item) => `
          <div class="fcr-container">
            <div class="fcr-box">
              <div class="box-number">${item.index}</div>
              ${copiedBoxes[item.id] ? '<div class="copied-indicator">✓ COPIED</div>' : ''}
              <div class="box-header">Invoice No.: ${item.invoiceNo}</div>
              <div class="box-content">${item.formattedText}</div>
            </div>
          </div>
        `).join('')}
      </body>
      </html>
    `;

        // Create blob and download
        const blob = new Blob([htmlContent], { type: 'application/msword' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `FCR_Export_${new Date().toISOString().split('T')[0]}.doc`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        addLog('FCR data exported to DOC file successfully!', 'success');
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event) => {
            // Ctrl+K for search
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                searchInputRef.current?.focus();
            }

            // Escape to clear search
            if (event.key === 'Escape') {
                setSearchTerm('');
            }

            // Ctrl+S for save
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault();
                updateProject();
            }

            // Ctrl+Z for undo
            if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
                event.preventDefault();
                undoLastCopy();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [currentProject, processedData, copiedBoxes, copyHistory]);

    const copiedCount = Object.keys(copiedBoxes).length;
    const totalCount = processedData?.length || 0;
    const progressPercent = totalCount > 0 ? (copiedCount / totalCount) * 100 : 0;
    const filteredData = getFilteredData();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Fixed toolbar */}
            <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg p-3 flex gap-2">
                <button
                    onClick={updateProject}
                    disabled={isSaving}
                    className="p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                    title="Save to MongoDB (Ctrl+S)"
                >
                    {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                </button>
                <button
                    onClick={undoLastCopy}
                    className="p-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                    title="Undo Last Copy (Ctrl+Z)"
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
                <div className="fixed bottom-4 left-4 z-50 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg">
                    Copied: {copiedCount} / {totalCount}
                </div>
            )}

            {/* Progress bar */}
            <div className="fixed bottom-0 left-0 w-full h-1 bg-gray-200">
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
                        <Cloud className="w-6 h-6 text-blue-600 mr-2" />
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

                        {/* Save/Update Button */}
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

                        {/* Load Project Dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Load Saved Project</label>
                            <select
                                onChange={(e) => e.target.value && loadProject(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            >
                                <option value="">Select a project...</option>
                                {/* {savedProjects.map((project) => (
                                    <option key={project._id} value={project._id}>
                                        {project.name} ({new Date(project.updatedAt).toLocaleDateString()})
                                    </option>
                                ))} */}
                                {Array.isArray(savedProjects) && savedProjects.map((project) => (
                                    <option key={project._id} value={project._id}>
                                        {project.name} ({new Date(project.updatedAt).toLocaleDateString()})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {currentProject && (
                        <div className="mt-4 p-3 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-800">
                                <CheckCircle className="w-4 h-4 inline mr-1" />
                                Currently working on: <strong>{currentProject.name}</strong>
                                <span className="ml-2 text-green-600">
                                    (Last updated: {new Date(currentProject.updatedAt).toLocaleString()})
                                </span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Shortcuts panel */}
                {showShortcuts && (
                    <div className="bg-blue-50 rounded-xl p-6 mb-8 relative">
                        <button
                            onClick={() => setShowShortcuts(false)}
                            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h3 className="text-lg font-semibold text-blue-800 mb-4">Keyboard Shortcuts</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex items-center gap-2">
                                <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl+K</kbd>
                                <span className="text-sm">Search</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Esc</kbd>
                                <span className="text-sm">Clear Search</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl+S</kbd>
                                <span className="text-sm">Save Project</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl+Z</kbd>
                                <span className="text-sm">Undo Last Copy</span>
                            </div>
                        </div>
                    </div>
                )}

                {!showShortcuts && (
                    <button
                        onClick={() => setShowShortcuts(true)}
                        className="fixed top-16 right-4 z-50 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                        Show Shortcuts
                    </button>
                )}

                {/* File upload section */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-dashed border-blue-300 hover:border-blue-400 transition-colors">
                        <div className="text-center">
                            <Upload className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">Upload FCR Data File</h3>
                            <p className="text-gray-600 mb-4">Upload CSV or Excel file with FCR data</p>
                            <input
                                type="file"
                                accept=".csv,.xlsx"
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

                {/* Export button for processed data */}
                {processedData && (
                    <div className="text-center mb-8">
                        <button
                            onClick={exportToDOC}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center mx-auto"
                        >
                            <Download className="w-5 h-5 mr-2" />
                            Export to DOC (Box Format)
                        </button>
                    </div>
                )}

                {/* Search and filter controls */}
                {processedData && (
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Search className="w-5 h-5 text-gray-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search by Invoice Number (Ctrl+K)"
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
                                <div className="space-y-1 text-sm">
                                    {item.formattedText.split('\n').map((line, idx) => (
                                        <div key={idx} className="leading-relaxed">
                                            {line || <br />}
                                        </div>
                                    ))}
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
                                <p>1. Upload a CSV or Excel file containing FCR data with the required columns</p>
                                <p>2. Click "Process Data" to format and generate interactive FCR boxes</p>
                                <p>3. Enter a project name and save your work to MongoDB for future access</p>
                                <p>4. Click on any box to copy its entire content to clipboard</p>
                                <p>5. Copied boxes are highlighted in yellow with a checkmark</p>
                                <p>6. Your progress is automatically saved to MongoDB</p>
                                <p>7. Use search and filters to find specific invoices</p>
                                <p>8. Export your data as DOC file with proper box formatting</p>
                                <p>9. Load previously saved projects from the dropdown menu</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FCRDraftGenerator;