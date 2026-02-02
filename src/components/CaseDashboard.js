import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { assessViability } from '../services/viabilityService';
import { calculateDamages } from '../services/damagesService';
import { generateEvidenceChecklist } from '../services/evidenceService';

const CaseDashboard = ({ onNavigate }) => {
    const { caseData, cases, currentCaseId, userTier } = useApp();
    const [viability, setViability] = useState(null);
    const [damages, setDamages] = useState(null);
    const [evidenceList, setEvidenceList] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    
    useEffect(() => {
        // Auto-generate assessments when case data changes
        if (caseData.claimType && caseData.claimAmount) {
            const viabilityResult = assessViability(caseData);
            setViability(viabilityResult);
            
            const damagesResult = calculateDamages(caseData);
            setDamages(damagesResult);
            
            const evidenceResult = generateEvidenceChecklist(caseData);
            setEvidenceList(evidenceResult);
        }
    }, [caseData]);
    
    if (!currentCaseId && cases.length === 0) {
        return (
            <div className="dashboard-empty">
                <h2>Welcome to Small Claims Court App</h2>
                <p>You don't have any cases yet.</p>
                <button 
                    className="btn-primary"
                    onClick={() => onNavigate('intake')}
                >
                    Start New Case
                </button>
            </div>
        );
    }
    
    const renderOverview = () => (
        <div className="overview-tab">
            <h2>Case Overview</h2>
            <div className="case-info">
                <div className="info-row">
                    <label>Claim Type:</label>
                    <span>{caseData.claimType || 'Not set'}</span>
                </div>
                <div className="info-row">
                    <label>Claim Amount:</label>
                    <span>${caseData.claimAmount?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="info-row">
                    <label>Plaintiff:</label>
                    <span>{caseData.plaintiff?.name || 'Not set'}</span>
                </div>
                <div className="info-row">
                    <label>Defendant:</label>
                    <span>{caseData.defendant?.name || 'Not set'}</span>
                </div>
                <div className="info-row">
                    <label>Venue:</label>
                    <span>{caseData.venue || 'Not set'}</span>
                </div>
            </div>
        </div>
    );
    
    const renderViability = () => (
        <div className="viability-tab">
            <h2>Case Viability Assessment</h2>
            {viability ? (
                <div className="assessment-result">
                    <div className={`viability-score viability-${viability.score}`}>
                        <h3>Viability Score: {viability.scoreLabel}</h3>
                        <div className="score-bar">
                            <div className="score-fill" style={{ width: `${viability.score * 20}%` }}></div>
                        </div>
                    </div>
                    <div className="assessment-details">
                        <h4>Assessment Summary</h4>
                        <p>{viability.summary}</p>
                        
                        <h4>Strengths</h4>
                        <ul>
                            {viability.strengths.map((strength, idx) => (
                                <li key={idx} className="strength-item">{strength}</li>
                            ))}
                        </ul>
                        
                        <h4>Potential Issues</h4>
                        <ul>
                            {viability.weaknesses.map((weakness, idx) => (
                                <li key={idx} className="weakness-item">{weakness}</li>
                            ))}
                        </ul>
                        
                        <h4>Recommendations</h4>
                        <ul>
                            {viability.recommendations.map((rec, idx) => (
                                <li key={idx}>{rec}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            ) : (
                <p>Complete the case intake to see viability assessment.</p>
            )}
        </div>
    );
    
    const renderDamages = () => (
        <div className="damages-tab">
            <h2>Damages Calculator</h2>
            {damages ? (
                <div className="damages-result">
                    <div className="damages-summary">
                        <h3>Conservative Estimate</h3>
                        <div className="total-damages">
                            ${damages.total.toFixed(2)}
                        </div>
                    </div>
                    
                    <div className="damages-breakdown">
                        <h4>Breakdown</h4>
                        <table className="damages-table">
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Amount</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {damages.breakdown.map((item, idx) => (
                                    <tr key={idx}>
                                        <td>{item.category}</td>
                                        <td>${item.amount.toFixed(2)}</td>
                                        <td>{item.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="info-box">
                        <p><strong>Note:</strong> This is a conservative calculation. Courts may award different amounts based on evidence and applicable law.</p>
                    </div>
                </div>
            ) : (
                <p>Complete the case intake to see damages calculation.</p>
            )}
        </div>
    );
    
    const renderEvidence = () => (
        <div className="evidence-tab">
            <h2>Evidence Checklist</h2>
            {evidenceList ? (
                <div className="evidence-checklist">
                    <div className="info-box">
                        <p>Based on your claim type ({caseData.claimType}), here's what evidence matters:</p>
                    </div>
                    
                    <h3>Critical Evidence</h3>
                    <ul className="evidence-list critical">
                        {evidenceList.critical.map((item, idx) => (
                            <li key={idx}>
                                <input type="checkbox" />
                                <label>{item}</label>
                            </li>
                        ))}
                    </ul>
                    
                    <h3>Important Evidence</h3>
                    <ul className="evidence-list important">
                        {evidenceList.important.map((item, idx) => (
                            <li key={idx}>
                                <input type="checkbox" />
                                <label>{item}</label>
                            </li>
                        ))}
                    </ul>
                    
                    <h3>Optional Evidence</h3>
                    <ul className="evidence-list optional">
                        {evidenceList.optional.map((item, idx) => (
                            <li key={idx}>
                                <input type="checkbox" />
                                <label>{item}</label>
                            </li>
                        ))}
                    </ul>
                    
                    {evidenceList.notRelevant.length > 0 && (
                        <>
                            <h3>Not Relevant</h3>
                            <ul className="evidence-list not-relevant">
                                {evidenceList.notRelevant.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            ) : (
                <p>Complete the case intake to see evidence checklist.</p>
            )}
        </div>
    );
    
    return (
        <div className="case-dashboard">
            <div className="dashboard-header">
                <h1>Case Dashboard</h1>
                <button 
                    className="btn-primary"
                    onClick={() => onNavigate('documents')}
                >
                    View Documents
                </button>
            </div>
            
            <div className="dashboard-tabs">
                <button 
                    className={activeTab === 'overview' ? 'active' : ''}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button 
                    className={activeTab === 'viability' ? 'active' : ''}
                    onClick={() => setActiveTab('viability')}
                >
                    Viability
                </button>
                <button 
                    className={activeTab === 'damages' ? 'active' : ''}
                    onClick={() => setActiveTab('damages')}
                >
                    Damages
                </button>
                <button 
                    className={activeTab === 'evidence' ? 'active' : ''}
                    onClick={() => setActiveTab('evidence')}
                >
                    Evidence
                </button>
            </div>
            
            <div className="dashboard-content">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'viability' && renderViability()}
                {activeTab === 'damages' && renderDamages()}
                {activeTab === 'evidence' && renderEvidence()}
            </div>
        </div>
    );
};

export default CaseDashboard;

