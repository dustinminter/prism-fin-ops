import React, { useState } from 'react';
import { BID_SOLICITATIONS } from '../../data';
import { BidsTable } from './components/BidsTable';
import { BidDetailModal } from './components/BidDetailDrawer';
import { FileText, Users, Clock, ArrowUpRight } from 'lucide-react';

export const BidSolicitations = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBid, setSelectedBid] = useState<any | null>(null);

    const filteredBids = BID_SOLICITATIONS.filter(bid => 
        bid.bid_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bid.header.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bid.header.organization.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalBids = BID_SOLICITATIONS.length;
    const totalHolders = BID_SOLICITATIONS.reduce((acc, curr) => acc + curr.holders.length, 0);
    const totalFiles = BID_SOLICITATIONS.reduce((acc, curr) => acc + curr.attachments.length, 0);

    return (
        <div className="max-w-[2400px] mx-auto px-6 py-6 h-[calc(100vh-64px)] flex flex-col space-y-6">
            {/* Header */}
            <div className="flex flex-col space-y-2 shrink-0">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Bid Solicitations</h1>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                        <Clock className="w-3.5 h-3.5" />
                        Last Scraped: {new Date(BID_SOLICITATIONS[0]?.scraped_at).toLocaleDateString()}
                    </div>
                </div>
                <p className="text-sm text-slate-500">
                    Active procurements and bid solicitations tracked via COMMBUYS for technology-related services.
                </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{totalBids}</div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Bids</div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{totalHolders}</div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Bid Holders</div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                        <ArrowUpRight className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{totalFiles}</div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Related Documents</div>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="flex-1 min-h-0">
                <BidsTable 
                    bids={filteredBids}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    selectedBidNumber={selectedBid?.bid_number || null}
                    onSelectBid={setSelectedBid}
                />
            </div>

            {/* Detail Modal */}
            <BidDetailModal 
                bid={selectedBid}
                onClose={() => setSelectedBid(null)}
            />
        </div>
    );
};
