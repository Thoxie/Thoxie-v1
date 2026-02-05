'use client';

import { useState } from 'react';
import { Case } from '@/types/Case';

interface CaseFormProps {
  onSubmit: (caseData: Omit<Case, 'id' | 'createdAt'>) => void;
  onCancel?: () => void;
}

export default function CaseForm({ onSubmit, onCancel }: CaseFormProps) {
  const [formData, setFormData] = useState({
    userId: '',
    caseType: '',
    claimAmount: '',
    courtState: '',
    courtCounty: '',
    defendants: '',
    status: 'pending' as Case['status'],
    tier: 'free' as Case['tier'],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const caseData: Omit<Case, 'id' | 'createdAt'> = {
      userId: formData.userId,
      caseType: formData.caseType,
      claimAmount: parseFloat(formData.claimAmount),
      courtState: formData.courtState,
      courtCounty: formData.courtCounty,
      defendants: formData.defendants.split(',').map(d => d.trim()).filter(d => d),
      status: formData.status,
      tier: formData.tier,
    };
    
    onSubmit(caseData);
    
    // Reset form
    setFormData({
      userId: '',
      caseType: '',
      claimAmount: '',
      courtState: '',
      courtCounty: '',
      defendants: '',
      status: 'pending',
      tier: 'free',
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6 space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Add New Case</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            User ID
          </label>
          <input
            type="text"
            name="userId"
            value={formData.userId}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter user ID"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Case Type
          </label>
          <input
            type="text"
            name="caseType"
            value={formData.caseType}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Property Damage"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Claim Amount ($)
          </label>
          <input
            type="number"
            name="claimAmount"
            value={formData.claimAmount}
            onChange={handleChange}
            required
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Court State
          </label>
          <input
            type="text"
            name="courtState"
            value={formData.courtState}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., California"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Court County
          </label>
          <input
            type="text"
            name="courtCounty"
            value={formData.courtCounty}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Los Angeles County"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Defendants (comma-separated)
          </label>
          <input
            type="text"
            name="defendants"
            value={formData.defendants}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., John Doe, Jane Smith"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tier
          </label>
          <select
            name="tier"
            value={formData.tier}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>
      
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          Add Case
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors font-medium"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
