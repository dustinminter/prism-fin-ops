import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { FindingsStats } from './components/FindingsStats';
import { FindingsTable } from './components/FindingsTable';
import { FindingDetails } from './components/FindingDetails';

export const RiskQueue = () => {
    const { riskQueue, filters, setFilters } = useApp();
    const navigate = useNavigate();
    const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'evidence'>('overview');

    // Filter queue based on global agency filter if selected
    const filteredQueue = filters.selectedAgencyId === 'ALL'
        ? riskQueue
        : riskQueue.filter(r => r.agencyId === filters.selectedAgencyId);

    // Auto-select first item
    useEffect(() => {
        if ((!selectedFindingId || !filteredQueue.find(r => r.id === selectedFindingId)) && filteredQueue.length > 0) {
            setSelectedFindingId(filteredQueue[0].id);
        } else if (filteredQueue.length === 0) {
            setSelectedFindingId(null);
        }
    }, [filteredQueue, selectedFindingId]);

    const activeFinding = riskQueue.find(r => r.id === selectedFindingId);
    const criticalCount = filteredQueue.filter(r => r.severity === 'Critical').length;
    const newCount = filteredQueue.filter(r => r.status === 'New').length;

    const navigateToCip = () => {
        if (activeFinding) {
            setFilters({ ...filters, selectedAgencyId: activeFinding.agencyId });
            navigate('/cip');
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-[2400px] mx-auto h-[calc(100vh-64px)] flex flex-col">
            <div className="flex justify-between items-center flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Findings Viewer</h1>
                    <p className="text-slate-500 text-sm mt-1">Intelligence and triage for financial risks.</p>
                </div>
            </div>

            <FindingsStats
                totalCount={filteredQueue.length}
                criticalCount={criticalCount}
                newCount={newCount}
            />

            <div className="flex gap-6 flex-1 min-h-0">
                <FindingsTable
                    findings={filteredQueue}
                    selectedId={selectedFindingId}
                    onSelect={setSelectedFindingId}
                />

                <FindingDetails
                    activeFinding={activeFinding}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onViewInPlan={navigateToCip}
                />
            </div>
        </div>
    );
};
