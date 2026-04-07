import React, { useState, useMemo } from 'react';
import { Distributor, Currency, formatCurrency, calculateDifference, calculatePercentage } from '../types';
import { 
  ResponsiveContainer, Tooltip, Legend, CartesianGrid, 
  AreaChart, Area, ReferenceLine, XAxis, YAxis
} from 'recharts';
import { Download, AlertCircle, X, ArrowUp, ArrowDown, ArrowUpDown, TrendingUp, TrendingDown, Activity, DollarSign, Percent } from 'lucide-react';
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
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const { theme } = useTheme();

  const today = new Date().toISOString().split('T')[0];

  const filteredTransactions = useMemo(() => {
    return distributors.filter(d => {
      if (!d.date) return true;
      if (startDate && d.date < startDate) return false;
      if (endDate && d.date > endDate) return false;
      return true;
    });
  }, [distributors, startDate, endDate]);

  const groupedDistributors = useMemo(() => {
    const map = new Map<string, Distributor>();
    filteredTransactions.forEach(d => {
      const name = (d.name || 'Unnamed').trim();
      if (map.has(name)) {
        const existing = map.get(name)!;
        existing.actualAmount += (d.actualAmount || 0);
        existing.discountAmount += (d.discountAmount || 0);
      } else {
        map.set(name, {
          id: name,
          name: name,
          actualAmount: d.actualAmount || 0,
          discountAmount: d.discountAmount || 0,
        });
      }
    });
    return Array.from(map.values());
  }, [filteredTransactions]);

  const totalActual = groupedDistributors.reduce((sum, d) => sum + (d.actualAmount || 0), 0);
  const totalDiscount = groupedDistributors.reduce((sum, d) => sum + (d.discountAmount || 0), 0);
  const totalDifference = totalActual - totalDiscount;
  
  const avgDiscountPct = totalActual ? (totalDiscount / totalActual) * 100 : 0;
  const overallDiffPct = totalActual ? (totalDifference / totalActual) * 100 : 0;
  const avgActual = groupedDistributors.length ? totalActual / groupedDistributors.length : 0;

  const handleExport = async () => {
    setExportError(null);
    try {
      await exportToExcel(filteredTransactions, groupedDistributors, currency, startDate || undefined, endDate || undefined);
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
    let sortableItems = [...groupedDistributors];
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
  }, [groupedDistributors, sortConfig]);

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

  // Data for Area Chart
  const lineChartData = useMemo(() => {
    return groupedDistributors.map(d => ({
      name: d.name || 'Unnamed',
      actual: d.actualAmount || 0,
      difference: calculateDifference(d)
    }));
  }, [groupedDistributors]);

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
      <div className="grid grid-cols-1 gap-4 md:gap-6">
        
        {/* Middle: Area Chart Trend */}
        <ChartCard title="Actual vs Difference Trend" className="w-full">
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

      {/* Bottom Row: Data Table */}
      <div className="grid grid-cols-1 gap-4 md:gap-6">
        {/* Right: Data Table */}
        <ChartCard 
          title="Calculations Breakdown" 
          className="w-full"
          action={
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  max={today}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  title="Start Date"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  max={today}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  title="End Date"
                />
              </div>
              <button
                onClick={handleExport}
                disabled={distributors.length === 0}
                className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 dark:text-indigo-400 px-4 py-2 rounded-xl transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={16} />
                Export
              </button>
            </div>
          }
        >
          {/* Mobile Sort Dropdown */}
          <div className="md:hidden mb-4 flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Sort by:</span>
            <select 
              className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-700 dark:text-slate-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
              value={`${sortConfig.key}-${sortConfig.direction}`}
              onChange={(e) => {
                const [key, direction] = e.target.value.split('-');
                setSortConfig({ key: key as SortKey, direction: direction as SortDirection });
              }}
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="actualAmount-desc">Actual (High to Low)</option>
              <option value="actualAmount-asc">Actual (Low to High)</option>
              <option value="discountAmount-desc">Discount (High to Low)</option>
              <option value="discountAmount-asc">Discount (Low to High)</option>
              <option value="difference-desc">Difference (High to Low)</option>
              <option value="difference-asc">Difference (Low to High)</option>
              <option value="percentage-desc">% Diff (High to Low)</option>
              <option value="percentage-asc">% Diff (Low to High)</option>
            </select>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
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

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {sortedDistributors.length === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 italic text-sm">No data available</div>
            ) : (
              sortedDistributors.map(d => {
                const diff = calculateDifference(d);
                const pct = calculatePercentage(d);
                return (
                  <div key={d.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-slate-900 dark:text-white">{d.name || 'Unnamed'}</div>
                      <div className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg text-xs font-semibold">
                        {pct.toFixed(2)}%
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Actual</div>
                        <div className="text-slate-600 dark:text-slate-300 font-medium">{formatCurrency(d.actualAmount || 0, currency)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Discount</div>
                        <div className="text-slate-600 dark:text-slate-300 font-medium">{formatCurrency(d.discountAmount || 0, currency)}</div>
                      </div>
                      <div className="col-span-2 pt-3 mt-1 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center">
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Difference</div>
                          <div className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(diff, currency)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
