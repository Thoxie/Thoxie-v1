// Basic Form Component for Case Creation
import React, { useState } from 'react';

const CaseForm = () => {
    const [caseData, setCaseData] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCaseData({ ...caseData, [name]: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Submit logic here
        console.log('Case submitted:', caseData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <input type='text' name='caseName' onChange={handleChange} placeholder='Case Name' required />
            <button type='submit'>Create Case</button>
        </form>
    );
};

export default CaseForm;