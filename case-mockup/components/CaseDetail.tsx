'use client';

import { Case } from '@/types/Case';
import Link from 'next/link';

interface CaseDetailProps {
  caseData: Case;
}

export default function CaseDetail({ caseData }: CaseDetailProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: Case['status']) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      active: 'bg-green-100 text-green-800 border-green-300',
      closed: 'bg-gray-100 text-gray-800 border-gray-300',
      dismissed: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status];
  };

  const getTierColor = (tier: Case['tier']) => {
    return tier === 'paid' 
      ? 'bg-purple-100 text-purple-800 border-purple-300' 
      : 'bg-blue-100 text-blue-800 border-blue-300';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Cases
        </Link>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <h1 className="text-3xl font-bold">Case Details</h1>
          <p className="text-blue-100 mt-1">Case ID: {caseData.id}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Status and Tier Section */}
          <div className="flex gap-4">
            <div className={`px-4 py-2 rounded-lg border-2 ${getStatusColor(caseData.status)}`}>
              <div className="text-xs font-medium uppercase tracking-wide opacity-75">Status</div>
              <div className="text-lg font-bold capitalize">{caseData.status}</div>
            </div>
            <div className={`px-4 py-2 rounded-lg border-2 ${getTierColor(caseData.tier)}`}>
              <div className="text-xs font-medium uppercase tracking-wide opacity-75">Tier</div>
              <div className="text-lg font-bold capitalize">{caseData.tier}</div>
            </div>
          </div>

          {/* Case Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 uppercase tracking-wide">
                  User ID
                </label>
                <p className="mt-1 text-lg text-gray-900 font-mono">{caseData.userId}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Case Type
                </label>
                <p className="mt-1 text-lg text-gray-900">{caseData.caseType}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Claim Amount
                </label>
                <p className="mt-1 text-2xl font-bold text-green-600">
                  {formatCurrency(caseData.claimAmount)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Created At
                </label>
                <p className="mt-1 text-lg text-gray-900">{formatDate(caseData.createdAt)}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Court State
                </label>
                <p className="mt-1 text-lg text-gray-900">{caseData.courtState}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Court County
                </label>
                <p className="mt-1 text-lg text-gray-900">{caseData.courtCounty}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Defendants
                </label>
                <ul className="mt-1 space-y-1">
                  {caseData.defendants.map((defendant, index) => (
                    <li key={index} className="text-lg text-gray-900 flex items-start gap-2">
                      <span className="text-blue-600 font-bold">&bull;</span>
                      <span>{defendant}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* JSON Inspector Section */}
          <div className="border-t pt-6">
            <h2 className="text-xl font-bold text-gray-800 mb-3">
              Raw JSON Data
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-gray-800 font-mono">
                {JSON.stringify(
                  {
                    ...caseData,
                    createdAt: caseData.createdAt.toISOString(),
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
