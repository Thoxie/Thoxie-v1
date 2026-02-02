import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import NavLayout from './components/NavLayout';
import IntakeWizard from './components/IntakeWizard';
import CaseDashboard from './components/CaseDashboard';
import DocumentPreview from './components/DocumentPreview';

function App() {
    const [currentView, setCurrentView] = useState('dashboard');
    
    const renderView = () => {
        switch (currentView) {
            case 'intake':
                return <IntakeWizard onComplete={() => setCurrentView('dashboard')} />;
            case 'dashboard':
                return <CaseDashboard onNavigate={setCurrentView} />;
            case 'documents':
                return <DocumentPreview onBack={() => setCurrentView('dashboard')} />;
            default:
                return <CaseDashboard onNavigate={setCurrentView} />;
        }
    };
    
    return (
        <AppProvider>
            <div className="app">
                <NavLayout currentView={currentView} onNavigate={setCurrentView} />
                <main className="main-content">
                    {renderView()}
                </main>
            </div>
        </AppProvider>
    );
}

export default App;
