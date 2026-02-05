export interface Case {
  id: string;
  userId: string;
  caseType: string;
  claimAmount: number;
  courtState: string;
  courtCounty: string;
  defendants: string[];
  createdAt: Date;
  status: 'pending' | 'active' | 'closed' | 'dismissed';
  tier: 'free' | 'paid';
}
