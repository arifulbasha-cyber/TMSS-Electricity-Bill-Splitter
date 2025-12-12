
import React, { useRef, useState } from 'react';
import { BillCalculationResult, BillConfig, MeterReading, TariffConfig } from '../types';
import { FileText, Printer, Image as ImageIcon, Save, Loader2, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useLanguage } from '../i18n';

interface CalculationSummaryProps {
  result: BillCalculationResult;
  config: BillConfig;
  mainMeter: MeterReading;
  meters: MeterReading[];
  onSaveHistory: () => void;
  tariffConfig: TariffConfig;
  isHistorical?: boolean;
  onClose?: () => void;
}

const CalculationSummary: React.FC<CalculationSummaryProps> = ({ result, config, mainMeter, meters, onSaveHistory, tariffConfig, isHistorical = false, onClose }) => {
  const { t, formatNumber, translateMonth, formatDateLocalized } = useLanguage();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Use Dynamic Config
  const DEMAND_CHARGE = tariffConfig.demandCharge;
  const METER_RENT = tariffConfig.meterRent;
  const VAT_RATE_PCT = tariffConfig.vatRate * 100;

  const handlePrint = () => {
    window.print();
  };

  const handleSaveImage = async () => {
    if (!reportRef.current) return;
    
    try {
      setIsGeneratingImage(true);
      
      // Clone the element to render it in a "tablet" width container
      const element = reportRef.current;
      const clone = element.cloneNode(true) as HTMLElement;

      // Helper to bump text size classes for the image export
      const bumpTextSize = (el: HTMLElement) => {
        const classMap: Record<string, string> = {
          'text-[10px]': 'text-sm',
          'text-xs': 'text-base',
          'text-sm': 'text-lg',
          'text-base': 'text-xl',
          'text-lg': 'text-2xl',
          'text-xl': 'text-3xl',
          'text-2xl': 'text-4xl',
          'text-3xl': 'text-5xl',
          'sm:text-xs': 'sm:text-base',
          'sm:text-sm': 'sm:text-lg',
          'sm:text-base': 'sm:text-xl',
        };

        const classes = el.className.split(' ');
        const newClasses = classes.map(c => classMap[c] || c);
        el.className = newClasses.join(' ');
      };

      const allElements = clone.querySelectorAll('*');
      allElements.forEach(node => {
        if (node instanceof HTMLElement) bumpTextSize(node);
      });
      bumpTextSize(clone); 

      // Force Light Mode styles on clone for export to match "Paper" look usually desired for images
      
      const scrollables = clone.querySelectorAll('.overflow-x-auto');
      scrollables.forEach(el => {
        (el as HTMLElement).style.overflow = 'visible';
        (el as HTMLElement).style.display = 'block';
      });
      
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '768px';
      // Detect if dark mode is active to set container background
      const isDark = document.documentElement.classList.contains('dark');
      container.style.backgroundColor = isDark ? '#0f172a' : '#ffffff'; // slate-900 or white
      
      // If dark mode, ensure the clone has 'dark' class context if it relies on it
      if (isDark) clone.classList.add('dark');

      container.appendChild(clone);
      document.body.appendChild(container);

      await new Promise(resolve => setTimeout(resolve, 150));
      
      const canvas = await html2canvas(clone, {
        scale: 3, 
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        logging: false,
        useCORS: true,
        width: 768,
        windowWidth: 768 
      });
      
      document.body.removeChild(container);
      
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `TMSS-Bill-${config.month}-${config.dateGenerated}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to generate image", error);
      alert("Failed to save image. Please try again.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const mainMeterUnits = Math.max(0, mainMeter.current - mainMeter.previous);

  return (
    <div className="bg-white dark:bg-slate-900 shadow-xl rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 print:shadow-none print:border-none print:m-0 print:p-0 w-full transition-colors duration-200">
       {/* Actions Bar (No Print) */}
       <div className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 justify-between items-center no-print">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 text-sm sm:text-base">
             <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> {t('bill_report')} {isHistorical && <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-0.5 rounded-full ml-2">Viewing History</span>}
          </h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onClose && isHistorical && (
               <button 
                  onClick={onClose}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-2 rounded-lg transition-colors shadow-sm"
               >
                  <X className="w-4 h-4" /> <span className="sm:hidden lg:inline">{t('cancel')}</span>
               </button>
            )}
            
            {!isHistorical && (
              <button 
                onClick={onSaveHistory}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 rounded-lg transition-colors shadow-sm"
                title={t('save_history')}
              >
                 <Save className="w-4 h-4" /> <span className="sm:hidden lg:inline">{t('save_history')}</span>
              </button>
            )}

            <button 
              onClick={handleSaveImage} 
              disabled={isGeneratingImage}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              title={`${t('save_image')} (Tablet View)`}
            >
               {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />} 
               <span className="sm:hidden lg:inline">{t('save_image')}</span>
            </button>
            <button 
              onClick={handlePrint} 
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
               <Printer className="w-4 h-4" /> <span className="sm:hidden lg:inline">{t('print')}</span>
            </button>
          </div>
       </div>

       {/* Printable Content */}
       <div ref={reportRef} className="p-4 sm:p-8 space-y-6 sm:space-y-8 print:p-0 print:space-y-6 bg-white dark:bg-slate-900 min-h-[500px] print:min-h-0 transition-colors duration-200">
          
          {/* 1. Header */}
          <div className="text-center border-b-2 border-slate-800 dark:border-slate-100 pb-4 sm:pb-6 print:pb-4">
             <h1 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-2 sm:mb-4 print:text-2xl print:mb-2">{t('tmss_house_bill')}</h1>
             <div className="flex justify-between max-w-2xl mx-auto text-sm font-medium text-slate-600 dark:text-slate-300 pt-2 px-1 sm:px-4">
                <div className="flex flex-col items-start">
                   <span className="text-[10px] sm:text-xs uppercase text-slate-400 dark:text-slate-500 font-bold tracking-wider">{t('bill_month')}</span>
                   <span className="text-slate-900 dark:text-white text-base sm:text-lg print:text-base">{translateMonth(config.month)}</span>
                </div>
                 <div className="flex flex-col items-end">
                   <span className="text-[10px] sm:text-xs uppercase text-slate-400 dark:text-slate-500 font-bold tracking-wider">{t('date_generated')}</span>
                   <span className="text-slate-900 dark:text-white text-base sm:text-lg print:text-base">{formatDateLocalized(config.dateGenerated)}</span>
                </div>
             </div>
          </div>

          {/* 2. Costs Configuration (Two Column Grid) */}
          <div>
             <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase border-b border-slate-200 dark:border-slate-700 pb-2 mb-2 tracking-tight flex items-center gap-2">
                {t('costs_configuration')}
             </h3>
             <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-slate-900 dark:text-slate-200">
                 <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 dark:text-slate-400">{t('total_bill_payable')}</span>
                    <span className="font-bold">{formatNumber(config.totalBillPayable)}</span>
                 </div>
                 <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 dark:text-slate-400">{t('calculated_rate')}</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 print:text-slate-900">{formatNumber(result.calculatedRate.toFixed(2))}</span>
                 </div>
                 <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 dark:text-slate-400">{t('demand_charge')}</span>
                    <span className="font-medium">{formatNumber(DEMAND_CHARGE)}</span>
                 </div>
                 <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 dark:text-slate-400">{t('meter_rent')}</span>
                    <span className="font-medium">{formatNumber(METER_RENT)}</span>
                 </div>
                 <div className="flex justify-between items-baseline">
                    <div className="flex items-baseline gap-2">
                        <span className="text-slate-600 dark:text-slate-400">{t('vat_total')}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-600 italic font-normal print:text-[9px] hidden sm:inline">{t('vat_desc_1').replace('5%', `${formatNumber(VAT_RATE_PCT)}%`)}</span>
                    </div>
                    <span className="font-medium">{formatNumber(Math.round(result.vatTotal))}</span>
                 </div>
                 <div className="flex justify-between items-baseline">
                    <div className="flex items-baseline gap-2">
                        <span className="text-slate-600 dark:text-slate-400">{t('vat_distributed')}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-600 italic font-normal print:text-[9px] hidden sm:inline">{t('vat_desc_2').replace('5%', `${formatNumber(VAT_RATE_PCT)}%`)}</span>
                    </div>
                    <span className="font-medium">{formatNumber(result.vatDistributed.toFixed(2))}</span>
                 </div>
                 <div className="flex justify-between items-baseline">
                    <div className="flex items-baseline gap-2">
                        <span className="text-slate-600 dark:text-slate-400">{t('vat_fixed')}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-600 italic font-normal print:text-[9px] hidden sm:inline">{t('vat_desc_3').replace('5%', `${formatNumber(VAT_RATE_PCT)}%`)}</span>
                    </div>
                    <span className="font-medium">{formatNumber(result.vatFixed.toFixed(2))}</span>
                 </div>
                 <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 dark:text-slate-400">{t('bkash_fee')}</span>
                    <span className="font-medium">{config.bkashFee ? formatNumber(config.bkashFee) : '-'}</span>
                 </div>
                 <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 dark:text-slate-400">{t('late_fee')}</span>
                    <span className="font-medium">{result.lateFee > 0 ? formatNumber(Math.round(result.lateFee)) : '-'}</span>
                 </div>
             </div>
          </div>

          {/* 3. Meter Readings */}
          <div>
             <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase border-b border-slate-200 dark:border-slate-700 pb-2 mb-4 tracking-tight flex items-center gap-2">
                {t('meter_readings')}
             </h3>
             <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 print:border-slate-300">
               <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800 print:bg-slate-100 text-[10px] sm:text-sm">
                     <tr className="text-slate-500 dark:text-slate-400 uppercase">
                        <th className="pl-2 pr-1 py-2 sm:px-4 sm:py-3 font-semibold text-left">{t('name')}</th>
                        <th className="hidden sm:table-cell px-4 py-3 font-semibold text-center">{t('meter_no')}</th>
                        <th className="px-1 py-2 sm:px-4 sm:py-3 font-semibold text-right">{t('previous')}</th>
                        <th className="px-1 py-2 sm:px-4 sm:py-3 font-semibold text-right">{t('current')}</th>
                        <th className="px-1 py-2 sm:px-4 sm:py-3 font-semibold text-right">{t('unit')}</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200 text-xs sm:text-sm">
                     {/* Main Meter */}
                     <tr className="bg-slate-50/50 dark:bg-slate-800/30 font-medium">
                        <td className="pl-2 pr-1 py-2 sm:px-4 sm:py-2 text-slate-800 dark:text-slate-200">
                           {t(mainMeter.name)}
                           <div className="sm:hidden text-[10px] text-slate-400 font-normal">#{formatNumber(mainMeter.meterNo)}</div>
                        </td>
                        <td className="hidden sm:table-cell px-4 py-2 text-center text-slate-600 dark:text-slate-400">{formatNumber(mainMeter.meterNo)}</td>
                        <td className="px-1 py-2 sm:px-4 sm:py-2 text-right text-slate-600 dark:text-slate-400">{formatNumber(mainMeter.previous)}</td>
                        <td className="px-1 py-2 sm:px-4 sm:py-2 text-right text-slate-600 dark:text-slate-400">{formatNumber(mainMeter.current)}</td>
                        <td className="px-1 py-2 sm:px-4 sm:py-2 text-right font-bold text-slate-900 dark:text-white">{formatNumber(mainMeterUnits)}</td>
                     </tr>
                     
                     {/* Sub Meters */}
                     {meters.map((m) => {
                        const units = Math.max(0, m.current - m.previous);
                        return (
                           <tr key={m.id}>
                              <td className="pl-2 pr-1 py-2 sm:px-4 sm:py-2 font-medium text-slate-700 dark:text-slate-300">
                                 {t(m.name)}
                                 <div className="sm:hidden text-[10px] text-slate-400 font-normal">#{formatNumber(m.meterNo)}</div>
                              </td>
                              <td className="hidden sm:table-cell px-4 py-2 text-center text-slate-500 dark:text-slate-400">{formatNumber(m.meterNo)}</td>
                              <td className="px-1 py-2 sm:px-4 sm:py-2 text-right text-slate-600 dark:text-slate-400">{formatNumber(m.previous)}</td>
                              <td className="px-1 py-2 sm:px-4 sm:py-2 text-right text-slate-600 dark:text-slate-400">{formatNumber(m.current)}</td>
                              <td className="px-1 py-2 sm:px-4 sm:py-2 text-right font-semibold text-slate-900 dark:text-white">{formatNumber(units)}</td>
                           </tr>
                        );
                     })}
                     <tr className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border-t-2 border-slate-200 dark:border-slate-700 print:bg-slate-50 print:text-slate-900 print:border-slate-300 h-12 leading-none">
                        <td colSpan={3} className="pl-2 pr-1 sm:px-4 text-right uppercase text-[10px] sm:text-xs tracking-wider text-slate-600 dark:text-slate-400 whitespace-nowrap align-middle" style={{ verticalAlign: 'middle' }}>
                            <span className="sm:hidden">{t('total')}</span><span className="hidden sm:inline">{t('total_user_units')}</span>
                        </td>
                        <td colSpan={2} className="px-1 sm:px-4 text-right align-middle py-3" style={{ verticalAlign: 'middle' }}>
                           {formatNumber(result.totalUnits)}
                        </td>
                     </tr>
                  </tbody>
               </table>
             </div>
          </div>

          {/* 4. Individual Bills */}
          <div>
             <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase border-b border-slate-200 dark:border-slate-700 pb-2 mb-4 tracking-tight">{t('final_split')}</h3>
             <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 print:border-slate-300">
               <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800 print:bg-slate-100 text-[10px] sm:text-sm">
                     <tr className="text-slate-500 dark:text-slate-400 uppercase">
                        <th className="pl-2 pr-1 py-2 sm:px-4 sm:py-3 font-semibold text-left">{t('user')}</th>
                        <th className="px-1 py-2 sm:px-4 sm:py-3 font-semibold text-right">{t('units')}</th>
                        <th className="px-1 py-2 sm:px-4 sm:py-3 font-semibold text-right"><span className="sm:hidden">{t('engy')}</span><span className="hidden sm:inline">{t('energy_cost')}</span></th>
                        <th className="px-1 py-2 sm:px-4 sm:py-3 font-semibold text-right"><span className="sm:hidden">{t('fixed')}</span><span className="hidden sm:inline">{t('fixed_cost')}</span></th>
                        <th className="pl-1 pr-2 py-2 sm:px-4 sm:py-3 font-semibold text-right text-indigo-700 dark:text-indigo-400 print:text-black">{t('bill')}</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200 text-xs sm:text-sm">
                     {result.userCalculations.map((user) => (
                        <tr key={user.id}>
                           <td className="pl-2 pr-1 py-2 sm:px-4 sm:py-2 font-medium text-slate-700 dark:text-slate-300">{t(user.name)}</td>
                           <td className="px-1 py-2 sm:px-4 sm:py-2 text-right text-slate-600 dark:text-slate-400">{formatNumber(user.unitsUsed)}</td>
                           <td className="px-1 py-2 sm:px-4 sm:py-2 text-right text-slate-600 dark:text-slate-400">{formatNumber(Math.round(user.energyCost))}</td>
                           <td className="px-1 py-2 sm:px-4 sm:py-2 text-right text-slate-600 dark:text-slate-400">{formatNumber(Math.round(user.fixedCost))}</td>
                           <td className="pl-1 pr-2 py-2 sm:px-4 sm:py-2 text-right font-bold text-indigo-700 dark:text-indigo-400 text-sm sm:text-base print:text-black">{formatNumber(Math.round(user.totalPayable))}</td>
                        </tr>
                     ))}
                     <tr className="bg-slate-900 dark:bg-black font-bold text-white border-t-2 border-slate-800 dark:border-slate-700 print:bg-slate-50 print:text-slate-900 print:border-slate-300 h-10 sm:h-12 leading-none">
                        <td colSpan={4} className="pl-2 pr-1 sm:px-4 text-right uppercase text-[10px] sm:text-xs tracking-wider text-slate-300 dark:text-slate-500 whitespace-nowrap align-middle" style={{ verticalAlign: 'middle' }}>
                            <span className="sm:hidden">{t('total')}</span><span className="hidden sm:inline">{t('total_collection')}</span>
                        </td>
                        <td className="pl-1 pr-2 sm:px-4 text-right text-emerald-400 print:text-slate-900 align-middle py-2 sm:py-3" style={{ verticalAlign: 'middle' }}>{formatNumber(Math.round(result.totalCollection))}</td>
                     </tr>
                  </tbody>
               </table>
             </div>
          </div>
       </div>
    </div>
  );
};

export default CalculationSummary;
