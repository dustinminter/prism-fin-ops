import React from 'react';
import { useApp } from '../../context/AppContext';
import { AGENCIES, MONTHLY_TRENDS } from '../../data';
import { DashboardV2Header } from './components/DashboardV2Header';
import { MetricCards } from './components/MetricCards';
import { SpendingChart } from './components/SpendingChart';
import { RiskDistribution } from './components/RiskDistribution';
import { RecentTransactions } from './components/RecentTransactions';

export const DashboardV2 = () => {
    const { filters } = useApp();
    
    // Data processing logic
    const filteredAgencies = filters.selectedAgencyId === 'ALL'
        ? AGENCIES
        : AGENCIES.filter(a => a.id === filters.selectedAgencyId);

    const totalPlanned = filteredAgencies.reduce((acc, curr) => acc + curr.cipPlanned, 0);
    const totalVariance = filteredAgencies.reduce((acc, curr) => acc + curr.variance, 0);
    const atRiskCount = filteredAgencies.filter(a => ['High', 'Critical'].includes(a.riskLevel)).length;
    
    const totalPlannedBurn = MONTHLY_TRENDS.reduce((acc, curr) => acc + curr.plannedBurn, 0);
    const totalActualBurn = MONTHLY_TRENDS.reduce((acc, curr) => acc + curr.actualBurn, 0);
    const burnEfficiency = totalPlannedBurn > 0 ? Math.round((totalActualBurn / totalPlannedBurn) * 100) : 0;

    return (
        <div className="bg-[#F8FAFC] p-8">
            <div className="max-w-[2400px] mx-auto">
                <DashboardV2Header />
                
                <MetricCards 
                    totalPlanned={totalPlanned}
                    totalVariance={totalVariance}
                    atRiskCount={atRiskCount}
                    burnEfficiency={burnEfficiency}
                />
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    <div className="lg:col-span-2">
                        <SpendingChart />
                    </div>
                    <div className="lg:col-span-1">
                        <RiskDistribution agencies={filteredAgencies} />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 gap-8">
                    <div className="w-full">
                        <RecentTransactions agencyId={filters.selectedAgencyId} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardV2;
