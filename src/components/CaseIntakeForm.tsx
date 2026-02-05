import React, { useState } from 'react';

const CaseIntakeForm = () => {
  const [step, setStep] = useState(1);

  const nextStep = () => {
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Add form submission logic here
    alert('Form submitted!');
  };

  return (
    <form onSubmit={handleSubmit}>
      {step === 1 && (
        <div>
          <h2>Step 1: Basic Information</h2>
          <input type="text" placeholder="Name" required />
          <input type="email" placeholder="Email" required />
          <button type="button" onClick={nextStep}>Next</button>
        </div>
      )}
      {step === 2 && (
        <div>
          <h2>Step 2: Additional Details</h2>
          <textarea placeholder="Details" required></textarea>
          <button type="button" onClick={prevStep}>Previous</button>
          <button type="submit">Submit</button>
        </div>
      )}
    </form>
  );
};

export default CaseIntakeForm;