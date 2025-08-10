import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Download, Search, Filter, Copy, Check, X, RotateCcw, Save, Eye, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import Papa from 'papaparse';

const FCRGenerator = () => {
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
  const searchInputRef = useRef(null);

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
      const cleanSerial = parseInt(parseFloat, expSerial);
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

  // Load saved progress
  useEffect(() => {
    const savedCopied = JSON.parse(localStorage.getItem('fcr_copied_boxes') || '{}');
    const savedHistory = JSON.parse(localStorage.getItem('fcr_copy_history') || '[]');
    setCopiedBoxes(savedCopied);
    setCopyHistory(savedHistory);
  }, []);

  // Save progress
  const saveProgress = useCallback(() => {
    localStorage.setItem('fcr_copied_boxes', JSON.stringify(copiedBoxes));
    localStorage.setItem('fcr_copy_history', JSON.stringify(copyHistory));
    addLog('Progress saved successfully!', 'success');
  }, [copiedBoxes, copyHistory, addLog]);

  // Auto-save progress
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.keys(copiedBoxes).length > 0) {
        localStorage.setItem('fcr_copied_boxes', JSON.stringify(copiedBoxes));
        localStorage.setItem('fcr_copy_history', JSON.stringify(copyHistory));
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [copiedBoxes, copyHistory]);

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
    localStorage.removeItem('fcr_copied_boxes');
    localStorage.removeItem('fcr_copy_history');
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

  const exportToCSV = () => {
    if (!processedData) return;

    const csvData = processedData.map(item => ({
      'Invoice Number': item.invoiceNo,
      'Description': item.description,
      'PO Numbers': item.poNumbers,
      'Goods': item.goods,
      'Invoice Date': item.invoiceDate,
      'Entry Date': item.entryDate,
      'Contact Date': item.contactDate,
      'EXP Serial': item.expSerial,
      'AD Code': item.adCode,
      'EXP Year': item.expYear,
      'LC Contact': item.lcContact,
      'Country Code': item.countryCode,
      'Copied Status': copiedBoxes[item.id] ? 'Copied' : 'Not Copied'
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fcr_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        saveProgress();
      }

      // Ctrl+Z for undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault();
        undoLastCopy();
      }

      // Alt+F for filter toggle
      if (event.altKey && event.key === 'f') {
        event.preventDefault();
        const filters = ['all', 'copied', 'not-copied'];
        const currentIndex = filters.indexOf(currentFilter);
        const nextIndex = (currentIndex + 1) % filters.length;
        setCurrentFilter(filters[nextIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentFilter, saveProgress]);

  const copiedCount = Object.keys(copiedBoxes).length;
  const totalCount = processedData?.length || 0;
  const progressPercent = totalCount > 0 ? (copiedCount / totalCount) * 100 : 0;
  const filteredData = getFilteredData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Fixed toolbar */}
      <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg p-3 flex gap-2">
        <button
          onClick={saveProgress}
          className="p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          title="Save Progress (Ctrl+S)"
        >
          <Save className="w-4 h-4" />
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
          onClick={() => window.print()}
          className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          title="Print (Ctrl+P)"
        >
          <FileText className="w-4 h-4" />
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
          <p className="text-lg text-gray-600">Interactive FCR document generator with click-to-copy functionality</p>
          <p className="text-sm text-gray-500 mt-2">by Mahabubul Alam Arif | GitHub: arif547</p>
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
                <span className="text-sm">Save Progress</span>
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
              onClick={exportToCSV}
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center mx-auto"
            >
              <Download className="w-5 h-5 mr-2" />
              Export to CSV
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
                <p>3. Click on any box to copy its entire content to clipboard</p>
                <p>4. Copied boxes are highlighted in yellow with a checkmark</p>
                <p>5. Your progress is automatically saved and restored when you return</p>
                <p>6. Use search and filters to find specific invoices</p>
                <p>7. Export your data with copy status to CSV for record keeping</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FCRGenerator;