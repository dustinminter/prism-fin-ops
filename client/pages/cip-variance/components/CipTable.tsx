import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Search, Filter, Activity, Calendar, User, DollarSign, Tag, RotateCcw, ArrowUp, ArrowDown, ChevronRight } from 'lucide-react';
import { formatCurrencyPrecise } from '../../../lib/utils';

interface CipTableProps {
    items: any[];
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedItemId: string | null;
    onSelectItem: (item: any) => void;
    objectCodes: string[];
    activeObjectCode: string;
    onObjectCodeChange: (code: string) => void;
    sortConfig: { key: string, direction: 'asc' | 'desc' } | null;
    onSort: (key: string) => void;
}

export const CipTable = ({
    items,
    searchQuery,
    onSearchChange,
    selectedItemId,
    onSelectItem,
    objectCodes,
    activeObjectCode,
    onObjectCodeChange,
    sortConfig,
    onSort
}: CipTableProps) => {
    const renderSortIcon = (key: string) => {
        if (sortConfig?.key !== key) return null;
        return sortConfig.direction === 'asc' 
            ? <ArrowUp className="w-3 h-3 text-blue-600" /> 
            : <ArrowDown className="w-3 h-3 text-blue-600" />;
    };

    return (
        <Card noPadding className="h-full flex flex-col border-none shadow-sm overflow-visible bg-transparent">
            <div className="bg-white rounded-t-2xl border border-slate-200/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 overflow-x-auto scrollbar-hide mr-4">
                    <div className="flex items-center gap-2">
                        {objectCodes.map(code => (
                            <button
                                key={code}
                                onClick={() => onObjectCodeChange(code)}
                                className={`px-4 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${activeObjectCode === code
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                                    }`}
                            >
                                {code === 'ALL' ? 'All Transactions' : code.match(/\((.*?)\)/)?.[1] || code}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400/20 w-full sm:w-48 bg-slate-50/50"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>
                    
                    <button 
                        onClick={() => {
                            onObjectCodeChange('ALL');
                            onSearchChange('');
                            onSort(''); // Clear sort
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors border-dashed"
                        title="Reset Filters"
                    >
                        <RotateCcw className="w-4 h-4 text-slate-400" />
                        <span>Reset</span>
                    </button>
                </div>
            </div>

            <div className="bg-white border-x border-b border-slate-200/60 rounded-b-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50/50 text-slate-400 font-medium uppercase tracking-wider border-b border-slate-200/60">
                            <tr>
                                <th 
                                    className="px-6 py-4 font-semibold w-36 text-[11px] cursor-pointer hover:bg-slate-100/50 transition-colors select-none"
                                    onClick={() => onSort('date')}
                                >
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Date
                                        {renderSortIcon('date')}
                                    </div>
                                </th>
                                <th className="px-6 py-4 font-semibold text-[11px]">
                                    <div className="flex items-center gap-2">
                                        <User className="w-3.5 h-3.5" />
                                        Vendor
                                    </div>
                                </th>
                                <th className="px-6 py-4 font-semibold text-[11px]">
                                    <div className="flex items-center gap-2">
                                        <Tag className="w-3.5 h-3.5" />
                                        Appropriation & Object Code
                                    </div>
                                </th>
                                <th 
                                    className="px-6 py-4 font-semibold text-right w-52 text-[11px] cursor-pointer hover:bg-slate-100/50 transition-colors select-none"
                                    onClick={() => onSort('amount')}
                                >
                                    <div className="flex items-center justify-end gap-2">
                                        <DollarSign className="w-3.5 h-3.5" />
                                        Amount
                                        {renderSortIcon('amount')}
                                    </div>
                                </th>
                                <th className="px-4 py-4 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.slice(0, 100).map((item) => {
                                return (
                                    <tr
                                        key={item.id}
                                        className={`group hover:bg-slate-50/80 cursor-pointer transition-all ${selectedItemId === item.id ? 'bg-slate-50' : ''}`}
                                        onClick={() => onSelectItem(item)}
                                    >
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="text-slate-900 font-semibold text-sm">{item.date}</div>
                                            <div className="text-[11px] text-slate-400 font-mono mt-1 uppercase">FY26 Period {item.fiscalPeriod}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm leading-tight">
                                                {item.vendor}
                                            </div>
                                            <div className="text-[11px] text-slate-400 font-medium mt-1.5 uppercase tracking-widest">
                                                ID: {item.id}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="text-slate-700 font-medium text-sm mb-2.5 leading-relaxed">{item.appropriationName}</div>
                                            <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                                                {item.objectCode}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right whitespace-nowrap">
                                            <div className="text-slate-900 font-black text-lg font-mono">{formatCurrencyPrecise(item.amount)}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Actual Expenditure</div>
                                        </td>
                                        <td className="px-4 py-5 text-right">
                                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                
                <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
                    <div className="text-xs text-slate-500 font-medium italic">
                        Showing <span className="text-slate-900 font-bold">{Math.min(items.length, 100)}</span> of <span className="text-slate-900 font-bold">{items.length.toLocaleString()}</span> total transactions
                    </div>
                    <div className="flex items-center gap-1">
                        <button className="w-9 h-9 rounded-xl text-xs font-bold flex items-center justify-center bg-white border border-slate-200 shadow-sm text-slate-900 hover:bg-slate-50 transition-colors">1</button>
                        <button className="w-9 h-9 rounded-xl text-xs font-bold flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white transition-colors">2</button>
                        <button className="w-9 h-9 rounded-xl text-xs font-bold flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white transition-colors">3</button>
                        <span className="mx-2 text-slate-300 font-bold">...</span>
                        <button className="px-4 h-9 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-white transition-colors">Next</button>
                    </div>
                </div>
            </div>
        </Card>
    );
};
