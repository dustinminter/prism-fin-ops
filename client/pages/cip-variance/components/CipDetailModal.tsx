import React from 'react';
import { 
    AlertCircle, 
    Plus, 
    ArrowRight, 
    TrendingDown, 
    DollarSign, 
    Calendar, 
    Building2,
    ArrowUpRight,
    Search,
    Filter,
    Download,
    ExternalLink,
    Activity,
    ChevronRight
} from 'lucide-react';
import { formatCurrency, formatCurrencyPrecise, getRiskColor } from '../../../lib/utils';
import { Modal } from '../../../components/ui/Modal';

interface CipDetailModalProps {
    item: any;
    relatedFindings: any[];
    onClose: () => void;
    onCreateFinding: () => void;
    onViewFinding: (finding: any) => void;
}

export const CipDetailModal = ({ 
    item, 
    relatedFindings, 
    onClose, 
    onCreateFinding, 
    onViewFinding 
}: CipDetailModalProps) => {
    if (!item) return null;

    const consumptionRate = Math.round(((item.consumptionRate ?? (item.planned ? item.consumed / item.planned : 0)) * 100));

    return (
        <Modal 
            isOpen={!!item} 
            onClose={onClose} 
            fullScreen 
            noPadding
            title={item.program}
        >
            <div className="flex h-full bg-slate-50/50">
                {/* Left Sidebar - Summary & Actions */}
                <div className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0">
                    <div className="p-6 space-y-6 overflow-y-auto flex-1">
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Agency</div>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                                    {item.agencyId.slice(0, 2)}
                                </div>
                                <div className="text-sm font-semibold text-slate-900">{item.agencyId}</div>
                            </div>
                        </div>

                        <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-orange-800">Variance Alert</h4>
                                    <p className="text-xs text-orange-700 mt-1 leading-relaxed">
                                        There is a {formatCurrency(item.variance)} gap, representing a {((item.variance / item.planned) * 100).toFixed(1)}% deviation from plan.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Financials</h4>
                            <div className="space-y-2">
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="text-[10px] font-medium text-slate-500 uppercase">Planned</div>
                                    <div className="text-sm font-bold text-slate-900 font-mono">{formatCurrencyPrecise(item.planned)}</div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="text-[10px] font-medium text-slate-500 uppercase">Consumed</div>
                                    <div className="text-sm font-bold text-slate-900 font-mono">{formatCurrencyPrecise(item.consumed)}</div>
                                </div>
                                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                    <div className="text-[10px] font-medium text-emerald-600 uppercase">Consumption Rate</div>
                                    <div className="text-sm font-bold text-emerald-700">{consumptionRate}%</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Related Findings</h4>
                            {relatedFindings.length > 0 ? (
                                <div className="space-y-2">
                                    {relatedFindings.map(finding => (
                                        <button
                                            key={finding.id}
                                            onClick={() => onViewFinding(finding)}
                                            className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition-all group"
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getRiskColor(finding.severity)}`}>
                                                    {finding.severity}
                                                </span>
                                                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-orange-400" />
                                            </div>
                                            <p className="text-xs font-medium text-slate-800 line-clamp-2">{finding.title}</p>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-lg border border-dashed border-slate-200">
                                    No active findings.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-3">
                        <button
                            onClick={onCreateFinding}
                            className="w-full py-2.5 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition-all flex items-center justify-center shadow-sm"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Risk Finding
                        </button>
                    </div>
                </div>

                {/* Main Content - Transaction Explorer */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Hero Header in Main Content */}
                    <div className="bg-white p-8 border-b border-slate-200">
                        <div className="max-w-[2000px] mx-auto">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-3">
                                <span>Capital Investment Plan</span>
                                <ChevronRight className="w-3 h-3" />
                                <span>{item.category}</span>
                                <ChevronRight className="w-3 h-3" />
                                <span className="text-slate-900">{item.program}</span>
                            </div>
                            
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{item.program}</h1>
                                    <p className="text-slate-500 mt-2 max-w-2xl text-sm leading-relaxed">
                                        Detailed transaction history and financial breakdown for {item.program}. 
                                        All data is sourced from CTHRU and updated daily.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
                                        <Download className="w-4 h-4" />
                                        Export CSV
                                    </button>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-900 rounded-lg text-sm font-semibold text-white hover:bg-slate-800 transition-all shadow-sm">
                                        <ExternalLink className="w-4 h-4" />
                                        View on CTHRU
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200/60 mt-8">
                                <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Activity className="w-3.5 h-3.5 text-blue-500" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Program Utilization</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                                {consumptionRate}%
                                            </h2>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consumed</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="flex items-center justify-end gap-1.5 text-slate-400 mb-0.5">
                                                <TrendingDown className="w-3 h-3 text-blue-500" />
                                                <span className="text-[9px] font-bold uppercase tracking-widest">Actual</span>
                                            </div>
                                            <div className="text-base font-bold text-slate-900 font-mono">{formatCurrency(item.consumed)}</div>
                                        </div>
                                        <div className="h-8 w-px bg-slate-200 hidden md:block" />
                                        <div className="text-right">
                                            <div className="flex items-center justify-end gap-1.5 text-slate-400 mb-0.5">
                                                <DollarSign className="w-3 h-3 text-slate-400" />
                                                <span className="text-[9px] font-bold uppercase tracking-widest">Planned</span>
                                            </div>
                                            <div className="text-base font-bold text-slate-900 font-mono">{formatCurrency(item.planned)}</div>
                                        </div>
                                        <div className="h-8 w-px bg-slate-200 hidden md:block" />
                                        <div className="text-right">
                                            <div className="flex items-center justify-end gap-1.5 text-slate-400 mb-0.5">
                                                <Calendar className="w-3 h-3 text-slate-400" />
                                                <span className="text-[9px] font-bold uppercase tracking-widest">Year</span>
                                            </div>
                                            <div className="text-base font-bold text-slate-900">{item.fiscalYear}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative h-3 bg-slate-200/50 rounded-full overflow-hidden shadow-inner">
                                    <div 
                                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-blue-500/20"
                                        style={{ width: `${Math.min(consumptionRate, 100)}%` }}
                                    >
                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[shimmer_2s_linear_infinite]" />
                                    </div>
                                </div>
                                
                                <div className="flex justify-between mt-2.5">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Start</div>
                                    <div className="text-[9px] font-bold text-orange-600 uppercase tracking-widest">
                                        Remaining Variance: {formatCurrency(item.variance)}
                                    </div>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Target</div>
                                </div>
                            </div>

                            <style>{`
                                @keyframes shimmer {
                                    from { background-position: 0 0; }
                                    to { background-position: 40px 0; }
                                }
                            `}</style>
                        </div>
                    </div>

                    {/* Transaction Table Area */}
                    <div className="flex-1 overflow-hidden flex flex-col p-8">
                        <div className="max-w-[2000px] w-full mx-auto flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                                <div className="flex items-center gap-4">
                                    <h3 className="font-bold text-slate-900">Recent Transactions</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Data</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Search transactions..."
                                            className="pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg bg-white w-48 focus:outline-none focus:ring-2 focus:ring-slate-400/10"
                                        />
                                    </div>
                                    <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                                        <Filter className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {item.transactions && item.transactions.length > 0 ? (
                                    <table className="w-full text-left border-collapse table-fixed">
                                        <thead className="sticky top-0 bg-white z-10 border-b border-slate-100">
                                            <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                <th className="px-6 py-3 w-[25%]">Vendor & ID</th>
                                                <th className="px-6 py-3 w-[15%]">Date</th>
                                                <th className="px-6 py-3 w-[40%]">Object Code & Description</th>
                                                <th className="px-6 py-3 text-right w-[15%]">Amount</th>
                                                <th className="px-6 py-3 w-[5%]"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {item.transactions.map((tx: any) => (
                                                <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="px-6 py-4 align-top">
                                                        <div className="font-semibold text-slate-900 text-xs truncate" title={tx.vendor}>{tx.vendor}</div>
                                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.id}</div>
                                                    </td>
                                                    <td className="px-6 py-4 align-top">
                                                        <div className="text-xs text-slate-600 font-medium">{tx.date}</div>
                                                        <div className="text-[10px] text-slate-400 uppercase font-bold mt-1">Period {tx.fiscalPeriod}</div>
                                                    </td>
                                                    <td className="px-6 py-4 align-top">
                                                        <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 uppercase tracking-tight mb-1.5">
                                                            {tx.objectClass}
                                                        </div>
                                                        <div className="text-[11px] font-semibold text-slate-800 leading-tight">
                                                            {tx.objectCode}
                                                        </div>
                                                        {tx.appropriationName && (
                                                            <div className="text-[10px] text-slate-400 mt-1 truncate italic">
                                                                {tx.appropriationName}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right align-top">
                                                        <div className="text-sm font-bold text-slate-900 font-mono">{formatCurrency(tx.amount)}</div>
                                                        <div className="text-[10px] text-slate-400 mt-1 uppercase font-medium">{tx.fundCode || 'GF'}</div>
                                                    </td>
                                                    <td className="px-4 py-4 text-right align-top">
                                                        <button className="p-1 text-slate-300 hover:text-slate-600 transition-colors">
                                                            <ArrowUpRight className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-slate-50/30">
                                        <Building2 className="w-12 h-12 mb-3 opacity-20" />
                                        <p className="text-sm">No transaction data available</p>
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
                                <div className="text-[10px] font-medium text-slate-500">
                                    Total Transactions: <span className="text-slate-900 font-bold">{item.transactions?.length || 0}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button className="px-3 py-1 text-[10px] font-bold text-slate-400 cursor-not-allowed">Previous</button>
                                    <button className="w-6 h-6 rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-900 shadow-sm flex items-center justify-center">1</button>
                                    <button className="px-3 py-1 text-[10px] font-bold text-slate-600 hover:text-slate-900">Next</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
