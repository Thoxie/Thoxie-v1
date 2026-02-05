// Path: src/components/CaseForm.tsx

import React from 'react';

const CaseForm: React.FC = () => {
    const [formData, setFormData] = React.useState({ name: '', email: '' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Form submitted:', formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label>Name:</label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
            </div>
            <div>
                <label>Email:</label>
                <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
            </div>
            <button type="submit">Submit</button>
        </form>
    );
};

export default CaseForm;
