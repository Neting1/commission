import React, { useState, useMemo } from 'react';
import { Distributor, Currency, formatCurrency, calculateDifference, calculatePercentage } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Line } from 'recharts';
import { Download, AlertCircle, X, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
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

const DashboardPanel = ({ title, children, action, className = '' }: { title: string, children: React.ReactNode, action?: React.ReactNode, className?: string }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden ${className}`}>
    <div className="bg-[#155eaf] text-white px-4 py-2.5 text-sm font-semibold flex justify-between items-center">
      <span>{title}</span>
      {action && <div>{action}</div>}
    </div>
    <div className="p-4 flex-1 flex flex-col">
      {children}
    </div>
  </div>
);

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
      <ArrowUp size={14} className="text-[#155eaf] dark:text-blue-400" />
    ) : (
      <ArrowDown size={14} className="text-[#155eaf] dark:text-blue-400" />
    );
  };

  const chartData = [
    { name: 'Difference', value: Math.max(0, totalDifference), color: '#54b8b1' }, // Teal
    { name: 'Discount', value: Math.max(0, totalDiscount), color: '#f97316' }, // Orange
  ];

  const barChartData = useMemo(() => {
    return distributors.map(d => ({
      name: d.name || 'Unnamed',
      actual: d.actualAmount || 0,
      discount: d.discountAmount || 0,
      difference: calculateDifference(d),
      percentage: calculatePercentage(d)
    }));
  }, [distributors]);

  const horizontalBarColors = ['#2563eb', '#54b8b1', '#94a3b8', '#64748b'];

  return (
    <div className="space-y-4 md:space-y-6">
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

      {/* Top Row: KPIs, Horizontal Bar, Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <DashboardPanel title="Difference and Actual Amount">
          <div className="flex flex-col items-center justify-center h-full py-6">
            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-2">Total Difference</span>
            <span className="text-4xl md:text-5xl font-light text-[#2563eb] dark:text-blue-400 mb-6">
              {formatCurrency(totalDifference, currency)}
            </span>
            <div className="flex gap-6 text-sm text-slate-500 dark:text-slate-400 font-medium">
              <div className="flex flex-col items-center">
                <span className="text-xs uppercase tracking-wider mb-1">Total Actual</span>
                <span className="text-slate-700 dark:text-slate-300">{formatCurrency(totalActual, currency)}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs uppercase tracking-wider mb-1">Total Discount</span>
                <span className="text-slate-700 dark:text-slate-300">{formatCurrency(totalDiscount, currency)}</span>
              </div>
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Difference Percentage by Distributor">
          {distributors.length > 0 ? (
            <div className="h-48 md:h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 11 }} width={80} />
                  <Tooltip
                    formatter={(value: any) => `${Number(value || 0).toFixed(2)}%`}
                    contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', borderColor: theme === 'dark' ? '#334155' : '#e2e8f0', color: theme === 'dark' ? '#f8fafc' : '#0f172a' }}
                  />
                  <Bar dataKey="percentage" barSize={16}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={horizontalBarColors[index % horizontalBarColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 md:h-56 flex items-center justify-center text-slate-400 italic text-sm">No data available</div>
          )}
        </DashboardPanel>

        <DashboardPanel title="Amount Breakdown">
          {totalActual > 0 ? (
            <div className="h-48 md:h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value || 0), currency)}
                    contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', borderColor: theme === 'dark' ? '#334155' : '#e2e8f0', color: theme === 'dark' ? '#f8fafc' : '#0f172a' }}
                  />
                  <Legend verticalAlign="bottom" iconType="square" wrapperStyle={{ fontSize: '11px', color: theme === 'dark' ? '#cbd5e1' : '#475569' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 md:h-56 flex items-center justify-center text-slate-400 italic text-sm">No data available</div>
          )}
        </DashboardPanel>
      </div>

      {/* Middle Row: Combo Chart */}
      <DashboardPanel title="Actual Amount vs Difference Percentage">
        {distributors.length > 0 ? (
          <div className="h-72 md:h-80 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={barChartData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 11 }} 
                  dy={10}
                />
                <YAxis 
                  yAxisId="left" 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => `${currency.symbol}${val}`} 
                  tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 11 }} 
                  dx={-10}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => `${val}%`} 
                  tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 11 }} 
                  dx={10}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', borderColor: theme === 'dark' ? '#334155' : '#e2e8f0', color: theme === 'dark' ? '#f8fafc' : '#0f172a' }}
                  formatter={(value: any, name: string) => {
                    const numValue = Number(value || 0);
                    if (name === '% Diff') return [`${numValue.toFixed(2)}%`, name];
                    return [formatCurrency(numValue, currency), name];
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} iconType="square" />
                <Bar yAxisId="left" dataKey="actual" name="Actual Amount" fill="#54b8b1" barSize={32} />
                <Bar yAxisId="left" dataKey="discount" name="Discount Amount" fill="#94a3b8" barSize={32} />
                <Line yAxisId="right" type="monotone" dataKey="percentage" name="% Diff" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 md:h-80 flex items-center justify-center text-slate-400 italic text-sm">No data available</div>
        )}
      </DashboardPanel>

      {/* Bottom Row: Data Table */}
      <DashboardPanel 
        title="Calculations Breakdown" 
        action={
          <button
            onClick={handleExport}
            disabled={distributors.length === 0}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            Export
          </button>
        }
      >
        <div className="overflow-x-auto mt-2">
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
                      <td className="p-2 md:py-3 text-right text-slate-600 dark:text-slate-300">{formatCurrency(d.discountAmount || 0, currency)}</td>
                      <td className="p-2 md:py-3 text-right font-medium text-[#54b8b1]">{formatCurrency(diff, currency)}</td>
                      <td className="p-2 md:py-3 text-right font-medium text-[#2563eb] dark:text-blue-400">{pct.toFixed(2)}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </DashboardPanel>
    </div>
  );
}
