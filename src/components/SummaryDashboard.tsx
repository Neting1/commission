import React, { useState, useMemo } from 'react';
import { Distributor, Currency, formatCurrency, calculateDifference, calculatePercentage } from '../types';
import { 
  ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  AreaChart, Area, ReferenceLine, FunnelChart, Funnel, LabelList, Cell
} from 'recharts';
import { Download, AlertCircle, X, ArrowUp, ArrowDown, ArrowUpDown, TrendingUp, TrendingDown, Activity, Users, DollarSign, Percent } from 'lucide-react';
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

const StatCard = ({ title, value, subtitle, subValue, trend, icon: Icon, colorClass }: any) => (
  <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60 p-5 rounded-3xl shadow-sm flex flex-col relative overflow-hidden group transition-all hover:shadow-md">
    <div className="flex justify-between items-start mb-4 z-10">
      <div className={`p-3 rounded-2xl ${colorClass} bg-opacity-10 dark:bg-opacity-20`}>
        <Icon size={22} className={colorClass.replace('bg-', 'text-').split(' ')[0]} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
          trend === 'up' 
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
            : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
        }`}>
          {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{subValue}</span>
        </div>
      )}
    </div>
    <div className="z-10">
      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</h3>
      <div className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        {value}
      </div>
      {subtitle && !trend && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
          {subtitle} <span className="text-slate-700 dark:text-slate-300">{subValue}</span>
        </div>
      )}
    </div>
    <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity ${colorClass.replace('text-', 'bg-')}`} />
  </div>
);

const ChartCard = ({ title, children, action, className = '' }: { title: string, children: React.ReactNode, action?: React.ReactNode, className?: string }) => (
  <div className={`bg-white dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 flex flex-col overflow-hidden ${className}`}>
    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
      <h2 className="text-base font-semibold text-slate-800 dark:text-white">{title}</h2>
      {action && <div>{action}</div>}
    </div>
    <div className="p-6 flex-1 flex flex-col">
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
  
  const avgDiscountPct = totalActual ? (totalDiscount / totalActual) * 100 : 0;
  const overallDiffPct = totalActual ? (totalDifference / totalActual) * 100 : 0;
  const avgActual = distributors.length ? totalActual / distributors.length : 0;

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
      <ArrowUp size={14} className="text-indigo-500" />
    ) : (
      <ArrowDown size={14} className="text-indigo-500" />
    );
  };

  // Data for Funnel (Top 5 by Actual Amount)
  const funnelColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316'];
  const funnelData = useMemo(() => {
    return [...distributors]
      .sort((a, b) => (b.actualAmount || 0) - (a.actualAmount || 0))
      .slice(0, 5)
      .map((d, i) => ({
        name: d.name || 'Unnamed',
        value: d.actualAmount || 0,
        fill: funnelColors[i % funnelColors.length]
      }));
  }, [distributors]);

  // Data for Area Chart
  const lineChartData = useMemo(() => {
    return distributors.map(d => ({
      name: d.name || 'Unnamed',
      actual: d.actualAmount || 0,
      difference: calculateDifference(d)
    }));
  }, [distributors]);

  // Data for Target Bar
  const targetData = [{
    name: 'Total',
    actual: totalActual,
    difference: Math.max(0, totalDifference)
  }];

  const customTooltipStyle = {
    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
    borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
    color: theme === 'dark' ? '#f8fafc' : '#0f172a',
    borderRadius: '12px',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    padding: '12px'
  };

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Analyze your calculation metrics and trends.</p>
        </div>
      </div>

      {exportError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-2xl flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{exportError}</p>
          </div>
          <button onClick={() => setExportError(null)} className="text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Top Row: KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <StatCard 
          title="Total Actual" 
          value={formatCurrency(totalActual, currency)} 
          subValue={`${overallDiffPct.toFixed(2)}%`}
          trend={overallDiffPct >= 0 ? 'up' : 'down'}
          icon={DollarSign}
          colorClass="text-indigo-600 bg-indigo-600"
        />
        <StatCard 
          title="Total Difference" 
          value={formatCurrency(totalDifference, currency)} 
          subtitle="Avg Discount:"
          subValue={`${avgDiscountPct.toFixed(2)}%`}
          icon={Activity}
          colorClass="text-emerald-500 bg-emerald-500"
        />
        <StatCard 
          title="Total Discount" 
          value={formatCurrency(totalDiscount, currency)} 
          subtitle="Distributors:"
          subValue={distributors.length.toString()}
          icon={Percent}
          colorClass="text-rose-500 bg-rose-500"
        />
      </div>

      {/* Middle Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        
        {/* Left: Funnel Chart */}
        <ChartCard title="Top 5 by Actual Amount" className="lg:col-span-4">
          {funnelData.length > 0 ? (
            <div className="h-64 md:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value || 0), currency)}
                    contentStyle={customTooltipStyle}
                    itemStyle={{ color: theme === 'dark' ? '#cbd5e1' : '#475569', fontWeight: 500 }}
                  />
                  <Funnel
                    dataKey="value"
                    data={funnelData}
                    isAnimationActive
                  >
                    <LabelList position="center" fill="#fff" stroke="none" dataKey="name" fontSize={13} fontWeight={600} />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 md:h-80 flex items-center justify-center text-slate-400 dark:text-slate-500 italic text-sm">No data available</div>
          )}
        </ChartCard>

        {/* Middle: Area Chart Trend */}
        <ChartCard title="Actual vs Difference Trend" className="lg:col-span-8">
          {distributors.length > 0 ? (
            <div className="h-64 md:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDiff" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                  <XAxis 
                    dataKey="name" 
                    stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} 
                    tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }} 
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} 
                    tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }} 
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `${currency.symbol}${val}`}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={customTooltipStyle}
                    formatter={(value: any, name: string) => [formatCurrency(Number(value || 0), currency), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '13px', color: theme === 'dark' ? '#cbd5e1' : '#475569', paddingTop: '20px' }} iconType="circle" />
                  <ReferenceLine y={avgActual} stroke="#f59e0b" strokeDasharray="4 4" label={{ position: 'top', value: 'Avg Actual', fill: '#f59e0b', fontSize: 11, fontWeight: 500 }} />
                  <Area type="monotone" dataKey="actual" name="Actual Amount" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" activeDot={{ r: 6, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="difference" name="Difference" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorDiff)" activeDot={{ r: 6, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 md:h-80 flex items-center justify-center text-slate-400 dark:text-slate-500 italic text-sm">No data available</div>
          )}
        </ChartCard>
      </div>

      {/* Bottom Row: Target Bar & Data Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        {/* Left: Target Bar */}
        <ChartCard title="Difference vs Target" className="lg:col-span-4">
          {totalActual > 0 ? (
            <div className="h-72 md:h-96 w-full relative flex flex-col justify-center">
              <div className="absolute top-0 right-0 text-right">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target (Actual)</div>
                <div className="text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(totalActual, currency)}</div>
              </div>
              <div className="absolute top-0 left-0 text-left">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Achieved (Diff)</div>
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(totalDifference, currency)}</div>
              </div>
              
              <div className="mt-16 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={targetData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                    <Tooltip 
                      contentStyle={customTooltipStyle}
                      formatter={(value: any, name: string) => [formatCurrency(Number(value || 0), currency), name]}
                      cursor={{ fill: theme === 'dark' ? '#334155' : '#f1f5f9', opacity: 0.4 }}
                    />
                    <XAxis dataKey="name" hide />
                    <YAxis hide domain={[0, Math.max(totalActual, totalDifference) * 1.1]} />
                    {/* Background bar representing the target (Actual) */}
                    <Bar dataKey="actual" fill={theme === 'dark' ? '#334155' : '#e2e8f0'} radius={[8, 8, 0, 0]} barSize={80} />
                    {/* Foreground bar representing the progress (Difference) */}
                    <Bar dataKey="difference" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={80} style={{ transform: 'translateX(-80px)' }}>
                      {targetData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="url(#colorActual)" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="h-72 md:h-96 flex items-center justify-center text-slate-400 dark:text-slate-500 italic text-sm">No data available</div>
          )}
        </ChartCard>

        {/* Right: Data Table */}
        <ChartCard 
          title="Calculations Breakdown" 
          className="lg:col-span-8"
          action={
            <button
              onClick={handleExport}
              disabled={distributors.length === 0}
              className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 dark:text-indigo-400 px-4 py-2 rounded-xl transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              Export
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="p-3 font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-tl-xl" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1.5">Name <SortIcon columnKey="name" /></div>
                  </th>
                  <th className="p-3 font-semibold text-right cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors" onClick={() => handleSort('actualAmount')}>
                    <div className="flex items-center justify-end gap-1.5">Actual Amount <SortIcon columnKey="actualAmount" /></div>
                  </th>
                  <th className="p-3 font-semibold text-right cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors" onClick={() => handleSort('discountAmount')}>
                    <div className="flex items-center justify-end gap-1.5">Discount Amount <SortIcon columnKey="discountAmount" /></div>
                  </th>
                  <th className="p-3 font-semibold text-right cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors" onClick={() => handleSort('difference')}>
                    <div className="flex items-center justify-end gap-1.5">Difference <SortIcon columnKey="difference" /></div>
                  </th>
                  <th className="p-3 font-semibold text-right cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-tr-xl" onClick={() => handleSort('percentage')}>
                    <div className="flex items-center justify-end gap-1.5">% Diff <SortIcon columnKey="percentage" /></div>
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {sortedDistributors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 dark:text-slate-400 italic">No data available</td>
                  </tr>
                ) : (
                  sortedDistributors.map(d => {
                    const diff = calculateDifference(d);
                    const pct = calculatePercentage(d);
                    
                    return (
                      <tr key={d.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                        <td className="p-3 font-medium text-slate-900 dark:text-white">{d.name || 'Unnamed'}</td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-300">{formatCurrency(d.actualAmount || 0, currency)}</td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-300">{formatCurrency(d.discountAmount || 0, currency)}</td>
                        <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(diff, currency)}</td>
                        <td className="p-3 text-right font-semibold text-indigo-600 dark:text-indigo-400">
                          <span className="bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-lg">{pct.toFixed(2)}%</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
