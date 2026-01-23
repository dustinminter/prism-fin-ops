import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Search, Filter, ArrowUpDown, ChevronRight, Activity } from 'lucide-react';
import { formatCurrencyPrecise } from '../../../lib/utils';

interface CipTableProps {
    items: any[];
    agencies: { id: string, name: string }[];
    activeAgencyId: string;
    onAgencyChange: (id: string) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedItemId: string | null;
    onSelectItem: (item: any) => void;
}

export const CipTable = ({
    items,
    agencies,
    activeAgencyId,
    onAgencyChange,
    searchQuery,
    onSearchChange,
    selectedItemId,
    onSelectItem
}: CipTableProps) => (
    <Card noPadding className="h-full flex flex-col border-none shadow-sm overflow-visible bg-transparent">
        <div className="bg-white rounded-t-2xl border border-slate-200/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide max-w-full sm:max-w-[70%]">
                {agencies.map(agency => (
                    <button
                        key={agency.id}
                        onClick={() => onAgencyChange(agency.id)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeAgencyId === agency.id
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                            }`}
                    >
                        {agency.name}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search programs..."
                        className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400/20 w-full sm:w-64 bg-slate-50/50"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
                <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Filters</span>
                </button>
                <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <ArrowUpDown className="w-4 h-4" />
                    <span className="hidden sm:inline">Sort</span>
                </button>
            </div>
        </div>

        <div className="bg-white border-x border-b border-slate-200/60 rounded-b-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-50/50 text-slate-400 font-medium text-[11px] uppercase tracking-wider border-b border-slate-200/60">
                        <tr>
                            <th className="px-6 py-4 font-semibold">
                                <div className="flex items-center gap-2">
                                    Program & Category
                                    <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                </div>
                            </th>
                            <th className="px-6 py-4 font-semibold">Agency</th>
                            <th className="px-6 py-4 font-semibold text-right">Planned</th>
                            <th className="px-6 py-4 font-semibold text-right">Consumed</th>
                            <th className="px-6 py-4 font-semibold text-right">Variance</th>
                            <th className="px-6 py-4 font-semibold text-right">Usage</th>
                            <th className="px-4 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map((item) => {
                            const consumptionRate = Math.round(((item.consumptionRate ?? (item.planned ? item.consumed / item.planned : 0)) * 100));
                            const isHighVariance = item.variance > 10000000;
                            
                            return (
                                <tr
                                    key={item.id}
                                    className={`group hover:bg-slate-50/80 cursor-pointer transition-all ${selectedItemId === item.id ? 'bg-slate-50' : ''}`}
                                    onClick={() => onSelectItem(item)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                item.category === 'IT' ? 'bg-blue-50 text-blue-600' :
                                                item.category === 'Facilities' ? 'bg-purple-50 text-purple-600' :
                                                item.category === 'Infrastructure' ? 'bg-emerald-50 text-emerald-600' :
                                                'bg-slate-50 text-slate-600'
                                            }`}>
                                                <Activity className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                    {item.program}
                                                </div>
                                                <div className="text-[11px] text-slate-400 font-medium mt-0.5 uppercase tracking-wider">
                                                    {item.category} • {item.id}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-tight">
                                            {item.agencyId}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="text-slate-900 font-medium">{formatCurrencyPrecise(item.planned)}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">ESTIMATED</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="text-slate-900 font-medium">{formatCurrencyPrecise(item.consumed)}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">ACTUAL</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className={`font-bold ${isHighVariance ? 'text-red-600' : 'text-slate-900'}`}>
                                            {formatCurrencyPrecise(item.variance)}
                                        </div>
                                        <div className={`text-[10px] font-medium ${isHighVariance ? 'text-red-400' : 'text-slate-400'}`}>
                                            {isHighVariance ? 'CRITICAL GAP' : 'VARIANCE'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end gap-1.5">
                                            <div className="text-xs font-bold text-slate-700">{consumptionRate}%</div>
                                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${
                                                        consumptionRate > 90 ? 'bg-emerald-500' :
                                                        consumptionRate > 50 ? 'bg-blue-500' :
                                                        'bg-amber-500'
                                                    }`}
                                                    style={{ width: `${Math.min(consumptionRate, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
                <div className="text-xs text-slate-500 font-medium">
                    Showing <span className="text-slate-900">{items.length}</span> of <span className="text-slate-900">{items.length}</span> programs
                </div>
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(p => (
                        <button key={p} className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${p === 1 ? 'bg-white border border-slate-200 shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                            {p}
                        </button>
                    ))}
                    <span className="mx-1 text-slate-300">...</span>
                    <button className="px-3 h-8 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900">Next</button>
                </div>
            </div>
        </div>
    </Card>
);
