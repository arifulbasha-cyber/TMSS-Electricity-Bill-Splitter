
import React, { useRef, useState } from 'react';
import { BillCalculationResult, BillConfig, MeterReading } from '../types';
import { FileText, Printer, Image as ImageIcon, Save, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';

interface CalculationSummaryProps {
  result: BillCalculationResult;
  config: BillConfig;
  mainMeter: MeterReading;
  meters: MeterReading[];
  onSaveHistory: () => void;
}

const CalculationSummary: React.FC<CalculationSummaryProps> = ({ result, config, mainMeter, meters, onSaveHistory }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

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
      // This makes the text significantly larger and clearer in the saved image
      const bumpTextSize = (el: HTMLElement) => {
        const classMap: Record<string, string> = {
          // Aggressively bump text sizes (2 steps up) for better visibility
          'text-[10px]': 'text-sm',
          'text-xs': 'text-base',
          'text-sm': 'text-lg',
          'text-base': 'text-xl',
          'text-lg': 'text-2xl',
          'text-xl': 'text-3xl',
          'text-2xl': 'text-4xl',
          'text-3xl': 'text-5xl',
          // Handle responsive prefixes
          'sm:text-xs': 'sm:text-base',
          'sm:text-sm': 'sm:text-lg',
          'sm:text-base': 'sm:text-xl',
        };

        const classes = el.className.split(' ');
        const newClasses = classes.map(c => classMap[c] || c);
        el.className = newClasses.join(' ');
      };

      // Apply text size bump to all elements in the clone
      const allElements = clone.querySelectorAll('*');
      allElements.forEach(node => {
        if (node instanceof HTMLElement) bumpTextSize(node);
      });
      bumpTextSize(clone); // Apply to root as well

      // Ensure scrollable areas (tables) are fully visible in the capture
      const scrollables = clone.querySelectorAll('.overflow-x-auto');
      scrollables.forEach(el => {
        (el as HTMLElement).style.overflow = 'visible';
        (el as HTMLElement).style.display = 'block';
      });
      
      // Setup container to simulate tablet view off-screen
      // Width 768px (iPad Mini / Tablet Portrait)
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '768px'; 
      container.style.backgroundColor = '#ffffff';
      
      // Append clone to container and container to body
      container.appendChild(clone);
      document.body.appendChild(container);

      // Wait for rendering to settle
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Generate canvas from the tablet-width clone
      const canvas = await html2canvas(clone, {
        scale: 3, // Ultra High Quality (3x resolution)
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        width: 768,
        windowWidth: 768 // Force tablet media query simulation
      });
      
      // Clean up DOM
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-'); // Expecting yyyy-mm-dd
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${parseInt(day)}/${parseInt(month)}/${year.slice(-2)}`;
  };

  const mainMeterUnits = Math.max(0, mainMeter.current - mainMeter.previous);

  return (
    <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-slate-200 print:shadow-none print:border-none print:m-0 print:p-0 w-full">
       {/* Actions Bar (No Print) */}
       <div className="bg-slate-50/80 backdrop-blur px-4 sm:px-6 py-4 border-b border-slate-200 flex flex-wrap gap-3 justify-between items-center no-print">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2 text-sm sm:text-base">
             <FileText className="w-5 h-5 text-indigo-600" /> Bill Report
          </h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={onSaveHistory}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 px-3 py-2 rounded-lg transition-colors shadow-sm"
              title="Save to History"
            >
               <Save className="w-4 h-4" /> <span className="sm:hidden lg:inline">Save</span>
            </button>
            <button 
              onClick={handleSaveImage} 
              disabled={isGeneratingImage}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 px-3 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              title="Save as Image (Tablet View)"
            >
               {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />} 
               <span className="sm:hidden lg:inline">Image</span>
            </button>
            <button 
              onClick={handlePrint} 
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
               <Printer className="w-4 h-4" /> <span className="sm:hidden lg:inline">Print</span>
            </button>
          </div>
       </div>

       {/* Printable Content */}
       <div ref={reportRef} className="p-4 sm:p-8 space-y-6 sm:space-y-8 print:p-0 print:space-y-6 bg-white min-h-[500px] print:min-h-0">
          
          {/* 1. Header */}
          <div className="text-center border-b-2 border-slate-800 pb-4 sm:pb-6 print:pb-4">
             <h1 className="text-xl sm:text-3xl font-bold text-slate-900 uppercase tracking-widest mb-2 sm:mb-4 print:text-2xl print:mb-2">TMSS House Electricity Bill</h1>
             <div className="flex justify-between max-w-2xl mx-auto text-sm font-medium text-slate-600 pt-2 px-1 sm:px-4">
                <div className="flex flex-col items-start">
                   <span className="text-[10px] sm:text-xs uppercase text-slate-400 font-bold tracking-wider">Bill Month</span>
                   <span className="text-slate-900 text-base sm:text-lg print:text-base">{config.month}</span>
                </div>
                 <div className="flex flex-col items-end">
                   <span className="text-[10px] sm:text-xs uppercase text-slate-400 font-bold tracking-wider">Date Generated</span>
                   <span className="text-slate-900 text-base sm:text-lg print:text-base">{formatDate(config.dateGenerated)}</span>
                </div>
             </div>
          </div>

          {/* 2. Costs Configuration (Two Column Grid) */}
          <div>
             <h3 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-200 pb-2 mb-2 tracking-tight flex items-center gap-2">
                Costs Configuration
             </h3>
             <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                 <div className="flex justify-between items-baseline">
                    <span className="text-slate-600">Total Bill Payable</span>
                    <span className="font-bold text-slate-900">{config.totalBillPayable}</span>
                 </div>
                 <div className="flex justify-between items-baseline">
                    <span className="text-slate-600">Calculated Rate/Unit</span>
                    <span className="font-bold text-indigo-600 print:text-slate-900">{result.calculatedRate.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-baseline">
                    <span className="text-slate-600">Demand Charge</span>
                    <span className="font-medium text-slate-900">{config.demandCharge}</span>
                 </div>
                 <div className="flex justify-between items-baseline">
                    <span className="text-slate-600">Meter Rent</span>
                    <span className="font-medium text-slate-900">{config.meterRent}</span>
                 </div>
                 <div className="flex justify-between items-baseline">
                    <div className="flex items-baseline gap-2">
                        <span className="text-slate-600">VAT (Total)</span>
                        <span className="text-[10px] text-slate-400 italic font-normal print:text-[9px] hidden sm:inline">Unit Uses Bill+Demand+Rent*5%</span>
                    </div>
                    <span className="font-medium text-slate-900">{result.vatTotal.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-baseline">
                    <div className="flex items-baseline gap-2">
                        <span className="text-slate-600">VAT Distributed</span>
                        <span className="text-[10px] text-slate-400 italic font-normal print:text-[9px] hidden sm:inline">Unit Uses Bill*5%</span>
                    </div>
                    <span className="font-medium text-slate-900">{result.vatDistributed.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-baseline">
                    <div className="flex items-baseline gap-2">
                        <span className="text-slate-600">VAT Fixed</span>
                        <span className="text-[10px] text-slate-400 italic font-normal print:text-[9px] hidden sm:inline">Demand+Rent*5%</span>
                    </div>
                    <span className="font-medium text-slate-900">{result.vatFixed.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-baseline">
                    <span className="text-slate-600">bKash Fee</span>
                    <span className="font-medium text-slate-900">{config.bkashFee || '-'}</span>
                 </div>
             </div>
          </div>

          {/* 3. Meter Readings */}
          <div>
             <h3 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-200 pb-2 mb-4 tracking-tight flex items-center gap-2">
                Meter Readings
             </h3>
             <div className="overflow-x-auto rounded-lg border border-slate-200 print:border-slate-300">
               <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 print:bg-slate-100 text-[10px] sm:text-sm">
                     <tr className="text-slate-500 uppercase">
                        <th className="pl-2 pr-1 py-2 sm:px-4 sm:py-3 font-semibold text-left">Name</th>
                        <th className="hidden sm:table-cell px-4 py-3 font-semibold text-center">Meter No</th>
                        <th className="px-1 py-2 sm:px-4 sm:py-3 font-semibold text-right">Prev</th>
                        <th className="px-1 py-2 sm:px-4 sm:py-3 font-semibold text-right">Curr</th>
                        <th className="px-1 py-2 sm:px-4 sm:py-3 font-semibold text-right">Unit</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-slate-200 text-xs sm:text-sm">
                     {/* Main Meter */}
                     <tr className="bg-slate-50/50 font-medium">
                        <td className="pl-2 pr-1 py-2 sm:px-4 sm:py-2 text-slate-800">
                           {mainMeter.name}
                           <div className="sm:hidden text-[10px] text-slate-400 font-normal">#{mainMeter.meterNo}</div>
                        </td>
                        <td className="hidden sm:table-cell px-4 py-2 text-center text-slate-600">{mainMeter.meterNo}</td>
                        <td className="px-1 py-2 sm:px-4 sm:py-2 text-right text-slate-600">{mainMeter.previous}</td>
                        <td className="px-1 py-2 sm:px-4 sm:py-2 text-right text-slate-600">{mainMeter.current}</td>
                        <td className="px-1 py-2 sm:px-4 sm:py-2 text-right font-bold text-slate-900">{mainMeterUnits}</td>
                     </tr>
                     
                     {/* Sub Meters */}
                     {meters.map((m) => {
                        const units = Math.max(0, m.current - m.previous);
                        return (
                           <tr key={m.id}>
                              <td className="pl-2 pr-1 py-2 sm:px-4 sm:py-2 font-medium text-slate-700">
                                 {m.name}
                                 <div className="sm:hidden text-[10px] text-slate-400 font-normal">#{m.meterNo}</div>
                              </td>
                              <td className="hidden sm:table-cell px-4 py-2 text-center text-slate-500">{m.meterNo}</td>
                              <td className="px-1 py-2 sm:px-4 sm:py-2 text-right text-slate-600">{m.previous}</td>
                              <td className="px-1 py-2 sm:px-4 sm:py-2 text-right text-slate-600">{m.current}</td>
                              <td className="px-1 py-2 sm:px-4 sm:py-2 text-right font-semibold text-slate-900">{units}</td>
                           </tr>
                        );
                     })}
                     <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200 print:bg-slate-50 print:text-slate-900 print:border-slate-300 h-12 leading-none">
                        <td colSpan={3} className="pl-2 pr-1 sm:px-4 text-right uppercase text-[10px] sm:text-xs tracking-wider text-slate-600 whitespace-nowrap align-middle" style={{ verticalAlign: 'middle' }}>
                            <span className="sm:hidden">Total</span><span className="hidden sm:inline">Total Units</span>
                        </td>
                        <td colSpan={2} className="px-1 sm:px-4 text-right align-middle py-3" style={{ verticalAlign: 'middle' }}>
                           {result.totalUnits}
                        </td>
                     </tr>
                  </tbody>
               </table>
             </div>
          </div>

          {/* 4. Final Split Calculation */}
          <div>
             <h3 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-200 pb-2 mb-4 tracking-tight">Final Split Calculation</h3>
             <div className="overflow-x-auto rounded-lg border border-slate-200 print:border-slate-300">
               <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 print:bg-slate-100 text-[10px] sm:text-sm">
                     <tr className="text-slate-500 uppercase">
                        <th className="pl-2 pr-1 py-2 sm:px-4 sm:py-3 font-semibold text-left">User</th>
                        <th className="px-1 py-2 sm:px-4 sm:py-3 font-semibold text-right">Units</th>
                        <th className="px-1 py-2 sm:px-4 sm:py-3 font-semibold text-right"><span className="sm:hidden">Engy</span><span className="hidden sm:inline">Energy Cost</span></th>
                        <th className="px-1 py-2 sm:px-4 sm:py-3 font-semibold text-right"><span className="sm:hidden">Fixed</span><span className="hidden sm:inline">Fixed Costs</span></th>
                        <th className="pl-1 pr-2 py-2 sm:px-4 sm:py-3 font-semibold text-right text-indigo-700 print:text-black">Total</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-slate-200 text-xs sm:text-sm">
                     {result.userCalculations.map((user) => (
                        <tr key={user.id}>
                           <td className="pl-2 pr-1 py-2 sm:px-4 sm:py-2 font-medium text-slate-700">{user.name}</td>
                           <td className="px-1 py-2 sm:px-4 sm:py-2 text-right text-slate-600">{user.unitsUsed}</td>
                           <td className="px-1 py-2 sm:px-4 sm:py-2 text-right text-slate-600">{Math.round(user.energyCost)}</td>
                           <td className="px-1 py-2 sm:px-4 sm:py-2 text-right text-slate-600">{Math.round(user.fixedCost)}</td>
                           <td className="pl-1 pr-2 py-2 sm:px-4 sm:py-2 text-right font-bold text-indigo-700 text-sm sm:text-base print:text-black">{Math.round(user.totalPayable)}</td>
                        </tr>
                     ))}
                     <tr className="bg-slate-900 font-bold text-white border-t-2 border-slate-800 print:bg-slate-50 print:text-slate-900 print:border-slate-300 h-10 sm:h-12 leading-none">
                        <td colSpan={4} className="pl-2 pr-1 sm:px-4 text-right uppercase text-[10px] sm:text-xs tracking-wider text-slate-300 whitespace-nowrap align-middle" style={{ verticalAlign: 'middle' }}>
                            <span className="sm:hidden">Total</span><span className="hidden sm:inline">Total Collection</span>
                        </td>
                        <td className="pl-1 pr-2 sm:px-4 text-right text-emerald-400 print:text-slate-900 align-middle py-2 sm:py-3" style={{ verticalAlign: 'middle' }}>{Math.round(result.totalCollection)}</td>
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
