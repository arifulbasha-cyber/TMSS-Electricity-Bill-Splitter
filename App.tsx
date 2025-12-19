import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
import { Lightbulb, Database, Settings, Users, Cloud, Moon, Sun, Menu, ArrowRight, PieChart, BarChart3, RefreshCw, Plus, ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { LanguageProvider, useLanguage } from './i18n';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { spreadsheetService } from './services/spreadsheet';
import { StatusBar, Style } from '@capacitor/status-bar';

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
    const vatFixed = (DEMAND_CHARGE + METER_RENT) * VAT_RATE;
    const vatDistributed = Math.max(0, vatTotal - vatFixed);
    const lateFee = config.includeLateFee ? vatTotal : 0;

    let totalUnits = 0;
    meters.forEach(m => {
      const units = m.current - m.previous;
      totalUnits += units > 0 ? units : 0;
    });

    const variableCostPool = config.totalBillPayable - DEMAND_CHARGE - METER_RENT - vatFixed;
    const calculatedRate = totalUnits > 0 ? variableCostPool / totalUnits : 0;
    const numUsers = meters.length;
    
    const totalFixedPool = DEMAND_CHARGE + METER_RENT + vatFixed + config.bkashFee + lateFee;
    const fixedCostPerUser = numUsers > 0 ? totalFixedPool / numUsers : 0;

    let totalCollection = 0;
    const userCalculations: UserCalculation[] = meters.map(m => {
      const units = Math.max(0, m.current - m.previous);
      const energyCostWithDistributedVat = units * calculatedRate;
      const totalPayable = energyCostWithDistributedVat + fixedCostPerUser;
      totalCollection += totalPayable;
      return {
        id: m.id,
        name: m.name,
        unitsUsed: units,
        energyCost: energyCostWithDistributedVat,
        fixedCost: fixedCostPerUser,
        totalPayable: totalPayable
      };
    });

    return { 
      vatFixed, 
      vatDistributed, 
      vatTotal, 
      lateFee, 
      calculatedRate, 
      totalUnits, 
      userCalculations, 
      totalCollection 
    };
};

const AppContent: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  type AppView = 'home' | 'input' | 'estimator' | 'report' | 'history' | 'stats' | 'trends' | 'tenants' | 'tariff';
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [viewedBill, setViewedBill] = useState<SavedBill | null>(null);
  const [activeModal, setActiveModal] = useState<'none' | 'cloud'>('none');

  // Core State
  const [config, setConfig] = useState<BillConfig>(INITIAL_CONFIG);
  const [mainMeter, setMainMeter] = useState<MeterReading>(INITIAL_MAIN_METER);
  const [meters, setMeters] = useState<MeterReading[]>(INITIAL_METERS);
  const [history, setHistory] = useState<SavedBill[]>([]);
  const [tariffConfig, setTariffConfig] = useState<TariffConfig>(DEFAULT_TARIFF_CONFIG);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const lastCloudSyncTimestamp = useRef<number>(0);
  const isFirstRender = useRef(true);
  const isInternalChange = useRef(false);

  // Status Bar Immersive Setup for Android
  useEffect(() => {
    const handleStatusBar = async () => {
      try {
        // This command makes the webview occupy the full screen including the status bar area
        await StatusBar.setOverlaysWebView({ overlay: true });
        
        // Our headers (Emerald-700 and Slate-900) are dark, so we want light icons
        // Using Style.Light ensures white icons/text in the status bar
        await StatusBar.setStyle({ style: Style.Light });
      } catch (e) {
        // Fallback for non-native platforms
        console.debug('StatusBar plugin not available or platform not supported.');
      }
    };
    handleStatusBar();
  }, []);

  const fetchCloudData = useCallback(async (isSilent = false) => {
    if (!spreadsheetService.isReady()) return;
    
    if (!isSilent) setIsInitialLoading(true);
    setIsSyncing(true);
    
    try {
      const [cloudDraft, cloudHistory, cloudTariff, cloudTenants] = await Promise.all([
        spreadsheetService.getDraft(),
        spreadsheetService.getBills(),
        spreadsheetService.getTariff(),
        spreadsheetService.getTenants()
      ]);

      if (cloudDraft && cloudDraft.updatedAt > lastCloudSyncTimestamp.current) {
        isInternalChange.current = true; 
        setConfig(cloudDraft.config);
        setMainMeter(cloudDraft.mainMeter);
        setMeters(cloudDraft.meters);
        lastCloudSyncTimestamp.current = cloudDraft.updatedAt;
      }
      
      if (cloudHistory && cloudHistory.length > 0) {
        setHistory(sortBills(cloudHistory));
        localStorage.setItem('tmss_bill_history', JSON.stringify(cloudHistory));
      }

      if (cloudTariff) {
        setTariffConfig(cloudTariff);
        localStorage.setItem('tmss_tariff_config', JSON.stringify(cloudTariff));
      }

      if (cloudTenants) {
        setTenants(cloudTenants);
        localStorage.setItem('tmss_tenants', JSON.stringify(cloudTenants));
      }

      console.log("Cloud sync complete.");
    } catch (error) {
      console.error("Cloud pull failed:", error);
    } finally {
      setIsInitialLoading(false);
      setIsSyncing(false);
      setTimeout(() => { isInternalChange.current = false; }, 100);
    }
  }, []);

  useEffect(() => {
    const savedHistory = localStorage.getItem('tmss_bill_history');
    if (savedHistory) setHistory(sortBills(JSON.parse(savedHistory)));
    
    const savedTariff = localStorage.getItem('tmss_tariff_config');
    if (savedTariff) setTariffConfig(JSON.parse(savedTariff));
    
    const savedTenants = localStorage.getItem('tmss_tenants');
    if (savedTenants) setTenants(JSON.parse(savedTenants));

    const savedDraft = localStorage.getItem('tmss_draft_config');
    if (savedDraft) {
        setConfig(JSON.parse(savedDraft));
        const m = localStorage.getItem('tmss_draft_meters');
        if (m) setMeters(JSON.parse(m));
        const main = localStorage.getItem('tmss_draft_main_meter');
        if (main) setMainMeter(JSON.parse(main));
    }

    if (spreadsheetService.isReady()) {
      fetchCloudData();
    }
  }, [fetchCloudData]);

  useEffect(() => {
    if (!spreadsheetService.isReady()) return;
    
    const interval = setInterval(() => {
      if (!isSyncing && !isInitialLoading) {
        fetchCloudData(true);
      }
    }, 30000); 

    return () => clearInterval(interval);
  }, [fetchCloudData, isSyncing, isInitialLoading]);

  useEffect(() => {
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
    }
    if (isInternalChange.current) return;
    if (isInitialLoading) return;

    const now = Date.now();
    localStorage.setItem('tmss_draft_config', JSON.stringify(config));
    localStorage.setItem('tmss_draft_main_meter', JSON.stringify(mainMeter));
    localStorage.setItem('tmss_draft_meters', JSON.stringify(meters));

    if (spreadsheetService.isReady()) {
        const timer = setTimeout(async () => {
            setIsSyncing(true);
            try {
                await spreadsheetService.saveDraft({
                    updatedAt: now,
                    config,
                    mainMeter,
                    meters
                });
                lastCloudSyncTimestamp.current = now;
            } catch (e) {
                console.error("Auto-save push failed");
            } finally {
                setIsSyncing(false);
            }
        }, 2000); 
        return () => clearTimeout(timer);
    }
  }, [config, mainMeter, meters, isInitialLoading]);

  const handleViewChange = (view: AppView) => {
      setCurrentView(view);
      if (view !== 'report' && view !== 'input') {
        setViewedBill(null);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      localStorage.setItem('tmss_tariff_config', JSON.stringify(newConfig));
      if (spreadsheetService.isReady()) {
         setIsSyncing(true);
         try {
            await spreadsheetService.saveTariff(newConfig);
         } finally {
            setIsSyncing(false);
         }
      }
  };

  const handleTenantsUpdate = async (newTenants: Tenant[]) => {
      setTenants(newTenants);
      localStorage.setItem('tmss_tenants', JSON.stringify(newTenants));
      if (spreadsheetService.isReady()) {
         setIsSyncing(true);
         try {
            await spreadsheetService.saveTenants(newTenants);
         } finally {
            setIsSyncing(false);
         }
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
    localStorage.setItem('tmss_bill_history', JSON.stringify(updatedHistory));
    
    if (spreadsheetService.isReady()) {
       setIsSyncing(true);
       try {
         await spreadsheetService.saveBill(newRecord);
       } finally {
         setIsSyncing(false);
       }
    }
  };

  const loadFromHistory = (record: SavedBill) => {
    if (window.confirm(t('confirm_load').replace('{month}', record.config.month))) {
      const cleanConfig: BillConfig = {
        month: record.config.month,
        dateGenerated: record.config.dateGenerated,
        totalBillPayable: record.config.totalBillPayable,
        bkashFee: record.config.bkashFee,
        includeLateFee: record.config.includeLateFee || false,
        includeBkashFee: record.config.includeBkashFee || false
      };
      setConfig(cleanConfig);
      setMainMeter(record.mainMeter);
      setMeters(record.meters);
      setCurrentView('home');
      setViewedBill(null);
    }
  };

  const handleViewHistory = (record: SavedBill) => {
    setViewedBill(record);
    setCurrentView('report');
  };

  const deleteFromHistory = async (id: string) => {
    if (window.confirm(t('confirm_delete'))) {
      const updatedHistory = history.filter(h => h.id !== id);
      setHistory(updatedHistory);
      localStorage.setItem('tmss_bill_history', JSON.stringify(updatedHistory));
    }
  };

  const onCloudConnected = () => {
    setIsMenuOpen(false);
    fetchCloudData(); 
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
    if (isInitialLoading) return <SkeletonLoader />;

    switch(currentView) {
      case 'home':
        return <Dashboard config={config} result={calculationResult} mainMeter={mainMeter} />;
      case 'input':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <BillConfiguration 
                config={activeConfig} 
                onChange={handleConfigChange} 
                tariffConfig={tariffConfig} 
                onSaveHistory={saveToHistory}
                readOnly={!!viewedBill}
            />
            <MeterReadings 
                mainMeter={activeMainMeter} 
                onMainMeterUpdate={setMainMeter} 
                readings={activeMeters} 
                onUpdate={setMeters} 
                tenants={tenants} 
                onManageTenants={() => handleViewChange('tenants')}
                maxUnits={maxUserUnits}
                calculatedRate={calculationResult.calculatedRate}
                tariffConfig={tariffConfig}
                readOnly={!!viewedBill}
            />
          </div>
        );
      case 'estimator':
        return <BillEstimator tariffConfig={tariffConfig} />;
      case 'report':
        return (
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
        );
      case 'history':
        return (
          <BillHistory 
              history={history} 
              onLoad={loadFromHistory} 
              onDelete={deleteFromHistory} 
              onViewReport={handleViewHistory}
          />
        );
      case 'stats':
        return (
          <div className="space-y-4">
             <button onClick={() => handleViewChange('home')} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors px-2">
                <ArrowLeft className="w-4 h-4" /> {t('back')}
             </button>
             <ConsumptionStats calculations={calculationResult.userCalculations} totalUnits={calculationResult.totalUnits} />
          </div>
        );
      case 'trends':
        return (
          <div className="space-y-4">
             <button onClick={() => handleViewChange('home')} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors px-2">
                <ArrowLeft className="w-4 h-4" /> {t('back')}
             </button>
             <TrendsDashboard history={history} />
          </div>
        );
      case 'tenants':
        return (
          <div className="space-y-4">
             <button onClick={() => handleViewChange('home')} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors px-2">
                <ArrowLeft className="w-4 h-4" /> {t('back')}
             </button>
             <TenantManager tenants={tenants} onUpdateTenants={handleTenantsUpdate} />
          </div>
        );
      case 'tariff':
        return (
          <div className="space-y-4">
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

  const isCloudReady = spreadsheetService.isReady();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-safe">
      {/* Immersive Edge-to-Edge Header - Using pt-safe to bleed color into status bar area */}
      <header className="bg-emerald-700 dark:bg-slate-900 sticky top-0 z-30 no-print pt-safe border-b border-emerald-800 dark:border-slate-800 shadow-md">
        {/* mt-1 on mobile adds a small additional buffer so text/icons sit clearly below system clock/icons */}
        <div className="px-4 h-16 sm:h-20 flex items-center justify-between mt-1 sm:mt-0">
          <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2.5 rounded-2xl">
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-base sm:text-lg font-black text-white leading-none truncate pr-2">{t('app_title')}</h1>
                <div className="flex items-center gap-1.5 mt-1">
                  {isCloudReady ? (
                      <div className="flex items-center gap-1 text-[9px] font-black text-emerald-100 uppercase tracking-widest">
                          <FileSpreadsheet className="w-2.5 h-2.5" />
                          Sheets Cloud
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
            <button 
              onClick={() => fetchCloudData()} 
              disabled={isSyncing || !isCloudReady}
              className={`p-3 text-white/70 hover:bg-white/10 rounded-2xl transition-colors ${!isCloudReady ? 'opacity-30 cursor-not-allowed' : ''}`}
              title="Sync with Cloud"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>

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
                      <Users className="w-5 h-5 text-emerald-500" /> {t('tenants')}
                    </button>
                    <button onClick={() => { handleViewChange('tariff'); setIsMenuOpen(false); }} className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors">
                      <Settings className="w-5 h-5 text-slate-500" /> {t('settings')}
                    </button>
                    <button onClick={() => { setActiveModal('cloud'); setIsMenuOpen(false); }} className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors">
                      <Cloud className="w-5 h-5 text-indigo-500" /> {t('cloud_setup')}
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
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 print:p-0 pb-32">
        {renderView()}
      </main>

      <MobileNav currentView={currentView as any} onChangeView={handleViewChange} />

      {currentView === 'home' && (
        <button 
          onClick={() => handleViewChange('input')}
          className="fixed bottom-28 right-6 w-14 h-14 bg-emerald-600 text-white rounded-2xl shadow-2xl flex items-center justify-center z-40 transition-all hover:scale-105 active:scale-90 mb-safe"
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