// Service for generating evidence checklist based on claim type
export const generateEvidenceChecklist = (caseData) => {
    if (!caseData.claimType) {
        return null;
    }
    
    let critical = [];
    let important = [];
    let optional = [];
    let notRelevant = [];
    
    // Common evidence for all cases
    const commonCritical = [
        'Copy of filed complaint',
        'Proof of service on defendant',
        'Photo ID or driver\'s license'
    ];
    
    const commonImportant = [
        'Timeline of events (written summary)',
        'All correspondence with defendant',
        'Witness contact information'
    ];
    
    // Claim type specific evidence
    switch (caseData.claimType) {
        case 'unpaid_debt':
            critical = [
                ...commonCritical,
                'Original contract or agreement',
                'Invoices showing amounts owed',
                'Payment history or ledger',
                'Demand letter sent to defendant'
            ];
            important = [
                ...commonImportant,
                'Bank statements showing payments made',
                'Email or text confirmations of debt',
                'Proof of delivered goods/services'
            ];
            optional = [
                'Credit report (if applicable)',
                'Collection agency communications',
                'Prior payment arrangements'
            ];
            notRelevant = [
                'Tax returns',
                'Personal character references'
            ];
            break;
            
        case 'property_damage':
            critical = [
                ...commonCritical,
                'Photos of damage (dated)',
                'Repair estimates (2-3 quotes)',
                'Proof of property ownership',
                'Police report (if applicable)'
            ];
            important = [
                ...commonImportant,
                'Before and after photos',
                'Receipts for any repairs already made',
                'Expert assessment of damage',
                'Proof defendant caused damage'
            ];
            optional = [
                'Video of damage',
                'Weather reports (if relevant)',
                'Property value assessment'
            ];
            notRelevant = [
                'Unrelated property issues',
                'Prior disputes with other parties'
            ];
            break;
            
        case 'breach_contract':
            critical = [
                ...commonCritical,
                'Signed contract or agreement',
                'Proof you fulfilled your obligations',
                'Documentation of breach',
                'Calculation of damages'
            ];
            important = [
                ...commonImportant,
                'Email/written communications about contract',
                'Receipts showing your performance',
                'Notice of breach sent to defendant',
                'Any amendments to contract'
            ];
            optional = [
                'Similar contracts for comparison',
                'Industry standard practices',
                'Expert testimony on contract terms'
            ];
            notRelevant = [
                'Verbal agreements not in contract',
                'Personal opinions about fairness'
            ];
            break;
            
        case 'landlord_tenant':
            critical = [
                ...commonCritical,
                'Lease agreement',
                'Move-in inspection report',
                'Photos of property condition',
                'Rent payment records'
            ];
            important = [
                ...commonImportant,
                'Security deposit receipt',
                'Notice to vacate (if applicable)',
                'Repair requests and responses',
                'Bank statements showing rent payments'
            ];
            optional = [
                'Move-out inspection report',
                'Previous tenants\' issues',
                'Local housing code violations'
            ];
            notRelevant = [
                'Complaints about other tenants',
                'Personal disputes unrelated to lease'
            ];
            break;
            
        case 'personal_injury':
            critical = [
                ...commonCritical,
                'Medical records and bills',
                'Photos of injuries',
                'Accident/incident report',
                'Proof of defendant\'s liability'
            ];
            important = [
                ...commonImportant,
                'Doctor\'s statement on injuries',
                'Lost wage documentation',
                'Prescription records',
                'Physical therapy records'
            ];
            optional = [
                'Expert medical testimony',
                'Future medical cost estimates',
                'Pain and suffering journal'
            ];
            notRelevant = [
                'Unrelated medical history',
                'Pre-existing conditions (unless related)'
            ];
            break;
            
        default:
            critical = commonCritical;
            important = [
                ...commonImportant,
                'Any contracts or agreements',
                'Documentation supporting your claim',
                'Proof of damages'
            ];
            optional = [
                'Expert opinions',
                'Comparable cases or precedents'
            ];
            notRelevant = [
                'Irrelevant personal information'
            ];
            break;
    }
    
    return {
        critical,
        important,
        optional,
        notRelevant
    };
};
