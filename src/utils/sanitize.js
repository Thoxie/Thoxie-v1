// Utility function to escape HTML to prevent XSS attacks
export const escapeHtml = (text) => {
    if (!text) return '';
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
};

// Format currency values safely
export const formatCurrency = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return '$0.00';
    }
    return `$${amount.toFixed(2)}`;
};

// Format date safely
export const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
};
