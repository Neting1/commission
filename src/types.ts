export type UserRole = 'admin' | 'manager' | 'user';

export interface Distributor {
  id: string;
  displayId?: string;
  name: string;
  actualAmount: number;
  discountAmount: number;
  commissionRate?: number;
  date?: string; // ISO date string YYYY-MM-DD
}

export interface Currency {
  code: string;
  symbol: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name?: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'GHS', symbol: 'GH₵' },
  { code: 'INR', symbol: '₹' },
];

export function formatCurrency(value: number, currency: Currency): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.code,
  }).format(value);
}

export function calculateDifference(distributor: Distributor): number {
  return (distributor.actualAmount || 0) - (distributor.discountAmount || 0);
}

export function calculateCommission(distributor: Distributor): number {
  const actual = distributor.actualAmount || 0;
  const rate = (distributor.commissionRate || 0) / 100;
  const discount = distributor.discountAmount || 0;
  return (actual * rate) - discount;
}

export function calculatePercentage(distributor: Distributor): number {
  const actual = Number(distributor.actualAmount) || 0;
  
  // Explicitly handle cases where Actual Amount is zero to prevent division by zero
  if (actual === 0) {
    return 0;
  }
  
  const diff = calculateDifference(distributor);
  return (diff / actual) * 100;
}

