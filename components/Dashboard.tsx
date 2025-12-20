import React from 'react';
import { BillCalculationResult, BillConfig, MeterReading } from '../types';
import { useLanguage } from '../i18n';
import { Zap, Banknote, Users2, Activity } from 'lucide-react';

interface DashboardProps {
  config: BillConfig;
  result: BillCalculationResult;
  mainMeter: MeterReading;
}

const Dashboard: React.FC<DashboardProps> = ({ config, result, mainMeter }) => {
  const { t, formatNumber, translateMonth } = useLanguage();
  const mainMeterUnits = Math.max(0, mainMeter.current - mainMeter.previous);
  const systemLoss = mainMeterUnits - result.totalUnits;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Obsidian Hero Card */}
      <div className="glass-card rounded-[3rem] p-8 shadow-2xl shadow-emerald-500/10 relative overflow-hidden group border border-white/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-[80px] -ml-16 -mb-16"></div>
          
          <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-6">
                  <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400/80">{t('total_bill_payable')}</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/30 to-transparent"></div>
              </div>
              
              <div className="flex flex-col">
                  <span className="text-7xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">
                    ৳{formatNumber(config.totalBillPayable)}
                  </span>
                  <div className="flex items-center gap-3 mt-6">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{translateMonth(config.month)}</span>
                    <div className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{config.dateGenerated}</span>
                  </div>
              </div>
          </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-5">
          <div className="glass-card rounded-[2.5rem] p-6 active:scale-95 transition-all">
              <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                  <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-slate-400">{t('main_meter')}</span>
              </div>
              <div className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">{formatNumber(mainMeterUnits)}</div>
              <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-2">KWH AGGREGATE</div>
          </div>
          
          <div className="glass-card rounded-[2.5rem] p-6 active:scale-95 transition-all">
              <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-slate-400">{t('calculated_rate')}</span>
              </div>
              <div className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">৳{formatNumber(result.calculatedRate.toFixed(2))}</div>
              <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-2">PER UNIT BASE</div>
          </div>
      </div>

      {/* Individual Bills - Luxury List */}
      <div className="space-y-5">
          <div className="flex items-center gap-3 px-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-slate-400">{t('final_split')}</span>
              <div className="h-[0.5px] flex-1 bg-black/5 dark:bg-white/10"></div>
          </div>
          
          <div className="space-y-4">
              {result.userCalculations.map((user) => (
                  <div key={user.id} className="glass-card rounded-[2rem] p-5 flex items-center justify-between group active:scale-[0.98] transition-all">
                      <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 dark:from-emerald-500/20 dark:to-indigo-500/20 flex items-center justify-center border border-white/10">
                              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{user.name.substring(0, 2).toUpperCase()}</span>
                          </div>
                          <div>
                              <div className="text-base font-semibold text-slate-900 dark:text-white leading-none mb-2">{t(user.name)}</div>
                              <div className="text-[10px] font-medium uppercase tracking-widest text-slate-400">{formatNumber(user.unitsUsed)} UNITS</div>
                          </div>
                      </div>
                      <div className="text-right">
                          <div className="text-2xl font-black tracking-tighter text-emerald-600 dark:text-emerald-400 leading-none mb-1">৳{formatNumber(Math.round(user.totalPayable))}</div>
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">PAYABLE</span>
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* Secondary Summary Glass */}
      <div className="glass-card p-8 rounded-[2.5rem] border-emerald-500/10">
          <div className="grid grid-cols-2 gap-10">
              <div>
                  <div className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.25em] mb-3">{t('total_user_units')}</div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{formatNumber(result.totalUnits)} <span className="text-[10px] tracking-normal font-medium text-slate-400 ml-1">KWH</span></div>
              </div>
              <div className="text-right">
                  <div className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.25em] mb-3">{t('system_loss')}</div>
                  <div className={`text-3xl font-black tracking-tighter ${systemLoss > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {formatNumber(systemLoss.toFixed(1))} <span className="text-[10px] tracking-normal font-medium text-slate-400 ml-1">KWH</span>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;