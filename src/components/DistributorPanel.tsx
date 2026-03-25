import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Distributor, Currency, formatCurrency, calculateDistributorCommission } from '../types';

interface Props {
  distributors: Distributor[];
  setDistributors: React.Dispatch<React.SetStateAction<Distributor[]>>;
  currency: Currency;
}

export default function DistributorPanel({ distributors, setDistributors, currency }: Props) {
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (warning) {
      const timer = setTimeout(() => setWarning(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [warning]);

  const addDistributor = () => {
    setDistributors([
      ...distributors,
      {
        id: uuidv4(),
        displayId: '',
        name: '',
        totalSales: 0,
        commissionType: 'percentage',
        commissionValue: 0,
        salesReps: [],
      },
    ]);
  };

  const removeDistributor = (id: string) => {
    setDistributors(distributors.filter((d) => d.id !== id));
  };

  const updateDistributor = (id: string, field: keyof Distributor, value: any) => {
    setDistributors(
      distributors.map((d) => {
        if (d.id === id) {
          // Validation
          if (field === 'commissionValue' && d.commissionType === 'percentage' && value > 100) {
            value = 100;
            setWarning('Distributor commission percentage cannot exceed 100%. Value capped.');
          }
          if ((field === 'totalSales' || field === 'commissionValue') && value < 0) {
            value = 0;
          }
          return { ...d, [field]: value };
        }
        return d;
      })
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl font-semibold text-slate-800 dark:text-white">Distributors</h2>
        <button
          onClick={addDistributor}
          className="flex items-center gap-2 bg-indigo-600 dark:bg-indigo-500 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors text-xs md:text-sm font-medium"
        >
          <Plus size={14} md:size={16} />
          Add
        </button>
      </div>

      {warning && (
        <div className="mb-4 md:mb-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-400 rounded-lg flex items-center gap-2 text-xs md:text-sm animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={14} md:size={16} />
          {warning}
        </div>
      )}

      {distributors.length === 0 ? (
        <div className="text-center py-8 md:py-12 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-xs md:text-sm">
          No distributors added yet. Click "Add" to start.
        </div>
      ) : (
        <div className="space-y-4">
          {distributors.map((d) => (
            <div key={d.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-end bg-slate-50 dark:bg-slate-800/50 p-3 md:p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="md:col-span-4">
                <label className="block text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Name</label>
                <input
                  type="text"
                  value={d.name}
                  onChange={(e) => updateDistributor(d.id, 'name', e.target.value)}
                  placeholder="Distributor Name"
                  className="w-full px-2 py-1.5 md:px-3 md:py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs md:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Sales ({currency.symbol})</label>
                <input
                  type="number"
                  min="0"
                  value={d.totalSales || ''}
                  onChange={(e) => updateDistributor(d.id, 'totalSales', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 md:px-3 md:py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs md:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Type</label>
                <select
                  value={d.commissionType}
                  onChange={(e) => {
                    updateDistributor(d.id, 'commissionType', e.target.value);
                    if (e.target.value === 'percentage' && d.commissionValue > 100) {
                      updateDistributor(d.id, 'commissionValue', 100);
                      setWarning('Distributor commission percentage cannot exceed 100%. Value capped.');
                    }
                  }}
                  className="w-full px-2 py-1.5 md:px-3 md:py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs md:text-sm text-slate-900 dark:text-white"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Value</label>
                <input
                  type="number"
                  min="0"
                  max={d.commissionType === 'percentage' ? "100" : undefined}
                  value={d.commissionValue || ''}
                  onChange={(e) => updateDistributor(d.id, 'commissionValue', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-2 py-1.5 md:px-3 md:py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs md:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
              <div className="md:col-span-1 flex flex-col justify-end h-full pb-1 md:pb-2">
                <div className="text-xs md:text-sm font-semibold text-emerald-600 dark:text-emerald-400 truncate" title="Calculated Commission">
                  {formatCurrency(calculateDistributorCommission(d), currency)}
                </div>
              </div>
              <div className="md:col-span-1 flex justify-end">
                <button
                  onClick={() => removeDistributor(d.id)}
                  className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  title="Remove Distributor"
                >
                  <Trash2 size={16} md:size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
