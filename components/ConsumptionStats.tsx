
import React from 'react';
import { UserCalculation } from '../types';
import { PieChart } from 'lucide-react';
import { useLanguage } from '../i18n';

interface ConsumptionStatsProps {
  calculations: UserCalculation[];
  totalUnits: number;
}

const ConsumptionStats: React.FC<ConsumptionStatsProps> = ({ calculations, totalUnits }) => {
  const { t } = useLanguage();
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 print-break-inside-avoid transition-colors duration-200">
      <div className="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
        <PieChart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('consumption_share')}</h2>
      </div>
      <div className="space-y-5">
        {calculations.map((user, index) => {
          const percentage = totalUnits > 0 ? (user.unitsUsed / totalUnits) * 100 : 0;
          const colors = ['bg-indigo-600', 'bg-purple-600', 'bg-pink-600', 'bg-rose-600', 'bg-emerald-600', 'bg-blue-600'];
          const colorClass = colors[index % colors.length];

          return (
            <div key={user.id}>
              <div className="flex justify-between text-sm mb-2">
                <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${colorClass}`}></div>
                   <span className="font-medium text-slate-700 dark:text-slate-300">{t(user.name)}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{percentage.toFixed(1)}%</span>
                  <span className="text-slate-400 mx-1">•</span>
                  <span className="text-slate-500 dark:text-slate-400">{user.unitsUsed} kWh</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                <div 
                  className={`${colorClass} h-2 rounded-full transition-all duration-500 ease-out`} 
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
        
        {calculations.length === 0 && (
          <div className="text-center text-slate-400 dark:text-slate-500 text-sm py-4">
            {t('no_active_meters')}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsumptionStats;
