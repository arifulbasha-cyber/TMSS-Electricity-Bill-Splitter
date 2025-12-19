import React from 'react';
import { FileText, Zap, History, Home } from 'lucide-react';
import { useLanguage } from '../i18n';

interface MobileNavProps {
  currentView: 'home' | 'input' | 'estimator' | 'report' | 'history';
  onChangeView: (view: 'home' | 'input' | 'estimator' | 'report' | 'history') => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ currentView, onChangeView }) => {
  const { t } = useLanguage();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'estimator', label: t('bill_estimator'), icon: Zap },
    { id: 'report', label: t('report'), icon: FileText },
    { id: 'history', label: t('history'), icon: History },
  ] as const;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-50 pt-2 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.04)] print:hidden transition-all duration-200">
      <div className="flex justify-around items-center max-w-lg mx-auto h-16 sm:h-20 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button 
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className="flex flex-col items-center gap-1 group relative flex-1"
            >
              <div className={`px-5 py-1.5 rounded-2xl transition-all duration-300 ease-out flex items-center justify-center ${
                isActive 
                  ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 shadow-sm' 
                  : 'bg-transparent text-slate-400 dark:text-slate-500 group-hover:bg-slate-100 dark:group-hover:bg-slate-800/50'
              }`}>
                <Icon className={`w-6 h-6 transition-transform duration-200 ${isActive ? 'scale-110 stroke-[2.5]' : ''}`} />
              </div>
              <span className={`text-[10px] font-black tracking-tight transition-colors duration-200 uppercase ${
                isActive ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'
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
