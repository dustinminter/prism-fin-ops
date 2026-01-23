import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Search, ExternalLink, Calendar, User, Building2 } from 'lucide-react';
import { BidSolicitation, BidHolder } from '../../../types';

interface BidsTableProps {
    bids: (BidSolicitation & { holders: BidHolder[] })[];
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedBidNumber: string | null;
    onSelectBid: (bid: any) => void;
}

export const BidsTable = ({
    bids,
    searchQuery,
    onSearchChange,
    selectedBidNumber,
    onSelectBid
}: BidsTableProps) => {
    return (
        <Card noPadding className="h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-slate-800">Recent Bid Solicitations</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search bids..."
                        className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 w-full sm:w-64"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3">Bid Details</th>
                            <th className="px-6 py-3">Organization</th>
                            <th className="px-6 py-3">Opening Date</th>
                            <th className="px-6 py-3 text-right">Holders</th>
                            <th className="px-6 py-3 text-right">Files</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {bids.map((bid) => (
                            <tr
                                key={bid.bid_number}
                                className={`hover:bg-slate-50 cursor-pointer transition-colors ${selectedBidNumber === bid.bid_number ? 'bg-blue-50/50' : ''}`}
                                onClick={() => onSelectBid(bid)}
                            >
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-800">{bid.header.description}</div>
                                    <div className="text-xs text-slate-400 font-normal mt-0.5">{bid.bid_number}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center text-slate-600">
                                        <Building2 className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                        <span className="text-xs">{bid.header.organization}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5 ml-5">{bid.header.department}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center text-slate-600">
                                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                        <span className="text-xs">{bid.header.opening_date.split(' ')[0]}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-xs">
                                    {bid.holders.length}
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-xs">
                                    {bid.attachments.length}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};
