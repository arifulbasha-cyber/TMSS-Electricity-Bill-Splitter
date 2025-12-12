
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BillConfig, MeterReading, BillCalculationResult, UserCalculation, SavedBill, TariffConfig, Tenant } from './types';
import { INITIAL_CONFIG, INITIAL_METERS, INITIAL_MAIN_METER, DEFAULT_TARIFF_CONFIG } from './constants';
import BillConfiguration from './components/BillConfiguration';
import MeterReadings from './components/MeterReadings';
import ConsumptionStats from './components/ConsumptionStats';
import CalculationSummary from './components/CalculationSummary';
import BillHistory from './components/BillHistory';
import BillEstimator from './components/BillEstimator';
import TariffModal from './components/TariffModal';
import TenantManager from './components/TenantManager';
import TrendsDashboard from './components/TrendsDashboard';
import CloudSetupModal from './components/CloudSetupModal';
import MobileNav from './components/MobileNav';
import SkeletonLoader from './components/SkeletonLoader';
import ModalWrapper from './components/ModalWrapper';
import { Lightbulb, Database, Download, Settings, Users, Cloud, LogIn, LogOut, Moon, Sun, Menu, ArrowRight, PieChart, BarChart3, RefreshCw } from 'lucide-react';
import { LanguageProvider, useLanguage } from './i18n';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { firebaseService } from './services/firebase';
import { User } from 'firebase/auth';

// Helper to sort bills: Latest Date Generated -> Latest Saved At
const sortBills = (bills: SavedBill[]) => {
  return [...bills].sort((a, b) => {
    // Primary: Date Generated (Descending)
    const dateA = a.config.dateGenerated;
    const dateB = b.config.dateGenerated;
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    
    // Secondary: Saved At (Descending)
    return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
  });
};

// Pure calculation logic extracted for reuse
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
    // Use the actual bkashFee from config which is synced with tariff when toggled
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

// Inner App component to use the hook
const AppContent: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  
  // Navigation State
  const [currentView, setCurrentView] = useState<'input' | 'estimator' | 'report' | 'history'>('input');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // View State (Separate from Draft State)
  const [viewedBill, setViewedBill] = useState<SavedBill | null>(null);

  // Modal States
  const [activeModal, setActiveModal] = useState<'none' | 'stats' | 'trends' | 'tariff' | 'tenants' | 'cloud'>('none');

  // App Data - Initialize from LocalStorage Draft if available
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
  
  // Tariff State
  const [tariffConfig, setTariffConfig] = useState<TariffConfig>(DEFAULT_TARIFF_CONFIG);

  // Tenant State
  const [tenants, setTenants] = useState<Tenant[]>([]);

  // Cloud State
  const [user, setUser] = useState<User | null>(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Prevent initial render from triggering cloud save
  const isFirstRender = useRef(true);

  const handleViewChange = (view: 'input' | 'estimator' | 'report' | 'history') => {
      setCurrentView(view);
      // If leaving report or intentionally switching, clear the historical view so inputs show draft data
      if (view !== 'report') {
        setViewedBill(null);
      }
  };

  // Auto-Save Draft to Local Storage and Sync to Cloud (Debounced)
  useEffect(() => {
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
    }

    // 1. Save Local Immediately
    const now = Date.now();
    localStorage.setItem('tmss_draft_config', JSON.stringify(config));
    localStorage.setItem('tmss_draft_main_meter', JSON.stringify(mainMeter));
    localStorage.setItem('tmss_draft_meters', JSON.stringify(meters));
    localStorage.setItem('tmss_draft_updatedAt', now.toString());

    // 2. Debounced Cloud Save
    // Only save if logged in
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
                console.error("Failed to sync draft", e);
                setIsSyncing(false);
            }
        }, 2000); // Wait 2 seconds of inactivity
        return () => clearTimeout(timer);
    }
  }, [config, mainMeter, meters, user, isFirebaseReady]);

  // Init Check
  useEffect(() => {
    setIsFirebaseReady(firebaseService.isReady());
    if (firebaseService.isReady() && firebaseService.auth) {
       firebaseService.auth.onAuthStateChanged((u) => {
         setUser(u);
       });
    }
  }, []);

  // Data Loading Strategy (History/Settings/Draft Conflict)
  useEffect(() => {
    const loadData = async () => {
       setIsSyncing(true);
       if (user && isFirebaseReady) {
          // Cloud Load
          try {
             const cloudHistory = await firebaseService.getBills(user.uid);
             // Sort by date generated desc
             setHistory(sortBills(cloudHistory));

             const cloudTariff = await firebaseService.getTariff(user.uid);
             if (cloudTariff) setTariffConfig(cloudTariff);

             const cloudTenants = await firebaseService.getTenants(user.uid);
             setTenants(cloudTenants);

             // Check for Newer Draft
             // Logic: If cloud is newer, retrieve. If local is newer or same, keep local.
             const cloudDraft = await firebaseService.getDraft(user.uid);
             const localUpdatedAt = parseInt(localStorage.getItem('tmss_draft_updatedAt') || '0');
             
             if (cloudDraft && cloudDraft.updatedAt > localUpdatedAt) {
                 // Cloud is strictly newer, load it automatically
                 setConfig(cloudDraft.config);
                 setMainMeter(cloudDraft.mainMeter);
                 setMeters(cloudDraft.meters);
                 // Update local timestamp to match cloud to prevent immediate re-save loop issues
                 localStorage.setItem('tmss_draft_updatedAt', cloudDraft.updatedAt.toString());
                 console.log("Loaded newer draft from cloud");
             }
          } catch (e) {
             console.error("Cloud load error", e);
          }
       } else {
          // Local Load
          const savedHistory = localStorage.getItem('tmss_bill_history');
          if (savedHistory) {
            try { 
              const parsed = JSON.parse(savedHistory);
              setHistory(sortBills(parsed)); 
            } catch (e) { console.error(e); }
          }
          const savedTariff = localStorage.getItem('tmss_tariff_config');
          if (savedTariff) {
             try { setTariffConfig(JSON.parse(savedTariff)); } catch (e) { console.error(e); }
          }
          const savedTenants = localStorage.getItem('tmss_tenants');
          if (savedTenants) {
             try { setTenants(JSON.parse(savedTenants)); } catch (e) { console.error(e); }
          }
       }
       setIsSyncing(false);
    };

    loadData();
  }, [user, isFirebaseReady]);

  // Listen for PWA install prompt
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
        // Sync bKash Fee from tariff when toggled
        if (key === 'includeBkashFee') {
            newData.bkashFee = value ? tariffConfig.bkashCharge : 0;
        }
        return newData;
    });
  };

  const handleTariffSave = async (newConfig: TariffConfig) => {
      setTariffConfig(newConfig);
      // Also update current config if bKash is enabled to reflect new rate immediately
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

    setConfig(prev => ({
      ...prev,
      month: nextMonth,
      dateGenerated: new Date().toISOString().split('T')[0],
      totalBillPayable: 0
    }));

    setMainMeter(prev => ({
      ...prev,
      previous: prev.current,
      current: prev.current
    }));

    setMeters(prev => prev.map(m => ({
      ...m,
      previous: m.current,
      current: m.current
    })));
    setIsMenuOpen(false);
  };

  // History Actions
  const saveToHistory = async () => {
    const newRecord: SavedBill = {
      id: Date.now().toString(),
      savedAt: new Date().toISOString(),
      config: { ...config },
      mainMeter: { ...mainMeter },
      meters: [...meters]
    };
    
    // Sort immediately
    const updatedHistory = sortBills([newRecord, ...history]);
    setHistory(updatedHistory);

    if (user && isFirebaseReady) {
       await firebaseService.saveBill(user.uid, newRecord);
    } else {
       localStorage.setItem('tmss_bill_history', JSON.stringify(updatedHistory));
    }
    alert(t('saved_success'));
  };

  // Restores data and goes to Input view
  const loadFromHistory = (record: SavedBill) => {
    if (window.confirm(t('confirm_load').replace('{month}', record.config.month))) {
      applyBillRecord(record);
      setCurrentView('input');
      setViewedBill(null); // Clear viewing state
      setActiveModal('none');
    }
  };

  // View report WITHOUT overwriting current inputs
  const handleViewHistory = (record: SavedBill) => {
    // No confirmation needed as we are not overwriting inputs
    setViewedBill(record);
    setCurrentView('report');
    setActiveModal('none');
  };

  // Helper to apply record data to state with compatibility checks
  const applyBillRecord = (record: SavedBill) => {
      const legacyConfig = record.config as any;
      const includeLateFee = legacyConfig.includeLateFee !== undefined 
          ? legacyConfig.includeLateFee 
          : (legacyConfig.lateFee && legacyConfig.lateFee > 0);
          
      const includeBkashFee = legacyConfig.includeBkashFee !== undefined
          ? legacyConfig.includeBkashFee
          : (legacyConfig.bkashFee > 0);

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
      
      // If deleting the bill currently being viewed, go back to input
      if (viewedBill?.id === id) {
          setViewedBill(null);
          setCurrentView('input');
      }

      if (user && isFirebaseReady) {
         await firebaseService.deleteBill(user.uid, id);
      } else {
         localStorage.setItem('tmss_bill_history', JSON.stringify(updatedHistory));
      }
    }
  };

  // Cloud Actions
  const handleLogin = async () => {
    if (!isFirebaseReady) {
      setActiveModal('cloud');
      setIsMenuOpen(false);
      return;
    }
    try {
      await firebaseService.login();
      setIsMenuOpen(false);
    } catch (e) {
      console.error(e);
      alert("Login failed");
    }
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

  // --- Dynamic Calculation Logic ---
  // If we are viewing a historical bill, use its data. Otherwise use current input state.
  const activeConfig = viewedBill ? viewedBill.config : config;
  const activeMeters = viewedBill ? viewedBill.meters : meters;
  const activeMainMeter = viewedBill ? viewedBill.mainMeter : mainMeter;

  // Calculate results based on the ACTIVE data source
  const calculationResult: BillCalculationResult = useMemo(() => {
    return calculateBillBreakdown(activeConfig, activeMeters, tariffConfig);
  }, [activeConfig, activeMeters, tariffConfig]);

  // Calculate max units for visualization bar (always from current meters for input view, or active for report?)
  // Let's use active meters so stats/report visualization works for history too
  const maxUserUnits = useMemo(() => {
    let max = 0;
    activeMeters.forEach(m => {
        const u = Math.max(0, m.current - m.previous);
        if (u > max) max = u;
    });
    return max;
  }, [activeMeters]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 print:bg-white print:pb-0 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 no-print transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg shrink-0 shadow-lg shadow-indigo-500/20">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div>
               <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">{t('app_title')}</h1>
               <div className="flex items-center gap-1 mt-1">
                 {user ? (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400">
                        <Cloud className="w-3 h-3" />
                        {t('cloud_mode')}
                    </div>
                 ) : (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        <Database className="w-3 h-3" />
                        {t('local_mode')}
                    </div>
                 )}
                 {isSyncing ? (
                    <span className="text-[10px] text-indigo-500 animate-pulse ml-1 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> {t('syncing')}</span>
                 ) : (
                    user && <span className="text-[10px] text-slate-400 ml-1">{t('draft_synced')}</span>
                 )}
               </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {installPrompt && (
              <button
                onClick={handleInstallClick}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-semibold rounded-full shadow-sm hover:bg-slate-800 dark:hover:bg-slate-600 transition-all animate-pulse"
              >
                <Download className="w-3 h-3" /> {t('install_app')}
              </button>
            )}

            {/* Menu Button */}
            <div className="relative">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 z-50 relative"
              >
                <Menu className="w-6 h-6" />
                <span className="text-sm font-semibold hidden sm:inline">{t('menu')}</span>
              </button>

              {/* Dropdown Menu & Backdrop */}
              {isMenuOpen && (
                <>
                  {/* Backdrop to close menu on outside click */}
                  <div 
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setIsMenuOpen(false)}
                  ></div>

                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</div>
                    </div>
                    
                    <button onClick={() => { setActiveModal('stats'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-purple-500" /> {t('consumption_share')}
                    </button>
                    <button onClick={() => { setActiveModal('trends'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-500" /> {t('trends')}
                    </button>
                    <button onClick={handleNextMonth} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-green-500" /> {t('next_month')}
                    </button>
                    
                    <div className="my-2 border-t border-slate-100 dark:border-slate-800"></div>
                    
                    <button onClick={() => { setActiveModal('tenants'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
                      <Users className="w-4 h-4 text-orange-500" /> {t('tenants')}
                    </button>
                    <button onClick={() => { setActiveModal('tariff'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
                      <Settings className="w-4 h-4 text-slate-500" /> {t('settings')}
                    </button>
                    
                    <div className="my-2 border-t border-slate-100 dark:border-slate-800"></div>

                    <div className="flex items-center justify-between px-4 py-2">
                      <span className="text-sm text-slate-700 dark:text-slate-200">{theme === 'dark' ? t('dark_mode') : t('light_mode')}</span>
                      <button onClick={toggleTheme} className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between px-4 py-2">
                       <div className="flex rounded-md bg-slate-100 dark:bg-slate-800 p-0.5">
                         <button onClick={() => setLanguage('en')} className={`px-2 py-0.5 text-xs font-bold rounded ${language === 'en' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>EN</button>
                         <button onClick={() => setLanguage('bn')} className={`px-2 py-0.5 text-xs font-bold rounded ${language === 'bn' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>BN</button>
                       </div>
                    </div>

                    {user ? (
                       <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                          <LogOut className="w-4 h-4" /> {t('logout')}
                       </button>
                    ) : (
                       <button onClick={handleLogin} className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-2">
                          <LogIn className="w-4 h-4" /> {t('login')} / {t('cloud_setup')}
                       </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 print:p-0 print:max-w-none">
        {isSyncing && history.length === 0 ? (
           <SkeletonLoader />
        ) : (
          <>
            {/* VIEW: INPUT (CALCULATOR) */}
            {currentView === 'input' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <Database className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    <h2 className="text-lg font-bold">{t('data_input_part')}</h2>
                </div>
                {/* Note: In input view, we always use the mutable state (config, mainMeter, meters) */}
                <BillConfiguration config={config} onChange={handleConfigChange} tariffConfig={tariffConfig} />
                <MeterReadings 
                     mainMeter={mainMeter} 
                     onMainMeterUpdate={setMainMeter} 
                     readings={meters} 
                     onUpdate={setMeters} 
                     tenants={tenants} 
                     onManageTenants={() => setActiveModal('tenants')}
                     maxUnits={maxUserUnits}
                     calculatedRate={calculationResult.calculatedRate}
                     tariffConfig={tariffConfig}
                />
              </div>
            )}

            {/* VIEW: ESTIMATOR (Moved from Modal) */}
            {currentView === 'estimator' && (
               <div className="animate-in fade-in duration-300">
                   <BillEstimator tariffConfig={tariffConfig} />
               </div>
            )}

            {/* VIEW: REPORT */}
            {currentView === 'report' && (
               <div className="animate-in fade-in duration-300">
                   <CalculationSummary 
                        result={calculationResult} 
                        config={activeConfig} 
                        mainMeter={activeMainMeter}
                        meters={activeMeters}
                        onSaveHistory={saveToHistory}
                        tariffConfig={tariffConfig}
                        isHistorical={!!viewedBill}
                        onClose={() => handleViewChange('input')}
                   />
               </div>
            )}

            {/* VIEW: HISTORY (Moved from Modal/Logic) */}
            {currentView === 'history' && (
               <div className="animate-in fade-in duration-300">
                   <BillHistory 
                        history={history} 
                        onLoad={loadFromHistory} 
                        onDelete={deleteFromHistory} 
                        onViewReport={handleViewHistory}
                   />
               </div>
            )}
          </>
        )}
      </main>

      {/* Mobile Navigation */}
      <MobileNav 
         currentView={currentView} 
         onChangeView={handleViewChange}
      />

      {/* Modals */}
      <ModalWrapper isOpen={activeModal === 'stats'} onClose={() => setActiveModal('none')} title={t('consumption_share')}>
         <ConsumptionStats calculations={calculationResult.userCalculations} totalUnits={calculationResult.totalUnits} />
      </ModalWrapper>

      <ModalWrapper isOpen={activeModal === 'trends'} onClose={() => setActiveModal('none')} title={t('trends_dashboard')}>
         <TrendsDashboard history={history} />
      </ModalWrapper>

      <TariffModal isOpen={activeModal === 'tariff'} onClose={() => setActiveModal('none')} config={tariffConfig} onSave={handleTariffSave} />
      <TenantManager isOpen={activeModal === 'tenants'} onClose={() => setActiveModal('none')} tenants={tenants} onUpdateTenants={handleTenantsUpdate} />
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
