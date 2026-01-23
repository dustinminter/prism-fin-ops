import React from 'react';
import { Card } from '../../../components/ui/Card';
import { AGENCIES } from '../../../data';
import { cn } from '../../../lib/utils';
import { ArrowUpRight, ShieldAlert, ShieldCheck, Shield } from 'lucide-react';
import { Agency } from '../../../data';

interface RiskWatchlistProps {
    agencies: Agency[];
}

export const RiskWatchlist = ({ agencies }: RiskWatchlistProps) => {
    // Sort agencies by risk level and variance
    const watchList = [...agencies]
        .sort((a, b) => {
            const riskOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
            if (riskOrder[a.riskLevel as keyof typeof riskOrder] !== riskOrder[b.riskLevel as keyof typeof riskOrder]) {
                return riskOrder[a.riskLevel as keyof typeof riskOrder] - riskOrder[b.riskLevel as keyof typeof riskOrder];
            }
            return b.variance - a.variance;
        })
        .slice(0, 5);

    const getRiskIcon = (level: string) => {
        switch (level) {
            case 'Critical': return <ShieldAlert className="w-4 h-4 text-rose-600" />;
            case 'High': return <ShieldAlert className="w-4 h-4 text-amber-600" />;
            case 'Medium': return <Shield className="w-4 h-4 text-blue-600" />;
            default: return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
        }
    };

    const getRiskBadgeClass = (level: string) => {
        switch (level) {
            case 'Critical': return "bg-rose-50 text-rose-700 border-rose-100";
            case 'High': return "bg-amber-50 text-amber-700 border-amber-100";
            case 'Medium': return "bg-blue-50 text-blue-700 border-blue-100";
            default: return "bg-emerald-50 text-emerald-700 border-emerald-100";
        }
    };

    return (
        <Card className="h-full border-none shadow-sm" noPadding>
            <div className="p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Agency Risk Watchlist</h3>
                        <p className="text-sm text-slate-500 mt-1">High-priority accounts requiring action</p>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50">
                                <th className="pb-3 pl-2">Agency</th>
                                <th className="pb-3">Risk Level</th>
                                <th className="pb-3 text-right">Variance</th>
                                <th className="pb-3 pr-2 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {watchList.map((agency) => (
                                <tr key={agency.id} className="group hover:bg-slate-50 transition-colors">
                                    <td className="py-4 pl-2">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900 line-clamp-1">{agency.name}</span>
                                            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">{agency.id}</span>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <div className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border",
                                            getRiskBadgeClass(agency.riskLevel)
                                        )}>
                                            {getRiskIcon(agency.riskLevel)}
                                            {agency.riskLevel}
                                        </div>
                                    </td>
                                    <td className="py-4 text-right">
                                        <span className="text-sm font-bold text-slate-900">
                                            ${(agency.variance / 1000000).toFixed(1)}M
                                        </span>
                                    </td>
                                    <td className="py-4 pr-2 text-right">
                                        <button className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400 hover:text-indigo-600">
                                            <ArrowUpRight className="w-4 h-4" />
                                        </button>
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
