import React, { useState } from 'react';
import { X, ExternalLink, Download, User, Phone, MapPin, Building2, FileText, Users, Eye, Calendar } from 'lucide-react';
import { BidSolicitation, BidHolder } from '../../../types';
import { FilePreviewModal } from './FilePreviewModal';
import { Modal } from '../../../components/ui/Modal';

interface BidDetailModalProps {
    bid: (BidSolicitation & { holders: BidHolder[] }) | null;
    onClose: () => void;
}

export const BidDetailModal = ({ bid, onClose }: BidDetailModalProps) => {
    const [previewFile, setPreviewFile] = useState<{ filename: string; url: string } | null>(null);

    if (!bid) return null;

    const handleFileClick = (e: React.MouseEvent, file: any) => {
        e.preventDefault();
        const fileUrl = `/data/commbuys/${bid.bid_number}/${file.local_path}`;
        setPreviewFile({ filename: file.filename, url: fileUrl });
    };

    return (
        <Modal
            isOpen={!!bid}
            onClose={onClose}
            title="Bid Details"
            fullScreen
            maxWidth="full"
            noPadding
        >
            <div className="h-full flex flex-col bg-slate-50/50 overflow-hidden">
                <div className="flex-1 flex flex-col p-8 min-h-0">
                    <div className="flex-1 flex flex-col gap-6 min-h-0">
                        {/* Header Banner */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start gap-6 shrink-0">
                            <div className="space-y-3 flex-1">
                                <div className="inline-flex items-center px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                                    {bid.bid_number}
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                                    {bid.header.description}
                                </h2>
                                <div className="flex flex-wrap gap-6 text-xs text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>Opening: <b>{bid.header.opening_date}</b></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-3.5 h-3.5" />
                                        <span>Org: <b>{bid.header.organization}</b></span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto">
                                <a
                                    href={bid.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                                >
                                    View on COMMBUYS
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        </div>

                        {/* Middle Section: Line Items & Contact */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
                            {/* Line Items */}
                            <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="px-5 py-3 border-b border-slate-50 bg-slate-50/50">
                                    <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">Line Items</h3>
                                </div>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {bid.items.map((item) => (
                                        <div key={item.item_number} className="p-3 border border-slate-50 rounded-xl bg-slate-50/30">
                                            <div className="flex items-start gap-3">
                                                <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0">
                                                    #{item.item_number}
                                                </span>
                                                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2" title={item.description}>{item.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Contact Card */}
                            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
                                <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider border-b border-slate-50 pb-2">
                                    Procurement Contact
                                </h3>
                                <div className="grid grid-cols-1 gap-3">
                                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-blue-50/50 border border-blue-100/50">
                                        <div className="bg-white p-1.5 rounded-lg shadow-sm">
                                            <User className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <div className="text-[9px] uppercase font-bold text-blue-500 tracking-tight">Purchaser</div>
                                            <div className="text-xs font-bold text-slate-900">{bid.contact_info.name || bid.header.purchaser}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/50 border border-slate-100">
                                        <div className="bg-white p-1.5 rounded-lg shadow-sm">
                                            <Phone className="w-4 h-4 text-slate-600" />
                                        </div>
                                        <div>
                                            <div className="text-[9px] uppercase font-bold text-slate-500 tracking-tight">Direct Phone</div>
                                            <div className="text-xs font-medium text-slate-900">{bid.contact_info.phone}</div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Bottom Section: Bid Holders & Documents (Sharing remaining space) */}
                        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                            {/* Bid Holders */}
                            <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-0">
                                <div className="px-5 py-3 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between shrink-0">
                                    <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">Bid Holders</h3>
                                    <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">{bid.holders.length} Registered</span>
                                </div>
                                <div className="flex-1 overflow-auto min-h-0">
                                    <table className="w-full text-[11px] text-left">
                                        <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-5 py-2 font-semibold">Company / Organization</th>
                                                <th className="px-5 py-2 font-semibold">Contact</th>
                                                <th className="px-5 py-2 font-semibold">Location</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {bid.holders.map((holder, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-5 py-3 font-medium text-slate-900">{holder.company_name}</td>
                                                    <td className="px-5 py-3 text-slate-600">{holder.contact_person}</td>
                                                    <td className="px-5 py-3 text-slate-500">
                                                        {holder.address.city}, {holder.address.state}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* Attachments */}
                            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-0">
                                <div className="px-5 py-3 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between shrink-0">
                                    <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">Documents</h3>
                                    <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">{bid.attachments.length}</span>
                                </div>
                                <div className="flex-1 overflow-auto p-4 min-h-0 space-y-2">
                                    {bid.attachments.map((file, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={(e) => handleFileClick(e, file)}
                                            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group text-left"
                                        >
                                            <div className="flex items-center min-w-0">
                                                <div className="bg-slate-50 p-1.5 rounded-lg group-hover:bg-white transition-colors">
                                                    <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
                                                </div>
                                                <span className="text-[11px] text-slate-600 font-medium truncate ml-2.5">{file.filename}</span>
                                            </div>
                                            <Eye className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>

            {previewFile && (
                <FilePreviewModal
                    isOpen={!!previewFile}
                    onClose={() => setPreviewFile(null)}
                    filename={previewFile.filename}
                    fileUrl={previewFile.url}
                />
            )}
        </Modal>
    );
};
