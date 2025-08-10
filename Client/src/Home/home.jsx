import React from 'react';
import PoProcessor from '../POProcessor';

const home = () => {
    return (
        <div>
            <PoProcessor />
            <div className="card bg-base-100 w-96 shadow-sm">
                <figure>
                    <img
                        src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp"
                        alt="Shoes" />
                </figure>

            </div>
        </div>
    );
};

export default home;