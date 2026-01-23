import React from 'react';

interface FindingsStatsProps {
    totalCount: number;
    criticalCount: number;
    newCount: number;
}

export const FindingsStats = ({ totalCount, criticalCount, newCount }: FindingsStatsProps) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-shrink-0">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center shadow-sm">
            <div className="p-3 bg-slate-100 rounded-lg mr-4 text-slate-600 font-bold text-lg">{totalCount}</div>
            <div>
                <p className="text-sm text-slate-600 font-medium">Active Findings</p>
                <p className="text-xs text-slate-400">Filtered view</p>
            </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-red-100 flex items-center shadow-sm">
            <div className="p-3 bg-red-50 text-red-600 rounded-lg mr-4 font-bold text-lg">{criticalCount}</div>
            <div>
                <p className="text-sm text-slate-800 font-medium">Critical</p>
                <p className="text-xs text-red-500">Require attention</p>
            </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-100 flex items-center shadow-sm">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg mr-4 font-bold text-lg">{newCount}</div>
            <div>
                <p className="text-sm text-slate-800 font-medium">New / Unread</p>
                <p className="text-xs text-blue-500">Needs triage</p>
            </div>
        </div>
    </div>
);
