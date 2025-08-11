import React, { useState, useEffect } from 'react';
import { Calendar, Box, Copy, Download, Tag, User } from 'lucide-react';

const ProjectsDashboard = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const [apiData, setApiData] = useState({
        projects: [],
        totalPages: 1,
        currentPage: 1,
        total: 0
    });

    useEffect(() => {
        // Fetch projects from API
        const fetchProjects = async () => {
            try {
                setLoading(true);
                const response = await fetch('http://localhost:5000/api/projects');
                const data = await response.json();
                setProjects(data.projects);
                setApiData(data);
            } catch (error) {
                console.error('Error fetching projects:', error);
                // Fallback to empty state if API fails
                setProjects([]);
                setApiData({
                    projects: [],
                    totalPages: 1,
                    currentPage: 1,
                    total: 0
                });
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getCompletionColor = (percentage) => {
        if (percentage === 0) return 'bg-gray-200';
        if (percentage < 30) return 'bg-red-200';
        if (percentage < 70) return 'bg-yellow-200';
        return 'bg-green-200';
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Projects Dashboard</h1>
                    <p className="text-gray-600">Manage and track your project progress</p>
                    <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                        <span>Total Projects: {apiData.total}</span>
                        <span>•</span>
                        <span>Page {apiData.currentPage} of {apiData.totalPages}</span>
                    </div>
                </div>

                {/* Projects Grid */}
                {projects.length === 0 ? (
                    <div className="text-center py-20">
                        <Box className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-gray-900 mb-2">No Projects Found</h3>
                        <p className="text-gray-600">Create your first project to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <div
                                key={project._id}
                                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
                            >
                                <div className="p-6">
                                    {/* Project Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                                                {project.name || 'Untitled Project'}
                                            </h3>
                                            <p className="text-gray-500 text-sm">
                                                ID: {project._id.slice(-8)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                            <User className="h-3 w-3" />
                                            {project.createdBy}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {project.description && (
                                        <p className="text-gray-600 mb-4 text-sm">
                                            {project.description}
                                        </p>
                                    )}

                                    {/* Progress Bar */}
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-700">Progress</span>
                                            <span className="text-sm font-semibold text-gray-900">
                                                {project.completionPercentage}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-300 ${getCompletionColor(project.completionPercentage)}`}
                                                style={{ width: `${project.completionPercentage}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                                            <Box className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                                            <p className="text-lg font-bold text-blue-700">{project.totalBoxes}</p>
                                            <p className="text-xs text-blue-600">Total Boxes</p>
                                        </div>
                                        <div className="text-center p-3 bg-green-50 rounded-lg">
                                            <Copy className="h-5 w-5 text-green-600 mx-auto mb-1" />
                                            <p className="text-lg font-bold text-green-700">{project.copiedCount}</p>
                                            <p className="text-xs text-green-600">Copied</p>
                                        </div>
                                    </div>

                                    {/* Additional Stats */}
                                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                                        <div className="flex items-center gap-1">
                                            <Download className="h-4 w-4" />
                                            <span>{project.exportCount} exports</span>
                                        </div>
                                        {project.tags && project.tags.length > 0 && (
                                            <div className="flex items-center gap-1">
                                                <Tag className="h-4 w-4" />
                                                <span>{project.tags.length} tags</span>
                                            </div>
                                        )}
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
                                    <a
                                        href={`/project/${project._id}`}
                                        className="block w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-center no-underline"
                                    >
                                        View Project
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectsDashboard;