// Service for generating legal documents
export const generateDemandLetter = (caseData) => {
    const today = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    return `
        <div class="document">
            <div class="document-header">
                <p>${caseData.plaintiff?.name || '[Your Name]'}<br/>
                ${caseData.plaintiff?.address || '[Your Address]'}<br/>
                ${caseData.plaintiff?.phone || '[Your Phone]'}<br/>
                ${caseData.plaintiff?.email || '[Your Email]'}</p>
                
                <p style="margin-top: 20px;">${today}</p>
                
                <p style="margin-top: 20px;">${caseData.defendant?.name || '[Defendant Name]'}<br/>
                ${caseData.defendant?.address || '[Defendant Address]'}</p>
            </div>
            
            <div class="document-body">
                <p><strong>RE: Demand for Payment - ${caseData.claimType?.replace('_', ' ').toUpperCase() || 'CLAIM'}</strong></p>
                
                <p>Dear ${caseData.defendant?.name || '[Defendant Name]'},</p>
                
                <p>This letter serves as formal notice and demand for payment of damages in the amount of 
                <strong>$${caseData.claimAmount?.toFixed(2) || '0.00'}</strong> arising from 
                ${getClaimDescription(caseData.claimType)}.</p>
                
                <p><strong>Background:</strong></p>
                <p>${caseData.description || '[Describe the circumstances of your claim, including relevant dates, facts, and how the defendant is responsible for the damages.]'}</p>
                
                <p><strong>Damages:</strong></p>
                <p>As a result of the above, I have incurred damages totaling $${caseData.claimAmount?.toFixed(2) || '0.00'}. 
                This amount represents ${getDamagesDescription(caseData.claimType)}.</p>
                
                <p><strong>Demand for Payment:</strong></p>
                <p>I hereby demand payment in full of $${caseData.claimAmount?.toFixed(2) || '0.00'} within 
                <strong>fifteen (15) days</strong> of the date of this letter. Payment should be made by 
                [check/money order/electronic transfer] to the address listed above.</p>
                
                <p>If you fail to pay the demanded amount within the specified time period, I will have no choice 
                but to pursue this matter in small claims court, which may result in additional court costs and 
                fees being added to the amount owed.</p>
                
                <p>I prefer to resolve this matter amicably without court involvement. Please contact me at 
                ${caseData.plaintiff?.phone || '[your phone]'} or ${caseData.plaintiff?.email || '[your email]'} 
                to discuss payment arrangements if needed.</p>
                
                <p>Sincerely,</p>
                
                <p style="margin-top: 40px;">_______________________<br/>
                ${caseData.plaintiff?.name || '[Your Name]'}</p>
                
                <p style="margin-top: 20px;"><em>cc: File</em></p>
            </div>
        </div>
    `;
};

export const generateComplaint = (caseData) => {
    return `
        <div class="document">
            <div class="document-header" style="text-align: center;">
                <h2>SMALL CLAIMS COURT<br/>
                ${caseData.venue || '[COUNTY]'} COUNTY</h2>
                
                <p style="margin-top: 30px;"><strong>SMALL CLAIMS COMPLAINT</strong></p>
            </div>
            
            <div class="document-body">
                <table class="complaint-table">
                    <tr>
                        <td style="width: 50%;"><strong>Plaintiff:</strong><br/>
                        ${caseData.plaintiff?.name || '[Plaintiff Name]'}<br/>
                        ${caseData.plaintiff?.address || '[Plaintiff Address]'}<br/>
                        Phone: ${caseData.plaintiff?.phone || '[Phone]'}</td>
                        <td style="width: 50%;"><strong>Case No.:</strong> ____________<br/><br/>
                        <strong>Filed:</strong> ____________</td>
                    </tr>
                </table>
                
                <p style="margin-top: 20px;"><strong>vs.</strong></p>
                
                <table class="complaint-table">
                    <tr>
                        <td><strong>Defendant:</strong><br/>
                        ${caseData.defendant?.name || '[Defendant Name]'}<br/>
                        ${caseData.defendant?.address || '[Defendant Address]'}</td>
                    </tr>
                </table>
                
                <hr style="margin: 30px 0;"/>
                
                <h3 style="text-align: center;">COMPLAINT FOR DAMAGES</h3>
                
                <p><strong>1. PARTIES</strong></p>
                <p>Plaintiff ${caseData.plaintiff?.name || '[Plaintiff Name]'} is a resident of 
                ${caseData.venue || '[County]'} County.</p>
                
                <p>Defendant ${caseData.defendant?.name || '[Defendant Name]'} is a resident of 
                ${caseData.venue || '[County]'} County.</p>
                
                <p><strong>2. JURISDICTION AND VENUE</strong></p>
                <p>This Court has jurisdiction over this matter pursuant to [State] law governing small claims 
                courts. Venue is proper in ${caseData.venue || '[County]'} County because 
                [the defendant resides here / the events occurred here / the contract was to be performed here].</p>
                
                <p><strong>3. CLAIM TYPE</strong></p>
                <p>This is an action for ${getClaimDescription(caseData.claimType)}.</p>
                
                <p><strong>4. FACTS</strong></p>
                <p>${caseData.description || '[State the facts of your case clearly and concisely. Include: What happened? When did it happen? Where did it happen? Who was involved? What did the defendant do or fail to do?]'}</p>
                
                <p><strong>5. DAMAGES</strong></p>
                <p>As a direct and proximate result of Defendant's actions, Plaintiff has suffered damages in the 
                amount of $${caseData.claimAmount?.toFixed(2) || '0.00'}, consisting of 
                ${getDamagesDescription(caseData.claimType)}.</p>
                
                <p><strong>6. DEMAND FOR RELIEF</strong></p>
                <p>WHEREFORE, Plaintiff respectfully requests that this Court enter judgment against Defendant as follows:</p>
                <ol style="margin-left: 40px;">
                    <li>Money damages in the amount of $${caseData.claimAmount?.toFixed(2) || '0.00'};</li>
                    <li>Court costs and fees;</li>
                    <li>Such other and further relief as the Court deems just and proper.</li>
                </ol>
                
                <p style="margin-top: 40px;">Respectfully submitted,</p>
                
                <p style="margin-top: 40px;">_______________________<br/>
                ${caseData.plaintiff?.name || '[Your Name]'}<br/>
                Plaintiff, Pro Se</p>
                
                <p style="margin-top: 20px;"><strong>Date:</strong> ____________</p>
                
                <hr style="margin: 30px 0;"/>
                
                <p style="text-align: center;"><strong>VERIFICATION</strong></p>
                
                <p>I, ${caseData.plaintiff?.name || '[Your Name]'}, declare under penalty of perjury 
                that I have read the foregoing complaint and that the facts stated therein are true and correct 
                to the best of my knowledge and belief.</p>
                
                <p style="margin-top: 40px;">_______________________<br/>
                ${caseData.plaintiff?.name || '[Your Name]'}</p>
                
                <p><strong>Date:</strong> ____________</p>
            </div>
        </div>
    `;
};

// Helper function to get claim description
const getClaimDescription = (claimType) => {
    const descriptions = {
        'property_damage': 'property damage',
        'breach_contract': 'breach of contract',
        'unpaid_debt': 'unpaid debt',
        'personal_injury': 'personal injury',
        'landlord_tenant': 'landlord/tenant dispute',
        'other': 'other civil matter'
    };
    return descriptions[claimType] || 'a civil matter';
};

// Helper function to get damages description
const getDamagesDescription = (claimType) => {
    const descriptions = {
        'property_damage': 'the cost of repair or replacement of damaged property',
        'breach_contract': 'lost profits and expenses incurred as a result of the breach',
        'unpaid_debt': 'the principal amount owed plus any agreed-upon interest',
        'personal_injury': 'medical expenses, lost wages, and pain and suffering',
        'landlord_tenant': 'unpaid rent, property damage, or improperly withheld security deposit',
        'other': 'various documented expenses and losses'
    };
    return descriptions[claimType] || 'documented losses and expenses';
};
