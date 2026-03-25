import React, { useState } from 'react';
import { Distributor, Currency, formatCurrency, calculateDistributorCommission, calculateTotalSalesRepCommission, calculateNetEarnings } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Download, TrendingUp, Users, DollarSign, AlertCircle, X } from 'lucide-react';
import { exportToExcel } from '../ExcelExport';
import { useTheme } from '../ThemeContext';

interface Props {
  distributors: Distributor[];
  currency: Currency;
  isSalesRep?: boolean;
}

export default function SummaryDashboard({ distributors, currency, isSalesRep = false }: Props) {
  const [exportError, setExportError] = useState<string | null>(null);
  const { theme } = useTheme();

  const totalDistributorCommission = distributors.reduce((sum, d) => sum + calculateDistributorCommission(d), 0);
  const totalSalesRepCommission = distributors.reduce((sum, d) => sum + calculateTotalSalesRepCommission(d), 0);
  const netEarnings = totalDistributorCommission - totalSalesRepCommission;

  const handleExport = async () => {
    setExportError(null);
    try {
      await exportToExcel(distributors, currency);
    } catch (error) {
      console.error('Failed to export to Excel:', error);
      setExportError('Failed to generate Excel file. Please try again.');
    }
  };

  const chartData = isSalesRep 
    ? distributors.filter(d => calculateTotalSalesRepCommission(d) > 0).map(d => ({
        name: d.name || 'Unnamed',
        value: calculateTotalSalesRepCommission(d),
        color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}` // Simple random color for now, or we can use a fixed palette
      }))
    : [
        { name: 'Net Earnings', value: Math.max(0, netEarnings), color: '#10b981' }, // emerald-500
        { name: 'Sales Rep Commissions', value: Math.max(0, totalSalesRepCommission), color: '#6366f1' }, // indigo-500
      ];

  // For sales reps, let's use a predefined color palette for the pie chart
  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#3b82f6'];
  if (isSalesRep) {
    chartData.forEach((entry, index) => {
      entry.color = COLORS[index % COLORS.length];
    });
  }

  return (
    <div className="space-y-6">
      {exportError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{exportError}</p>
          </div>
          <button onClick={() => setExportError(null)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
            <X size={18} />
          </button>
        </div>
      )}

      <div className={`grid grid-cols-1 ${isSalesRep ? 'md:grid-cols-1' : 'md:grid-cols-3'} gap-4 md:gap-6`}>
        {!isSalesRep && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6 flex items-center gap-4">
            <div className="p-3 md:p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
              <TrendingUp size={20} md:size={24} />
            </div>
            <div>
              <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Dist. Commission</p>
              <p className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(totalDistributorCommission, currency)}</p>
            </div>
          </div>
        )}
        
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6 flex items-center gap-4">
          <div className="p-3 md:p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
            <Users size={20} md:size={24} />
          </div>
          <div>
            <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{isSalesRep ? 'Total Earned' : 'Total Rep Commission'}</p>
            <p className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(totalSalesRepCommission, currency)}</p>
          </div>
        </div>
        
        {!isSalesRep && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6 flex items-center gap-4">
            <div className={`p-3 md:p-4 rounded-full ${netEarnings >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
              <DollarSign size={20} md:size={24} />
            </div>
            <div>
              <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net Earnings</p>
              <p className={`text-xl md:text-2xl font-bold ${netEarnings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(netEarnings, currency)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-semibold text-slate-800 dark:text-white">Distributor Breakdown</h2>
            {!isSalesRep && (
              <button
                onClick={handleExport}
                disabled={distributors.length === 0}
                className="flex items-center gap-2 bg-emerald-600 dark:bg-emerald-500 text-white px-3 py-2 md:px-4 md:py-2 rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors text-xs md:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={14} md:size={16} />
                Export
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px] md:text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="p-2 md:pb-3 font-medium">Distributor</th>
                  {!isSalesRep && <th className="p-2 md:pb-3 font-medium text-right">Earned Comm.</th>}
                  <th className="p-2 md:pb-3 font-medium text-right">{isSalesRep ? 'Your Comm.' : 'Rep Comm.'}</th>
                  {!isSalesRep && <th className="p-2 md:pb-3 font-medium text-right">Net</th>}
                </tr>
              </thead>
              <tbody className="text-xs md:text-sm">
                {distributors.length === 0 ? (
                  <tr>
                    <td colSpan={isSalesRep ? 2 : 4} className="py-8 text-center text-slate-500 dark:text-slate-400 italic">No data available</td>
                  </tr>
                ) : (
                  distributors.map(d => {
                    const distComm = calculateDistributorCommission(d);
                    const repComm = calculateTotalSalesRepCommission(d);
                    const net = distComm - repComm;
                    
                    return (
                      <tr key={d.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="p-2 md:py-3 font-medium text-slate-800 dark:text-slate-200">{d.name || 'Unnamed'}</td>
                        {!isSalesRep && <td className="p-2 md:py-3 text-right text-slate-600 dark:text-slate-300">{formatCurrency(distComm, currency)}</td>}
                        <td className="p-2 md:py-3 text-right text-indigo-600 dark:text-indigo-400">{formatCurrency(repComm, currency)}</td>
                        {!isSalesRep && <td className="p-2 md:py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(net, currency)}</td>}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-slate-800 dark:text-white mb-4 md:mb-6">{isSalesRep ? 'Earnings by Distributor' : 'Distribution'}</h2>
          {(isSalesRep ? totalSalesRepCommission : totalDistributorCommission) > 0 ? (
            <div className="h-48 md:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value, currency)}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0', 
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                      color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                    }}
                    itemStyle={{ color: theme === 'dark' ? '#cbd5e1' : '#475569' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    wrapperStyle={{ color: theme === 'dark' ? '#cbd5e1' : '#475569', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 md:h-64 flex items-center justify-center text-slate-400 dark:text-slate-500 italic text-xs md:text-sm border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
              Not enough data for chart
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
