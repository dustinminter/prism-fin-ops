import React from 'react';
import { FileText, User, Tag, Info, ExternalLink } from 'lucide-react';
import { formatCurrency, getRiskColor } from '../../../lib/utils';

interface FindingDetailsProps {
    activeFinding: any;
    activeTab: 'overview' | 'evidence';
    setActiveTab: (tab: 'overview' | 'evidence') => void;
    onViewInPlan: () => void;
}

export const FindingDetails = ({ activeFinding, activeTab, setActiveTab, onViewInPlan }: FindingDetailsProps) => {
    if (!activeFinding) {
        return (
            <div className="w-[450px] flex-shrink-0 bg-slate-50 border border-slate-200 border-dashed rounded-2xl flex flex-col items-center justify-center text-slate-400">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <Info className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-sm font-medium">Select a finding to view details</p>
            </div>
        );
    }

    return (
        <div className="w-[450px] flex-shrink-0 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100">
                <div className="flex justify-between items-start mb-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getRiskColor(activeFinding.severity)}`}>
                        {activeFinding.severity}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{activeFinding.id}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2 leading-snug">{activeFinding.title}</h2>
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{activeFinding.agencyId}</span>
                    <span>•</span>
                    <span>{activeFinding.createdDate}</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Intelligence
                </button>
                <button
                    onClick={() => setActiveTab('evidence')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'evidence' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Evidence
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/3?0">
                {activeTab === 'overview' && (
                    <>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center">
                                <Info className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Summary
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                {activeFinding.description}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white border border-slate-100 rounded-lg">
                                <div className="text-xs text-slate-400 mb-1 flex items-center"><User className="w-3 h-3 mr-1" /> Owner</div>
                                <div className="text-sm font-medium text-slate-800">{activeFinding.owner}</div>
                            </div>
                            <div className="p-3 bg-white border border-slate-100 rounded-lg">
                                <div className="text-xs text-slate-400 mb-1 flex items-center"><Tag className="w-3 h-3 mr-1" /> Driver</div>
                                <div className="text-sm font-medium text-slate-800">{activeFinding.driver}</div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Recommended Actions</h3>
                            <ul className="space-y-2">
                                {activeFinding.recommendedSteps.map((step: string, i: number) => (
                                    <li key={i} className="flex items-start p-3 bg-white border border-slate-100 rounded-lg">
                                        <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">
                                            {i + 1}
                                        </div>
                                        <span className="text-sm text-slate-600">{step}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                )}

                {activeTab === 'evidence' && (
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Financial Impact</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500">Total Variance</span>
                                <span className="text-lg font-bold text-slate-900 font-mono">{formatCurrency(activeFinding.varianceDelta)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500">Agency Exposure</span>
                                <span className="text-sm font-medium text-slate-900 font-mono">High</span>
                            </div>
                            <div className="pt-2">
                                <div className="text-xs text-slate-400 mb-1">Impact Analysis</div>
                                <p className="text-xs text-slate-500 italic">
                                    This finding accounts for a significant variance against the Q3 projection.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 bg-white border-t border-slate-200">
                <div className="flex space-x-3">
                    <button
                        onClick={onViewInPlan}
                        className="flex-1 bg-white border border-slate-200 text-slate-700 rounded-lg py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-center"
                    >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View in Plan vs Actuals
                    </button>
                    <button className="flex-1 bg-slate-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Generate Brief
                    </button>
                </div>
            </div>
        </div>
    );
};
