import React from 'react';
import { Outlet } from 'react-router';
import Header from './Header/Header';
import Footer from './Footer/Footer';

const Root = () => {
    return (
        <div>
            <Header />
            <Outlet />
            <Footer />
        </div>
    );
};

export default Root;