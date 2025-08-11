import React, { useState, useEffect } from 'react';
import { Calendar, Box, Copy, Download, Tag, User, Plus } from 'lucide-react';
import { Link, Links } from 'react-router';

const ProjectsDashboard = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch('https://demco-fcr-server.vercel.app/api/projects');

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('Fetched projects:', data); // Debug log

                // The simplified server returns an array directly, not an object with projects property
                setProjects(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error fetching projects:', error);
                setError(error.message);
                setProjects([]);
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const calculateStats = (project) => {
        const totalBoxes = project.processedData?.length || 0;
        const copiedCount = project.copiedBoxes ? Object.keys(project.copiedBoxes).length : 0;
        const completionPercentage = totalBoxes > 0 ? Math.round((copiedCount / totalBoxes) * 100) : 0;

        return {
            totalBoxes,
            copiedCount,
            completionPercentage
        };
    };

    const getCompletionColor = (percentage) => {
        if (percentage === 0) return 'bg-gray-400';
        if (percentage < 30) return 'bg-red-400';
        if (percentage < 70) return 'bg-yellow-400';
        return 'bg-green-400';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading projects...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-20">
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            <p className="font-bold">Error loading projects</p>
                            <p className="text-sm">{error}</p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">Projects Dashboard</h1>
                            <p className="text-gray-600">Manage and track your FCR project progress</p>
                            <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                                <span>Total Projects: {projects.length}</span>
                            </div>
                        </div>
                        <a
                            href="/"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center gap-2"
                        >
                            <Plus className="h-5 w-5" />
                            New Project
                        </a>
                    </div>
                </div>

                {/* Projects Grid */}
                {projects.length === 0 ? (
                    <div className="text-center py-20">
                        <Box className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-gray-900 mb-2">No Projects Found</h3>
                        <p className="text-gray-600 mb-6">Create your first FCR project to get started.</p>
                        <a
                            href="/"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 inline-flex items-center gap-2"
                        >
                            <Plus className="h-5 w-5" />
                            Create Project
                        </a>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => {
                            const stats = calculateStats(project);

                            return (
                                <div
                                    key={project._id}
                                    className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
                                >
                                    <div className="p-6">
                                        {/* Project Header */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-gray-900 mb-1 line-clamp-2">
                                                    {project.name || 'Untitled Project'}
                                                </h3>
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <Calendar className="h-4 w-4" />
                                                    <span>{project.year || 'No year'}</span>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                                                ID: {project._id?.slice(-6) || 'N/A'}
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-700">Progress</span>
                                                <span className="text-sm font-semibold text-gray-900">
                                                    {stats.completionPercentage}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all duration-300 ${getCompletionColor(stats.completionPercentage)}`}
                                                    style={{ width: `${stats.completionPercentage}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                                                <Box className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                                                <p className="text-lg font-bold text-blue-700">{stats.totalBoxes}</p>
                                                <p className="text-xs text-blue-600">Total Boxes</p>
                                            </div>
                                            <div className="text-center p-3 bg-green-50 rounded-lg">
                                                <Copy className="h-5 w-5 text-green-600 mx-auto mb-1" />
                                                <p className="text-lg font-bold text-green-700">{stats.copiedCount}</p>
                                                <p className="text-xs text-green-600">Completed</p>
                                            </div>
                                        </div>

                                        {/* Remaining Count */}
                                        <div className="mb-4 p-2 bg-gray-50 rounded text-center">
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">{stats.totalBoxes - stats.copiedCount}</span> remaining
                                            </p>
                                        </div>

                                        {/* Dates */}
                                        <div className="border-t pt-4 space-y-2">
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Calendar className="h-3 w-3" />
                                                <span>Created: {formatDate(project.createdAt)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Calendar className="h-3 w-3" />
                                                <span>Updated: {formatDate(project.updatedAt)}</span>
                                            </div>
                                        </div>

                                        {/* Action Button */}

                                        <button
                                            className="block w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-center"
                                        >
                                            <Link to={`/project/${project._id}`} >
                                                Load Project
                                            </Link>
                                        </button>

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectsDashboard;