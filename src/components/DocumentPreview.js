import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TIERS, hasFeature, FREE_TIER_LIMITS } from '../utils/featureFlags';
import { generateDemandLetter } from '../services/documentService';
import { generateComplaint } from '../services/documentService';

const DocumentPreview = ({ onBack }) => {
    const { caseData, userTier } = useApp();
    const [selectedDoc, setSelectedDoc] = useState('demand');
    const [showExportMessage, setShowExportMessage] = useState(false);
    
    const canExport = hasFeature('DOCUMENT_EXPORT', userTier);
    const showWatermark = userTier === TIERS.FREE;
    
    const handleExport = () => {
        if (!canExport) {
            setShowExportMessage(true);
            setTimeout(() => setShowExportMessage(false), 3000);
            return;
        }
        // Export logic for paid tier
        alert('Export functionality - available in paid tier');
    };
    
    const renderDocument = () => {
        let content = '';
        
        if (selectedDoc === 'demand') {
            content = generateDemandLetter(caseData);
        } else if (selectedDoc === 'complaint') {
            content = generateComplaint(caseData);
        } else if (selectedDoc === 'court') {
            content = renderCourtSelection();
            return content;
        }
        
        return (
            <div className="document-preview-content">
                {showWatermark && (
                    <div className="watermark">
                        {FREE_TIER_LIMITS.WATERMARK_TEXT}
                    </div>
                )}
                <div className="document-text" dangerouslySetInnerHTML={{ __html: content }} />
            </div>
        );
    };
    
    const renderCourtSelection = () => {
        return (
            <div className="court-selection">
                <h2>Court Selection Preview</h2>
                <div className="info-box">
                    <p><strong>Free Tier:</strong> Basic court information only. Upgrade for court-specific filing rules and requirements.</p>
                </div>
                
                <h3>Suggested Court</h3>
                <div className="court-info">
                    <h4>Small Claims Court - {caseData.venue || '[County]'} County</h4>
                    <p><strong>Address:</strong> [Court address based on venue]</p>
                    <p><strong>Phone:</strong> [Court phone number]</p>
                    <p><strong>Hours:</strong> Monday-Friday, 8:00 AM - 4:00 PM</p>
                    <p><strong>Claim Limit:</strong> Varies by state (typically $5,000-$10,000)</p>
                </div>
                
                <h3>General Filing Information</h3>
                <ul>
                    <li>Filing fees typically range from $30-$100</li>
                    <li>Cases are usually heard within 30-90 days</li>
                    <li>Bring all evidence and witnesses to your hearing</li>
                    <li>Consider mediation if offered by the court</li>
                </ul>
                
                {!hasFeature('FILING_RULES', userTier) && (
                    <div className="upgrade-prompt">
                        <p><strong>🔒 Upgrade to access:</strong></p>
                        <ul>
                            <li>Court-specific filing rules and procedures</li>
                            <li>Required forms and deadlines</li>
                            <li>Step-by-step filing instructions</li>
                            <li>Local court rules and requirements</li>
                        </ul>
                    </div>
                )}
            </div>
        );
    };
    
    return (
        <div className="document-preview">
            <div className="preview-header">
                <button className="btn-secondary" onClick={onBack}>
                    ← Back to Dashboard
                </button>
                <h1>Document Previews</h1>
            </div>
            
            <div className="preview-controls">
                <div className="doc-selector">
                    <button 
                        className={selectedDoc === 'demand' ? 'active' : ''}
                        onClick={() => setSelectedDoc('demand')}
                    >
                        Demand Letter
                    </button>
                    <button 
                        className={selectedDoc === 'complaint' ? 'active' : ''}
                        onClick={() => setSelectedDoc('complaint')}
                    >
                        Small Claims Complaint
                    </button>
                    <button 
                        className={selectedDoc === 'court' ? 'active' : ''}
                        onClick={() => setSelectedDoc('court')}
                    >
                        Court Selection
                    </button>
                </div>
                
                <div className="preview-actions">
                    <button 
                        className="btn-primary"
                        onClick={handleExport}
                        disabled={!canExport}
                    >
                        {canExport ? 'Export PDF' : '🔒 Export (Paid Feature)'}
                    </button>
                </div>
            </div>
            
            {showExportMessage && (
                <div className="alert alert-info">
                    Export is available in the paid tier. Upgrade to download documents.
                </div>
            )}
            
            <div className="preview-container">
                {renderDocument()}
            </div>
            
            {userTier === TIERS.FREE && selectedDoc !== 'court' && (
                <div className="free-tier-notice">
                    <p>📄 <strong>Free Tier Preview:</strong> This document is watermarked and view-only. Upgrade to remove watermarks and export documents.</p>
                </div>
            )}
        </div>
    );
};

export default DocumentPreview;

