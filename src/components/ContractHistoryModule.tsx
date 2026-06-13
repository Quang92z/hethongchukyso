import React, { useState } from 'react';
import { History, Download, FileText, CheckCircle2, ChevronDown, ChevronUp, Copy, Calendar, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { SavedContract } from '../types';

export function ContractHistoryModule({ contracts }: { contracts: SavedContract[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (contracts.length === 0) {
    return (
      <div className="p-6 md:p-12 h-full flex flex-col items-center justify-center text-center animate-in fade-in">
         <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4 shadow-inner">
           <History size={40} />
         </div>
         <h2 className="text-xl font-bold text-slate-700 mb-2">Chưa Có Hợp Đồng Nào Được Lưu</h2>
         <p className="text-sm text-slate-500 max-w-sm">
           Các hợp đồng và tài liệu đã ký thành công của bạn sẽ được lưu trữ tự động tại đây để tra cứu và tải xuống.
         </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full flex flex-col gap-6">
      <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3 mb-2">
          <div className="bg-slate-800 p-2 rounded-lg text-white shadow-md">
            <History size={20} />
          </div>
          Lịch Sử Hợp Đồng Đã Ký
        </h2>
        <p className="text-sm text-slate-600">
          Quản lý, tra cứu và tải xuống các chứng từ PDF đã được lưu trữ trong phiên làm việc.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {contracts.map((contract) => {
           const isExpanded = expandedId === contract.id;
           const date = new Date(contract.timestamp);
           const dateString = date.toLocaleDateString('vi-VN');
           const timeString = date.toLocaleTimeString('vi-VN');

           return (
             <div key={contract.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all hover:border-slate-300">
               <div 
                 className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                 onClick={() => setExpandedId(isExpanded ? null : contract.id)}
               >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shadow-sm border border-emerald-100">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{contract.name}</h4>
                      <div className="flex items-center gap-3 mt-1 text-[10px] uppercase font-bold text-slate-500">
                         <span className="flex items-center gap-1"><Calendar size={12} /> {dateString}</span>
                         <span className="flex items-center gap-1"><Clock size={12} /> {timeString}</span>
                         <span className={cn(
                           "px-2 py-0.5 rounded-full text-[9px] border",
                           contract.type === 'Cá nhân' ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"
                         )}>
                           {contract.type}
                         </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-slate-400">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
               </div>

               {isExpanded && (
                 <div className="bg-slate-50 border-t border-slate-200 p-4 md:p-6 animate-in slide-in-from-top-2">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* PDF Download */}
                      <div className="w-full md:w-1/3 flex flex-col gap-3">
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bản Gốc PDF</label>
                         <div className="bg-white p-4 border border-slate-200 rounded-xl flex flex-col items-center justify-center text-center gap-3">
                           <CheckCircle2 size={32} className="text-emerald-500" />
                           <span className="text-xs font-bold text-slate-700">Tài Liệu Toàn Vẹn</span>
                           <button 
                             onClick={() => {
                               const a = document.createElement('a');
                               a.href = contract.fileUrl;
                               a.download = contract.name;
                               a.click();
                             }}
                             className="w-full text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2 transition-colors flex justify-center items-center gap-2 shadow-sm"
                           >
                             <Download size={14} /> Tải PDF
                           </button>
                         </div>
                      </div>

                      {/* Signatures */}
                      <div className="w-full md:w-2/3 flex flex-col gap-3">
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chứng Thực Bằng Khóa RSA (.sig)</label>
                         
                         {contract.signatures.single && (
                           <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
                             <div className="bg-slate-100 p-2 text-[10px] font-bold flex justify-between items-center text-slate-600 border-b border-slate-200">
                               <span>MÃ HÀM BĂM DUY NHẤT</span>
                               <button 
                                 onClick={() => navigator.clipboard.writeText(contract.signatures.single!)}
                                 className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                               >
                                 <Copy size={12}/> Copy
                               </button>
                             </div>
                             <textarea readOnly value={contract.signatures.single} className="w-full h-20 text-[9px] font-mono text-slate-600 p-3 bg-slate-50 resize-none outline-none break-all" />
                           </div>
                         )}

                         {contract.signatures.partyA && (
                           <div className="bg-white border border-indigo-100 rounded-lg overflow-hidden flex flex-col">
                             <div className="bg-indigo-50 p-2 text-[10px] font-bold flex justify-between items-center text-indigo-800 border-b border-indigo-100">
                               <span>BÊN A - MÃ HÀM BĂM DUY NHẤT</span>
                               <button 
                                 onClick={() => navigator.clipboard.writeText(contract.signatures.partyA!)}
                                 className="text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                               >
                                 <Copy size={12}/> Copy
                               </button>
                             </div>
                             <textarea readOnly value={contract.signatures.partyA} className="w-full h-20 text-[9px] font-mono text-indigo-800 p-3 bg-slate-50 resize-none outline-none break-all" />
                           </div>
                         )}

                         {contract.signatures.partyB && (
                           <div className="bg-white border border-emerald-100 rounded-lg overflow-hidden flex flex-col">
                             <div className="bg-emerald-50 p-2 text-[10px] font-bold flex justify-between items-center text-emerald-800 border-b border-emerald-100">
                               <span>BÊN B - MÃ HÀM BĂM DUY NHẤT</span>
                               <button 
                                 onClick={() => navigator.clipboard.writeText(contract.signatures.partyB!)}
                                 className="text-emerald-500 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                               >
                                 <Copy size={12}/> Copy
                               </button>
                             </div>
                             <textarea readOnly value={contract.signatures.partyB} className="w-full h-20 text-[9px] font-mono text-emerald-800 p-3 bg-slate-50 resize-none outline-none break-all" />
                           </div>
                         )}

                      </div>
                    </div>
                 </div>
               )}
             </div>
           );
        })}
      </div>
    </div>
  );
}
