import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CIP_LINE_ITEMS, RISK_FINDINGS, AGENCIES } from '../../data';
import { FileText, Calendar, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CipStats } from './components/CipStats';
import { CipTable } from './components/CipTable';
import { CipDetailModal } from './components/CipDetailModal';
import { Card } from '../../components/ui/Card';

const AGENCY_FILTERS = [
    { id: 'ALL', name: 'All Agencies' },
    ...AGENCIES.map(a => ({ id: a.id, name: a.id }))
];

export const CipVariance = () => {
    const { filters, setFilters, addRiskFinding } = useApp();
    const navigate = useNavigate();
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [activeAgencyId, setActiveAgencyId] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredItems = CIP_LINE_ITEMS.filter(item => {
        const matchAgency = activeAgencyId === 'ALL' || item.agencyId === activeAgencyId;
        const matchSearch = item.program.toLowerCase().includes(searchQuery.toLowerCase());
        return matchAgency && matchSearch;
    });

    const relatedFindings = selectedItem
        ? RISK_FINDINGS.filter(r => r.agencyId === selectedItem.agencyId)
        : [];

    const totalPlanned = filteredItems.reduce((acc, i) => acc + i.planned, 0);
    const totalConsumed = filteredItems.reduce((acc, i) => acc + i.consumed, 0);
    const totalVariance = filteredItems.reduce((acc, i) => acc + i.variance, 0);

    const handleCreateFinding = () => {
        if (!selectedItem) return;
        addRiskFinding({
            id: `RISK-${Date.now()}`,
            title: `Variance detected in ${selectedItem.program}`,
            agencyId: selectedItem.agencyId,
            severity: 'High',
            varianceDelta: selectedItem.variance,
            driver: 'Data Variance',
            createdDate: new Date().toISOString().split('T')[0],
            status: 'New',
            owner: 'Unassigned',
            description: `Automated finding created from CIP view for ${selectedItem.program}.`,
            recommendedSteps: ['Investigate consumption rate']
        });
        setSelectedItem(null);
        navigate('/risks');
    };

    const selectedAgency = AGENCIES.find(a => a.id === filters.selectedAgencyId);

    return (
        <div className="p-8 space-y-8 max-w-[2400px] mx-auto bg-slate-50/30 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider border border-blue-100">Capital Planning</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Plan vs Actuals</h1>
                    <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
                        <Target className="w-4 h-4 text-slate-400" />
                        Tracking investment variance and consumption across state agencies.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        FY26 Period 4
                    </button>
                    <a href="https://budget.digital.mass.gov/capital/fy26/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-sm">
                        <FileText className="w-4 h-4 mr-2" />
                        Capital Plan
                    </a>
                </div>
            </div>

            <CipStats
                totalPlanned={totalPlanned}
                totalConsumed={totalConsumed}
                totalVariance={totalVariance}
            />

          
            <div className="w-full">
                <CipTable
                    items={filteredItems}
                    agencies={AGENCY_FILTERS}
                    activeAgencyId={activeAgencyId}
                    onAgencyChange={setActiveAgencyId}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    selectedItemId={selectedItem?.id}
                    onSelectItem={setSelectedItem}
                />
            </div>

            <CipDetailModal
                item={selectedItem}
                relatedFindings={relatedFindings}
                onClose={() => setSelectedItem(null)}
                onCreateFinding={handleCreateFinding}
                onViewFinding={(finding) => {
                    setFilters({ ...filters, selectedAgencyId: finding.agencyId });
                    navigate('/risks');
                }}
            />
        </div>
    );
};
