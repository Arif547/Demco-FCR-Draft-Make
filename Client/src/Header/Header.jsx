
import React from 'react';
import { Link } from 'react-router';

const Header = () => {
    return (
        <div className='max-w-[1200px] mx-auto '>
            <div className="navbar bg-base-100 shadow-sm">
                <div className="flex-1">
                    <a className="btn btn-ghost text-xl">daisyUI</a>
                </div>
                <div className="flex-none">
                    <ul className="menu menu-horizontal px-1">
                        <li><a>Link</a></li>
                        <li><Link to="/FcrDarftMake">FcrDarftMake</Link></li>
                        <li><Link to="/ProjectsDashboard">/Projects</Link></li>

                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Header;