import React, { useState, useCallback } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import Papa from 'papaparse';

// Constants
const PO_HEADERS = ['Invoice', 'PO', 'Goods'];
const RECYCLED_HEADERS = ['PO'];
const OUTPUT_HEADERS = ['Invoice Number', 'PO Numbers', 'Description', 'Goods'];

const TYPE_MIXED = "100% PORCELAIN TABLEWARE AND 80% PORCELAIN, 20% RECYCLED PRE-CONSUMER PORCELAIN";
const TYPE_RECYCLED = "80% PORCELAIN, 20% RECYCLED PRE-CONSUMER PORCELAIN";
const TYPE_NORMAL = "100% PORCELAIN TABLEWARE";

const POProcessor = () => {
    const [poData, setPOData] = useState(null);
    const [recycledPOsData, setRecycledPOsData] = useState(null);
    const [processedData, setProcessedData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState([]);
    const [errors, setErrors] = useState([]);

    const addLog = useCallback((message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { message, type, timestamp }]);
    }, []);

    const addError = useCallback((message) => {
        setErrors(prev => [...prev, message]);
        addLog(message, 'error');
    }, [addLog]);

    const clearLogs = () => {
        setLogs([]);
        setErrors([]);
    };

    const validateHeaders = (headers, expectedHeaders, fileName) => {
        const normalizedHeaders = headers.map(h => h.trim());
        const normalizedExpected = expectedHeaders.map(h => h.trim());

        if (JSON.stringify(normalizedHeaders) !== JSON.stringify(normalizedExpected)) {
            throw new Error(`Header mismatch in ${fileName}. Expected: [${normalizedExpected.join(', ')}], Got: [${normalizedHeaders.join(', ')}]`);
        }
    };

    const parseCSVFile = (file, expectedHeaders, fileName) => {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: false,
                delimiter: "", // Auto-detect delimiter
                delimitersToGuess: [',', ';', '\t', '|'], // Try these delimiters
                complete: (results) => {
                    try {
                        // Check for parsing errors
                        const criticalErrors = results.errors.filter(error =>
                            error.type === 'Delimiter' || error.type === 'Quotes'
                        );

                        if (criticalErrors.length > 0) {
                            addLog(`Warning: Some parsing issues in ${fileName}: ${criticalErrors.map(e => e.message).join(', ')}`, 'warning');
                        }

                        // Check if we have valid data
                        if (!results.data || results.data.length === 0) {
                            throw new Error(`No valid data found in ${fileName}. Please check the file format.`);
                        }

                        const headers = results.meta.fields;
                        if (!headers || headers.length === 0) {
                            throw new Error(`No headers found in ${fileName}. Please ensure the file has a header row.`);
                        }

                        addLog(`Detected delimiter: '${results.meta.delimiter}' in ${fileName}`);
                        validateHeaders(headers, expectedHeaders, fileName);

                        addLog(`Successfully read ${results.data.length} rows from ${fileName}`);
                        resolve(results.data);
                    } catch (error) {
                        reject(error);
                    }
                },
                error: (error) => {
                    reject(new Error(`Failed to parse ${fileName}: ${error.message}`));
                }
            });
        });
    };

    const handleFileUpload = async (event, fileType) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            clearLogs();
            addLog(`Reading file: ${file.name}`);

            let data;
            if (fileType === 'po') {
                data = await parseCSVFile(file, PO_HEADERS, file.name);
                setPOData(data);
                addLog(`PO data loaded: ${data.length} records`);
            } else if (fileType === 'recycled') {
                data = await parseCSVFile(file, RECYCLED_HEADERS, file.name);
                setRecycledPOsData(data);
                addLog(`Recycled POs data loaded: ${data.length} records`);
            }
        } catch (error) {
            addError(`Error loading ${file.name}: ${error.message}`);
        }
    };

    const processPOData = (poData) => {
        addLog("Processing PO data");

        const invoicePOMap = {};
        const invoiceGoodsMap = {};

        poData.forEach(row => {
            const invoice = row.Invoice?.trim();
            const po = row.PO?.trim();
            const goods = row.Goods?.trim();

            if (invoice) {
                if (!invoicePOMap[invoice]) {
                    invoicePOMap[invoice] = [];
                    invoiceGoodsMap[invoice] = [];
                }

                if (po) invoicePOMap[invoice].push(po);
                if (goods) invoiceGoodsMap[invoice].push(goods);
            }
        });

        addLog(`Processed data for ${Object.keys(invoicePOMap).length} invoices`);
        return { invoicePOMap, invoiceGoodsMap };
    };

    const determineInvoiceType = (invoicePOMap, recycledPOsSet) => {
        addLog("Determining invoice types");

        const invoiceTypeMap = {};
        const typeCounts = { mixed: 0, recycled: 0, normal: 0 };

        Object.entries(invoicePOMap).forEach(([invoice, posList]) => {
            const hasRecycled = posList.some(po => recycledPOsSet.has(po));
            const hasNormal = posList.some(po => !recycledPOsSet.has(po) && po);

            if (hasRecycled && hasNormal) {
                invoiceTypeMap[invoice] = TYPE_MIXED;
                typeCounts.mixed++;
            } else if (hasRecycled) {
                invoiceTypeMap[invoice] = TYPE_RECYCLED;
                typeCounts.recycled++;
            } else {
                invoiceTypeMap[invoice] = TYPE_NORMAL;
                typeCounts.normal++;
            }
        });

        addLog(`Invoice type counts: Mixed: ${typeCounts.mixed}, Recycled: ${typeCounts.recycled}, Normal: ${typeCounts.normal}`);
        return invoiceTypeMap;
    };

    const processData = async () => {
        if (!poData || !recycledPOsData) {
            addError("Please upload both PO data and recycled POs files");
            return;
        }

        setIsProcessing(true);
        clearLogs();

        try {
            addLog("Starting PO data processing");

            // Extract recycled PO numbers
            const recycledPOsSet = new Set(
                recycledPOsData
                    .map(row => row.PO?.trim())
                    .filter(po => po)
            );
            addLog(`Found ${recycledPOsSet.size} recycled PO numbers`);

            // Process the data
            const { invoicePOMap, invoiceGoodsMap } = processPOData(poData);
            const invoiceTypeMap = determineInvoiceType(invoicePOMap, recycledPOsSet);

            // Generate output data
            const outputData = Object.entries(invoicePOMap).map(([invoice, pos]) => {
                const poNumbers = pos.filter(po => po).join(',');
                const goods = (invoiceGoodsMap[invoice] || []).filter(g => g).join(',');
                const description = invoiceTypeMap[invoice] || TYPE_NORMAL;

                return {
                    'Invoice Number': invoice,
                    'PO Numbers': poNumbers,
                    'Description': description,
                    'Goods': goods
                };
            });

            setProcessedData(outputData);
            addLog(`Successfully processed ${outputData.length} invoices`);
            addLog("Processing completed successfully", 'success');

        } catch (error) {
            addError(`Processing failed: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadCSV = () => {
        if (!processedData) return;

        const csv = Papa.unparse(processedData, {
            columns: OUTPUT_HEADERS
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `output_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center mb-4">
                            <FileText className="w-12 h-12 text-indigo-600 mr-3" />
                            <h1 className="text-4xl font-bold text-gray-800">PO Data Processor</h1>
                        </div>
                        <p className="text-lg text-gray-600">Upload your CSV files to process purchase order data and generate reports</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 mb-8">
                        {/* PO Data Upload */}
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-dashed border-blue-300 hover:border-blue-400 transition-colors">
                            <div className="text-center">
                                <Upload className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">PO Data File</h3>
                                <p className="text-gray-600 mb-4">Upload CSV with columns: Invoice, PO, Goods</p>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => handleFileUpload(e, 'po')}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                {poData && (
                                    <div className="mt-3 flex items-center justify-center text-green-600">
                                        <CheckCircle className="w-5 h-5 mr-2" />
                                        <span className="text-sm font-medium">{poData.length} records loaded</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recycled POs Upload */}
                        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 border-2 border-dashed border-green-300 hover:border-green-400 transition-colors">
                            <div className="text-center">
                                <Upload className="w-12 h-12 text-green-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">Recycled POs File</h3>
                                <p className="text-gray-600 mb-4">Upload CSV with column: PO</p>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => handleFileUpload(e, 'recycled')}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                                />
                                {recycledPOsData && (
                                    <div className="mt-3 flex items-center justify-center text-green-600">
                                        <CheckCircle className="w-5 h-5 mr-2" />
                                        <span className="text-sm font-medium">{recycledPOsData.length} records loaded</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Process Button */}
                    <div className="text-center mb-8">
                        <button
                            onClick={processData}
                            disabled={!poData || !recycledPOsData || isProcessing}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-8 rounded-xl text-lg shadow-lg transform hover:scale-105 disabled:hover:scale-100 transition-all duration-200 disabled:cursor-not-allowed flex items-center mx-auto"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader className="w-6 h-6 mr-3 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <FileText className="w-6 h-6 mr-3" />
                                    Process Data
                                </>
                            )}
                        </button>
                    </div>

                    {/* Download Button */}
                    {processedData && (
                        <div className="text-center mb-8">
                            <button
                                onClick={downloadCSV}
                                className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center mx-auto"
                            >
                                <Download className="w-5 h-5 mr-2" />
                                Download Processed CSV
                            </button>
                        </div>
                    )}

                    {/* Logs Section */}
                    {logs.length > 0 && (
                        <div className="bg-gray-50 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-800">Processing Log</h3>
                                <button
                                    onClick={clearLogs}
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
                                                    : log.type === 'warning'
                                                        ? 'bg-yellow-100 text-yellow-800'
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

                    {/* Results Preview */}
                    {processedData && (
                        <div className="mt-8 bg-gray-50 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                Results Preview ({processedData.length} invoices processed)
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-white rounded-lg overflow-hidden shadow">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            {OUTPUT_HEADERS.map(header => (
                                                <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    {header}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {processedData.slice(0, 10).map((row, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                {OUTPUT_HEADERS.map(header => (
                                                    <td key={header} className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                                                        {row[header]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {processedData.length > 10 && (
                                    <p className="text-center text-gray-500 text-sm mt-4">
                                        Showing first 10 rows of {processedData.length} total rows
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default POProcessor;