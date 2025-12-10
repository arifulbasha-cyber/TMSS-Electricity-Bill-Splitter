
import React, { useMemo } from 'react';
import { SavedBill } from '../types';
import { useLanguage } from '../i18n';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { useTheme } from './ThemeContext';

interface TrendsDashboardProps {
  history: SavedBill[];
}

const TrendsDashboard: React.FC<TrendsDashboardProps> = ({ history }) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const sortedData = useMemo(() => {
    return [...history].sort((a, b) => new Date(a.config.dateGenerated).getTime() - new Date(b.config.dateGenerated).getTime());
  }, [history]);

  const chartData = useMemo(() => {
    return sortedData.map(bill => {
      const dataPoint: any = {
        name: bill.config.month.substring(0, 3),
        fullMonth: bill.config.month,
        amount: bill.config.totalBillPayable,
        date: bill.config.dateGenerated,
      };

      // Add user units for stacked bar
      bill.meters.forEach(m => {
        const units = Math.max(0, m.current - m.previous);
        dataPoint[m.name] = units;
      });

      return dataPoint;
    });
  }, [sortedData]);

  const uniqueUsers = useMemo(() => {
    const users = new Set<string>();
    history.forEach(bill => {
      bill.meters.forEach(m => users.add(m.name));
    });
    return Array.from(users);
  }, [history]);

  const stats = useMemo(() => {
    if (history.length === 0) return { avg: 0, max: 0, total: 0, trend: 0 };
    
    const amounts = history.map(h => h.config.totalBillPayable);
    const total = amounts.reduce((a, b) => a + b, 0);
    const avg = total / amounts.length;
    const max = Math.max(...amounts);

    let trend = 0;
    if (history.length >= 2) {
      const current = sortedData[sortedData.length - 1].config.totalBillPayable;
      const prev = sortedData[sortedData.length - 2].config.totalBillPayable;
      trend = ((current - prev) / prev) * 100;
    }

    return { avg, max, total, trend };
  }, [history, sortedData]);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center transition-colors duration-200">
        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
           <TrendingUp className="w-8 h-8 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">{t('trends_dashboard')}</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2">{t('no_history_data')}</p>
      </div>
    );
  }

  const colors = ['#4f46e5', '#9333ea', '#db2777', '#e11d48', '#059669', '#2563eb'];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
         <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
         <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('trends_dashboard')}</h2>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> {t('avg_bill')}
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">৳{Math.round(stats.avg)}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> {t('max_bill')}
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">৳{stats.max}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
           <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
             <Calendar className="w-4 h-4" /> {t('total_paid')}
           </div>
           <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">৳{stats.total}</div>
           {stats.trend !== 0 && (
             <div className={`text-xs font-medium mt-1 flex items-center gap-1 ${stats.trend > 0 ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`}>
                {stats.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(stats.trend).toFixed(1)}% {stats.trend > 0 ? t('insight_increase') : t('insight_decrease')}
             </div>
           )}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Line Chart: Total Bill History */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-6">{t('bill_history_trend')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid stroke={isDark ? "#334155" : "#f1f5f9"} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={12} tickLine={false} />
                <YAxis stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={12} tickLine={false} tickFormatter={(val) => `৳${val}`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#1e293b' : '#fff', 
                    borderRadius: '8px', 
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    color: isDark ? '#f8fafc' : '#1e293b'
                  }}
                  itemStyle={{ color: isDark ? '#f8fafc' : '#1e293b', fontWeight: 600 }}
                />
                <Line type="monotone" dataKey="amount" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: isDark ? '#1e293b' : '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: User Consumption */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-6">{t('consumption_trend')}</h3>
          <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid stroke={isDark ? "#334155" : "#f1f5f9"} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={12} tickLine={false} />
                <YAxis stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={12} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: isDark ? '#1e293b' : '#f8fafc' }}
                  contentStyle={{ 
                    backgroundColor: isDark ? '#1e293b' : '#fff', 
                    borderRadius: '8px', 
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    color: isDark ? '#f8fafc' : '#1e293b'
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: isDark ? '#cbd5e1' : '#64748b' }} />
                {uniqueUsers.map((user, idx) => (
                  <Bar key={user} dataKey={user} stackId="a" fill={colors[idx % colors.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TrendsDashboard;
