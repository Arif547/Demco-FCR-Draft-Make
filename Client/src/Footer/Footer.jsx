import React from 'react';
import { Link } from 'react-router';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-base-200 border-t border-base-300">
            <div className="max-w-[1200px] mx-auto">
                {/* Main Footer Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 p-10">
                    {/* Company Info */}
                    <div>
                        <Link to="/" className="text-2xl font-bold text-primary mb-4 block">
                            FCRDEMCO
                        </Link>
                        <p className="text-base-content/70 text-sm leading-relaxed">
                            Building innovative solutions with modern web technologies.
                            Specializing in React development and user-centered design.
                        </p>
                        <div className="flex space-x-3 mt-4">
                            <a
                                href="https://mahabubul-alam.netlify.app/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-circle btn-ghost btn-sm hover:btn-primary transition-all duration-200"
                                title="Portfolio"
                            >
                                🌐
                            </a>
                            <a
                                href="mailto:contact@fcrdemco.com"
                                className="btn btn-circle btn-ghost btn-sm hover:btn-primary transition-all duration-200"
                                title="Email"
                            >
                                ✉️
                            </a>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <div>
                        <h6 className="text-lg font-semibold text-base-content mb-4">Navigation</h6>
                        <div className="flex flex-col space-y-2">
                            <Link to="/" className="link link-hover text-sm">Home</Link>
                            <Link to="/FcrDarftMake" className="link link-hover text-sm">FCR Draft</Link>
                            <Link to="/ProjectsDashboard" className="link link-hover text-sm">Projects</Link>
                        </div>
                    </div>

                    {/* Services/Features */}
                    <div>
                        <h6 className="text-lg font-semibold text-base-content mb-4">Services</h6>
                        <div className="flex flex-col space-y-2">
                            <a
                                href="https://mahabubul-alam.netlify.app/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="link link-hover text-sm"
                            >
                                Web Development
                            </a>
                            <a className="link link-hover text-sm">React Applications</a>
                            <a className="link link-hover text-sm">UI/UX Design</a>
                            <a className="link link-hover text-sm">Project Management</a>
                        </div>
                    </div>

                    {/* Contact & Legal */}
                    <div>
                        <h6 className="text-lg font-semibold text-base-content mb-4">Connect</h6>
                        <div className="flex flex-col space-y-2">
                            <a
                                href="https://mahabubul-alam.netlify.app/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="link link-hover text-sm"
                            >
                                Portfolio
                            </a>
                            <a className="link link-hover text-sm">About</a>
                            <a className="link link-hover text-sm">Privacy Policy</a>
                            <a className="link link-hover text-sm">Terms of Service</a>
                        </div>
                    </div>
                </div>

                {/* Bottom Footer */}
                <div className="footer footer-center p-4 bg-base-300 text-base-content border-t border-base-content/10">
                    <aside>
                        <p className="text-sm">
                            Copyright © {currentYear} FCRDEMCO - All rights reserved |
                            <span className="ml-1">
                                Built with ❤️ by
                                <a
                                    href="https://mahabubul-alam.netlify.app/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="link link-primary ml-1 font-medium"
                                >
                                    Mahabubul Alam
                                </a>
                            </span>
                        </p>
                    </aside>
                </div>
            </div>
        </footer>
    );
};

export default Footer;