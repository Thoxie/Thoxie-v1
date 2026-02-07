'use client';

import { useState } from 'react';
import { Case } from '@/types/Case';
import { mockCases } from '@/lib/mockData';
import CaseForm from '@/components/CaseForm';
import CaseList from '@/components/CaseList';

export default function Home() {
  const [cases, setCases] = useState<Case[]>(mockCases);
  const [showForm, setShowForm] = useState(false);

  const handleAddCase = (caseData: Omit<Case, 'id' | 'createdAt'>) => {
    const newCase: Case = {
      ...caseData,
      id: `case-${Date.now()}`,
      createdAt: new Date(),
    };
    
    setCases(prev => [newCase, ...prev]);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Case Management System
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Small Claims Court Case Mockup
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
          >
            {showForm ? 'Hide Form' : 'Add New Case'}
          </button>
        </div>

        {showForm && (
          <div className="mb-8">
            <CaseForm onSubmit={handleAddCase} onCancel={() => setShowForm(false)} />
          </div>
        )}

        <CaseList cases={cases} />
      </main>

      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-gray-600">
          <p>Case Mockup &copy; 2024 - Ready for Vercel Deployment</p>
        </div>
      </footer>
    </div>
  );
}
