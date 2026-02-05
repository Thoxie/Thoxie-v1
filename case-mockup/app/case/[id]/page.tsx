'use client';

import { use } from 'react';
import { mockCases } from '@/lib/mockData';
import CaseDetail from '@/components/CaseDetail';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CasePage({ params }: PageProps) {
  const { id } = use(params);
  const caseData = mockCases.find(c => c.id === id);

  if (!caseData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white shadow-lg rounded-lg p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Case Not Found</h1>
          <p className="text-gray-600 mb-6">
            The case with ID &quot;{id}&quot; could not be found.
          </p>
          <Link
            href="/"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium inline-block"
          >
            Back to Cases
          </Link>
        </div>
      </div>
    );
  }

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
        <CaseDetail caseData={caseData} />
      </main>
    </div>
  );
}
