export type CommissionType = 'percentage' | 'fixed';
export type UserRole = 'admin' | 'manager' | 'sales_rep';

export interface SalesRep {
  id: string;
  name: string;
  email?: string; // Link to user account
  commissionType: CommissionType;
  commissionValue: number;
}

export interface Distributor {
  id: string;
  displayId?: string;
  name: string;
  totalSales: number;
  commissionType: CommissionType;
  commissionValue: number;
  salesReps: SalesRep[];
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

export function calculateDistributorCommission(distributor: Distributor): number {
  if (distributor.commissionType === 'percentage') {
    return distributor.totalSales * (distributor.commissionValue / 100);
  }
  return distributor.commissionValue;
}

export function calculateSalesRepCommission(rep: SalesRep, distributorCommission: number): number {
  if (rep.commissionType === 'percentage') {
    return distributorCommission * (rep.commissionValue / 100);
  }
  return rep.commissionValue;
}

export function calculateTotalSalesRepCommission(distributor: Distributor): number {
  const distCommission = calculateDistributorCommission(distributor);
  return distributor.salesReps.reduce(
    (total, rep) => total + calculateSalesRepCommission(rep, distCommission),
    0
  );
}

export function calculateNetEarnings(distributor: Distributor): number {
  return calculateDistributorCommission(distributor) - calculateTotalSalesRepCommission(distributor);
}
