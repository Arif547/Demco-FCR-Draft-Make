import React, { useState, useEffect } from 'react';
import { Copy, Check, X, ArrowLeft } from 'lucide-react';

const ProjectDetailPage = () => {
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copiedBoxes, setCopiedBoxes] = useState({});

    // Get project ID dynamically from URL
    const getProjectIdFromUrl = () => {
        const path = window.location.pathname;
        const match = path.match(/\/project\/([^\/]+)/);
        return match ? match[1] : null;
    };

    const projectId = getProjectIdFromUrl();
    const API_BASE = 'https://demco-fcr-server.vercel.app/api';

    // Load project data
    useEffect(() => {
        loadProject();
    }, []);

    const loadProject = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/projects/${projectId}`);
            if (response.ok) {
                const data = await response.json();
                setProject(data);
                setCopiedBoxes(data.copiedBoxes || {});
            }
        } catch (error) {
            console.error('Failed to load project:', error);
        } finally {
            setLoading(false);
        }
    };

    // Update copy status on server - fallback to full project update
    const updateCopyStatus = async (boxId, isCopied) => {
        try {
            // First try the dedicated copy-status endpoint
            let response = await fetch(`${API_BASE}/projects/${projectId}/copy-status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    boxId,
                    isCopied
                })
            });

            // If that fails, fallback to updating the entire project
            if (!response.ok) {
                console.log('Copy-status endpoint failed, using fallback method');

                const newCopiedBoxes = { ...copiedBoxes };
                if (isCopied) {
                    newCopiedBoxes[boxId] = true;
                } else {
                    delete newCopiedBoxes[boxId];
                }

                response = await fetch(`${API_BASE}/projects/${projectId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        copiedBoxes: newCopiedBoxes,
                        updatedAt: new Date()
                    })
                });
            }

            return response.ok;
        } catch (error) {
            console.error('Failed to update copy status:', error);
            return false;
        }
    };

    // Copy to clipboard and mark as copied
    const copyToClipboard = async (boxId, content) => {
        try {
            await navigator.clipboard.writeText(content);

            // Update local state immediately for instant visual feedback
            setCopiedBoxes(prev => ({
                ...prev,
                [boxId]: true
            }));

            // Then update server
            const success = await updateCopyStatus(boxId, true);
            if (!success) {
                // If server update fails, revert the local state
                setCopiedBoxes(prev => ({
                    ...prev,
                    [boxId]: false
                }));
            }
        } catch (error) {
            console.error('Failed to copy:', error);
            // Revert local state if copy fails
            setCopiedBoxes(prev => ({
                ...prev,
                [boxId]: false
            }));
        }
    };

    // Remove copied status
    const removeCopyStatus = async (boxId) => {
        // Update local state immediately
        setCopiedBoxes(prev => {
            const newState = { ...prev };
            delete newState[boxId];
            return newState;
        });

        // Then update server
        const success = await updateCopyStatus(boxId, false);
        if (!success) {
            // If server update fails, revert the local state
            setCopiedBoxes(prev => ({
                ...prev,
                [boxId]: true
            }));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading project...</p>
                </div>
            </div>
        );
    }

    if (!projectId) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Invalid Project URL</h2>
                    <p className="text-gray-600">No project ID found in URL.</p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Project Not Found</h2>
                    <p className="text-gray-600">The requested project could not be loaded.</p>
                </div>
            </div>
        );
    }

    const processedData = project.processedData || [];
    const copiedCount = Object.values(copiedBoxes).filter(Boolean).length;
    const totalCount = processedData.length;
    const progressPercent = totalCount > 0 ? (copiedCount / totalCount) * 100 : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => window.history.back()}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                                <p className="text-sm text-gray-500">
                                    {project.Year && `Year: ${project.Year} • `}
                                    Created: {new Date(project.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        {/* Progress */}
                        <div className="text-right">
                            <div className="text-lg font-semibold text-gray-800">
                                {copiedCount} / {totalCount}
                            </div>
                            <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                                <div
                                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {processedData.length === 0 ? (
                    <div className="text-center py-20">
                        <h3 className="text-xl font-medium text-gray-900 mb-2">No Data Available</h3>
                        <p className="text-gray-600">This project doesn't have any processed data.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {processedData.map((item) => (
                            <div
                                key={item.id}
                                className={`relative bg-white border-2 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 ${copiedBoxes[item.id]
                                    ? 'border-green-400 bg-green-50'
                                    : 'border-gray-300 hover:border-blue-400'
                                    }`}
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

                                {/* Remove copy button */}
                                {copiedBoxes[item.id] && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeCopyStatus(item.id);
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
                                <div className="space-y-1 text-sm mb-4">
                                    {item.formattedText?.split('\n').map((line, idx) => (
                                        <div key={idx} className="leading-relaxed">
                                            {line || <br />}
                                        </div>
                                    ))}
                                </div>

                                {/* Copy button */}
                                <button
                                    onClick={() => copyToClipboard(item.id, item.formattedText)}
                                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${copiedBoxes[item.id]
                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                >
                                    {copiedBoxes[item.id] ? (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            Copy Content
                                        </>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectDetailPage;