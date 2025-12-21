
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { BillConfig, MeterReading, BillCalculationResult, UserCalculation, SavedBill, TariffConfig, Tenant } from './types';
import { INITIAL_CONFIG, INITIAL_METERS, INITIAL_MAIN_METER, DEFAULT_TARIFF_CONFIG } from './constants';
import Dashboard from './components/Dashboard';
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
import { Lightbulb, Database, Settings, Users, Cloud, Moon, Sun, Menu, ArrowRight, PieChart, BarChart3, RefreshCw, FileSpreadsheet, UploadCloud, DownloadCloud } from 'lucide-react';
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
    return { vatFixed, vatDistributed, vatTotal, lateFee, calculatedRate, totalUnits, userCalculations, totalCollection };
};

const AppContent: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  type AppView = 'home' | 'estimator' | 'report' | 'history' | 'stats' | 'trends' | 'tenants' | 'tariff';
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [viewedBill, setViewedBill] = useState<SavedBill | null>(null);
  const [activeModal, setActiveModal] = useState<'none' | 'cloud'>('none');
  const [config, setConfig] = useState<BillConfig>(INITIAL_CONFIG);
  const [mainMeter, setMainMeter] = useState<MeterReading>(INITIAL_MAIN_METER);
  const [meters, setMeters] = useState<MeterReading[]>(INITIAL_METERS);
  const [history, setHistory] = useState<SavedBill[]>([]);
  const [tariffConfig, setTariffConfig] = useState<TariffConfig>(DEFAULT_TARIFF_CONFIG);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const lastCloudSyncTimestamp = useRef<number>(0);
  const isFirstRender = useRef(true);
  const isInternalChange = useRef(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    const handleStatusBar = async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: Style.Light });
      } catch (e) {}
    };
    handleStatusBar();
  }, []);

  const fetchCloudData = useCallback(async () => {
    if (!spreadsheetService.isReady()) return;
    setIsInitialLoading(true);
    setIsSyncing(true);
    try {
      const [cloudDraft, cloudHistory, cloudTariff, cloudTenants] = await Promise.all([
        spreadsheetService.getDraft(),
        spreadsheetService.getBills(),
        spreadsheetService.getTariff(),
        spreadsheetService.getTenants()
      ]);
      if (cloudDraft) {
        isInternalChange.current = true; 
        setConfig(cloudDraft.config);
        setMainMeter(cloudDraft.mainMeter);
        setMeters(cloudDraft.meters);
        lastCloudSyncTimestamp.current = cloudDraft.updatedAt;
        localStorage.setItem('tmss_draft_config', JSON.stringify(cloudDraft.config));
        localStorage.setItem('tmss_draft_main_meter', JSON.stringify(cloudDraft.mainMeter));
        localStorage.setItem('tmss_draft_meters', JSON.stringify(cloudDraft.meters));
      }
      if (cloudHistory) { setHistory(sortBills(cloudHistory)); localStorage.setItem('tmss_bill_history', JSON.stringify(cloudHistory)); }
      if (cloudTariff) { setTariffConfig(cloudTariff); localStorage.setItem('tmss_tariff_config', JSON.stringify(cloudTariff)); }
      if (cloudTenants) { setTenants(cloudTenants); localStorage.setItem('tmss_tenants', JSON.stringify(cloudTenants)); }
      
      alert("Local data overwritten with cloud data!");
    } catch (error) { console.error("Cloud fetch error", error); } finally { setIsInitialLoading(false); setIsSyncing(false); setTimeout(() => { isInternalChange.current = false; }, 1000); }
  }, []);

  const pushCloudData = useCallback(async () => {
    if (!spreadsheetService.isReady()) return;
    setIsSyncing(true);
    try {
      const now = Date.now();
      // Overwrite all cloud parts with current local data
      await Promise.all([
        spreadsheetService.saveDraft({ updatedAt: now, config, mainMeter, meters }),
        spreadsheetService.saveTariff(tariffConfig),
        spreadsheetService.saveTenants(tenants),
        spreadsheetService.saveHistory(history)
      ]);
      lastCloudSyncTimestamp.current = now;
      alert("Cloud data overwritten with local data!");
    } catch (error) { alert("Failed to push data."); } finally { setIsSyncing(false); }
  }, [config, mainMeter, meters, tariffConfig, tenants, history]);

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
  }, []);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (isInternalChange.current || isInitialLoading) return;
    localStorage.setItem('tmss_draft_config', JSON.stringify(config));
    localStorage.setItem('tmss_draft_main_meter', JSON.stringify(mainMeter));
    localStorage.setItem('tmss_draft_meters', JSON.stringify(meters));
    if (spreadsheetService.isReady()) {
        const timer = setTimeout(async () => {
            setIsSyncing(true);
            try { await spreadsheetService.saveDraft({ updatedAt: Date.now(), config, mainMeter, meters }); } catch (e) {} finally { setIsSyncing(false); }
        }, 2000); 
        return () => clearTimeout(timer);
    }
  }, [config, mainMeter, meters, isInitialLoading]);

  const handleViewChange = (view: AppView) => {
      setCurrentView(view);
      if (view !== 'report') setViewedBill(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTariffSave = async (newConfig: TariffConfig) => {
      setTariffConfig(newConfig);
      if (config.includeBkashFee) setConfig(prev => ({ ...prev, bkashFee: newConfig.bkashCharge }));
      localStorage.setItem('tmss_tariff_config', JSON.stringify(newConfig));
      if (spreadsheetService.isReady()) { setIsSyncing(true); try { await spreadsheetService.saveTariff(newConfig); } finally { setIsSyncing(false); } }
  };

  const handleTenantsUpdate = async (newTenants: Tenant[]) => {
      setTenants(newTenants);
      localStorage.setItem('tmss_tenants', JSON.stringify(newTenants));
      if (spreadsheetService.isReady()) { setIsSyncing(true); try { await spreadsheetService.saveTenants(newTenants); } finally { setIsSyncing(false); } }
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
    const newRecord: SavedBill = { id: Date.now().toString(), savedAt: new Date().toISOString(), config: { ...config }, mainMeter: { ...mainMeter }, meters: [...meters] };
    const updatedHistory = sortBills([newRecord, ...history]);
    setHistory(updatedHistory);
    localStorage.setItem('tmss_bill_history', JSON.stringify(updatedHistory));
    if (spreadsheetService.isReady()) { setIsSyncing(true); try { await spreadsheetService.saveBill(newRecord); } finally { setIsSyncing(false); } }
  };

  const loadFromHistory = (record: SavedBill) => {
    if (window.confirm(t('confirm_load').replace('{month}', record.config.month))) {
      setConfig({ ...record.config, includeLateFee: record.config.includeLateFee || false, includeBkashFee: record.config.includeBkashFee || false });
      setMainMeter(record.mainMeter);
      setMeters(record.meters);
      setCurrentView('home');
      setViewedBill(null);
    }
  };

  const activeConfig = viewedBill ? viewedBill.config : config;
  const activeMeters = viewedBill ? viewedBill.meters : meters;
  const activeMainMeter = viewedBill ? viewedBill.mainMeter : mainMeter;
  const calculationResult: BillCalculationResult = useMemo(() => calculateBillBreakdown(activeConfig, activeMeters, tariffConfig), [activeConfig, activeMeters, tariffConfig]);

  const renderView = () => {
    if (isInitialLoading) return <SkeletonLoader />;
    switch(currentView) {
      case 'home': return <Dashboard config={config} result={calculationResult} mainMeter={mainMeter} meters={meters} onUpdateMeters={setMeters} onMainMeterUpdate={setMainMeter} onConfigUpdate={setConfig} tenants={tenants} tariffConfig={tariffConfig} onSaveHistory={saveToHistory} />;
      case 'estimator': return <BillEstimator tariffConfig={tariffConfig} />;
      case 'report': return <CalculationSummary result={calculationResult} config={activeConfig} mainMeter={activeMainMeter} meters={activeMeters} onSaveHistory={saveToHistory} tariffConfig={tariffConfig} isHistorical={!!viewedBill} onClose={() => handleViewChange('home')} />;
      case 'history': return <BillHistory history={history} onLoad={loadFromHistory} onDelete={(id) => { if (window.confirm(t('confirm_delete'))) setHistory(history.filter(h => h.id !== id)); }} onViewReport={(record) => { setViewedBill(record); setCurrentView('report'); }} />;
      case 'stats': return <ConsumptionStats calculations={calculationResult.userCalculations} totalUnits={calculationResult.totalUnits} />;
      case 'trends': return <TrendsDashboard history={history} />;
      case 'tenants': return <TenantManager tenants={tenants} onUpdateTenants={handleTenantsUpdate} />;
      case 'tariff': return <TariffSettings config={tariffConfig} onSave={handleTariffSave} />;
      default: return null;
    }
  };

  const isCloudReady = spreadsheetService.isReady();

  return (
    <div className="min-h-screen bg-transparent pb-safe transition-colors duration-500">
      <header className="sticky top-0 z-30 no-print pt-safe border-b border-white/10 bg-emerald-900/80 backdrop-blur-2xl shadow-xl">
        <div className="px-5 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
              <div className="bg-white/10 p-2.5 rounded-2xl border border-white/20 backdrop-blur-md">
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-white leading-none">{t('app_title')}</h1>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {isCloudReady ? (
                      <div className="flex items-center gap-1 text-[8px] font-black text-emerald-100 uppercase tracking-widest">
                          <FileSpreadsheet className="w-2.5 h-2.5" /> Sheets Cloud
                      </div>
                  ) : (
                      <div className="flex items-center gap-1 text-[8px] font-black text-white/40 uppercase tracking-widest">
                          <Database className="w-2.5 h-2.5" /> {t('local')}
                      </div>
                  )}
                  {isSyncing && <RefreshCw className="w-2.5 h-2.5 text-emerald-200 animate-spin" />}
                </div>
              </div>
          </div>
            
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }} 
              className="p-3 text-white/90 hover:bg-white/10 rounded-2xl transition-all active:scale-90"
            >
              <Menu className="w-6 h-6" />
            </button>

            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsMenuOpen(false)}></div>
                <div ref={menuRef} className="absolute right-0 top-full mt-3 w-64 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] py-3 z-50 animate-in fade-in slide-in-from-top-2 overflow-hidden border border-white/20">
                  {isCloudReady && (
                    <div className="px-2 pb-2">
                      <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4 mb-2 pt-1">Cloud Sync</div>
                      <button onClick={() => { pushCloudData(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3 rounded-2xl active:scale-95 transition-all">
                        <UploadCloud className="w-5 h-5" /> Push to Cloud
                      </button>
                      <button onClick={() => { fetchCloudData(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3 rounded-2xl active:scale-95 transition-all">
                        <DownloadCloud className="w-5 h-5" /> Pull from Cloud
                      </button>
                      <div className="mx-4 my-2 border-t border-black/5 dark:border-white/5"></div>
                    </div>
                  )}
                  <button onClick={() => { handleViewChange('stats'); setIsMenuOpen(false); }} className="w-full text-left px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3 transition-colors">
                    <PieChart className="w-5 h-5 text-emerald-500" /> {t('consumption_share')}
                  </button>
                  <button onClick={() => { handleViewChange('trends'); setIsMenuOpen(false); }} className="w-full text-left px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3 transition-colors">
                    <BarChart3 className="w-5 h-5 text-indigo-500" /> {t('trends')}
                  </button>
                  <button onClick={handleNextMonth} className="w-full text-left px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3 transition-colors">
                    <ArrowRight className="w-5 h-5 text-emerald-600" /> {t('next_month')}
                  </button>
                  <div className="mx-4 my-2 border-t border-black/5 dark:border-white/5"></div>
                  <button onClick={() => { handleViewChange('tenants'); setIsMenuOpen(false); }} className="w-full text-left px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3 transition-colors">
                    <Users className="w-5 h-5 text-teal-500" /> {t('tenants')}
                  </button>
                  <button onClick={() => { handleViewChange('tariff'); setIsMenuOpen(false); }} className="w-full text-left px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3 transition-colors">
                    <Settings className="w-5 h-5 text-slate-500" /> {t('settings')}
                  </button>
                  <button onClick={() => { setActiveModal('cloud'); setIsMenuOpen(false); }} className="w-full text-left px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3 transition-colors">
                    <Cloud className="w-5 h-5 text-indigo-500" /> {t('cloud_setup')}
                  </button>
                  <div className="mx-4 my-2 border-t border-black/5 dark:border-white/5"></div>
                  <div className="flex items-center justify-between px-5 py-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('theme')}</span>
                    <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-300 active:scale-90 transition-all">
                      {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-6 print:p-0 pb-32 relative">
        {renderView()}
      </main>

      <MobileNav currentView={currentView as any} onChangeView={handleViewChange} />

      <CloudSetupModal isOpen={activeModal === 'cloud'} onClose={() => setActiveModal('none')} onConnected={() => { setIsMenuOpen(false); fetchCloudData(); }} />
    </div>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  </ThemeProvider>
);

export default App;
