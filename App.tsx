
import React, { useState, useMemo, useEffect } from 'react';
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
import { Lightbulb, Database, Download, Settings, Users, BarChart3, Calculator, Cloud, LogIn, LogOut, Moon, Sun } from 'lucide-react';
import { LanguageProvider, useLanguage } from './i18n';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { firebaseService } from './services/firebase';
import { User } from 'firebase/auth';

// Inner App component to use the hook
const AppContent: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [currentView, setCurrentView] = useState<'calculator' | 'trends'>('calculator');
  const [config, setConfig] = useState<BillConfig>(INITIAL_CONFIG);
  const [mainMeter, setMainMeter] = useState<MeterReading>(INITIAL_MAIN_METER);
  const [meters, setMeters] = useState<MeterReading[]>(INITIAL_METERS);
  const [history, setHistory] = useState<SavedBill[]>([]);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  
  // Tariff State
  const [tariffConfig, setTariffConfig] = useState<TariffConfig>(DEFAULT_TARIFF_CONFIG);
  const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);

  // Tenant State
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isTenantManagerOpen, setIsTenantManagerOpen] = useState(false);

  // Cloud State
  const [user, setUser] = useState<User | null>(null);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Init Check
  useEffect(() => {
    setIsFirebaseReady(firebaseService.isReady());
    if (firebaseService.isReady() && firebaseService.auth) {
       firebaseService.auth.onAuthStateChanged((u) => {
         setUser(u);
       });
    }
  }, []);

  // Data Loading Strategy
  // If User -> Load from Cloud
  // If No User -> Load from LocalStorage
  useEffect(() => {
    const loadData = async () => {
       setIsSyncing(true);
       if (user && isFirebaseReady) {
          // Cloud Load
          try {
             const cloudHistory = await firebaseService.getBills(user.uid);
             // Sort by date desc
             setHistory(cloudHistory.sort((a,b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));

             const cloudTariff = await firebaseService.getTariff(user.uid);
             if (cloudTariff) setTariffConfig(cloudTariff);

             const cloudTenants = await firebaseService.getTenants(user.uid);
             setTenants(cloudTenants);
          } catch (e) {
             console.error("Cloud load error", e);
          }
       } else {
          // Local Load
          const savedHistory = localStorage.getItem('tmss_bill_history');
          if (savedHistory) {
            try { setHistory(JSON.parse(savedHistory)); } catch (e) { console.error(e); }
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
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleTariffSave = async (newConfig: TariffConfig) => {
      setTariffConfig(newConfig);
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
    
    const updatedHistory = [newRecord, ...history];
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
      const legacyConfig = record.config as any;
      const includeLateFee = legacyConfig.includeLateFee !== undefined 
          ? legacyConfig.includeLateFee 
          : (legacyConfig.lateFee && legacyConfig.lateFee > 0);

      const cleanConfig: BillConfig = {
        month: record.config.month,
        dateGenerated: record.config.dateGenerated,
        totalBillPayable: record.config.totalBillPayable,
        bkashFee: record.config.bkashFee,
        includeLateFee: includeLateFee
      };
      setConfig(cleanConfig);
      setMainMeter(record.mainMeter);
      setMeters(record.meters);
      setCurrentView('calculator');
    }
  };

  const deleteFromHistory = async (id: string) => {
    if (window.confirm(t('confirm_delete'))) {
      const updatedHistory = history.filter(h => h.id !== id);
      setHistory(updatedHistory);
      
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
      setIsCloudModalOpen(true);
      return;
    }
    try {
      await firebaseService.login();
    } catch (e) {
      console.error(e);
      alert("Login failed");
    }
  };

  const handleLogout = async () => {
    await firebaseService.logout();
    setHistory([]); // Clear view
    // It will auto-reload local data via useEffect
  };

  const onCloudConnected = () => {
    setIsFirebaseReady(true);
    if (firebaseService.auth) {
      firebaseService.auth.onAuthStateChanged(setUser);
    }
  };

  // Core Logic
  const calculationResult: BillCalculationResult = useMemo(() => {
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
  }, [config, meters, tariffConfig]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12 print:bg-white print:pb-0 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 no-print transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-auto sm:h-16 py-3 sm:py-0 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg shrink-0">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{t('app_title')}</h1>
            
            {/* Sync Indicator */}
            {user ? (
               <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full text-[10px] font-bold border border-green-100 dark:border-green-800">
                  <Cloud className="w-3 h-3" /> {t('cloud_mode')}
               </div>
            ) : (
               <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-full text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                  <Database className="w-3 h-3" /> {t('local_mode')}
               </div>
            )}
            {isSyncing && <span className="text-xs text-slate-400 animate-pulse">{t('syncing')}</span>}
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            {installPrompt && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-semibold rounded-full shadow-sm hover:bg-slate-800 dark:hover:bg-slate-600 transition-all animate-pulse"
              >
                <Download className="w-3 h-3" /> {t('install_app')}
              </button>
            )}

            {/* View Toggles */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700">
                <button 
                  onClick={() => setCurrentView('calculator')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${currentView === 'calculator' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                   <Calculator className="w-3 h-3" /> {t('calculator')}
                </button>
                <button 
                  onClick={() => setCurrentView('trends')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${currentView === 'trends' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                   <BarChart3 className="w-3 h-3" /> {t('trends')}
                </button>
            </div>

            {/* Settings & Tools */}
            <div className="flex items-center gap-1">
              <button onClick={() => setIsTenantManagerOpen(true)} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title={t('tenants')}>
                <Users className="w-5 h-5" />
              </button>
              <button onClick={() => setIsTariffModalOpen(true)} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title={t('settings')}>
                <Settings className="w-5 h-5" />
              </button>
              
              {/* Theme Toggle */}
              <button onClick={toggleTheme} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title={theme === 'dark' ? t('light_mode') : t('dark_mode')}>
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              {/* Cloud/Auth Button */}
              {user ? (
                 <div className="flex items-center gap-1 ml-1 pl-2 border-l border-slate-200 dark:border-slate-700">
                   <img src={user.photoURL || ''} alt="user" className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-600" />
                   <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors" title={t('logout')}>
                     <LogOut className="w-5 h-5" />
                   </button>
                 </div>
              ) : (
                 <div className="flex items-center gap-1 ml-1 pl-2 border-l border-slate-200 dark:border-slate-700">
                   {!isFirebaseReady ? (
                      <button onClick={() => setIsCloudModalOpen(true)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-full transition-colors" title={t('cloud_setup')}>
                         <Cloud className="w-5 h-5" />
                      </button>
                   ) : (
                      <button onClick={handleLogin} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                         <LogIn className="w-3 h-3" /> {t('login')}
                      </button>
                   )}
                 </div>
              )}
            </div>
            
            {/* Language Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-0.5 border border-slate-200 dark:border-slate-700">
               <button onClick={() => setLanguage('en')} className={`px-2 py-1 rounded-full text-xs font-bold transition-all ${language === 'en' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>EN</button>
               <button onClick={() => setLanguage('bn')} className={`px-2 py-1 rounded-full text-xs font-bold transition-all ${language === 'bn' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>BN</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 print:p-0 print:space-y-0 print:max-w-none">
        
        {currentView === 'calculator' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
            {/* Left Column */}
            <div className="lg:col-span-5 space-y-6 no-print">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 pb-2 border-b border-slate-200 dark:border-slate-800">
                <Database className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                <h2 className="text-lg font-bold">{t('data_input_part')}</h2>
              </div>
              <BillConfiguration config={config} onChange={handleConfigChange} onNextMonth={handleNextMonth} />
              <MeterReadings 
                 mainMeter={mainMeter} 
                 onMainMeterUpdate={setMainMeter} 
                 readings={meters} 
                 onUpdate={setMeters} 
                 tenants={tenants} 
                 onManageTenants={() => setIsTenantManagerOpen(true)}
              />
              <ConsumptionStats calculations={calculationResult.userCalculations} totalUnits={calculationResult.totalUnits} />
              <BillEstimator tariffConfig={tariffConfig} />
              <BillHistory history={history} onLoad={loadFromHistory} onDelete={deleteFromHistory} />
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
                <h4 className="font-semibold mb-2">{t('how_calc')}</h4>
                <ul className="list-disc list-inside space-y-1 opacity-80 text-xs">
                   <li><strong>{t('vat_fixed')}:</strong> (Demand + Rent) × {tariffConfig.vatRate * 100}%</li>
                   <li><strong>{t('vat_distributed')}:</strong> (Total Bill ÷ {(1 + tariffConfig.vatRate).toFixed(2)} - Fixed Charges) × {tariffConfig.vatRate * 100}%</li>
                   <li><strong>Rate/Unit:</strong> (Total Bill - Demand - Rent - VAT Fixed) ÷ Total Units</li>
                   <li><strong>Fixed Cost (User):</strong> (Demand + Rent + VAT Fixed + bKash + Late Fee) ÷ Users</li>
                </ul>
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-7 print:w-full">
               <div className="sticky top-24 print:static">
                  <CalculationSummary 
                    result={calculationResult} 
                    config={config} 
                    mainMeter={mainMeter}
                    meters={meters}
                    onSaveHistory={saveToHistory}
                    tariffConfig={tariffConfig}
                  />
               </div>
            </div>
          </div>
        ) : (
          <TrendsDashboard history={history} />
        )}

      </main>

      <TariffModal isOpen={isTariffModalOpen} onClose={() => setIsTariffModalOpen(false)} config={tariffConfig} onSave={handleTariffSave} />
      <TenantManager isOpen={isTenantManagerOpen} onClose={() => setIsTenantManagerOpen(false)} tenants={tenants} onUpdateTenants={handleTenantsUpdate} />
      <CloudSetupModal isOpen={isCloudModalOpen} onClose={() => setIsCloudModalOpen(false)} onConnected={onCloudConnected} />
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
