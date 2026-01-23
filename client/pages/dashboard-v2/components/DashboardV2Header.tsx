import React from 'react';
import { Search, User } from 'lucide-react';

export const DashboardV2Header = () => {
    return (
        <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col">
                <p className="text-sm font-medium text-slate-500 mb-1">Spending and Earnings Report</p>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Financial Overview</h1>
            </div>

            <div className="flex items-center gap-6">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search transactions..." 
                        className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 w-64 transition-all outline-none shadow-sm"
                    />
                </div>
                
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 active:scale-95">
                        <span className="text-lg leading-none">+</span>
                        Export Report
                    </button>
                    
                    <div className="h-8 w-px bg-slate-200 mx-1"></div>
                    
                    <div className="flex items-center gap-3 pl-2">
                        <div className="flex flex-col items-end">
                            <p className="text-sm font-semibold text-slate-900 leading-none">Michael Johnson</p>
                            <p className="text-xs text-slate-500 mt-1">johnson@mail.com</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                            <User className="w-6 h-6 text-slate-400" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
