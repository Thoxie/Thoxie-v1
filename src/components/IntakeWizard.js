import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

const CLAIM_TYPES = [
    { value: 'property_damage', label: 'Property Damage' },
    { value: 'breach_contract', label: 'Breach of Contract' },
    { value: 'unpaid_debt', label: 'Unpaid Debt' },
    { value: 'personal_injury', label: 'Personal Injury' },
    { value: 'landlord_tenant', label: 'Landlord/Tenant Dispute' },
    { value: 'other', label: 'Other' }
];

const IntakeWizard = ({ onComplete }) => {
    const { caseData, updateCaseData, createCase } = useApp();
    const [currentStep, setCurrentStep] = useState(1);
    const [errors, setErrors] = useState({});
    
    const validateStep = (step) => {
        const newErrors = {};
        
        if (step === 1 && !caseData.claimType) {
            newErrors.claimType = 'Please select a claim type';
        }
        
        if (step === 2) {
            if (!caseData.claimAmount || caseData.claimAmount <= 0) {
                newErrors.claimAmount = 'Please enter a valid claim amount';
            }
        }
        
        if (step === 3) {
            if (!caseData.plaintiff.name) newErrors.plaintiffName = 'Plaintiff name is required';
            if (!caseData.defendant.name) newErrors.defendantName = 'Defendant name is required';
        }
        
        if (step === 4) {
            if (!caseData.venue) newErrors.venue = 'Please select a venue';
            if (!caseData.description) newErrors.description = 'Case description is required';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleNext = () => {
        if (validateStep(currentStep)) {
            if (currentStep < 4) {
                setCurrentStep(currentStep + 1);
            } else {
                // Save the case and complete
                try {
                    createCase();
                    onComplete();
                } catch (error) {
                    alert(error.message);
                }
            }
        }
    };
    
    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };
    
    const renderStep1 = () => (
        <div className="wizard-step">
            <h2>Step 1: Claim Type</h2>
            <p>What type of claim are you filing?</p>
            <div className="form-group">
                {CLAIM_TYPES.map(type => (
                    <label key={type.value} className="radio-label">
                        <input
                            type="radio"
                            name="claimType"
                            value={type.value}
                            checked={caseData.claimType === type.value}
                            onChange={(e) => updateCaseData({ claimType: e.target.value })}
                        />
                        {type.label}
                    </label>
                ))}
                {errors.claimType && <span className="error">{errors.claimType}</span>}
            </div>
        </div>
    );
    
    const renderStep2 = () => (
        <div className="wizard-step">
            <h2>Step 2: Claim Amount</h2>
            <p>What is the total amount you are claiming?</p>
            <div className="form-group">
                <label>
                    Amount ($):
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={caseData.claimAmount || ''}
                        onChange={(e) => updateCaseData({ claimAmount: parseFloat(e.target.value) || 0 })}
                        placeholder="Enter amount"
                    />
                </label>
                {errors.claimAmount && <span className="error">{errors.claimAmount}</span>}
            </div>
            <div className="info-box">
                <p><strong>Note:</strong> Small claims courts typically handle cases up to $10,000 (varies by state).</p>
            </div>
        </div>
    );
    
    const renderStep3 = () => (
        <div className="wizard-step">
            <h2>Step 3: Parties Information</h2>
            
            <h3>Plaintiff (You)</h3>
            <div className="form-group">
                <label>
                    Name:
                    <input
                        type="text"
                        value={caseData.plaintiff.name || ''}
                        onChange={(e) => updateCaseData({ 
                            plaintiff: { ...caseData.plaintiff, name: e.target.value }
                        })}
                        placeholder="Your full legal name"
                    />
                </label>
                {errors.plaintiffName && <span className="error">{errors.plaintiffName}</span>}
                
                <label>
                    Address:
                    <input
                        type="text"
                        value={caseData.plaintiff.address || ''}
                        onChange={(e) => updateCaseData({ 
                            plaintiff: { ...caseData.plaintiff, address: e.target.value }
                        })}
                        placeholder="Street address"
                    />
                </label>
                
                <label>
                    Phone:
                    <input
                        type="tel"
                        value={caseData.plaintiff.phone || ''}
                        onChange={(e) => updateCaseData({ 
                            plaintiff: { ...caseData.plaintiff, phone: e.target.value }
                        })}
                        placeholder="Phone number"
                    />
                </label>
                
                <label>
                    Email:
                    <input
                        type="email"
                        value={caseData.plaintiff.email || ''}
                        onChange={(e) => updateCaseData({ 
                            plaintiff: { ...caseData.plaintiff, email: e.target.value }
                        })}
                        placeholder="Email address"
                    />
                </label>
            </div>
            
            <h3>Defendant</h3>
            <div className="form-group">
                <label>
                    Name:
                    <input
                        type="text"
                        value={caseData.defendant.name || ''}
                        onChange={(e) => updateCaseData({ 
                            defendant: { ...caseData.defendant, name: e.target.value }
                        })}
                        placeholder="Defendant's full legal name"
                    />
                </label>
                {errors.defendantName && <span className="error">{errors.defendantName}</span>}
                
                <label>
                    Address:
                    <input
                        type="text"
                        value={caseData.defendant.address || ''}
                        onChange={(e) => updateCaseData({ 
                            defendant: { ...caseData.defendant, address: e.target.value }
                        })}
                        placeholder="Street address"
                    />
                </label>
                
                <label>
                    Phone:
                    <input
                        type="tel"
                        value={caseData.defendant.phone || ''}
                        onChange={(e) => updateCaseData({ 
                            defendant: { ...caseData.defendant, phone: e.target.value }
                        })}
                        placeholder="Phone number (if known)"
                    />
                </label>
            </div>
        </div>
    );
    
    const renderStep4 = () => (
        <div className="wizard-step">
            <h2>Step 4: Venue & Description</h2>
            
            <div className="form-group">
                <label>
                    Court Venue (County):
                    <input
                        type="text"
                        value={caseData.venue || ''}
                        onChange={(e) => updateCaseData({ venue: e.target.value })}
                        placeholder="Enter county name"
                    />
                </label>
                {errors.venue && <span className="error">{errors.venue}</span>}
            </div>
            
            <div className="form-group">
                <label>
                    Case Description:
                    <textarea
                        rows="6"
                        value={caseData.description || ''}
                        onChange={(e) => updateCaseData({ description: e.target.value })}
                        placeholder="Briefly describe your case..."
                    />
                </label>
                {errors.description && <span className="error">{errors.description}</span>}
            </div>
            
            <div className="info-box">
                <p><strong>Tip:</strong> Include key facts, dates, and what you're asking the court to do.</p>
            </div>
        </div>
    );
    
    return (
        <div className="intake-wizard">
            <div className="wizard-header">
                <h1>Guided Case Intake</h1>
                <div className="progress-bar">
                    <div className="progress" style={{ width: `${(currentStep / 4) * 100}%` }}></div>
                </div>
                <p className="step-indicator">Step {currentStep} of 4</p>
            </div>
            
            <div className="wizard-content">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
                {currentStep === 4 && renderStep4()}
            </div>
            
            <div className="wizard-footer">
                <button 
                    className="btn-secondary" 
                    onClick={handleBack}
                    disabled={currentStep === 1}
                >
                    Back
                </button>
                <button 
                    className="btn-primary" 
                    onClick={handleNext}
                >
                    {currentStep === 4 ? 'Complete' : 'Next'}
                </button>
            </div>
        </div>
    );
};

export default IntakeWizard;

