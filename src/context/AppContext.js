import React, { createContext, useContext, useState, useEffect } from 'react';
import { TIERS } from '../utils/featureFlags';

// Create the App Context
const AppContext = createContext();

// Context Provider Component
export const AppProvider = ({ children }) => {
    // User tier state (default to FREE for now)
    const [userTier, setUserTier] = useState(TIERS.FREE);
    
    // Case data state
    const [caseData, setCaseData] = useState({
        claimType: '',
        claimAmount: 0,
        plaintiff: {
            name: '',
            address: '',
            phone: '',
            email: ''
        },
        defendant: {
            name: '',
            address: '',
            phone: '',
            email: ''
        },
        venue: '',
        description: '',
        evidence: [],
        viabilityAssessment: null,
        damagesCalculation: null
    });
    
    // Cases list (for managing multiple cases - restricted in free tier)
    const [cases, setCases] = useState([]);
    
    // Current case ID
    const [currentCaseId, setCurrentCaseId] = useState(null);
    
    // Update case data
    const updateCaseData = (updates) => {
        setCaseData(prev => ({
            ...prev,
            ...updates
        }));
    };
    
    // Create new case
    const createCase = () => {
        const newCase = {
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            ...caseData
        };
        
        // Free tier limit: only 1 case
        if (userTier === TIERS.FREE && cases.length >= 1) {
            throw new Error('Free tier is limited to one case. Please upgrade to create more cases.');
        }
        
        setCases(prev => [...prev, newCase]);
        setCurrentCaseId(newCase.id);
        return newCase;
    };
    
    // Save current case
    const saveCase = () => {
        if (!currentCaseId) return;
        
        setCases(prev => prev.map(c => 
            c.id === currentCaseId 
                ? { ...c, ...caseData, updatedAt: new Date().toISOString() }
                : c
        ));
    };
    
    // Load a case
    const loadCase = (caseId) => {
        const foundCase = cases.find(c => c.id === caseId);
        if (foundCase) {
            setCaseData(foundCase);
            setCurrentCaseId(caseId);
        }
    };
    
    const value = {
        userTier,
        setUserTier,
        caseData,
        setCaseData,
        updateCaseData,
        cases,
        currentCaseId,
        createCase,
        saveCase,
        loadCase
    };
    
    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

// Custom hook to use the App Context
export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
