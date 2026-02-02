// Service for assessing case viability
export const assessViability = (caseData) => {
    if (!caseData.claimType || !caseData.claimAmount) {
        return null;
    }
    
    const strengths = [];
    const weaknesses = [];
    const recommendations = [];
    let score = 3; // Default middle score (1-5)
    
    // Check claim amount
    if (caseData.claimAmount > 0 && caseData.claimAmount <= 10000) {
        strengths.push('Claim amount is within typical small claims court limits');
        score += 0.5;
    } else if (caseData.claimAmount > 10000) {
        weaknesses.push('Claim amount may exceed small claims court limits in many jurisdictions');
        recommendations.push('Consider reducing claim or filing in a different court');
        score -= 1;
    }
    
    // Check if basic information is complete
    if (caseData.plaintiff?.name && caseData.defendant?.name) {
        strengths.push('All parties are identified');
        score += 0.5;
    } else {
        weaknesses.push('Missing party information');
        recommendations.push('Complete all party details for a stronger case');
        score -= 0.5;
    }
    
    if (caseData.defendant?.address) {
        strengths.push('Defendant address is known for service');
        score += 0.3;
    } else {
        weaknesses.push('Defendant address is not provided - service may be difficult');
        recommendations.push('Locate defendant\'s current address before filing');
        score -= 0.5;
    }
    
    // Claim type specific analysis
    switch (caseData.claimType) {
        case 'unpaid_debt':
            strengths.push('Unpaid debt cases are generally straightforward if you have documentation');
            recommendations.push('Gather all contracts, invoices, and payment records');
            score += 0.3;
            break;
        case 'breach_contract':
            strengths.push('Contract cases have clear legal frameworks');
            recommendations.push('Ensure you have a written contract and can prove breach');
            weaknesses.push('Must demonstrate valid contract and damages');
            break;
        case 'property_damage':
            recommendations.push('Document all damages with photos and repair estimates');
            recommendations.push('Establish liability clearly');
            break;
        case 'personal_injury':
            weaknesses.push('Personal injury cases can be complex and may benefit from legal representation');
            recommendations.push('Consider consulting with an attorney for serious injuries');
            score -= 0.3;
            break;
        default:
            break;
    }
    
    // Ensure score is between 1 and 5
    score = Math.max(1, Math.min(5, score));
    
    // Generate summary based on score
    let summary = '';
    let scoreLabel = '';
    
    if (score >= 4) {
        scoreLabel = 'Strong';
        summary = 'Your case appears to have strong viability for small claims court. You have identified the key elements and the claim is appropriate for this venue.';
    } else if (score >= 3) {
        scoreLabel = 'Moderate';
        summary = 'Your case has moderate viability. There are some concerns that should be addressed to strengthen your position before filing.';
    } else {
        scoreLabel = 'Weak';
        summary = 'Your case may face significant challenges. Consider addressing the issues identified before proceeding, or consult with an attorney.';
    }
    
    return {
        score,
        scoreLabel,
        summary,
        strengths,
        weaknesses,
        recommendations
    };
};
