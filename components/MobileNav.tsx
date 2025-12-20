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
      <div className="max-w-md mx-auto h-18 bg-white/70 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/20 dark:border-white/10 rounded-[2.5rem] shadow-2xl shadow-black/20 px-4 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button 
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`flex flex-col items-center gap-1 transition-all duration-300 relative py-2 ${
                isActive ? 'scale-110' : 'opacity-40 hover:opacity-100'
              }`}
            >
              <div className={`p-2.5 rounded-2xl transition-all duration-300 ${
                isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-white'
              }`}>
                <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
              </div>
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