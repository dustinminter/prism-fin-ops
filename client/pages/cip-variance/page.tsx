import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { CIP_LINE_ITEMS, RISK_FINDINGS, AGENCIES, ALL_TRANSACTIONS } from '../../data';
import { FileText, Calendar, Target } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatCurrencyPrecise } from '../../lib/utils';
import { CipStats } from './components/CipStats';
import { CipTable } from './components/CipTable';
import { CipDetailModal } from './components/CipDetailModal';

export const CipVariance = () => {
    const { filters, setFilters, addRiskFinding } = useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeObjectCode, setActiveObjectCode] = useState('ALL');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });

    const eotssTransactions = (ALL_TRANSACTIONS as any[]).filter(t => 
        t.cabinetSecretariat === 'EXECUTIVE OFFICE OF TECHNOLOGY SERVICES AND SECURITY'
    );

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const transactionId = params.get('transactionId');
        if (transactionId) {
            const tx = eotssTransactions.find(t => t.id === transactionId);
            if (tx) {
                setSelectedItem(tx);
                // Clear the param after opening so it doesn't reopen on every refresh/navigation
                navigate('/cip', { replace: true });
            }
        }
    }, [location.search, eotssTransactions, navigate]);

    const OBJECT_CODES = React.useMemo(() => [
        'ALL',
        ...Array.from(new Set(eotssTransactions.map(t => t.objectCode)))
            .sort((a, b) => {
                const countA = eotssTransactions.filter(t => t.objectCode === a).length;
                const countB = eotssTransactions.filter(t => t.objectCode === b).length;
                return countB - countA;
            })
            .slice(0, 10)
    ], [eotssTransactions]);

    const filteredTransactions = eotssTransactions.filter(t => {
        const matchSearch = 
            t.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.appropriationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.objectCode.toLowerCase().includes(searchQuery.toLowerCase());
        const matchObjectCode = activeObjectCode === 'ALL' || t.objectCode === activeObjectCode;
        return matchSearch && matchObjectCode;
    });

    const sortedTransactions = React.useMemo(() => {
        if (!sortConfig) return filteredTransactions;
        return [...filteredTransactions].sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredTransactions, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(prev => {
            if (prev?.key === key) {
                if (prev.direction === 'desc') return { key, direction: 'asc' };
                return null; // Removes sort after cycle: desc -> asc -> null
            }
            return { key, direction: 'desc' }; // Default to desc (largest/latest)
        });
    };

    const eotssAgency = AGENCIES.find(a => a.id === 'EOTSS');
    
    // Total technology portfolio budget across all agencies
    const totalPlanned = AGENCIES.reduce((acc, a) => acc + a.cipPlanned, 0);
    // EOTSS actual spend from transactions
    const totalConsumed = eotssAgency?.consumed || 0;
    const totalVariance = totalPlanned - totalConsumed;

    const relatedFindings = RISK_FINDINGS.filter(r => r.agencyId === 'EOTSS');

    const handleCreateFinding = () => {
        if (!selectedItem) return;
        addRiskFinding({
            id: `RISK-${Date.now()}`,
            title: `Risk detected in transaction to ${selectedItem.vendor}`,
            agencyId: 'EOTSS',
            severity: 'High',
            varianceDelta: 0,
            driver: 'Transaction Audit',
            createdDate: new Date().toISOString().split('T')[0],
            status: 'New',
            owner: 'Unassigned',
            description: `Automated finding created for transaction ${selectedItem.id} to ${selectedItem.vendor} for ${formatCurrencyPrecise(selectedItem.amount)}.`,
            recommendedSteps: ['Audit transaction', 'Verify appropriation']
        });
        setSelectedItem(null);
        navigate('/risks');
    };

    return (
        <div className="p-8 space-y-8 max-w-[2400px] mx-auto bg-slate-50/30 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider border border-blue-100">EOTSS Financials</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Plan vs Actuals</h1>
                    <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
                        <Target className="w-4 h-4 text-slate-400" />
                        Tracking EOTSS investment variance and consumption across all programs.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        FY26 Period 7
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
                    items={sortedTransactions}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    selectedItemId={selectedItem?.id}
                    onSelectItem={setSelectedItem}
                    objectCodes={OBJECT_CODES}
                    activeObjectCode={activeObjectCode}
                    onObjectCodeChange={setActiveObjectCode}
                    sortConfig={sortConfig}
                    onSort={handleSort}
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
