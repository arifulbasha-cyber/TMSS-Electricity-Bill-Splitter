
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BillConfig, MeterReading, BillCalculationResult, UserCalculation, SavedBill, TariffConfig, Tenant } from './types';
import { INITIAL_CONFIG, INITIAL_METERS, INITIAL_MAIN_METER, DEFAULT_TARIFF_CONFIG } from './constants';
import Dashboard from './components/Dashboard';
import BillConfiguration from './components/BillConfiguration';
import MeterReadings from './components/MeterReadings';
import ConsumptionStats from './components/ConsumptionStats';
import CalculationSummary from './components/CalculationSummary';
import BillHistory from './components/BillHistory';
import BillEstimator from './components/BillEstimator';
import TariffSettings from './components/TariffSettings';
import TenantManager from './components/TenantManager';
import TrendsDashboard from './components/TrendsDashboard';
import CloudSetupModal from './components/CloudSetupModal';
import MobileNav from './components/MobileNav';
import SkeletonLoader from './components/SkeletonLoader';
import ModalWrapper from './components/ModalWrapper';
import { Lightbulb, Database, Download, Settings, Users, Cloud, LogIn, LogOut, Moon, Sun, Menu, ArrowRight, PieChart, BarChart3, RefreshCw, Plus, ArrowLeft } from 'lucide-react';
import { LanguageProvider, useLanguage } from './i18n';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { firebaseService } from './services/firebase';
import { User } from 'firebase/auth';

const sortBills = (bills: SavedBill[]) => {
  return [...bills].sort((a, b) => {
    const dateA = a.config.dateGenerated;
    const dateB = b.config.dateGenerated;
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
  });
};

const calculateBillBreakdown = (
  config: BillConfig, 
  meters: MeterReading[], 
  tariffConfig: TariffConfig
): BillCalculationResult => {
    const VAT_RATE = tariffConfig.vatRate;
    const DEMAND_CHARGE = tariffConfig.demandCharge;
    const METER_RENT = tariffConfig.meterRent;

    const vatTotal = (config.totalBillPayable * VAT_RATE) / (1 + VAT_RATE);
    const lateFee = config.includeLateFee ? vatTotal : 0;
    const vatFixed = (DEMAND_CHARGE + METER_RENT) * VAT_RATE;
    const vatDistributed = Math.max(0, ((config.totalBillPayable / (1 + VAT_RATE)) - (DEMAND_CHARGE + METER_RENT)) * VAT_RATE);

    let totalUnits = 0;
    meters.forEach(m => totalUnits += Math.max(0, m.current - m.previous));

    const variableCostPool = config.totalBillPayable - DEMAND_CHARGE - METER_RENT - vatFixed;
    const calculatedRate = totalUnits > 0 ? variableCostPool / totalUnits : 0;

    const numUsers = meters.length;
    const totalFixedPool = DEMAND_CHARGE + METER_RENT + vatFixed + config.bkashFee + lateFee;
    const fixedCostPerUser = numUsers > 0 ? totalFixedPool / numUsers : 0;

    let totalCollection = 0;
    const userCalculations: UserCalculation[] = meters.map(m => {
      const units = Math.max(0, m.current - m.previous);
      const energyCost = units * calculatedRate;
      const totalPayable = energyCost + fixedCostPerUser;
      totalCollection += totalPayable;
      return {
        id: m.id,
        name: m.name,
        unitsUsed: units,
        energyCost: energyCost,
        fixedCost: fixedCostPerUser,
        totalPayable: totalPayable
      };
    });

    return { vatFixed, vatDistributed, vatTotal, lateFee, calculatedRate, totalUnits, userCalculations, totalCollection };
};

const AppContent: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  type AppView = 'home' | 'input' | 'estimator' | 'report' | 'history' | 'stats' | 'trends' | 'tenants' | 'tariff';
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [viewedBill, setViewedBill] = useState<SavedBill | null>(null);
  const [activeModal, setActiveModal] = useState<'none' | 'cloud'>('none');

  const [config, setConfig] = useState<BillConfig>(() => {
    const saved = localStorage.getItem('tmss_draft_config');
    return saved ? JSON.parse(saved) : INITIAL_CONFIG;
  });
  const [mainMeter, setMainMeter] = useState<MeterReading>(() => {
    const saved = localStorage.getItem('tmss_draft_main_meter');
    return saved ? JSON.parse(saved) : INITIAL_MAIN_METER;
  });
  const [meters, setMeters] = useState<MeterReading[]>(() => {
    const saved = localStorage.getItem('tmss_draft_meters');
    return saved ? JSON.parse(saved) : INITIAL_METERS;
  });

  const [history, setHistory] = useState<SavedBill[]>([]);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [tariffConfig, setTariffConfig] = useState<TariffConfig>(DEFAULT_TARIFF_CONFIG);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const isFirstRender = useRef(true);

  const handleViewChange = (view: AppView) => {
      setCurrentView(view);
      if (view !== 'report') {
        setViewedBill(null);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
    }
    const now = Date.now();
    localStorage.setItem('tmss_draft_config', JSON.stringify(config));
    localStorage.setItem('tmss_draft_main_meter', JSON.stringify(mainMeter));
    localStorage.setItem('tmss_draft_meters', JSON.stringify(meters));
    localStorage.setItem('tmss_draft_updatedAt', now.toString());

    if (user && isFirebaseReady) {
        setIsSyncing(true);
        const timer = setTimeout(async () => {
            try {
                await firebaseService.saveDraft(user.uid, {
                    updatedAt: now,
                    config,
                    mainMeter,
                    meters
                });
                setIsSyncing(false);
            } catch (e) {
                setIsSyncing(false);
            }
        }, 2000);
        return () => clearTimeout(timer);
    }
  }, [config, mainMeter, meters, user, isFirebaseReady]);

  useEffect(() => {
    setIsFirebaseReady(firebaseService.isReady());
    if (firebaseService.isReady() && firebaseService.auth) {
       firebaseService.auth.onAuthStateChanged((u) => {
         setUser(u);
       });
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
       setIsSyncing(true);
       if (user && isFirebaseReady) {
          try {
             const cloudHistory = await firebaseService.getBills(user.uid);
             setHistory(sortBills(cloudHistory));
             const cloudTariff = await firebaseService.getTariff(user.uid);
             if (cloudTariff) setTariffConfig(cloudTariff);
             const cloudTenants = await firebaseService.getTenants(user.uid);
             setTenants(cloudTenants);
             const cloudDraft = await firebaseService.getDraft(user.uid);
             const localUpdatedAt = parseInt(localStorage.getItem('tmss_draft_updatedAt') || '0');
             if (cloudDraft && cloudDraft.updatedAt > localUpdatedAt) {
                 setConfig(cloudDraft.config);
                 setMainMeter(cloudDraft.mainMeter);
                 setMeters(cloudDraft.meters);
                 localStorage.setItem('tmss_draft_updatedAt', cloudDraft.updatedAt.toString());
             }
          } catch (e) {}
       } else {
          const savedHistory = localStorage.getItem('tmss_bill_history');
          if (savedHistory) {
            try { setHistory(sortBills(JSON.parse(savedHistory))); } catch (e) {}
          }
          const savedTariff = localStorage.getItem('tmss_tariff_config');
          if (savedTariff) {
             try { setTariffConfig(JSON.parse(savedTariff)); } catch (e) {}
          }
          const savedTenants = localStorage.getItem('tmss_tenants');
          if (savedTenants) {
             try { setTenants(JSON.parse(savedTenants)); } catch (e) {}
          }
       }
       setIsSyncing(false);
    };
    loadData();
  }, [user, isFirebaseReady]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleConfigChange = (key: keyof BillConfig, value: string | number | boolean) => {
    setConfig(prev => {
        const newData = { ...prev, [key]: value };
        if (key === 'includeBkashFee') {
            newData.bkashFee = value ? tariffConfig.bkashCharge : 0;
        }
        return newData;
    });
  };

  const handleTariffSave = async (newConfig: TariffConfig) => {
      setTariffConfig(newConfig);
      if (config.includeBkashFee) {
          setConfig(prev => ({ ...prev, bkashFee: newConfig.bkashCharge }));
      }
      if (user && isFirebaseReady) {
         await firebaseService.saveTariff(user.uid, newConfig);
      } else {
         localStorage.setItem('tmss_tariff_config', JSON.stringify(newConfig));
      }
  };

  const handleTenantsUpdate = async (newTenants: Tenant[]) => {
      setTenants(newTenants);
      if (user && isFirebaseReady) {
         await firebaseService.saveTenants(user.uid, newTenants);
      } else {
         localStorage.setItem('tmss_tenants', JSON.stringify(newTenants));
      }
  };

  const handleNextMonth = () => {
    if (!window.confirm(t('confirm_next_month'))) return;
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonthIndex = months.indexOf(config.month);
    const nextMonth = months[(currentMonthIndex + 1) % 12];
    setConfig(prev => ({ ...prev, month: nextMonth, dateGenerated: new Date().toISOString().split('T')[0], totalBillPayable: 0 }));
    setMainMeter(prev => ({ ...prev, previous: prev.current, current: prev.current }));
    setMeters(prev => prev.map(m => ({ ...m, previous: m.current, current: m.current })));
    setIsMenuOpen(false);
  };

  const saveToHistory = async () => {
    const newRecord: SavedBill = {
      id: Date.now().toString(),
      savedAt: new Date().toISOString(),
      config: { ...config },
      mainMeter: { ...mainMeter },
      meters: [...meters]
    };
    const updatedHistory = sortBills([newRecord, ...history]);
    setHistory(updatedHistory);
    if (user && isFirebaseReady) {
       await firebaseService.saveBill(user.uid, newRecord);
    } else {
       localStorage.setItem('tmss_bill_history', JSON.stringify(updatedHistory));
    }
    alert(t('saved_success'));
  };

  const loadFromHistory = (record: SavedBill) => {
    if (window.confirm(t('confirm_load').replace('{month}', record.config.month))) {
      applyBillRecord(record);
      setCurrentView('home');
      setViewedBill(null);
    }
  };

  const handleViewHistory = (record: SavedBill) => {
    setViewedBill(record);
    setCurrentView('report');
  };

  const applyBillRecord = (record: SavedBill) => {
      const legacyConfig = record.config as any;
      const includeLateFee = legacyConfig.includeLateFee !== undefined ? legacyConfig.includeLateFee : (legacyConfig.lateFee && legacyConfig.lateFee > 0);
      const includeBkashFee = legacyConfig.includeBkashFee !== undefined ? legacyConfig.includeBkashFee : (legacyConfig.bkashFee > 0);
      const cleanConfig: BillConfig = {
        month: record.config.month,
        dateGenerated: record.config.dateGenerated,
        totalBillPayable: record.config.totalBillPayable,
        bkashFee: record.config.bkashFee,
        includeLateFee: includeLateFee,
        includeBkashFee: includeBkashFee
      };
      setConfig(cleanConfig);
      setMainMeter(record.mainMeter);
      setMeters(record.meters);
  };

  const deleteFromHistory = async (id: string) => {
    if (window.confirm(t('confirm_delete'))) {
      const updatedHistory = history.filter(h => h.id !== id);
      setHistory(updatedHistory);
      if (viewedBill?.id === id) {
          setViewedBill(null);
          setCurrentView('home');
      }
      if (user && isFirebaseReady) {
         await firebaseService.deleteBill(user.uid, id);
      } else {
         localStorage.setItem('tmss_bill_history', JSON.stringify(updatedHistory));
      }
    }
  };

  const handleLogin = async () => {
    if (!isFirebaseReady) {
      setActiveModal('cloud');
      setIsMenuOpen(false);
      return;
    }
    try {
      await firebaseService.login();
      setIsMenuOpen(false);
    } catch (e) {}
  };

  const handleLogout = async () => {
    await firebaseService.logout();
    setHistory([]); 
    setIsMenuOpen(false);
  };

  const onCloudConnected = () => {
    setIsFirebaseReady(true);
    if (firebaseService.auth) {
      firebaseService.auth.onAuthStateChanged(setUser);
    }
  };

  const activeConfig = viewedBill ? viewedBill.config : config;
  const activeMeters = viewedBill ? viewedBill.meters : meters;
  const activeMainMeter = viewedBill ? viewedBill.mainMeter : mainMeter;

  const calculationResult: BillCalculationResult = useMemo(() => {
    return calculateBillBreakdown(activeConfig, activeMeters, tariffConfig);
  }, [activeConfig, activeMeters, tariffConfig]);

  const maxUserUnits = useMemo(() => {
    let max = 0;
    activeMeters.forEach(m => {
        const u = Math.max(0, m.current - m.previous);
        if (u > max) max = u;
    });
    return max;
  }, [activeMeters]);

  const renderView = () => {
    switch(currentView) {
      case 'home':
        return (
          <div className="animate-in fade-in duration-500">
            <Dashboard config={config} result={calculationResult} mainMeter={mainMeter} />
          </div>
        );
      case 'input':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <BillConfiguration config={config} onChange={handleConfigChange} tariffConfig={tariffConfig} />
            <MeterReadings 
                mainMeter={mainMeter} 
                onMainMeterUpdate={setMainMeter} 
                readings={meters} 
                onUpdate={setMeters} 
                tenants={tenants} 
                onManageTenants={() => handleViewChange('tenants')}
                maxUnits={maxUserUnits}
                calculatedRate={calculationResult.calculatedRate}
                tariffConfig={tariffConfig}
            />
          </div>
        );
      case 'estimator':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <BillEstimator tariffConfig={tariffConfig} />
          </div>
        );
      case 'report':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CalculationSummary 
                  result={calculationResult} 
                  config={activeConfig} 
                  mainMeter={activeMainMeter}
                  meters={activeMeters}
                  onSaveHistory={saveToHistory}
                  tariffConfig={tariffConfig}
                  isHistorical={!!viewedBill}
                  onClose={() => handleViewChange('home')}
              />
          </div>
        );
      case 'history':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <BillHistory 
                  history={history} 
                  onLoad={loadFromHistory} 
                  onDelete={deleteFromHistory} 
                  onViewReport={handleViewHistory}
              />
          </div>
        );
      case 'stats':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
             <button onClick={() => handleViewChange('home')} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors px-2">
                <ArrowLeft className="w-4 h-4" /> {t('back')}
             </button>
             <ConsumptionStats calculations={calculationResult.userCalculations} totalUnits={calculationResult.totalUnits} />
          </div>
        );
      case 'trends':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
             <button onClick={() => handleViewChange('home')} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors px-2">
                <ArrowLeft className="w-4 h-4" /> {t('back')}
             </button>
             <TrendsDashboard history={history} />
          </div>
        );
      case 'tenants':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
             <button onClick={() => handleViewChange('home')} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors px-2">
                <ArrowLeft className="w-4 h-4" /> {t('back')}
             </button>
             <TenantManager tenants={tenants} onUpdateTenants={handleTenantsUpdate} />
          </div>
        );
      case 'tariff':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
             <button onClick={() => handleViewChange('home')} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors px-2">
                <ArrowLeft className="w-4 h-4" /> {t('back')}
             </button>
             <TariffSettings config={tariffConfig} onSave={handleTariffSave} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28 transition-colors duration-200">
      <header className="bg-emerald-700 dark:bg-slate-950 sticky top-0 z-30 no-print px-4 pt-safe flex items-end justify-between border-b border-emerald-800 dark:border-slate-800 transition-colors duration-200 shadow-md shadow-emerald-900/10 min-h-[4rem]">
        <div className="flex items-center gap-3 w-full justify-between pb-3">
          <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2.5 rounded-2xl">
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-base sm:text-lg font-black text-white leading-none truncate pr-2">{t('app_title')}</h1>
                <div className="flex items-center gap-1.5 mt-1">
                  {user ? (
                      <div className="flex items-center gap-1 text-[9px] font-black text-emerald-100 uppercase tracking-widest">
                          <Cloud className="w-2.5 h-2.5" />
                          {t('cloud')}
                      </div>
                  ) : (
                      <div className="flex items-center gap-1 text-[9px] font-black text-white/50 uppercase tracking-widest">
                          <Database className="w-2.5 h-2.5" />
                          {t('local')}
                      </div>
                  )}
                  {isSyncing && <RefreshCw className="w-2.5 h-2.5 text-white/70 animate-spin" />}
                </div>
              </div>
          </div>
            
          <div className="flex items-center gap-1">
            {installPrompt && (
              <button onClick={handleInstallClick} className="p-3 text-white/70 hover:bg-white/10 rounded-2xl transition-colors">
                <Download className="w-5 h-5" />
              </button>
            )}

            <div className="relative">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-3 text-white hover:bg-white/10 rounded-2xl transition-all active:scale-90"
              >
                <Menu className="w-6 h-6" />
              </button>

              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsMenuOpen(false)}></div>
                  <div className="absolute right-0 top-full mt-3 w-64 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 py-3 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-5 py-2 mb-2">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('actions')}</div>
                    </div>
                    
                    <button onClick={() => { handleViewChange('stats'); setIsMenuOpen(false); }} className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors">
                      <PieChart className="w-5 h-5 text-emerald-500" /> {t('consumption_share')}
                    </button>
                    <button onClick={() => { handleViewChange('trends'); setIsMenuOpen(false); }} className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors">
                      <BarChart3 className="w-5 h-5 text-teal-500" /> {t('trends')}
                    </button>
                    <button onClick={handleNextMonth} className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors">
                      <ArrowRight className="w-5 h-5 text-emerald-600" /> {t('next_month')}
                    </button>
                    
                    <div className="mx-4 my-2 border-t border-slate-100 dark:border-slate-800"></div>
                    
                    <button onClick={() => { handleViewChange('tenants'); setIsMenuOpen(false); }} className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors">
                      <Users className="w-5 h-5 text-sage-500" /> {t('tenants')}
                    </button>
                    <button onClick={() => { handleViewChange('tariff'); setIsMenuOpen(false); }} className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors">
                      <Settings className="w-5 h-5 text-slate-500" /> {t('settings')}
                    </button>
                    
                    <div className="mx-4 my-2 border-t border-slate-100 dark:border-slate-800"></div>

                    <div className="flex items-center justify-between px-5 py-2">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('theme')}</span>
                      <button onClick={toggleTheme} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between px-5 py-2">
                      <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 w-full">
                        <button onClick={() => setLanguage('en')} className={`flex-1 py-1 text-[10px] font-black rounded-lg transition-all ${language === 'en' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-400'}`}>ENGLISH</button>
                        <button onClick={() => setLanguage('bn')} className={`flex-1 py-1 text-[10px] font-black rounded-lg transition-all ${language === 'bn' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-400'}`}>বাংলা</button>
                      </div>
                    </div>

                    {user ? (
                      <button onClick={handleLogout} className="w-full text-left px-5 py-4 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-3 mt-1">
                          <LogOut className="w-5 h-5" /> {t('logout')}
                      </button>
                    ) : (
                      <button onClick={handleLogin} className="w-full text-left px-5 py-4 text-sm font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 flex items-center gap-3 mt-1">
                          <LogIn className="w-5 h-5" /> {t('login')}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 print:p-0">
        {isSyncing && history.length === 0 ? (
           <SkeletonLoader />
        ) : (
          renderView()
        )}
      </main>

      <MobileNav currentView={currentView as any} onChangeView={handleViewChange} />

      {currentView === 'home' && (
        <button 
          onClick={() => handleViewChange('input')}
          className="fixed bottom-24 right-6 w-14 h-14 bg-emerald-600 text-white rounded-2xl shadow-2xl flex items-center justify-center z-40 transition-all hover:scale-105 active:scale-90"
          title={t('input')}
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      <CloudSetupModal isOpen={activeModal === 'cloud'} onClose={() => setActiveModal('none')} onConnected={onCloudConnected} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
