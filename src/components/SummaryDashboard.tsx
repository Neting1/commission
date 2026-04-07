import React, { useState, useMemo } from 'react';
import { Distributor, Currency, formatCurrency, calculateDifference, calculatePercentage } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Download, TrendingUp, DollarSign, AlertCircle, X, Percent, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { exportToExcel } from '../ExcelExport';
import { useTheme } from '../ThemeContext';

type SortKey = 'name' | 'actualAmount' | 'discountAmount' | 'difference' | 'percentage';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

interface Props {
  distributors: Distributor[];
  currency: Currency;
}

export default function SummaryDashboard({ distributors, currency }: Props) {
  const [exportError, setExportError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
  const { theme } = useTheme();

  const totalActual = distributors.reduce((sum, d) => sum + (d.actualAmount || 0), 0);
  const totalDiscount = distributors.reduce((sum, d) => sum + (d.discountAmount || 0), 0);
  const totalDifference = totalActual - totalDiscount;

  const handleExport = async () => {
    setExportError(null);
    try {
      await exportToExcel(distributors, currency);
    } catch (error) {
      console.error('Failed to export to Excel:', error);
      setExportError('Failed to generate Excel file. Please try again.');
    }
  };

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedDistributors = useMemo(() => {
    let sortableItems = [...distributors];
    sortableItems.sort((a, b) => {
      let aValue: any = 0;
      let bValue: any = 0;

      switch (sortConfig.key) {
        case 'name':
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
          break;
        case 'actualAmount':
          aValue = a.actualAmount || 0;
          bValue = b.actualAmount || 0;
          break;
        case 'discountAmount':
          aValue = a.discountAmount || 0;
          bValue = b.discountAmount || 0;
          break;
        case 'difference':
          aValue = calculateDifference(a);
          bValue = calculateDifference(b);
          break;
        case 'percentage':
          aValue = calculatePercentage(a);
          bValue = calculatePercentage(b);
          break;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sortableItems;
  }, [distributors, sortConfig]);

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown size={14} className="text-slate-400 opacity-50" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp size={14} className="text-indigo-600 dark:text-indigo-400" />
    ) : (
      <ArrowDown size={14} className="text-indigo-600 dark:text-indigo-400" />
    );
  };

  const chartData = [
    { name: 'Total Difference', value: Math.max(0, totalDifference), color: '#10b981' }, // emerald-500
    { name: 'Total Discount', value: Math.max(0, totalDiscount), color: '#6366f1' }, // indigo-500
  ];

  const barChartData = useMemo(() => {
    return distributors.map(d => ({
      name: d.name || 'Unnamed',
      actual: d.actualAmount || 0,
      discount: d.discountAmount || 0,
      difference: calculateDifference(d)
    }));
  }, [distributors]);

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6 flex items-center gap-4">
          <div className="p-3 md:p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
            <TrendingUp size={20} md:size={24} />
          </div>
          <div>
            <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Actual Amount</p>
            <p className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(totalActual, currency)}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6 flex items-center gap-4">
          <div className="p-3 md:p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
            <Percent size={20} md:size={24} />
          </div>
          <div>
            <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Discount Amount</p>
            <p className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(totalDiscount, currency)}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6 flex items-center gap-4">
          <div className={`p-3 md:p-4 rounded-full ${totalDifference >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
            <DollarSign size={20} md:size={24} />
          </div>
          <div>
            <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Difference</p>
            <p className={`text-xl md:text-2xl font-bold ${totalDifference >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(totalDifference, currency)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-semibold text-slate-800 dark:text-white">Calculations Breakdown</h2>
            <button
              onClick={handleExport}
              disabled={distributors.length === 0}
              className="flex items-center gap-2 bg-emerald-600 dark:bg-emerald-500 text-white px-3 py-2 md:px-4 md:py-2 rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors text-xs md:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={14} md:size={16} />
              Export
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px] md:text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="p-2 md:pb-3 font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">Name <SortIcon columnKey="name" /></div>
                  </th>
                  <th className="p-2 md:pb-3 font-medium text-right cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors" onClick={() => handleSort('actualAmount')}>
                    <div className="flex items-center justify-end gap-1">Actual Amount <SortIcon columnKey="actualAmount" /></div>
                  </th>
                  <th className="p-2 md:pb-3 font-medium text-right cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors" onClick={() => handleSort('discountAmount')}>
                    <div className="flex items-center justify-end gap-1">Discount Amount <SortIcon columnKey="discountAmount" /></div>
                  </th>
                  <th className="p-2 md:pb-3 font-medium text-right cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors" onClick={() => handleSort('difference')}>
                    <div className="flex items-center justify-end gap-1">Difference <SortIcon columnKey="difference" /></div>
                  </th>
                  <th className="p-2 md:pb-3 font-medium text-right cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors" onClick={() => handleSort('percentage')}>
                    <div className="flex items-center justify-end gap-1">% Diff <SortIcon columnKey="percentage" /></div>
                  </th>
                </tr>
              </thead>
              <tbody className="text-xs md:text-sm">
                {sortedDistributors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400 italic">No data available</td>
                  </tr>
                ) : (
                  sortedDistributors.map(d => {
                    const diff = calculateDifference(d);
                    const pct = calculatePercentage(d);
                    
                    return (
                      <tr key={d.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="p-2 md:py-3 font-medium text-slate-800 dark:text-slate-200">{d.name || 'Unnamed'}</td>
                        <td className="p-2 md:py-3 text-right text-slate-600 dark:text-slate-300">{formatCurrency(d.actualAmount || 0, currency)}</td>
                        <td className="p-2 md:py-3 text-right text-indigo-600 dark:text-indigo-400">{formatCurrency(d.discountAmount || 0, currency)}</td>
                        <td className="p-2 md:py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(diff, currency)}</td>
                        <td className="p-2 md:py-3 text-right font-medium text-slate-600 dark:text-slate-300">{pct.toFixed(2)}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-slate-800 dark:text-white mb-4 md:mb-6">Distribution</h2>
          {totalActual > 0 ? (
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

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold text-slate-800 dark:text-white mb-4 md:mb-6">Actual vs Discount by Distributor</h2>
        {distributors.length > 0 ? (
          <div className="h-72 md:h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke={theme === 'dark' ? '#94a3b8' : '#64748b'}
                  tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }}
                  tickLine={{ stroke: theme === 'dark' ? '#334155' : '#e2e8f0' }}
                  axisLine={{ stroke: theme === 'dark' ? '#334155' : '#e2e8f0' }}
                />
                <YAxis 
                  stroke={theme === 'dark' ? '#94a3b8' : '#64748b'}
                  tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }}
                  tickLine={{ stroke: theme === 'dark' ? '#334155' : '#e2e8f0' }}
                  axisLine={{ stroke: theme === 'dark' ? '#334155' : '#e2e8f0' }}
                  tickFormatter={(value) => `${currency.symbol}${value}`}
                />
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
                  cursor={{ fill: theme === 'dark' ? '#334155' : '#f1f5f9', opacity: 0.4 }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="actual" name="Actual Amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="discount" name="Discount Amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 md:h-96 flex items-center justify-center text-slate-400 dark:text-slate-500 italic text-xs md:text-sm border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            No data available for analysis
          </div>
        )}
      </div>
    </div>
  );
}
