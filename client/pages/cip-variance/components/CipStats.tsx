import React from 'react';
import { formatCurrency } from '../../../lib/utils';
import { Activity, Target, TrendingUp } from 'lucide-react';

interface CipStatsProps {
    totalPlanned: number;
    totalConsumed: number;
    totalVariance: number;
}

export const CipStats = ({ totalPlanned, totalConsumed, totalVariance }: CipStatsProps) => {
    const consumptionRate = totalPlanned > 0 ? (totalConsumed / totalPlanned) * 100 : 0;
    
    return (
        <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Activity className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">EOTSS Budget Utilization</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                            {Math.round(consumptionRate)}%
                        </h2>
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Spent against budget</span>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="text-right">
                        <div className="flex items-center justify-end gap-2 text-slate-400 mb-1">
                            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">EOTSS Actuals</span>
                        </div>
                        <div className="text-xl font-bold text-slate-900">{formatCurrency(totalConsumed)}</div>
                    </div>
                    <div className="h-10 w-px bg-slate-100 hidden md:block" />
                    <div className="text-right">
                        <div className="flex items-center justify-end gap-2 text-slate-400 mb-1">
                            <Target className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">EOTSS Budget</span>
                        </div>
                        <div className="text-xl font-bold text-slate-900">{formatCurrency(totalPlanned)}</div>
                    </div>
                </div>
            </div>

            <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                {/* Background markers/grid if needed, but keeping it clean as requested */}
                <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-blue-500/20"
                    style={{ width: `${Math.min(consumptionRate, 100)}%` }}
                >
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[shimmer_2s_linear_infinite]" />
                </div>
            </div>
            
            <div className="flex justify-between mt-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">0% Start</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Remaining: {formatCurrency(totalVariance)}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">100% Target</div>
            </div>

            <style>{`
                @keyframes shimmer {
                    from { background-position: 0 0; }
                    to { background-position: 40px 0; }
                }
            `}</style>
        </div>
    );
};
