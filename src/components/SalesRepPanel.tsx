import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Users, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Distributor, SalesRep, Currency, formatCurrency, calculateDistributorCommission, calculateSalesRepCommission } from '../types';

interface Props {
  distributors: Distributor[];
  setDistributors: React.Dispatch<React.SetStateAction<Distributor[]>>;
  currency: Currency;
}

export default function SalesRepPanel({ distributors, setDistributors, currency }: Props) {
  const [selectedDistributorId, setSelectedDistributorId] = useState<string>('');
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (warning) {
      const timer = setTimeout(() => setWarning(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [warning]);

  const selectedDistributor = distributors.find(d => d.id === selectedDistributorId);

  const addSalesRep = () => {
    if (!selectedDistributorId) return;
    
    setDistributors(distributors.map(d => {
      if (d.id === selectedDistributorId) {
        return {
          ...d,
          salesReps: [
            ...d.salesReps,
            {
              id: uuidv4(),
              name: '',
              commissionType: 'percentage',
              commissionValue: 0,
            }
          ]
        };
      }
      return d;
    }));
  };

  const removeSalesRep = (distId: string, repId: string) => {
    setDistributors(distributors.map(d => {
      if (d.id === distId) {
        return {
          ...d,
          salesReps: d.salesReps.filter(r => r.id !== repId)
        };
      }
      return d;
    }));
  };

  const updateSalesRep = (distId: string, repId: string, field: keyof SalesRep, value: any) => {
    setDistributors(distributors.map(d => {
      if (d.id === distId) {
        return {
          ...d,
          salesReps: d.salesReps.map(r => {
            if (r.id === repId) {
              if (field === 'commissionValue' && r.commissionType === 'percentage' && value > 100) {
                value = 100;
                setWarning('Sales Rep commission percentage cannot exceed 100%. Value capped.');
              }
              if (field === 'commissionValue' && value < 0) {
                value = 0;
              }
              return { ...r, [field]: value };
            }
            return r;
          })
        };
      }
      return d;
    }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <Users size={20} />
          </div>
          <h2 className="text-xl font-semibold text-slate-800">Sales Rep Allocation</h2>
        </div>
        
        <div className="w-full md:w-auto flex items-center gap-3">
          <select
            value={selectedDistributorId}
            onChange={(e) => setSelectedDistributorId(e.target.value)}
            className="w-full md:w-64 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="">Select a Distributor...</option>
            {distributors.map(d => (
              <option key={d.id} value={d.id}>
                {d.displayId ? `[${d.displayId}] ` : ''}{d.name || 'Unnamed Distributor'}
              </option>
            ))}
          </select>
          
          <button
            onClick={addSalesRep}
            disabled={!selectedDistributorId}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Plus size={16} />
            Add Rep
          </button>
        </div>
      </div>

      {warning && (
        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={16} />
          {warning}
        </div>
      )}

      {!selectedDistributorId ? (
        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
          Please select a distributor from the dropdown to manage their sales reps.
        </div>
      ) : selectedDistributor?.salesReps.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
          No sales reps assigned to {selectedDistributor.name || 'this distributor'}. Click "Add Rep" to start.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg mb-4 flex justify-between items-center">
            <span className="text-sm font-medium text-indigo-900">
              Total Distributor Commission Available:
            </span>
            <span className="text-lg font-bold text-indigo-700">
              {formatCurrency(calculateDistributorCommission(selectedDistributor!), currency)}
            </span>
          </div>
          
          {selectedDistributor?.salesReps.map((rep) => (
            <div key={rep.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Rep Name</label>
                <input
                  type="text"
                  value={rep.name}
                  onChange={(e) => updateSalesRep(selectedDistributor.id, rep.id, 'name', e.target.value)}
                  placeholder="Sales Rep Name"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Commission Type</label>
                <select
                  value={rep.commissionType}
                  onChange={(e) => {
                    updateSalesRep(selectedDistributor.id, rep.id, 'commissionType', e.target.value);
                    if (e.target.value === 'percentage' && rep.commissionValue > 100) {
                      updateSalesRep(selectedDistributor.id, rep.id, 'commissionValue', 100);
                      setWarning('Sales Rep commission percentage cannot exceed 100%. Value capped.');
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                >
                  <option value="percentage">% of Dist. Comm.</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Value</label>
                <input
                  type="number"
                  min="0"
                  max={rep.commissionType === 'percentage' ? "100" : undefined}
                  value={rep.commissionValue || ''}
                  onChange={(e) => updateSalesRep(selectedDistributor.id, rep.id, 'commissionValue', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="md:col-span-2 flex flex-col justify-end h-full pb-2">
                <div className="text-sm font-semibold text-emerald-600 truncate" title="Calculated Rep Commission">
                  {formatCurrency(calculateSalesRepCommission(rep, calculateDistributorCommission(selectedDistributor)), currency)}
                </div>
              </div>
              <div className="md:col-span-1 flex justify-end">
                <button
                  onClick={() => removeSalesRep(selectedDistributor.id, rep.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  title="Remove Rep"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
