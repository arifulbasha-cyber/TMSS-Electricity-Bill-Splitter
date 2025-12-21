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
    { id: 'estimator', label: 'Sim', icon: Zap },
    { id: 'report', label: 'Report', icon: FileText },
    { id: 'history', label: 'Log', icon: History },
  ] as const;

  return (
    <div className="fixed bottom-6 left-6 right-6 z-50 no-print">
      <div className="max-w-md mx-auto h-20 bg-white/70 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/20 dark:border-white/10 rounded-[2.5rem] shadow-2xl shadow-black/20 px-4 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button 
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`flex flex-col items-center justify-center transition-all duration-300 relative py-2 px-3 ${
                isActive ? 'scale-105' : 'opacity-50 grayscale-[0.5] hover:opacity-100'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-white'
              }`}>
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
              </div>
              
              <span className={`text-[9px] font-black uppercase tracking-[0.1em] mt-0.5 ${
                isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-300'
              }`}>
                {item.label}
              </span>

              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 bg-emerald-500 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNav;