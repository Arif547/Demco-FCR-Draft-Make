import React from 'react';
import { Link } from 'react-router';

const Header = () => {
    return (
        <div className='max-w-[1200px] mx-auto'>
            <div className="navbar bg-base-100 shadow-lg">
                <div className="navbar-start">
                    <Link to="/" className="btn btn-ghost text-xl font-bold text-primary hover:text-primary-focus transition-colors">
                        FCRDEMCO
                    </Link>
                </div>
                <div className="navbar-center">
                    <ul className="menu menu-horizontal px-1 gap-2">
                        <li>
                            <Link
                                to="/"
                                className={({ isActive }) =>
                                    `btn transition-all duration-200 ${isActive
                                        ? 'btn-primary'
                                        : 'btn-ghost hover:btn-primary'
                                    }`
                                }
                            >
                                Home
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/FcrDarftMake"
                                className={({ isActive }) =>
                                    `btn transition-all duration-200 ${isActive
                                        ? 'btn-primary'
                                        : 'btn-ghost hover:btn-primary'
                                    }`
                                }
                            >
                                FCR Draft
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/ProjectsDashboard"
                                className={({ isActive }) =>
                                    `btn transition-all duration-200 ${isActive
                                        ? 'btn-primary'
                                        : 'btn-ghost hover:btn-primary'
                                    }`
                                }
                            >
                                Projects
                            </Link>
                        </li>
                    </ul>
                </div>
                <div className="navbar-end">
                    <a
                        href="https://mahabubul-alam.netlify.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-primary hover:btn-primary transition-all duration-200"
                    >
                        Contact
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Header;