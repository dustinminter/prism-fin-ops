import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Clock } from 'lucide-react';
import { formatCurrency, getRiskColor } from '../../../lib/utils';

interface RiskFinding {
    id: string;
    severity: string;
    title: string;
    createdDate: string;
    agencyId: string;
    varianceDelta: number;
}

interface FindingsTableProps {
    findings: RiskFinding[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}

export const FindingsTable = ({ findings, selectedId, onSelect }: FindingsTableProps) => (
    <Card noPadding className="flex-1 overflow-hidden flex flex-col border-slate-200">
        <div className="overflow-y-auto flex-1">
            {findings.length > 0 ? (
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-3 border-b border-slate-200 w-[100px]">Severity</th>
                            <th className="px-6 py-3 border-b border-slate-200">Finding Title</th>
                            <th className="px-6 py-3 border-b border-slate-200">Agency</th>
                            <th className="px-6 py-3 border-b border-slate-200 text-right">Variance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {findings.map((risk) => (
                            <tr
                                key={risk.id}
                                className={`group cursor-pointer transition-colors ${selectedId === risk.id ? 'bg-orange-50' : 'hover:bg-slate-50'}`}
                                onClick={() => onSelect(risk.id)}
                            >
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getRiskColor(risk.severity)}`}>
                                        {risk.severity}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`font-medium ${selectedId === risk.id ? 'text-orange-900' : 'text-slate-800'}`}>{risk.title}</div>
                                    <div className="text-xs text-slate-400 mt-0.5 flex items-center">
                                        <Clock className="w-3 h-3 mr-1" /> {risk.createdDate}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600 text-xs">{risk.agencyId}</td>
                            <td className="px-6 py-4 text-slate-600 text-right font-mono text-xs">{formatCurrency(risk.varianceDelta)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                    <p>No findings match the current filters.</p>
                </div>
            )}
        </div>
    </Card>
);
