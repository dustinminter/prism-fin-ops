import React from 'react';
import { Card } from '../../../components/ui/Card';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Activity } from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import { cn } from '../../../lib/utils';

interface MetricCardProps {
    title: string;
    value: string | number;
    change?: string;
    trend?: 'up' | 'down';
    icon: React.ElementType;
    color: string;
}

const MetricCard = ({ title, value, change, trend, icon: Icon, color }: MetricCardProps) => (
    <Card className="hover:shadow-md transition-all border-none">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-slate-500 mb-2">{title}</p>
                <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
                {change && (
                    <div className="flex items-center mt-2">
                        <span className={cn(
                            "text-xs font-semibold flex items-center gap-0.5 px-2 py-0.5 rounded-full",
                            trend === 'up' ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                        )}>
                            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {change}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-2">vs last month</span>
                    </div>
                )}
            </div>
            <div className={cn("p-3 rounded-2xl", color)}>
                <Icon className="w-6 h-6 text-white" />
            </div>
        </div>
    </Card>
);

interface MetricCardsProps {
    totalPlanned: number;
    totalVariance: number;
    atRiskCount: number;
    burnEfficiency: number;
}

export const MetricCards = ({ totalPlanned, totalVariance, atRiskCount, burnEfficiency }: MetricCardsProps) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
                title="Total Planned"
                value={formatCurrency(totalPlanned)}
                change="12%"
                trend="up"
                icon={DollarSign}
                color="bg-indigo-500"
            />
            <MetricCard
                title="Total Variance"
                value={formatCurrency(totalVariance)}
                change="4.5%"
                trend="down"
                icon={AlertCircle}
                color="bg-amber-500"
            />
            <MetricCard
                title="Agencies at Risk"
                value={atRiskCount}
                change="2 new"
                trend="up"
                icon={Activity}
                color="bg-rose-500"
            />
            <MetricCard
                title="Burn Efficiency"
                value={`${burnEfficiency}%`}
                change="0.8%"
                trend="up"
                icon={TrendingUp}
                color="bg-emerald-500"
            />
        </div>
    );
};
