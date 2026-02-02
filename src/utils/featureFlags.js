// Feature tiers configuration
export const TIERS = {
    FREE: 'free',
    PAID: 'paid'
};

// Feature flags for different tiers
export const FEATURES = {
    // Free tier features
    GUIDED_INTAKE: {
        name: 'Guided Case Intake',
        tiers: [TIERS.FREE, TIERS.PAID]
    },
    VIABILITY_ASSESSMENT: {
        name: 'Case Viability Assessment',
        tiers: [TIERS.FREE, TIERS.PAID]
    },
    DAMAGES_CALCULATOR: {
        name: 'Damages Math Calculator',
        tiers: [TIERS.FREE, TIERS.PAID]
    },
    EVIDENCE_CHECKLIST: {
        name: 'Evidence Checklist',
        tiers: [TIERS.FREE, TIERS.PAID]
    },
    DRAFT_PREVIEWS: {
        name: 'Draft Previews',
        tiers: [TIERS.FREE, TIERS.PAID]
    },
    COURT_SELECTION_PREVIEW: {
        name: 'Court Selection Preview',
        tiers: [TIERS.FREE, TIERS.PAID]
    },
    
    // Paid tier only features
    DOCUMENT_EXPORT: {
        name: 'Document Export',
        tiers: [TIERS.PAID]
    },
    FILING_RULES: {
        name: 'Court-Specific Filing Rules',
        tiers: [TIERS.PAID]
    },
    SERVICE_INSTRUCTIONS: {
        name: 'Service Instructions',
        tiers: [TIERS.PAID]
    },
    HEARING_PREP: {
        name: 'Hearing Preparation Tools',
        tiers: [TIERS.PAID]
    },
    MULTIPLE_CASES: {
        name: 'Multiple Cases',
        tiers: [TIERS.PAID]
    },
    DEADLINE_AUTOMATION: {
        name: 'Deadline Automation',
        tiers: [TIERS.PAID]
    },
    REMOVE_WATERMARKS: {
        name: 'Remove Watermarks',
        tiers: [TIERS.PAID]
    }
};

// Check if a feature is available for a given tier
export const hasFeature = (featureKey, userTier) => {
    const feature = FEATURES[featureKey];
    if (!feature) return false;
    return feature.tiers.includes(userTier);
};

// Free tier limits
export const FREE_TIER_LIMITS = {
    MAX_CASES: 1,
    WATERMARK_TEXT: 'FREE PREVIEW - NOT FOR FILING',
    WATERMARK_ENABLED: true
};
