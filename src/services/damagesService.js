// Service for calculating damages conservatively
export const calculateDamages = (caseData) => {
    if (!caseData.claimAmount) {
        return null;
    }
    
    const breakdown = [];
    let total = 0;
    
    // Base claim amount (conservative: 80% of claimed)
    const baseAmount = caseData.claimAmount * 0.8;
    breakdown.push({
        category: 'Primary Damages',
        amount: baseAmount,
        notes: 'Conservative estimate at 80% of claimed amount'
    });
    total += baseAmount;
    
    // Claim type specific adjustments
    switch (caseData.claimType) {
        case 'unpaid_debt':
            // May include interest if documented
            if (caseData.claimAmount > 1000) {
                const interest = Math.min(caseData.claimAmount * 0.05, 500);
                breakdown.push({
                    category: 'Interest (if documented)',
                    amount: interest,
                    notes: 'Potential interest on debt (requires documentation)'
                });
                total += interest;
            }
            break;
            
        case 'property_damage':
            // Replacement vs repair cost consideration
            breakdown.push({
                category: 'Repair/Replacement',
                amount: caseData.claimAmount * 0.75,
                notes: 'Conservative repair cost estimate'
            });
            total = caseData.claimAmount * 0.75;
            break;
            
        case 'breach_contract':
            // Direct damages only (no consequential in small claims typically)
            breakdown.push({
                category: 'Direct Contract Damages',
                amount: caseData.claimAmount * 0.7,
                notes: 'Direct damages only - consequential damages typically not recoverable'
            });
            total = caseData.claimAmount * 0.7;
            break;
            
        case 'landlord_tenant':
            // Security deposit, unpaid rent, or damages
            breakdown.push({
                category: 'Documented Losses',
                amount: caseData.claimAmount * 0.85,
                notes: 'Based on lease terms and documentation'
            });
            total = caseData.claimAmount * 0.85;
            break;
            
        default:
            // Keep the base conservative estimate
            break;
    }
    
    // Court costs (filing fees typically $30-$100)
    const courtCosts = 75;
    breakdown.push({
        category: 'Court Filing Fees',
        amount: courtCosts,
        notes: 'Typical small claims filing fee (recoverable if you win)'
    });
    total += courtCosts;
    
    // Service fees (typically $20-$50 per defendant)
    const serviceFees = 35;
    breakdown.push({
        category: 'Service of Process',
        amount: serviceFees,
        notes: 'Cost to serve defendant (recoverable if you win)'
    });
    total += serviceFees;
    
    return {
        total: Math.round(total * 100) / 100,
        breakdown: breakdown.map(item => ({
            ...item,
            amount: Math.round(item.amount * 100) / 100
        }))
    };
};
