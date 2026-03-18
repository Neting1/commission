import React from 'react';
import { Distributor, Currency, formatCurrency, calculateDistributorCommission, calculateTotalSalesRepCommission, calculateNetEarnings } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Download, TrendingUp, Users, DollarSign } from 'lucide-react';
import { exportToExcel } from '../ExcelExport';

interface Props {
  distributors: Distributor[];
  currency: Currency;
}

export default function SummaryDashboard({ distributors, currency }: Props) {
  const totalDistributorCommission = distributors.reduce((sum, d) => sum + calculateDistributorCommission(d), 0);
  const totalSalesRepCommission = distributors.reduce((sum, d) => sum + calculateTotalSalesRepCommission(d), 0);
  const netEarnings = totalDistributorCommission - totalSalesRepCommission;

  const handleExport = async () => {
    try {
      await exportToExcel(distributors, currency);
    } catch (error) {
      console.error('Failed to export to Excel:', error);
      alert('Failed to generate Excel file. Please try again.');
    }
  };

  const chartData = [
    { name: 'Net Earnings', value: Math.max(0, netEarnings), color: '#10b981' }, // emerald-500
    { name: 'Sales Rep Commissions', value: Math.max(0, totalSalesRepCommission), color: '#6366f1' }, // indigo-500
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-full">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Dist. Commission</p>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalDistributorCommission, currency)}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Rep Commission</p>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalSalesRepCommission, currency)}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
          <div className={`p-4 rounded-full ${netEarnings >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Net Earnings</p>
            <p className={`text-2xl font-bold ${netEarnings >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(netEarnings, currency)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-slate-800">Distributor Breakdown</h2>
            <button
              onClick={handleExport}
              disabled={distributors.length === 0}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              Export to Excel
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="pb-3 font-medium">Distributor</th>
                  <th className="pb-3 font-medium text-right">Earned Comm.</th>
                  <th className="pb-3 font-medium text-right">Rep Comm.</th>
                  <th className="pb-3 font-medium text-right">Net</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {distributors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 italic">No data available</td>
                  </tr>
                ) : (
                  distributors.map(d => {
                    const distComm = calculateDistributorCommission(d);
                    const repComm = calculateTotalSalesRepCommission(d);
                    const net = distComm - repComm;
                    
                    return (
                      <tr key={d.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="py-3 font-medium text-slate-800">{d.name || 'Unnamed'}</td>
                        <td className="py-3 text-right text-slate-600">{formatCurrency(distComm, currency)}</td>
                        <td className="py-3 text-right text-indigo-600">{formatCurrency(repComm, currency)}</td>
                        <td className="py-3 text-right font-medium text-emerald-600">{formatCurrency(net, currency)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Distribution</h2>
          {totalDistributorCommission > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value, currency)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 italic text-sm border border-dashed border-slate-200 rounded-lg">
              Not enough data for chart
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
