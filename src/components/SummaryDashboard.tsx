import React, { useState, useMemo } from 'react';
import { Distributor, Currency, formatCurrency, calculateDifference, calculatePercentage } from '../types';
import { 
  ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  LineChart, Line, ReferenceLine, FunnelChart, Funnel, LabelList 
} from 'recharts';
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

const KPIBox = ({ title, value, subtitle, subValue, trend }: { title: string, value: string, subtitle?: string, subValue?: string, trend?: 'up' | 'down' }) => (
  <div className="bg-[#4a90e2] text-white p-4 flex flex-col justify-center items-center rounded shadow-sm relative overflow-hidden">
    <h3 className="text-xs md:text-sm font-medium text-blue-100 mb-1 z-10 text-center">{title}</h3>
    <div className="flex items-center gap-1 z-10">
      <span className="text-2xl md:text-3xl font-bold">{value}</span>
      {trend === 'up' && <ArrowUp size={16} className="text-green-300" />}
      {trend === 'down' && <ArrowDown size={16} className="text-red-300" />}
    </div>
    {(subtitle || subValue) && (
      <div className="text-[10px] md:text-xs text-blue-100 mt-2 z-10 text-center">
        {subtitle} {subValue}
      </div>
    )}
    {/* Subtle background gradient/overlay for depth */}
    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
  </div>
);

const DarkPanel = ({ title, children, action, className = '' }: { title: string, children: React.ReactNode, action?: React.ReactNode, className?: string }) => (
  <div className={`bg-[#233044] rounded shadow-sm border border-[#2d3d54] flex flex-col overflow-hidden ${className}`}>
    <div className="border-b border-[#2d3d54] px-4 py-3 flex justify-between items-center">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
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
      return <ArrowUpDown size={14} className="text-slate-500 opacity-50" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp size={14} className="text-[#4a90e2]" />
    ) : (
      <ArrowDown size={14} className="text-[#4a90e2]" />
    );
  };

  // Data for Funnel (Top 5 by Actual Amount)
  const funnelColors = ['#2dd4bf', '#3b82f6', '#1d4ed8', '#f97316', '#eab308'];
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

  // Data for Line Chart
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
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    color: '#f8fafc',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)'
  };

  return (
    <div className="bg-[#17202e] min-h-screen p-4 md:p-6 rounded-xl space-y-6 font-sans">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Calculations Overview</h1>
      </div>

      {exportError && (
        <div className="p-4 bg-red-900/40 border border-red-800 text-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{exportError}</p>
          </div>
          <button onClick={() => setExportError(null)} className="text-red-400 hover:text-red-300">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Top Row: KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPIBox 
          title="Total Actual" 
          value={formatCurrency(totalActual, currency)} 
          subtitle="% Diff Overall:" 
          subValue={`${overallDiffPct.toFixed(2)}%`}
          trend={overallDiffPct >= 0 ? 'up' : 'down'}
        />
        <KPIBox 
          title="Total Difference" 
          value={formatCurrency(totalDifference, currency)} 
        />
        <KPIBox 
          title="Total Discount" 
          value={formatCurrency(totalDiscount, currency)} 
          subtitle="Avg Discount:"
          subValue={`${avgDiscountPct.toFixed(2)}%`}
        />
        <KPIBox 
          title="Distributors" 
          value={distributors.length.toString()} 
          trend="up"
        />
        <KPIBox 
          title="Avg Actual / Dist" 
          value={formatCurrency(avgActual, currency)} 
        />
        <KPIBox 
          title="Overall % Diff" 
          value={`${overallDiffPct.toFixed(2)}%`} 
          trend={overallDiffPct >= 0 ? 'up' : 'down'}
        />
      </div>

      {/* Middle Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        
        {/* Left: Funnel Chart */}
        <DarkPanel title="Top Distributors by Actual" className="lg:col-span-3">
          {funnelData.length > 0 ? (
            <div className="h-64 md:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value || 0), currency)}
                    contentStyle={customTooltipStyle}
                    itemStyle={{ color: '#cbd5e1' }}
                  />
                  <Funnel
                    dataKey="value"
                    data={funnelData}
                    isAnimationActive
                  >
                    <LabelList position="center" fill="#fff" stroke="none" dataKey="name" fontSize={12} />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 md:h-80 flex items-center justify-center text-slate-500 italic text-sm">No data available</div>
          )}
        </DarkPanel>

        {/* Middle: Line Chart Trend */}
        <DarkPanel title="Actual vs Difference Trend" className="lg:col-span-7">
          {distributors.length > 0 ? (
            <div className="h-64 md:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2d3d54" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    tick={{ fill: '#94a3b8', fontSize: 11 }} 
                    axisLine={{ stroke: '#2d3d54' }}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    tick={{ fill: '#94a3b8', fontSize: 11 }} 
                    axisLine={{ stroke: '#2d3d54' }}
                    tickLine={false}
                    tickFormatter={(val) => `${currency.symbol}${val}`}
                  />
                  <Tooltip 
                    contentStyle={customTooltipStyle}
                    formatter={(value: any, name: string) => [formatCurrency(Number(value || 0), currency), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#cbd5e1', paddingTop: '10px' }} />
                  <ReferenceLine y={avgActual} stroke="#2dd4bf" strokeDasharray="3 3" label={{ position: 'top', value: 'Avg Actual', fill: '#2dd4bf', fontSize: 10 }} />
                  <Line type="monotone" dataKey="actual" name="Actual Amount" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#17202e', strokeWidth: 2, stroke: '#3b82f6' }} activeDot={{ r: 6, fill: '#3b82f6' }} />
                  <Line type="monotone" dataKey="difference" name="Difference" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: '#17202e', strokeWidth: 2, stroke: '#f97316' }} activeDot={{ r: 6, fill: '#f97316' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 md:h-80 flex items-center justify-center text-slate-500 italic text-sm">No data available</div>
          )}
        </DarkPanel>

        {/* Right: Target Bar */}
        <DarkPanel title="Difference vs Actual" className="lg:col-span-2">
          {totalActual > 0 ? (
            <div className="h-64 md:h-80 w-full relative flex justify-center items-end pb-8">
              <div className="absolute top-2 right-2 text-xs text-slate-400 text-right">
                <div>Actual Target</div>
                <div className="font-bold text-white">{formatCurrency(totalActual, currency)}</div>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={targetData} margin={{ top: 40, right: 10, left: 10, bottom: 0 }}>
                  <Tooltip 
                    contentStyle={customTooltipStyle}
                    formatter={(value: any, name: string) => [formatCurrency(Number(value || 0), currency), name]}
                    cursor={{ fill: 'transparent' }}
                  />
                  <XAxis dataKey="name" hide />
                  <YAxis hide domain={[0, Math.max(totalActual, totalDifference) * 1.1]} />
                  {/* Background bar representing the target (Actual) */}
                  <Bar dataKey="actual" fill="#334155" radius={[4, 4, 0, 0]} barSize={60} />
                  {/* Foreground bar representing the progress (Difference) */}
                  <Bar dataKey="difference" fill="#60a5fa" radius={[4, 4, 0, 0]} barSize={60} style={{ transform: 'translateX(-60px)' }} />
                </BarChart>
              </ResponsiveContainer>
              <div className="absolute bottom-2 text-center w-full">
                <div className="text-sm font-bold text-[#60a5fa]">{formatCurrency(totalDifference, currency)}</div>
              </div>
            </div>
          ) : (
            <div className="h-64 md:h-80 flex items-center justify-center text-slate-500 italic text-sm">No data available</div>
          )}
        </DarkPanel>
      </div>

      {/* Bottom Row: Data Table */}
      <DarkPanel 
        title="Calculations Breakdown" 
        action={
          <button
            onClick={handleExport}
            disabled={distributors.length === 0}
            className="flex items-center gap-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white px-3 py-1.5 rounded transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            Export
          </button>
        }
      >
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2d3d54] text-[10px] md:text-xs uppercase tracking-wider text-slate-400">
                <th className="p-2 md:pb-3 font-medium cursor-pointer hover:bg-[#2d3d54]/50 transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">Name <SortIcon columnKey="name" /></div>
                </th>
                <th className="p-2 md:pb-3 font-medium text-right cursor-pointer hover:bg-[#2d3d54]/50 transition-colors" onClick={() => handleSort('actualAmount')}>
                  <div className="flex items-center justify-end gap-1">Actual Amount <SortIcon columnKey="actualAmount" /></div>
                </th>
                <th className="p-2 md:pb-3 font-medium text-right cursor-pointer hover:bg-[#2d3d54]/50 transition-colors" onClick={() => handleSort('discountAmount')}>
                  <div className="flex items-center justify-end gap-1">Discount Amount <SortIcon columnKey="discountAmount" /></div>
                </th>
                <th className="p-2 md:pb-3 font-medium text-right cursor-pointer hover:bg-[#2d3d54]/50 transition-colors" onClick={() => handleSort('difference')}>
                  <div className="flex items-center justify-end gap-1">Difference <SortIcon columnKey="difference" /></div>
                </th>
                <th className="p-2 md:pb-3 font-medium text-right cursor-pointer hover:bg-[#2d3d54]/50 transition-colors" onClick={() => handleSort('percentage')}>
                  <div className="flex items-center justify-end gap-1">% Diff <SortIcon columnKey="percentage" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="text-xs md:text-sm text-slate-200">
              {sortedDistributors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 italic">No data available</td>
                </tr>
              ) : (
                sortedDistributors.map(d => {
                  const diff = calculateDifference(d);
                  const pct = calculatePercentage(d);
                  
                  return (
                    <tr key={d.id} className="border-b border-[#2d3d54]/50 last:border-0 hover:bg-[#2d3d54]/30 transition-colors">
                      <td className="p-2 md:py-3 font-medium text-white">{d.name || 'Unnamed'}</td>
                      <td className="p-2 md:py-3 text-right text-slate-300">{formatCurrency(d.actualAmount || 0, currency)}</td>
                      <td className="p-2 md:py-3 text-right text-slate-300">{formatCurrency(d.discountAmount || 0, currency)}</td>
                      <td className="p-2 md:py-3 text-right font-medium text-[#2dd4bf]">{formatCurrency(diff, currency)}</td>
                      <td className="p-2 md:py-3 text-right font-medium text-[#60a5fa]">{pct.toFixed(2)}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </DarkPanel>
    </div>
  );
}
