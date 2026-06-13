import React, { useState, useRef, useEffect } from 'react';
import { FileSignature, Check, Upload, Download, FileText, X, PenTool, Move, Users } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { cn } from '../lib/utils';
import { signFileWebCrypto } from '../lib/rsa';
import { SavedContract } from '../types';

export function ContractSignModule({ defaultPublicKey, defaultPrivateKey, defaultPrivateKeyB, onSaveContract }: { defaultPublicKey: string, defaultPrivateKey: string, defaultPrivateKeyB?: string, onSaveContract?: (contract: SavedContract) => void }) {
  const [privKeyA, setPrivKeyA] = useState(defaultPrivateKey);
  const [privKeyB, setPrivKeyB] = useState(defaultPrivateKeyB || '');
  
  useEffect(() => {
    setPrivKeyA(defaultPrivateKey);
  }, [defaultPrivateKey]);

  useEffect(() => {
    if (defaultPrivateKeyB) {
      setPrivKeyB(defaultPrivateKeyB);
    }
  }, [defaultPrivateKeyB]);
  
  const [pdfFileToSign, setPdfFileToSign] = useState<File | null>(null);
  
  const [signatureOutputA, setSignatureOutputA] = useState('');
  const [signatureOutputB, setSignatureOutputB] = useState('');
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);

  const [errorSign, setErrorSign] = useState('');
  
  const [isSigningA, setIsSigningA] = useState(false);
  const [signatureDataUrlA, setSignatureDataUrlA] = useState<string | null>(null);
  const [signaturePosA, setSignaturePosA] = useState({ x: 0.25, y: 0.85 });
  const [signatureWidthA, setSignatureWidthA] = useState(150);

  const [isSigningB, setIsSigningB] = useState(false);
  const [signatureDataUrlB, setSignatureDataUrlB] = useState<string | null>(null);
  const [signaturePosB, setSignaturePosB] = useState({ x: 0.75, y: 0.85 });
  const [signatureWidthB, setSignatureWidthB] = useState(150);

  const [pdfDimensions, setPdfDimensions] = useState<{width: number, height: number} | null>(null);
  const [draggingTarget, setDraggingTarget] = useState<'A' | 'B' | null>(null);

  const sigCanvasA = useRef<SignatureCanvas>(null);
  const sigCanvasB = useRef<SignatureCanvas>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (pdfFileToSign && previewCanvasRef.current) {
      let isMounted = true;
      const loadPreview = async () => {
        try {
          const fileUrl = URL.createObjectURL(pdfFileToSign);
          const pdf = await pdfjsLib.getDocument({ url: fileUrl }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1 });
          
          if (isMounted) {
            setPdfDimensions({ width: viewport.width, height: viewport.height });
          }

          const scale = 1.0;
          const scaledViewport = page.getViewport({ scale });
          
          const canvas = previewCanvasRef.current;
          if (canvas) {
            const context = canvas.getContext('2d');
            canvas.height = scaledViewport.height;
            canvas.width = scaledViewport.width;
            
            const renderContext = {
              canvasContext: context!,
              viewport: scaledViewport
            } as any;
            await page.render(renderContext).promise;
          }
        } catch (err) {
          console.error('Lỗi khi hiển thị preview:', err);
        }
      };
      loadPreview();
      return () => { isMounted = false; };
    }
  }, [pdfFileToSign, signatureDataUrlA, signatureDataUrlB]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, target: 'A' | 'B') => {
    e.stopPropagation();
    (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
    setDraggingTarget(target);
    updatePos(e, target);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingTarget) {
      updatePos(e, draggingTarget);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingTarget) {
      try {
        (e.target as HTMLDivElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
      setDraggingTarget(null);
    }
  };

  const updatePos = (e: React.PointerEvent<HTMLDivElement>, target: 'A' | 'B') => {
    if (!previewCanvasRef.current) return;
    const rect = previewCanvasRef.current.getBoundingClientRect();
    let clientX = e.clientX;
    let clientY = e.clientY;
    
    let x = (clientX - rect.left) / rect.width;
    let y = (clientY - rect.top) / rect.height;
    
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));
    
    if (target === 'A') {
      setSignaturePosA({ x, y });
    } else {
      setSignaturePosB({ x, y });
    }
  };


  const handleSign = async () => {
    setErrorSign('');
    if (!privKeyA || !privKeyB) {
      setErrorSign('Vui lòng nhập Khóa Bí Mật của cả 2 bên (Bên A và Bên B).');
      return;
    }
    if (!pdfFileToSign) {
       setErrorSign('Vui lòng chọn File PDF Hợp Đồng cần ký.');
       return;
    }
    
    if (!signatureDataUrlA || !signatureDataUrlB) {
       setErrorSign('Vui lòng tạo chữ ký trực quan cho cả 2 bên.');
       return;
    }

    try {
      setSignedPdfUrl(null);

      const pdfBytes = await pdfFileToSign.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      const sigBytesA = await fetch(signatureDataUrlA).then(res => res.arrayBuffer());
      const pngA = await pdfDoc.embedPng(sigBytesA);
      
      const sigBytesB = await fetch(signatureDataUrlB).then(res => res.arrayBuffer());
      const pngB = await pdfDoc.embedPng(sigBytesB);
      
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      
      // Stamp A
      const stampWidthA = signatureWidthA;
      const stampHeightA = (pngA.height / pngA.width) * stampWidthA;
      const xObjA = (signaturePosA.x * width) - (stampWidthA / 2);
      const yObjA = height - (signaturePosA.y * height) - (stampHeightA / 2);
      firstPage.drawImage(pngA, { x: xObjA, y: yObjA, width: stampWidthA, height: stampHeightA });

      // Stamp B
      const stampWidthB = signatureWidthB;
      const stampHeightB = (pngB.height / pngB.width) * stampWidthB;
      const xObjB = (signaturePosB.x * width) - (stampWidthB / 2);
      const yObjB = height - (signaturePosB.y * height) - (stampHeightB / 2);
      firstPage.drawImage(pngB, { x: xObjB, y: yObjB, width: stampWidthB, height: stampHeightB });
      
      const finalPdfBytes = await pdfDoc.save();
      const finalFile = new File([finalPdfBytes], `contract_signed_${pdfFileToSign.name}`, { type: 'application/pdf' });
      
      const finalPdfUrl = URL.createObjectURL(finalFile);
      setSignedPdfUrl(finalPdfUrl);

      // Web Crypto sign: since both parties should sign the final PDF document essentially to lock it
      // Wait, standard double signature means they both sign the same output, or sign sequentially. 
      // Re-signing the produced finalFile is fine.
      const resA = await signFileWebCrypto(finalFile, privKeyA);
      const resB = await signFileWebCrypto(finalFile, privKeyB);
      
      setSignatureOutputA(resA);
      setSignatureOutputB(resB);
    } catch (err: any) {
      setErrorSign('Lỗi hệ thống: ' + err.message);
    }
  };

  const FullscreenSignModal = ({ 
    isOpen, isA, onClose 
  }: { isOpen: boolean, isA: boolean, onClose: () => void }) => {
    if (!isOpen) return null;
    const ref = isA ? sigCanvasA : sigCanvasB;
    const setUrl = isA ? setSignatureDataUrlA : setSignatureDataUrlB;
    
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900/90 backdrop-blur-sm p-4 md:p-10 animate-in fade-in">
        <div className="bg-white flex flex-col flex-1 rounded-2xl overflow-hidden shadow-2xl max-w-5xl w-full mx-auto">
           <div className={`flex items-center justify-between p-4 border-b ${isA ? 'bg-indigo-50 border-indigo-100' : 'bg-emerald-50 border-emerald-100'}`}>
             <h3 className={`font-bold flex items-center gap-2 ${isA ? 'text-indigo-900' : 'text-emerald-900'}`}>
               <PenTool size={18}/> Bảng Vẽ Chữ Ký - {isA ? 'BÊN A' : 'BÊN B'}
             </h3>
             <button onClick={onClose} className="p-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors shadow-sm">
               <X size={20}/>
             </button>
           </div>
           
           <div className="flex-1 relative bg-white min-h-[300px]">
              <SignatureCanvas 
                ref={ref} 
                penColor={isA ? "blue" : "black"}
                onEnd={() => {
                  if (ref.current && !ref.current.isEmpty()) {
                     setUrl(ref.current.toDataURL('image/png'));
                  }
                }}
                canvasProps={{
                  className: 'absolute inset-0 w-full h-full cursor-crosshair touch-none'
                }}
              />
              <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none opacity-10 font-bold text-xl md:text-3xl uppercase tracking-[0.5em]">
                 Vẽ Chữ Ký Vào Đây
              </div>
           </div>
           
           <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
             <button 
               onClick={() => { ref.current?.clear(); setUrl(null); }} 
               className="px-4 py-3 md:px-6 font-semibold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shadow-sm text-sm"
             >
               Xóa viết lại
             </button>
             <button 
               onClick={onClose} 
               className={`px-6 py-3 md:px-10 text-white text-sm font-bold rounded-xl shadow-md transition-colors ${isA ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'}`}
             >
               Hoàn tất chữ ký
             </button>
           </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <FullscreenSignModal isOpen={isSigningA} isA={true} onClose={() => setIsSigningA(false)} />
      <FullscreenSignModal isOpen={isSigningB} isA={false} onClose={() => setIsSigningB(false)} />

      <div className="p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full flex flex-col gap-10">
        
        <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-2xl p-6 shadow-sm">
          <div className="mb-6 flex flex-col">
            <h2 className="text-xl font-bold text-amber-900 flex items-center gap-3">
              <div className="bg-amber-600 p-2 rounded-lg text-white shadow-md shadow-amber-600/20">
                <Users size={20} />
              </div>
              Ký Hợp Đồng Giữa 2 Bên (Bên A & Bên B)
            </h2>
            <p className="text-sm text-amber-700/70 mt-2">
              Cho phép định danh và xác thực đồng thời cả 2 chủ thể trên cùng 1 văn bản Hợp đồng (File PDF).
            </p>
          </div>
          
          <div className="flex flex-col gap-1 mb-6">
            <label className="text-xs font-bold text-amber-900 uppercase tracking-widest flex items-center justify-between">
              Nguồn Dữ Liệu (File Hợp Đồng PDF Chung)
            </label>
            <div className="w-full h-24 border-2 border-dashed border-amber-200 rounded-xl bg-amber-50/50 flex flex-col items-center justify-center p-4 relative group hover:border-amber-400 hover:bg-amber-50 transition-all cursor-pointer">
              <input type="file" accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => { if(e.target.files && e.target.files[0]) setPdfFileToSign(e.target.files[0]); }} />
              {pdfFileToSign ? (
                <div className="text-center flex flex-col items-center">
                  <FileText className="text-amber-600 mb-1" size={20} />
                  <p className="text-xs font-bold text-amber-900 truncate max-w-[300px]">{pdfFileToSign.name}</p>
                </div>
              ) : (
                <div className="text-center flex flex-col items-center text-amber-500">
                  <Upload className="mb-2 opacity-50 group-hover:opacity-100 transition-opacity" size={20} />
                  <p className="text-xs font-bold">Kéo thả hoặc Chọn Hợp Đồng PDF để Ký</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* PARTY A */}
            <div className="space-y-4 bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-indigo-100 text-indigo-700 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-l border-b border-indigo-200">
                 BÊN CHỮ KÝ 1
              </div>
              <h3 className="font-bold text-indigo-900 flex items-center gap-2 border-b border-indigo-50 pb-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">A</span>
                Đại diện Bên A
              </h3>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-indigo-900 uppercase">Khóa Bí Mật</label>
                <textarea 
                  value={privKeyA} onChange={e => setPrivKeyA(e.target.value)}
                  className="w-full h-20 p-2.5 text-[10px] font-mono leading-relaxed bg-slate-50 border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none shadow-inner"
                  placeholder="Dán Private Key Bên A..."
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-indigo-900 uppercase flex items-center justify-between">
                  <span>Chữ ký trực quan</span>
                  <div className="flex items-center gap-2">
                    {signatureDataUrlA && (
                      <span className="flex items-center gap-1 text-[10px] font-normal text-indigo-600">
                        KT:
                        <input type="range" min="50" max="400" value={signatureWidthA} onChange={e => setSignatureWidthA(Number(e.target.value))} className="w-16 accent-indigo-600 h-1 bg-indigo-200 rounded-lg appearance-none cursor-pointer" />
                      </span>
                    )}
                    {signatureDataUrlA && (
                      <button onClick={() => setSignatureDataUrlA(null)} className="text-[10px] text-indigo-600 hover:underline border-l border-indigo-200 pl-2">Xóa</button>
                    )}
                  </div>
                </label>
                <div 
                  onClick={() => setIsSigningA(true)} 
                  className="h-24 border border-dashed border-indigo-300 rounded-xl bg-indigo-50/50 hover:bg-indigo-50 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden relative group"
                >
                   {signatureDataUrlA ? (
                     <img src={signatureDataUrlA} className="max-h-full max-w-full object-contain p-2" alt="Bên A" />
                   ) : (
                     <div className="flex flex-col items-center text-indigo-600 opacity-60">
                       <PenTool size={20} className="mb-1" />
                       <span className="text-[10px] font-bold uppercase tracking-wide">Chạm để Ký</span>
                     </div>
                   )}
                </div>
              </div>
            </div>

            {/* PARTY B */}
            <div className="space-y-4 bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-l border-b border-emerald-200">
                 BÊN CHỮ KÝ 2
              </div>
              <h3 className="font-bold text-emerald-900 flex items-center gap-2 border-b border-emerald-50 pb-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">B</span>
                Đại diện Bên B
              </h3>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-emerald-900 uppercase">Khóa Bí Mật</label>
                <textarea 
                  value={privKeyB} onChange={e => setPrivKeyB(e.target.value)}
                  className="w-full h-20 p-2.5 text-[10px] font-mono leading-relaxed bg-slate-50 border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none shadow-inner"
                  placeholder="Dán Private Key Bên B..."
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-emerald-900 uppercase flex items-center justify-between">
                  <span>Chữ ký trực quan</span>
                  <div className="flex items-center gap-2">
                    {signatureDataUrlB && (
                      <span className="flex items-center gap-1 text-[10px] font-normal text-emerald-600">
                        KT:
                        <input type="range" min="50" max="400" value={signatureWidthB} onChange={e => setSignatureWidthB(Number(e.target.value))} className="w-16 accent-emerald-600 h-1 bg-emerald-200 rounded-lg appearance-none cursor-pointer" />
                      </span>
                    )}
                    {signatureDataUrlB && (
                      <button onClick={() => setSignatureDataUrlB(null)} className="text-[10px] text-emerald-600 hover:underline border-l border-emerald-200 pl-2">Xóa</button>
                    )}
                  </div>
                </label>
                <div 
                  onClick={() => setIsSigningB(true)} 
                  className="h-24 border border-dashed border-emerald-300 rounded-xl bg-emerald-50/50 hover:bg-emerald-50 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden relative group"
                >
                   {signatureDataUrlB ? (
                     <img src={signatureDataUrlB} className="max-h-full max-w-full object-contain p-2" alt="Bên B" />
                   ) : (
                     <div className="flex flex-col items-center text-emerald-600 opacity-60">
                       <PenTool size={20} className="mb-1" />
                       <span className="text-[10px] font-bold uppercase tracking-wide">Chạm để Ký</span>
                     </div>
                   )}
                </div>
              </div>
            </div>
          </div>

          {pdfFileToSign && (signatureDataUrlA || signatureDataUrlB) && (
            <div className="flex flex-col gap-1 mb-8 animate-in fade-in">
              <label className="text-xs font-bold text-amber-900 uppercase tracking-widest flex items-center justify-between">
                Sơ Đồ Vị Trí Đóng Dấu (Kéo Rê Các Chữ Ký Trên Tài Liệu)
              </label>
              <div 
                className="w-full relative border border-amber-200 rounded-lg overflow-hidden bg-slate-100 touch-none select-none"
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                <canvas ref={previewCanvasRef} className="w-full h-auto pointer-events-none block" />
                
                {signatureDataUrlA && (
                  <div 
                     onPointerDown={(e) => handlePointerDown(e, 'A')}
                     className="absolute border-2 border-indigo-500 border-dashed bg-indigo-500/10 flex items-center justify-center cursor-move p-0.5"
                     style={{
                       left: `${signaturePosA.x * 100}%`,
                       top: `${signaturePosA.y * 100}%`,
                       width: `${(signatureWidthA / (pdfDimensions?.width || 800)) * 100}%`,
                       transform: `translate(-50%, -50%)`,
                       transformOrigin: 'center',
                       zIndex: draggingTarget === 'A' ? 20 : 10
                     }}
                  >
                     <img src={signatureDataUrlA} className="w-full h-auto opacity-80 pointer-events-none" />
                     <div className="absolute -top-3 -left-3 bg-indigo-600 text-white w-5 h-5 rounded-full shadow-sm flex justify-center items-center text-[10px] font-bold">A</div>
                  </div>
                )}

                {signatureDataUrlB && (
                  <div 
                     onPointerDown={(e) => handlePointerDown(e, 'B')}
                     className="absolute border-2 border-emerald-500 border-dashed bg-emerald-500/10 flex items-center justify-center cursor-move p-0.5"
                     style={{
                       left: `${signaturePosB.x * 100}%`,
                       top: `${signaturePosB.y * 100}%`,
                       width: `${(signatureWidthB / (pdfDimensions?.width || 800)) * 100}%`,
                       transform: `translate(-50%, -50%)`,
                       transformOrigin: 'center',
                       zIndex: draggingTarget === 'B' ? 20 : 10
                     }}
                  >
                     <img src={signatureDataUrlB} className="w-full h-auto opacity-80 pointer-events-none" />
                     <div className="absolute -top-3 -right-3 bg-emerald-600 text-white w-5 h-5 rounded-full shadow-sm flex justify-center items-center text-[10px] font-bold">B</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <button 
              onClick={handleSign}
              className="w-full h-14 bg-amber-600 hover:bg-amber-700 text-white text-base font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Check size={20} />
              Ký & Phát Hành Hợp Đồng (Đóng Dấu 2 Bên)
            </button>
            {errorSign && <p className="text-xs text-red-600 font-bold bg-red-50 p-3 rounded-xl border border-red-100 text-center">{errorSign}</p>}
          </div>

          {(signedPdfUrl || signatureOutputA || signatureOutputB) && (
            <div className="mt-8 pt-8 border-t border-amber-100 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2 fade-in">
              <div className="md:col-span-1 bg-amber-50 p-4 rounded-xl border border-amber-200 flex flex-col items-center justify-center text-center">
                 <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-amber-600 mb-3 shadow-sm border border-amber-100">
                   <FileSignature size={32} />
                 </div>
                 <h4 className="font-bold text-amber-900 mb-1">Hợp Đồng Đã Ký</h4>
                 <p className="text-[10px] text-amber-700 mb-4 px-2">File PDF lưu giữ hai con dấu trực quan.</p>
                 {signedPdfUrl && (
                   <div className="flex flex-col gap-2 w-full">
                     {onSaveContract && signatureOutputA && signatureOutputB && (
                       <button 
                         onClick={() => onSaveContract({
                           id: Math.random().toString(36).substring(7),
                           name: pdfFileToSign?.name || 'Hợp Đồng 2 Bên',
                           timestamp: Date.now(),
                           type: 'Hợp đồng 2 Bên',
                           fileUrl: signedPdfUrl,
                           signatures: { partyA: signatureOutputA, partyB: signatureOutputB }
                         })}
                         className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 w-full py-2.5 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1"
                       >
                         <Check size={16} /> Lưu Hợp Đồng
                       </button>
                     )}
                     <button 
                       onClick={() => {
                         const a = document.createElement('a');
                         a.href = signedPdfUrl;
                         a.download = `Signed_${pdfFileToSign?.name || 'document.pdf'}`;
                         a.click();
                       }}
                       className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 w-full py-2.5 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1"
                     >
                       <Download size={16} /> Tải Hợp Đồng (.pdf)
                     </button>
                   </div>
                 )}
              </div>

              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="flex flex-col bg-white border border-indigo-100 rounded-xl overflow-hidden shadow-sm">
                   <div className="bg-indigo-50 p-2 text-center border-b border-indigo-100 font-bold text-[10px] text-indigo-900">
                     MÃ HÀM BĂM .SIG (BÊN A)
                   </div>
                   <textarea readOnly value={signatureOutputA} className="w-full h-32 p-3 text-[9px] font-mono text-indigo-800 bg-slate-50 outline-none resize-none" />
                   {signatureOutputA && (
                     <button 
                       onClick={() => {
                         const blob = new Blob([signatureOutputA], { type: 'text/plain' });
                         const url = URL.createObjectURL(blob);
                         const a = document.createElement('a');
                         a.href = url;
                         a.download = `PartyA_${pdfFileToSign?.name || 'document'}.sig`;
                         a.click();
                         URL.revokeObjectURL(url);
                       }}
                       className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 w-full py-2 transition-colors border-t border-indigo-100"
                     >
                       Tải .sig Bên A
                     </button>
                   )}
                 </div>

                 <div className="flex flex-col bg-white border border-emerald-100 rounded-xl overflow-hidden shadow-sm">
                   <div className="bg-emerald-50 p-2 text-center border-b border-emerald-100 font-bold text-[10px] text-emerald-900">
                     MÃ HÀM BĂM .SIG (BÊN B)
                   </div>
                   <textarea readOnly value={signatureOutputB} className="w-full h-32 p-3 text-[9px] font-mono text-emerald-800 bg-slate-50 outline-none resize-none" />
                   {signatureOutputB && (
                     <button 
                       onClick={() => {
                         const blob = new Blob([signatureOutputB], { type: 'text/plain' });
                         const url = URL.createObjectURL(blob);
                         const a = document.createElement('a');
                         a.href = url;
                         a.download = `PartyB_${pdfFileToSign?.name || 'document'}.sig`;
                         a.click();
                         URL.revokeObjectURL(url);
                       }}
                       className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 w-full py-2 transition-colors border-t border-emerald-100"
                     >
                       Tải .sig Bên B
                     </button>
                   )}
                 </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
