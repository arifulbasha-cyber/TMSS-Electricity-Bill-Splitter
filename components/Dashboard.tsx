
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
    <div className="space-y-6">
      {/* 1. Total Bill Payable Hero Card */}
      <div className="bg-emerald-600 dark:bg-emerald-700 text-white rounded-[2.5rem] p-8 shadow-2xl shadow-emerald-500/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
          <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4 opacity-80">
                  <div className="bg-white/20 p-2 rounded-xl">
                      <Banknote className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">{t('total_bill_payable')}</span>
              </div>
              <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black font-mono tracking-tighter">৳{formatNumber(config.totalBillPayable)}</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm font-bold text-white/70">
                  <span>{translateMonth(config.month)}</span>
                  <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                  <span>{config.dateGenerated}</span>
              </div>
          </div>
      </div>

      {/* 2. Main Meter & Rate Per Unit Grid */}
      <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-xl border border-slate-800">
              <div className="flex items-center gap-2 mb-3 text-emerald-400">
                  <Zap className="w-4 h-4 fill-current" />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{t('main_meter')}</span>
              </div>
              <div className="text-3xl font-black font-mono tracking-tighter">{formatNumber(mainMeterUnits)}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">kWh Total</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-3 text-emerald-600 dark:text-emerald-400">
                  <Activity className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('calculated_rate')}</span>
              </div>
              <div className="text-3xl font-black font-mono tracking-tighter text-slate-900 dark:text-white">৳{formatNumber(result.calculatedRate.toFixed(2))}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Per kWh</div>
          </div>
      </div>

      {/* 3. Tenant Unit Usage & Bills Individually */}
      <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                  <Users2 className="w-4 h-4 text-emerald-600" />
                  {t('final_split')}
              </h3>
          </div>
          <div className="space-y-3">
              {result.userCalculations.map((user) => (
                  <div key={user.id} className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:border-emerald-200 transition-colors">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-sm">
                              {user.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                              <div className="font-black text-slate-900 dark:text-white">{t(user.name)}</div>
                              <div className="text-xs font-bold text-slate-400">{formatNumber(user.unitsUsed)} kWh used</div>
                          </div>
                      </div>
                      <div className="text-right">
                          <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">৳{formatNumber(Math.round(user.totalPayable))}</div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Payable</div>
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* 4. Footer Summary Stats */}
      <div className="bg-slate-100/50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-200/50 dark:border-slate-800/50">
          <div className="grid grid-cols-2 gap-8">
              <div>
                  <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">{t('total_user_units')}</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">{formatNumber(result.totalUnits)} <span className="text-xs text-slate-400">kWh</span></div>
              </div>
              <div className="text-right">
                  <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">{t('system_loss')}</div>
                  <div className={`text-2xl font-black font-mono ${systemLoss > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {formatNumber(systemLoss.toFixed(1))} <span className="text-xs opacity-60">kWh</span>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
