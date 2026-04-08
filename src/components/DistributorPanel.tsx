import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, Undo2, Redo2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Distributor, Currency, formatCurrency, calculateDifference, calculatePercentage } from '../types';

interface Props {
  distributors: Distributor[];
  setDistributors: React.Dispatch<React.SetStateAction<Distributor[]>>;
  currency: Currency;
}

export default function DistributorPanel({ distributors, setDistributors, currency }: Props) {
  const [warning, setWarning] = useState<string | null>(null);
  const [past, setPast] = useState<Distributor[][]>([]);
  const [future, setFuture] = useState<Distributor[][]>([]);

  const today = new Date().toISOString().split('T')[0];

  const uniqueNames = Array.from(new Set(distributors.map(d => (d.name || '').trim()).filter(Boolean)));

  useEffect(() => {
    if (warning) {
      const timer = setTimeout(() => setWarning(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [warning]);

  const handleSetDistributors = (newDistributors: Distributor[] | ((prev: Distributor[]) => Distributor[])) => {
    setDistributors((prev) => {
      const next = typeof newDistributors === 'function' ? newDistributors(prev) : newDistributors;
      setPast((p) => [...p, prev]);
      setFuture([]);
      return next;
    });
  };

  const undo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast(past.slice(0, -1));
    setFuture([distributors, ...future]);
    setDistributors(previous);
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture(future.slice(1));
    setPast([...past, distributors]);
    setDistributors(next);
  };

  const addDistributor = () => {
    handleSetDistributors([
      ...distributors,
      {
        id: uuidv4(),
        displayId: '',
        name: '',
        actualAmount: 0,
        discountAmount: 0,
        date: new Date().toISOString().split('T')[0],
      },
    ]);
  };

  const removeDistributor = (id: string) => {
    handleSetDistributors(distributors.filter((d) => d.id !== id));
  };

  const updateDistributor = (id: string, field: keyof Distributor, value: any) => {
    handleSetDistributors(
      distributors.map((d) => {
        if (d.id === id) {
          if ((field === 'actualAmount' || field === 'discountAmount') && value < 0) {
            value = 0;
          }
          return { ...d, [field]: value };
        }
        return d;
      })
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl font-semibold text-slate-800 dark:text-white">Calculations</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={past.length === 0}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={redo}
            disabled={future.length === 0}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo"
          >
            <Redo2 size={18} />
          </button>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
          <button
            onClick={addDistributor}
            className="flex items-center gap-2 bg-indigo-600 dark:bg-indigo-500 text-white px-3 py-2 md:px-4 md:py-2 rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors text-xs md:text-sm font-medium"
          >
            <Plus size={14} md:size={16} />
            Add
          </button>
        </div>
      </div>

      {warning && (
        <div className="mb-4 md:mb-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-400 rounded-xl flex items-center gap-2 text-xs md:text-sm animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={14} md:size={16} />
          {warning}
        </div>
      )}

      {distributors.length === 0 ? (
        <div className="text-center py-8 md:py-12 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-xs md:text-sm">
          No calculations added yet. Click "Add" to start.
        </div>
      ) : (
        <div className="space-y-4">
          <datalist id="distributor-names">
            {uniqueNames.map(name => (
              <option key={name} value={name} />
            ))}
          </datalist>
          {distributors.map((d) => (
            <div key={d.id} className="group relative grid grid-cols-12 gap-3 md:gap-4 items-end bg-white dark:bg-slate-800/80 backdrop-blur-md p-4 md:p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all">
              <div className="col-span-6 md:col-span-3 lg:col-span-2">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Date</label>
                <input
                  type="date"
                  max={today}
                  value={d.date || ''}
                  onChange={(e) => updateDistributor(d.id, 'date', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div className="col-span-6 md:col-span-3 lg:col-span-3">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Name</label>
                <input
                  type="text"
                  list="distributor-names"
                  value={d.name}
                  onChange={(e) => updateDistributor(d.id, 'name', e.target.value)}
                  placeholder="Name"
                  className="w-full px-3 py-2 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>
              <div className="col-span-6 md:col-span-3 lg:col-span-2">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Actual ({currency.symbol})</label>
                <input
                  type="number"
                  min="0"
                  value={d.actualAmount || ''}
                  onChange={(e) => updateDistributor(d.id, 'actualAmount', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>
              <div className="col-span-6 md:col-span-3 lg:col-span-2">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Discount ({currency.symbol})</label>
                <input
                  type="number"
                  min="0"
                  value={d.discountAmount || ''}
                  onChange={(e) => updateDistributor(d.id, 'discountAmount', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>
              <div className="col-span-4 md:col-span-4 lg:col-span-1 flex flex-col justify-end h-full">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Diff</label>
                <div className="h-[38px] flex items-center px-2 sm:px-3 bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                  {formatCurrency(calculateDifference(d), currency)}
                </div>
              </div>
              <div className="col-span-4 md:col-span-4 lg:col-span-1 flex flex-col justify-end h-full">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">% Diff</label>
                <div className="h-[38px] flex items-center px-2 sm:px-3 bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                  {calculatePercentage(d).toFixed(2)}%
                </div>
              </div>
              <div className="col-span-4 md:col-span-4 lg:col-span-1 flex flex-col justify-end h-full">
                <div className="hidden lg:block h-[18px] mb-1.5"></div>
                <button
                  onClick={() => removeDistributor(d.id)}
                  className="h-[38px] w-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                  title="Remove"
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
