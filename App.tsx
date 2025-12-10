
import React, { useState, useMemo, useEffect } from 'react';
import { BillConfig, MeterReading, BillCalculationResult, UserCalculation, SavedBill } from './types';
import { INITIAL_CONFIG, INITIAL_METERS, INITIAL_MAIN_METER } from './constants';
import BillConfiguration from './components/BillConfiguration';
import MeterReadings from './components/MeterReadings';
import ConsumptionStats from './components/ConsumptionStats';
import CalculationSummary from './components/CalculationSummary';
import BillHistory from './components/BillHistory';
import BillEstimator from './components/BillEstimator';
import { Lightbulb, Database, Download } from 'lucide-react';
import { LanguageProvider, useLanguage } from './i18n';

// Inner App component to use the hook
const AppContent: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const [config, setConfig] = useState<BillConfig>(INITIAL_CONFIG);
  const [mainMeter, setMainMeter] = useState<MeterReading>(INITIAL_MAIN_METER);
  const [meters, setMeters] = useState<MeterReading[]>(INITIAL_METERS);
  const [history, setHistory] = useState<SavedBill[]>([]);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('tmss_bill_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

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

  const handleConfigChange = (key: keyof BillConfig, value: string | number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // History Actions
  const saveToHistory = () => {
    const newRecord: SavedBill = {
      id: Date.now().toString(),
      savedAt: new Date().toISOString(),
      config: { ...config },
      mainMeter: { ...mainMeter },
      meters: [...meters]
    };
    
    const updatedHistory = [newRecord, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('tmss_bill_history', JSON.stringify(updatedHistory));
    alert(t('saved_success'));
  };

  const loadFromHistory = (record: SavedBill) => {
    if (window.confirm(t('confirm_load').replace('{month}', record.config.month))) {
      // Create a clean config object from the saved record, omitting old properties if present
      const cleanConfig: BillConfig = {
        month: record.config.month,
        dateGenerated: record.config.dateGenerated,
        totalBillPayable: record.config.totalBillPayable,
        bkashFee: record.config.bkashFee,
        lateFee: record.config.lateFee || 0
      };
      setConfig(cleanConfig);
      setMainMeter(record.mainMeter);
      setMeters(record.meters);
    }
  };

  const deleteFromHistory = (id: string) => {
    if (window.confirm(t('confirm_delete'))) {
      const updatedHistory = history.filter(h => h.id !== id);
      setHistory(updatedHistory);
      localStorage.setItem('tmss_bill_history', JSON.stringify(updatedHistory));
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-'); // Expecting yyyy-mm-dd
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${parseInt(day)}/${parseInt(month)}/${year.slice(-2)}`;
  };

  // The Core Logic
  const calculationResult: BillCalculationResult = useMemo(() => {
    const VAT_RATE = 0.05;
    const DEMAND_CHARGE = 84;
    const METER_RENT = 10;

    // 0. Calculate Total VAT
    // Formula: VAT Amount = Total Bill * VAT Rate / (1 + VAT Rate)
    // This assumes the Total Bill includes the VAT.
    const vatTotal = (config.totalBillPayable * VAT_RATE) / (1 + VAT_RATE);

    // 1. Calculate Fixed VAT
    // Formula: (Demand Charge + Meter Rent) * 5%
    const vatFixed = (DEMAND_CHARGE + METER_RENT) * VAT_RATE;

    // 2. Calculate VAT Distributed
    // Formula: ((Total Bill / 1.05) - (Demand + Rent)) * 0.05
    // This isolates the variable (energy) base of the bill and calculates 5% VAT on it.
    const vatDistributed = Math.max(0, ((config.totalBillPayable / (1 + VAT_RATE)) - (DEMAND_CHARGE + METER_RENT)) * VAT_RATE);

    // 3. Calculate Total Units
    let totalUnits = 0;
    const userUnits = meters.map(m => {
      const u = Math.max(0, m.current - m.previous);
      totalUnits += u;
      return { id: m.id, units: u };
    });

    // 4. Rate Calculation
    // Formula: (Total Bill - Demand - Rent - VAT Fixed) / Total Units
    // This "variableCostPool" essentially contains the Energy Cost + VAT on Energy Cost.
    // By distributing this pool by units, we are distributing the Energy Cost and its associated VAT.
    const variableCostPool = config.totalBillPayable - DEMAND_CHARGE - METER_RENT - vatFixed;
    const calculatedRate = totalUnits > 0 ? variableCostPool / totalUnits : 0;

    // 5. Fixed Cost Per User
    // Formula: (Demand Charge + Meter Rent + VAT Fixed + bKash Fee + Late Fee) / N_users
    const numUsers = meters.length;
    const lateFee = config.lateFee || 0;
    const totalFixedPool = DEMAND_CHARGE + METER_RENT + vatFixed + config.bkashFee + lateFee;
    const fixedCostPerUser = numUsers > 0 ? totalFixedPool / numUsers : 0;

    // 6. Final Split
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

    return {
      vatFixed,
      vatDistributed,
      vatTotal,
      calculatedRate,
      totalUnits,
      userCalculations,
      totalCollection
    };
  }, [config, meters]);

  return (
    <div className="min-h-screen bg-slate-50 pb-12 print:bg-white print:pb-0">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-auto sm:h-16 py-3 sm:py-0 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg shrink-0">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('app_title')}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {installPrompt && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-full shadow-sm hover:bg-slate-800 transition-all animate-pulse"
              >
                <Download className="w-3 h-3" /> {t('install_app')}
              </button>
            )}
            
            {/* Language Toggle */}
            <div className="flex items-center bg-slate-100 rounded-full p-0.5 border border-slate-200">
               <button 
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${language === 'en' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                  EN
               </button>
               <button 
                  onClick={() => setLanguage('bn')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${language === 'bn' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                  BN
               </button>
            </div>

            <div className="text-sm text-slate-500 font-medium bg-slate-100 sm:bg-transparent px-3 py-1 rounded-full sm:p-0">
              {config.month} • {formatDate(config.dateGenerated)}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 print:p-0 print:space-y-0 print:max-w-none">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
          
          {/* Left Column: Data Input (Hidden on Print) */}
          <div className="lg:col-span-5 space-y-6 no-print">
            <div className="flex items-center gap-2 text-slate-800 pb-2 border-b border-slate-200">
              <Database className="w-5 h-5 text-slate-500" />
              <h2 className="text-lg font-bold">{t('data_input_part')}</h2>
            </div>
            
            <BillConfiguration config={config} onChange={handleConfigChange} />
            
            <MeterReadings 
              mainMeter={mainMeter}
              onMainMeterUpdate={setMainMeter}
              readings={meters} 
              onUpdate={setMeters} 
            />

            <ConsumptionStats 
              calculations={calculationResult.userCalculations}
              totalUnits={calculationResult.totalUnits}
            />

            <BillEstimator />

            <BillHistory 
              history={history}
              onLoad={loadFromHistory}
              onDelete={deleteFromHistory}
            />
            
            {/* Logic Explainer */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
              <h4 className="font-semibold mb-2">{t('how_calc')}</h4>
              <ul className="list-disc list-inside space-y-1 opacity-80 text-xs">
                 <li><strong>{t('vat_fixed')}:</strong> (Demand + Rent) × 5%</li>
                 <li><strong>{t('vat_distributed')}:</strong> Calculated Total VAT - VAT Fixed</li>
                 <li><strong>Rate/Unit:</strong> (Total Bill - Demand - Rent - VAT Fixed) ÷ Total Units</li>
                 <li><strong>Fixed Cost (User):</strong> (Demand + Rent + VAT Fixed + bKash + Late Fee) ÷ Users</li>
                 <li><strong>Payable:</strong> (Units × Rate) + Fixed Cost</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Results (Expanded on Print) */}
          <div className="lg:col-span-7 print:w-full">
             <div className="sticky top-24 print:static">
                <CalculationSummary 
                  result={calculationResult} 
                  config={config} 
                  mainMeter={mainMeter}
                  meters={meters}
                  onSaveHistory={saveToHistory}
                />
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
