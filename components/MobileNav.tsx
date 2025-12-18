
import React from 'react';
import { Calculator, FileText, Zap, History } from 'lucide-react';
import { useLanguage } from '../i18n';

interface MobileNavProps {
  currentView: 'input' | 'estimator' | 'report' | 'history';
  onChangeView: (view: 'input' | 'estimator' | 'report' | 'history') => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ currentView, onChangeView }) => {
  const { t } = useLanguage();

  const navItems = [
    { id: 'input', label: t('input'), icon: Calculator },
    { id: 'estimator', label: t('bill_estimator'), icon: Zap },
    { id: 'report', label: t('report'), icon: FileText },
    { id: 'history', label: t('history'), icon: History },
  ] as const;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-50 lg:hidden pb-safe px-4 py-3 shadow-lg print:hidden transition-colors duration-200">
      <div className="flex justify-around items-center max-w-lg mx-auto h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button 
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className="flex flex-col items-center gap-1 group relative flex-1"
            >
              {/* Active Indicator Pill */}
              <div className={`px-5 py-1 rounded-full transition-all duration-300 ease-out flex items-center justify-center ${
                isActive 
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' 
                  : 'bg-transparent text-slate-500 dark:text-slate-400 group-hover:bg-slate-200/50 dark:group-hover:bg-slate-800/50'
              }`}>
                <Icon className={`w-6 h-6 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
              </div>
              <span className={`text-[11px] font-bold tracking-tight transition-colors duration-200 ${
                isActive ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNav;
