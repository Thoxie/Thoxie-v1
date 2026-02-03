import React, { useState } from 'react';

const CaseIntakeForm = () => {
    const [claimType, setClaimType] = useState('');
    const [claimAmount, setClaimAmount] = useState('');
    const [parties, setParties] = useState([]);
    const [venue, setVenue] = useState({ state: '', county: '' });
    const [shortNarrative, setShortNarrative] = useState('');

    // multi-step form logic here

    return (
        <form>
            {/* form fields for Claim Type, Claim Amount, Parties, Venue, and Short Narrative */}
            {/* Add your input fields and buttons here */}
        </form>
    );
};

export default CaseIntakeForm;
