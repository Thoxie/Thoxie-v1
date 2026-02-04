import React from 'react';

const CaseForm: React.FC = () => {
    const [formData, setFormData] = React.useState({ name: '', email: '' });
    const [errors, setErrors] = React.useState({ name: '', email: '' });

    const validate = () => {
        let tempErrors = { name: '', email: '' };
        if (!formData.name) tempErrors.name = 'Name is required';
        if (!formData.email) tempErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email))
            tempErrors.email = 'Email is not valid';
        setErrors(tempErrors);
        return Object.values(tempErrors).every(x => x === '');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            // Handle form submission
            console.log('Form submitted', formData);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label>Name:</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                {errors.name && <span style={{ color: 'red' }}>{errors.name}</span>}
            </div>
            <div>
                <label>Email:</label>
                <input type="text" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                {errors.email && <span style={{ color: 'red' }}>{errors.email}</span>}
            </div>
            <button type="submit">Submit</button>
        </form>
    );
};

export default CaseForm;
