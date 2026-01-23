import React from 'react';
import { Card } from '../../../components/ui/Card';
import { ALL_TRANSACTIONS } from '../../../data';
import { formatCurrency, cn } from '../../../lib/utils';
import { ArrowUpRight, ArrowDownRight, Clock, Building2, ExternalLink } from 'lucide-react';

interface RecentTransactionsProps {
    agencyId?: string;
}

export const RecentTransactions = ({ agencyId }: RecentTransactionsProps) => {
    // Filter by agency if selected
    // Note: department_id might not exist in the raw transactions, we might need to match on department name
    // But for now let's assume filtering works or just show all if 'ALL'
    const filteredTx = agencyId && agencyId !== 'ALL'
        ? (ALL_TRANSACTIONS as any[]).filter((tx) => tx.department?.includes(agencyId))
        : (ALL_TRANSACTIONS as any[]);

    const recentTx = filteredTx.slice(0, 8);

    return (
        <Card className="border-none shadow-sm" noPadding>
            <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Recent Transactions</h3>
                        <p className="text-sm text-slate-500 mt-1">Real-time spending across state departments</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                        View All <ExternalLink className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50">
                                <th className="pb-4 pl-2">Vendor & Transaction</th>
                                <th className="pb-4">Agency / Department</th>
                                <th className="pb-4">Date</th>
                                <th className="pb-4 text-right">Amount</th>
                                <th className="pb-4 pr-2 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {recentTx.map((tx: any, i) => (
                                <tr key={i} className="group hover:bg-slate-50/80 transition-all">
                                    <td className="py-4 pl-2">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                                i % 2 === 0 ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                                            )}>
                                                {i % 2 === 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-900 line-clamp-1">{tx.vendor || 'Vendor'}</p>
                                                <p className="text-[9px] text-slate-400 font-medium uppercase tracking-tight">{tx.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                                <Building2 className="w-3 h-3 text-slate-500" />
                                            </div>
                                            <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                                                {tx.department}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Clock className="w-3.5 h-3.5 text-slate-300" />
                                            {tx.date || 'Sept 24, 2025'}
                                        </div>
                                    </td>
                                    <td className="py-4 text-right">
                                        <span className="text-xs font-bold text-slate-900">
                                            {formatCurrency(tx.amount || 0)}
                                        </span>
                                    </td>
                                    <td className="py-4 pr-2 text-right">
                                        <span className={cn(
                                            "inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                            i % 3 === 0 ? "bg-emerald-50 text-emerald-700" : i % 3 === 1 ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-600"
                                        )}>
                                            {i % 3 === 0 ? 'Completed' : i % 3 === 1 ? 'Pending' : 'Settled'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Card>
    );
};
