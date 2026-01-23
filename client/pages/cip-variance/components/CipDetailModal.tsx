import React from 'react';
import { 
    AlertCircle, 
    Plus, 
    ArrowRight, 
    DollarSign, 
    Calendar, 
    Building2,
    Tag,
    User,
    Activity,
    ChevronRight,
    ExternalLink,
    Download,
    CreditCard
} from 'lucide-react';
import { formatCurrency, formatCurrencyPrecise, getRiskColor } from '../../../lib/utils';
import { Modal } from '../../../components/ui/Modal';

interface CipDetailModalProps {
    item: any;
    relatedFindings: any[];
    onClose: () => void;
    onCreateFinding: () => void;
    onViewFinding: (finding: any) => void;
}

export const CipDetailModal = ({ 
    item, 
    relatedFindings, 
    onClose, 
    onCreateFinding, 
    onViewFinding 
}: CipDetailModalProps) => {
    if (!item) return null;

    return (
        <Modal 
            isOpen={!!item} 
            onClose={onClose} 
            fullScreen 
            noPadding
            title={`Transaction ${item.id}`}
        >
            <div className="flex h-full bg-slate-50/50">
                {/* Left Sidebar - Summary & Actions */}
                <div className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0">
                    <div className="p-6 space-y-6 overflow-y-auto flex-1">
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Vendor</div>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                                    <User className="w-4 h-4" />
                                </div>
                                <div className="text-sm font-semibold text-slate-900 truncate">{item.vendor}</div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Financials</h4>
                            <div className="space-y-2">
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="text-[10px] font-medium text-slate-500 uppercase">Amount</div>
                                    <div className="text-lg font-bold text-slate-900 font-mono">{formatCurrencyPrecise(item.amount)}</div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="text-[10px] font-medium text-slate-500 uppercase">Date</div>
                                    <div className="text-sm font-bold text-slate-900">{item.date}</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Classification</h4>
                            <div className="space-y-2">
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="text-[10px] font-medium text-slate-500 uppercase">Object Class</div>
                                    <div className="text-xs font-semibold text-slate-800">{item.objectClass}</div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="text-[10px] font-medium text-slate-500 uppercase">Object Code</div>
                                    <div className="text-xs font-semibold text-slate-800">{item.objectCode}</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Related Findings</h4>
                            {relatedFindings.length > 0 ? (
                                <div className="space-y-2">
                                    {relatedFindings.slice(0, 3).map(finding => (
                                        <button
                                            key={finding.id}
                                            onClick={() => onViewFinding(finding)}
                                            className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition-all group"
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getRiskColor(finding.severity)}`}>
                                                    {finding.severity}
                                                </span>
                                                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-orange-400" />
                                            </div>
                                            <p className="text-xs font-medium text-slate-800 line-clamp-2">{finding.title}</p>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-lg border border-dashed border-slate-200">
                                    No active findings for this transaction.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-3">
                        <button
                            onClick={onCreateFinding}
                            className="w-full py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-all flex items-center justify-center shadow-sm"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Flag for Audit
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="bg-white p-8 border-b border-slate-200">
                        <div className="max-w-[2000px] mx-auto">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-3">
                                <span>EOTSS</span>
                                <ChevronRight className="w-3 h-3" />
                                <span>Transactions</span>
                                <ChevronRight className="w-3 h-3" />
                                <span className="text-slate-900">{item.id}</span>
                            </div>
                            
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{item.vendor}</h1>
                                    <div className="flex items-center gap-3 mt-3">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold uppercase tracking-wide border border-blue-100">
                                            <CreditCard className="w-3.5 h-3.5" />
                                            Transaction
                                        </div>
                                        <div className="text-slate-400 text-sm font-medium">
                                            Fiscal Period {item.fiscalPeriod} • {item.date}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => {
                                            const blob = new Blob([JSON.stringify(item, null, 2)], { type: 'application/json' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `transaction-${item.id}.json`;
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                            URL.revokeObjectURL(url);
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                                    >
                                        <Download className="w-4 h-4" />
                                        Export
                                    </button>
                                    <button 
                                        onClick={() => {
                                            // Construct CTHRU URL
                                            // Format: https://cthruspending.mass.gov/#!/year/2026/explore/0-/department/{DEPT}/{ROW_ID}/cabinet_secretariat
                                            // CTHRU uses + instead of %20 for spaces in the department name
                                            const deptName = item.department || 'EXECUTIVE OFFICE OF TECHNOLOGY SERVICES AND SECURITY (ITD)';
                                            const dept = encodeURIComponent(deptName).replace(/%20/g, '+');
                                            const year = '2026';
                                            
                                            let url = `https://cthruspending.mass.gov/#!/year/${year}/explore/0-/department/${dept}/1/cabinet_secretariat`;
                                            
                                            // If we have the socrata internal ID (row ID), we can deep-link directly
                                            // We ensure we don't have a double 'row-' prefix
                                            if (item.socrataId) {
                                                const cleanId = item.socrataId.replace('row-', '');
                                                url = `https://cthruspending.mass.gov/#!/year/${year}/explore/0-/department/${dept}/1-payment-row-${cleanId}/cabinet_secretariat`;
                                            }
                                            
                                            window.open(url, '_blank');
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-900 rounded-lg text-sm font-semibold text-white hover:bg-slate-800 transition-all shadow-sm"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        View in CTHRU
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="max-w-[2000px] mx-auto space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center gap-2 text-slate-400 mb-4">
                                        <Activity className="w-4 h-4" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Appropriation</span>
                                    </div>
                                    <div className="text-base font-bold text-slate-900">{item.appropriationName}</div>
                                    <div className="text-xs text-slate-500 mt-1">Direct Appropriation/Subsidiarized</div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center gap-2 text-slate-400 mb-4">
                                        <Building2 className="w-4 h-4" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Department</span>
                                    </div>
                                    <div className="text-base font-bold text-slate-900">{item.department}</div>
                                    <div className="text-xs text-slate-500 mt-1">{item.cabinetSecretariat}</div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center gap-2 text-slate-400 mb-4">
                                        <Tag className="w-4 h-4" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Funding</span>
                                    </div>
                                    <div className="text-base font-bold text-slate-900">{item.fund || 'General Fund'}</div>
                                    <div className="text-xs text-slate-500 mt-1">Code: {item.fundCode || '0010'}</div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30">
                                    <h3 className="font-bold text-slate-900">Transaction Details</h3>
                                </div>
                                <div className="p-6">
                                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                        <div>
                                            <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Transaction ID</dt>
                                            <dd className="text-sm font-mono font-medium text-slate-900">{item.id}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fiscal Year</dt>
                                            <dd className="text-sm font-medium text-slate-900">2026</dd>
                                        </div>
                                        <div>
                                            <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Object Class</dt>
                                            <dd className="text-sm font-medium text-slate-900">{item.objectClass}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Object Code</dt>
                                            <dd className="text-sm font-medium text-slate-900">{item.objectCode}</dd>
                                        </div>
                                        <div className="md:col-span-2">
                                            <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Vendor Address Zip</dt>
                                            <dd className="text-sm font-medium text-slate-900">{item.zipCode || 'N/A'}</dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
