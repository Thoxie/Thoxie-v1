import { faker } from '@faker-js/faker';
import { Case } from '@/types/Case';

const caseTypes = [
  'Property Damage',
  'Breach of Contract',
  'Personal Injury',
  'Landlord-Tenant Dispute',
  'Consumer Complaint',
  'Unpaid Debt',
  'Neighbor Dispute'
];

const states = [
  'California',
  'Texas',
  'Florida',
  'New York',
  'Illinois',
  'Pennsylvania',
  'Ohio',
  'Georgia',
  'North Carolina',
  'Michigan'
];

const statuses: Case['status'][] = ['pending', 'active', 'closed', 'dismissed'];
const tiers: Case['tier'][] = ['free', 'paid'];

export function generateMockCase(): Case {
  const state = faker.helpers.arrayElement(states);
  const numberOfDefendants = faker.number.int({ min: 1, max: 3 });
  
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    caseType: faker.helpers.arrayElement(caseTypes),
    claimAmount: faker.number.float({ min: 500, max: 10000, fractionDigits: 2 }),
    courtState: state,
    courtCounty: faker.location.county() + ' County',
    defendants: Array.from({ length: numberOfDefendants }, () => faker.person.fullName()),
    createdAt: faker.date.past({ years: 1 }),
    status: faker.helpers.arrayElement(statuses),
    tier: faker.helpers.arrayElement(tiers),
  };
}

export function generateMockCases(count: number = 10): Case[] {
  return Array.from({ length: count }, () => generateMockCase());
}

// Pre-generated mock data for consistent display
export const mockCases: Case[] = [
  {
    id: '1',
    userId: 'user-001',
    caseType: 'Property Damage',
    claimAmount: 3500.00,
    courtState: 'California',
    courtCounty: 'Los Angeles County',
    defendants: ['John Smith', 'ABC Construction Inc.'],
    createdAt: new Date('2024-01-15'),
    status: 'active',
    tier: 'paid',
  },
  {
    id: '2',
    userId: 'user-001',
    caseType: 'Breach of Contract',
    claimAmount: 7500.00,
    courtState: 'California',
    courtCounty: 'San Diego County',
    defendants: ['Jane Doe'],
    createdAt: new Date('2024-02-20'),
    status: 'pending',
    tier: 'free',
  },
  {
    id: '3',
    userId: 'user-002',
    caseType: 'Landlord-Tenant Dispute',
    claimAmount: 2000.00,
    courtState: 'New York',
    courtCounty: 'New York County',
    defendants: ['Property Management LLC'],
    createdAt: new Date('2024-03-10'),
    status: 'active',
    tier: 'paid',
  },
  {
    id: '4',
    userId: 'user-003',
    caseType: 'Consumer Complaint',
    claimAmount: 1500.00,
    courtState: 'Texas',
    courtCounty: 'Harris County',
    defendants: ['Big Box Store Inc.'],
    createdAt: new Date('2024-04-05'),
    status: 'closed',
    tier: 'free',
  },
  {
    id: '5',
    userId: 'user-001',
    caseType: 'Unpaid Debt',
    claimAmount: 5000.00,
    courtState: 'Florida',
    courtCounty: 'Miami-Dade County',
    defendants: ['Robert Johnson'],
    createdAt: new Date('2024-05-12'),
    status: 'active',
    tier: 'paid',
  },
];
