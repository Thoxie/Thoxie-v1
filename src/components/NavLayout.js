import React from 'react';
import { useApp } from '../context/AppContext';
import { TIERS } from '../utils/featureFlags';

const NavLayout = ({ currentView, onNavigate }) => {
    const { userTier } = useApp();
    
    return (
        <nav className="navbar">
            <div className="nav-container">
                <div className="nav-brand">
                    <h1>Small Claims Court App</h1>
                    <span className="tier-badge">
                        {userTier === TIERS.FREE ? 'Free Tier' : 'Paid Tier'}
                    </span>
                </div>
                <div className="nav-links">
                    <button 
                        className={currentView === 'dashboard' ? 'active' : ''}
                        onClick={() => onNavigate('dashboard')}
                    >
                        Dashboard
                    </button>
                    <button 
                        className={currentView === 'intake' ? 'active' : ''}
                        onClick={() => onNavigate('intake')}
                    >
                        New Case
                    </button>
                    <button 
                        className={currentView === 'documents' ? 'active' : ''}
                        onClick={() => onNavigate('documents')}
                    >
                        Documents
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default NavLayout;

