import React, { useState, useRef } from 'react';
import { KeyRound, Lock, FileSignature, ShieldCheck, Copy, Check, Upload, Download, LogIn, Info, FileText, X, PenTool } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { PDFDocument } from 'pdf-lib';
import { cn } from './lib/utils';
import { generateRSAKeys, encryptPKCS1, decryptPKCS1, signPKCS1, verifyPKCS1, signFileWebCrypto, verifyFileWebCrypto } from './lib/rsa';

type Tab = 'keygen' | 'encryption' | 'signature' | 'pdf_sign';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('keygen');
  
  // Global Key State to pass between tabs
  const [publicKey, setPublicKey] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800 leading-tight">
                Hệ Thống Chữ Ký Số RSA
              </h1>
              <p className="text-xs text-slate-500 font-medium">Phiên bản 2.0 - Chuẩn PKCS#1 v1.5</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAuthenticated(false)}
            className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-100"
          >
            <LogIn size={16} className="rotate-180" />
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="flex flex-col space-y-2">
              <NavButton 
                active={activeTab === 'keygen'} 
                onClick={() => setActiveTab('keygen')}
                icon={<KeyRound size={18} />}
                label="Sinh Khóa (KeyGen)"
                description="Tạo cặp khóa Public / Private"
              />
              <NavButton 
                active={activeTab === 'encryption'} 
                onClick={() => setActiveTab('encryption')}
                icon={<Lock size={18} />}
                label="Mã Hóa & Giải Mã"
                description="Bảo mật thông điệp"
              />
              <NavButton 
                active={activeTab === 'signature'} 
                onClick={() => setActiveTab('signature')}
                icon={<FileSignature size={18} />}
                label="Ký & Xác Thực"
                description="Đảm bảo tính toàn vẹn"
              />
              <NavButton 
                active={activeTab === 'pdf_sign'} 
                onClick={() => setActiveTab('pdf_sign')}
                icon={<PenTool size={18} />}
                label="Ký Trực Quan PDF"
                description="Ký và đóng dấu lên tài liệu PDF"
              />
            </nav>
            
            <div className="mt-8 p-5 bg-blue-50 border border-blue-100 rounded-xl">
              <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                <Info size={16} />
                Thông số kỹ thuật
              </h3>
              <ul className="text-xs text-blue-800/80 space-y-2 list-none">
                <li className="flex justify-between border-b border-blue-100 pb-1">
                  <span className="font-semibold">Thuật toán:</span> <span>RSA</span>
                </li>
                <li className="flex justify-between border-b border-blue-100 pb-1">
                  <span className="font-semibold">Padding Mã Hóa:</span> <span>PKCS#1 v1.5</span>
                </li>
                <li className="flex justify-between border-b border-blue-100 pb-1">
                  <span className="font-semibold">Định dạng chữ ký:</span> <span>RSASSA-PKCS1-V1_5</span>
                </li>
                <li className="flex justify-between border-b border-blue-100 pb-1">
                  <span className="font-semibold">Hàm băm (Hash):</span> <span>SHA-256</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-semibold">Định dạng khóa:</span> <span>PEM (X.509/PKCS#8)</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm min-h-[600px] overflow-hidden">
              {activeTab === 'keygen' && (
                <KeyGenModule 
                  publicKey={publicKey} 
                  privateKey={privateKey} 
                  setPublicKey={setPublicKey} 
                  setPrivateKey={setPrivateKey} 
                />
              )}
              {activeTab === 'encryption' && (
                <EncryptionModule 
                  defaultPublicKey={publicKey} 
                  defaultPrivateKey={privateKey} 
                />
              )}
              {activeTab === 'signature' && (
                <SignatureModule 
                  defaultPublicKey={publicKey} 
                  defaultPrivateKey={privateKey} 
                />
              )}
              {activeTab === 'pdf_sign' && (
                <PdfVisualSignModule 
                  defaultPublicKey={publicKey} 
                  defaultPrivateKey={privateKey} 
                />
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }
    
    setIsLoading(true);
    // Simulate network delay and authentication
    setTimeout(() => {
      if (username === 'admin' && password === 'mai123') {
        onLogin();
      } else {
        setError('Thông tin đăng nhập không hợp lệ.');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]"></div>
        <div className="absolute top-[60%] -right-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px]"></div>
      </div>
      
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden relative z-10 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/30 mb-4 transform -rotate-6">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 text-center">Hệ Thống Chữ Ký Số</h2>
          <p className="text-slate-500 text-sm mt-2 text-center">Xác thực quyền truy cập vào bảng điều khiển bảo mật</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tên đăng nhập</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={isLoading}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-medium disabled:opacity-50"
              placeholder="Tên đăng nhập..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-medium disabled:opacity-50"
              placeholder="Mật khẩu..."
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 font-medium animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg hover:shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <LogIn size={18} />
                Đăng Nhập Hệ Thống
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label, description }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, description: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl transition-all duration-200 text-left w-full border border-transparent",
        active 
          ? "bg-white border-blue-100 shadow-sm shadow-blue-500/5 ring-1 ring-blue-500/20" 
          : "hover:bg-slate-100 hover:border-slate-200"
      )}
    >
      <div className={cn(
        "p-2 rounded-lg mt-0.5",
        active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
      )}>
        {icon}
      </div>
      <div>
        <div className={cn("text-sm font-bold", active ? "text-blue-900" : "text-slate-700")}>{label}</div>
        <div className="text-xs text-slate-500 mt-0.5">{description}</div>
      </div>
    </button>
  );
}

// ----------------------------------------------------------------------
// MODULE 1: KEY GENERATION
// ----------------------------------------------------------------------

function KeyGenModule({ 
  publicKey, privateKey, setPublicKey, setPrivateKey 
}: { 
  publicKey: string, privateKey: string, setPublicKey: (k: string) => void, setPrivateKey: (k: string) => void 
}) {
  const [length, setLength] = useState<2048 | 4096>(2048);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Add brief timeout to allow UI to render loading state clearly
    setTimeout(async () => {
      try {
        const keys = await generateRSAKeys(length);
        setPublicKey(keys.publicKey);
        setPrivateKey(keys.privateKey);
      } catch (err) {
        alert("Có lỗi xảy ra khi tạo khóa.");
        console.error(err);
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  };

  return (
    <div className="p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="mb-8 border-b border-slate-100 pb-5">
        <h2 className="text-2xl font-bold text-slate-800">Cấu hình Cặp Khóa RSA</h2>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          Cặp khóa RSA bao gồm Khóa công khai (Public Key) dùng để mã hóa tính bảo mật và kiểm tra chữ ký, và Khóa bí mật (Private Key) dùng để giải mã và tạo chữ ký số. Khóa được tạo hoàn toàn trên trình duyệt của bạn (Client-side) đảm bảo tính riêng tư tuyệt đối.
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 flex flex-col md:flex-row md:items-end gap-6 shadow-sm">
        <div className="flex flex-col gap-2 flex-full md:w-1/2">
          <label className="text-sm font-bold text-slate-800">Kích thước khóa phân tích modulo (Bits)</label>
          <div className="text-xs text-slate-500 mb-1">Khóa càng dài thuật toán càng an toàn nhưng tốc độ xử lý sẽ chậm hơn.</div>
          <select 
            value={length} 
            onChange={(e) => setLength(Number(e.target.value) as 2048 | 4096)}
            className="w-full h-11 px-4 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
            disabled={isGenerating}
          >
            <option value={2048}>2048 Bits (Tiêu chuẩn NIST - An toàn & Nhanh)</option>
            <option value={4096}>4096 Bits (Bảo mật tối đa - Chậm hơn)</option>
          </select>
        </div>
        <div className="flex md:w-1/2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang tạo số nguyên tố P & Q...
              </>
            ) : (
              <>
                <KeyRound size={18} />
                Khởi tạo Cặp Khóa Mới
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <KeyDisplayBox 
          label="Public Key (Khóa Công Khai)" 
          description="Được phân phối công khai để mọi người có thể mã hóa tin nhắn gửi cho bạn hoặc xác minh chữ ký của bạn."
          value={publicKey} 
          onChange={setPublicKey} 
          variant="public" 
        />
        <KeyDisplayBox 
          label="Private Key (Khóa Bí Mật)" 
          description="Tài sản tuyệt mật. Dùng để giải mã tin nhắn nhận được hoặc tạo chữ ký số đại diện cho bạn."
          value={privateKey} 
          onChange={setPrivateKey} 
          variant="private" 
        />
      </div>
    </div>
  );
}

function KeyDisplayBox({ label, description, value, onChange, variant = 'public' }: { label: string, description: string, value: string, onChange: (v: string) => void, variant?: 'public' | 'private' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) onChange(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownload = () => {
    if (!value) return;
    const blob = new Blob([value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = variant === 'public' ? 'public_key.pem' : 'private_key.pem';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col">
      <div className="mb-3">
        <h3 className={cn(
          "text-sm font-bold flex items-center gap-2",
          variant === 'public' ? "text-emerald-700" : "text-rose-700"
        )}>
          {variant === 'public' ? <Lock size={16} /> : <KeyRound size={16} />}
          {label}
        </h3>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </div>
      <div className={cn(
        "flex flex-col bg-slate-50 border rounded-xl overflow-hidden shadow-sm transition-all focus-within:ring-2",
        variant === 'public' ? "border-emerald-200 focus-within:ring-emerald-500/20" : "border-rose-200 focus-within:ring-rose-500/20"
      )}>
        <div className="flex items-center justify-between px-3 py-2 bg-white/50 border-b border-slate-200/60 transition-colors">
          <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Định Dạng PEM</span>
          <div className="flex items-center gap-1">
            <label title="Tải khóa lên từ file" className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-md cursor-pointer transition-colors border border-transparent hover:border-slate-300">
              <Upload size={14} />
              <input type="file" className="hidden" accept=".pem,.txt,.key" onChange={handleFileUpload} />
            </label>
            <button title="Lưu khóa thành file" onClick={handleDownload} disabled={!value} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-colors border border-transparent hover:border-slate-300 disabled:opacity-50">
              <Download size={14} />
            </button>
            <button title="Sao chép vào Clipboard" onClick={handleCopy} disabled={!value} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-colors border border-transparent hover:border-slate-300 disabled:opacity-50">
              {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Dán nội dung ${variant === 'public' ? 'Public' : 'Private'} Key chuẩn PEM vào đây...`}
          className={cn(
            "w-full h-56 p-4 bg-transparent text-[11px] leading-relaxed font-mono outline-none resize-none placeholder:text-slate-300 transition-colors",
            variant === 'public' ? "text-emerald-900" : "text-rose-900"
          )}
          spellCheck="false"
        />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MODULE 2: ENCRYPTION & DECRYPTION
// ----------------------------------------------------------------------

function EncryptionModule({ defaultPublicKey, defaultPrivateKey }: { defaultPublicKey: string, defaultPrivateKey: string }) {
  const [pubKey, setPubKey] = useState(defaultPublicKey);
  const [privKey, setPrivKey] = useState(defaultPrivateKey);
  
  const [plaintextToEncrypt, setPlaintextToEncrypt] = useState('');
  const [encryptedOutput, setEncryptedOutput] = useState('');
  
  const [ciphertextToDecrypt, setCiphertextToDecrypt] = useState('');
  const [decryptedOutput, setDecryptedOutput] = useState('');

  const [errorEncrypt, setErrorEncrypt] = useState<string>('');
  const [errorDecrypt, setErrorDecrypt] = useState<string>('');

  const handleEncrypt = () => {
    setErrorEncrypt('');
    if (!pubKey || !plaintextToEncrypt) {
      setErrorEncrypt('⚠ Yêu cầu bắt buộc: Khóa công khai (Public Key) và Văn bản nguồn (Plaintext).');
      return;
    }

    if (!pubKey.includes('BEGIN') || !pubKey.includes('PUBLIC KEY')) {
      setErrorEncrypt('Khóa công khai không đúng định dạng chuẩn PEM (phải chứa "-----BEGIN PUBLIC KEY-----").');
      return;
    }

    try {
      const result = encryptPKCS1(plaintextToEncrypt, pubKey);
      setEncryptedOutput(result);
      setCiphertextToDecrypt(result); // Auto-fill bottom section for convenience
    } catch (err: any) {
      setErrorEncrypt('Lỗi hệ thống mã hóa: ' + err.message);
    }
  };

  const handleDecrypt = () => {
    setErrorDecrypt('');
    if (!privKey || !ciphertextToDecrypt) {
      setErrorDecrypt('⚠ Yêu cầu bắt buộc: Khóa bí mật (Private Key) và Dữ liệu đã mã hóa (Ciphertext).');
      return;
    }

    if (!privKey.includes('BEGIN') || !privKey.includes('PRIVATE KEY')) {
      setErrorDecrypt('Khóa bí mật không đúng định dạng. Khóa phải là chuẩn PEM (chứa "-----BEGIN PRIVATE KEY-----").');
      return;
    }

    try {
      const result = decryptPKCS1(ciphertextToDecrypt, privKey);
      setDecryptedOutput(result);
    } catch (err: any) {
      setErrorDecrypt('Lỗi giải mã: Khóa bí mật không tồn tại tương ứng với bộ mã hóa hoặc cấu trúc Base64 bị hỏng.');
    }
  };

  return (
    <div className="p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full flex flex-col gap-10">
      
      {/* Encrypt Section */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <div className="mb-6 flex flex-col">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <Lock size={20} />
            </div>
            Quy trình Mã Hóa (Encryption)
          </h2>
          <p className="text-sm text-slate-500 mt-2">Dùng thuật toán bảo mật bất đối xứng RSA và đệm PKCS#1 v1.5 để mã hóa văn bản gốc thành bản mã. Bản mã chỉ có thể được giải mã bởi người sở hữu <strong className="font-semibold text-slate-700">Khóa Bí Mật</strong> tương ứng.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center justify-between">
                Khóa Công Khai (Người nhận)
                {pubKey && <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full normal-case">Đã nạp</span>}
              </label>
              <textarea 
                value={pubKey} onChange={e => setPubKey(e.target.value)}
                className="w-full h-28 p-3 text-[11px] font-mono leading-relaxed bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all placeholder:text-slate-400"
                placeholder="Dán chuỗi -----BEGIN PUBLIC KEY-----..."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-widest flex justify-between">
                Văn Bản Gốc (Plaintext)
                <span className="text-[10px] text-slate-400 normal-case">{plaintextToEncrypt.length} ký tự</span>
              </label>
              <textarea 
                value={plaintextToEncrypt} onChange={e => setPlaintextToEncrypt(e.target.value)}
                className="w-full h-28 p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y transition-all placeholder:text-slate-400"
                placeholder="Nhập nội dung bí mật cần chia sẻ (mật khẩu, tin nhắn quan trọng...)"
              />
            </div>
            <button 
              onClick={handleEncrypt}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-blue-600/20 flex flex-col items-center justify-center -space-y-0.5"
            >
              <span>Tiến Hành Mã Hóa</span>
              <span className="text-[10px] font-medium opacity-80 font-mono tracking-wider">RSA-OAEP / PKCS#1 v1.5</span>
            </button>
            {errorEncrypt && <p className="text-xs text-red-600 font-bold bg-red-50 p-2 rounded-md border border-red-100">{errorEncrypt}</p>}
          </div>

          <div className="flex flex-col gap-1.5 h-full">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">
              Bản Mã (Ciphertext - Base64 Encoding)
            </label>
            <p className="text-[11px] text-slate-500 mb-1">Kết quả sau khi mã hóa được đổi sang Base64 để hiển thị dưới dạng văn bản và lưu trữ.</p>
            <div className="flex-1 relative group">
              <textarea 
                readOnly
                value={encryptedOutput}
                className="w-full h-full min-h-[250px] p-4 text-[11px] font-mono text-slate-600 leading-relaxed bg-slate-100 border border-slate-200 rounded-xl outline-none resize-none shadow-inner"
                placeholder={encryptedOutput ? "" : "Kết quả thuật toán mã hóa bất đối xứng sẽ xuất hiện ở đây..."}
              />
              {encryptedOutput && (
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(encryptedOutput);
                  }}
                  className="absolute top-3 right-3 p-2 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-md shadow-sm transition-colors opacity-0 group-hover:opacity-100"
                  title="Sao chép bản mã"
                >
                  <Copy size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-slate-200 relative flex justify-center">
        <div className="absolute -top-3 bg-slate-50 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
          Luồng Dữ Liệu Ngược
        </div>
      </div>

      {/* Decrypt Section */}
      <div className="bg-slate-800 border-slate-700 rounded-2xl p-6 shadow-xl text-slate-200">
        <div className="mb-6 flex flex-col">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <div className="bg-slate-700 p-2 rounded-lg text-rose-400">
              <ShieldCheck size={20} />
            </div>
            Quy trình Giải Mã (Decryption)
          </h2>
          <p className="text-sm text-slate-400 mt-2">Dùng <strong className="font-semibold text-slate-300">Khóa Bí Mật</strong> duy nhất để giải các đoạn mã từ Base64 ngược trở lại văn bản đọc được.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                Khóa Bí Mật (Private Key)
                {privKey && <span className="text-[10px] text-rose-300 bg-rose-400/20 px-2 py-0.5 rounded-full normal-case">Đã nạp</span>}
              </label>
              <textarea 
                value={privKey} onChange={e => setPrivKey(e.target.value)}
                className="w-full h-28 p-3 text-[11px] font-mono leading-relaxed bg-slate-900 border border-slate-700 text-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/50 resize-none transition-all placeholder:text-slate-600"
                placeholder="Dán chuỗi -----BEGIN PRIVATE KEY-----..."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bản Mã Đầu Vào (Base64)</label>
              <textarea 
                value={ciphertextToDecrypt} onChange={e => setCiphertextToDecrypt(e.target.value)}
                className="w-full h-28 p-3 text-[11px] font-mono bg-slate-900 border border-slate-700 text-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/50 resize-y transition-all placeholder:text-slate-600 break-all"
                placeholder="Bản mã Base64 thường khá dài, hãy dán đầy đủ..."
              />
            </div>
            <button 
              onClick={handleDecrypt}
              className="w-full h-12 bg-white hover:bg-slate-200 text-slate-900 text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Lock size={16} className="text-slate-600" />
              Giải Mã Dữ Liệu
            </button>
            {errorDecrypt && <p className="text-xs text-red-400 font-bold bg-red-950/50 p-2 rounded-md border border-red-900/50">{errorDecrypt}</p>}
          </div>

          <div className="flex flex-col gap-1.5 h-full">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Văn Bản Gốc (Plaintext Phục Hồi)
            </label>
            <p className="text-[11px] text-slate-500 mb-1">Dữ liệu sau khi giải mã thành công hiển thị bảo mật cục bộ trên thiết bị của bạn.</p>
            <textarea 
              readOnly
              value={decryptedOutput}
              className={cn(
                "flex-1 w-full p-4 text-sm font-medium border rounded-xl outline-none resize-none shadow-inner transition-colors min-h-[250px]",
                decryptedOutput 
                  ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-400 font-mono text-xs leading-relaxed" 
                  : "bg-slate-900/50 border-slate-800 text-slate-500"
              )}
              placeholder={decryptedOutput ? "" : "Cần cặp chìa khóa hợp lệ để mở nội dung này..."}
            />
          </div>
        </div>

      </div>

    </div>
  );
}

// ----------------------------------------------------------------------
// MODULE 3: SIGNATURE & VERIFICATION
// ----------------------------------------------------------------------

function SignatureModule({ defaultPublicKey, defaultPrivateKey }: { defaultPublicKey: string, defaultPrivateKey: string }) {
  const [privKey, setPrivKey] = useState(defaultPrivateKey);
  const [pubKey, setPubKey] = useState(defaultPublicKey);
  
  const [signMode, setSignMode] = useState<'text'|'file'>('text');
  const [docToSign, setDocToSign] = useState('');
  const [fileToSign, setFileToSign] = useState<File | null>(null);
  const [signatureOutput, setSignatureOutput] = useState('');
  
  const [verifyMode, setVerifyMode] = useState<'text'|'file'>('text');
  const [docToVerify, setDocToVerify] = useState('');
  const [fileToVerify, setFileToVerify] = useState<File | null>(null);
  const [signatureToVerify, setSignatureToVerify] = useState('');
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);

  const [errorSign, setErrorSign] = useState('');
  const [errorVerify, setErrorVerify] = useState('');

  // Signature Registry State
  const [signatureRegistry, setSignatureRegistry] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('signatureRegistry');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveToRegistry = (sig: string) => {
    const next = [sig, ...signatureRegistry];
    setSignatureRegistry(next);
    localStorage.setItem('signatureRegistry', JSON.stringify(next));
  };

  const clearRegistry = () => {
    setSignatureRegistry([]);
    localStorage.removeItem('signatureRegistry');
  };

  const handleSign = async () => {
    setErrorSign('');
    if (!privKey) {
      setErrorSign('Vui lòng nhập Khóa Bí Mật (Private Key).');
      return;
    }
    if (signMode === 'text' && !docToSign) {
       setErrorSign('Vui lòng nhập Dữ liệu/Văn bản cần ký.');
       return;
    }
    if (signMode === 'file' && !fileToSign) {
       setErrorSign('Vui lòng chọn File cần ký.');
       return;
    }
    
    if (!privKey.includes('BEGIN') || !privKey.includes('PRIVATE KEY')) {
      setErrorSign('Khóa bí mật không đúng định dạng. Khóa phải là chuẩn PEM (bắt đầu bằng "-----BEGIN PRIVATE KEY-----"). Hãy quay lại mục "Sinh Khóa" để tạo mới hoặc copy cho đúng.');
      return;
    }

    try {
      let result = '';

      if (signMode === 'text') {
        result = signPKCS1(docToSign, privKey);
      } else {
        result = await signFileWebCrypto(fileToSign!, privKey);
      }

      // Check duplication
      if (signatureRegistry.includes(result)) {
        setErrorSign('TỪ CHỐI PHÁT HÀNH: Chữ ký điện tử này đã tồn tại trong thư viện lưu trữ. Hệ thống từ chối cấp lại chữ ký trùng lặp cho cùng một văn bản bằng cùng một khóa.');
        setSignatureOutput('');
        return;
      }

      setSignatureOutput(result);
      saveToRegistry(result);

      // Auto-fill bottom section
      setVerifyMode(signMode);
      if (signMode === 'text') setDocToVerify(docToSign);
      if (signMode === 'file') setFileToVerify(fileToSign);
      setSignatureToVerify(result);
      setVerificationResult(null);
    } catch (err: any) {
      setErrorSign('Lỗi hệ thống: Khóa bị hỏng hoặc sai cấu trúc (' + err.message + ')');
    }
  };

  const handleVerify = async () => {
    setErrorVerify('');
    setVerificationResult(null);
    if (!pubKey || !signatureToVerify) {
      setErrorVerify('Cần tham số: Public Key gốc và đoạn mã Chữ ký số Base64.');
      return;
    }
    if (verifyMode === 'text' && !docToVerify) {
      setErrorVerify('Vui lòng nhập Văn bản cần kiểm tra.');
      return;
    }
    if (verifyMode === 'file' && !fileToVerify) {
      setErrorVerify('Vui lòng chọn File gốc cần đối chiếu.');
      return;
    }

    if (!pubKey.includes('BEGIN') || !pubKey.includes('PUBLIC KEY')) {
      setErrorVerify('Khóa công khai (Public Key) không đúng định dạng. Khóa phải là chuẩn PEM.');
      return;
    }

    try {
      let isValid = false;
      if (verifyMode === 'text') {
        isValid = verifyPKCS1(docToVerify, signatureToVerify, pubKey);
      } else {
        isValid = await verifyFileWebCrypto(fileToVerify!, signatureToVerify, pubKey);
      }
      setVerificationResult(isValid);
    } catch (err: any) {
      setVerificationResult(false);
      setErrorVerify('Ngoại lệ bộ xác thực Crypto: ' + err.message);
    }
  };

  return (
    <div className="p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full flex flex-col gap-10">
      
      {/* Sign Section */}
      <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-2xl p-6 shadow-sm">
        <div className="mb-6 flex flex-col">
          <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-md shadow-indigo-600/20">
              <FileSignature size={20} />
            </div>
            Quy trình Định danh (Ký Số)
          </h2>
          <p className="text-sm text-indigo-700/70 mt-2">
            Đảm bảo <strong>Tính Toàn Vẹn</strong> (không bị thay đổi) và <strong>Tính Định Danh</strong> (chống chối bỏ). Khóa Bí mật sẽ băm văn bản với SHA-256 sau đó mã hóa đoạn băm tạo thành chữ ký.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-indigo-900 uppercase tracking-widest flex justify-between">
                Khóa Bí Mật (Người Ký)
              </label>
              <textarea 
                value={privKey} onChange={e => setPrivKey(e.target.value)}
                className="w-full h-24 p-2.5 text-[11px] font-mono leading-relaxed bg-white border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none shadow-inner"
                placeholder="Dán Private Key của Chủ thể cần định danh..."
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-indigo-900 uppercase tracking-widest flex items-center justify-between">
                <div>Nguồn dữ liệu</div>
                <div className="flex bg-indigo-100 p-0.5 rounded-md">
                  <button onClick={() => setSignMode('text')} className={cn("px-2 py-1 text-[10px] uppercase tracking-wide font-bold rounded transition-colors", signMode === 'text' ? "bg-white text-indigo-700 shadow-sm" : "text-indigo-600/70 hover:bg-indigo-200")}>Văn bản</button>
                  <button onClick={() => setSignMode('file')} className={cn("px-2 py-1 text-[10px] uppercase tracking-wide font-bold rounded transition-colors", signMode === 'file' ? "bg-white text-indigo-700 shadow-sm" : "text-indigo-600/70 hover:bg-indigo-200")}>Tệp File</button>
                </div>
              </label>
              
              {signMode === 'text' ? (
                <textarea 
                  value={docToSign} onChange={e => setDocToSign(e.target.value)}
                  className="w-full h-28 p-3 text-sm bg-white border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-y shadow-inner"
                  placeholder="Soạn thảo thông điệp hoặc dán nội dung văn bản gốc quan trọng vào đây..."
                />
              ) : (
                <div className="w-full h-28 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50/50 flex flex-col items-center justify-center p-4 relative group hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer">
                  <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => { if(e.target.files && e.target.files[0]) setFileToSign(e.target.files[0]); }} />
                  {fileToSign ? (
                    <div className="text-center flex flex-col items-center">
                      <FileSignature className="text-indigo-600 mb-1" size={24} />
                      <p className="text-xs font-bold text-indigo-900 truncate max-w-[200px]">{fileToSign.name}</p>
                      <p className="text-[10px] text-indigo-500 font-medium">Kích thước: {(fileToSign.size / 1024).toFixed(2)} KB</p>
                    </div>
                  ) : (
                    <div className="text-center flex flex-col items-center text-indigo-500">
                      <Upload className="mb-2 opacity-50 group-hover:opacity-100 transition-opacity" size={24} />
                      <p className="text-xs font-bold">Kéo thả hoặc Chọn File để Ký</p>
                      <p className="text-[10px] mt-0.5 opacity-70">Hỗ trợ mọi định dạng (PDF, DOCX, ZIP...)</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button 
              onClick={handleSign}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              Phát Hành Chữ Ký Số
            </button>
            {errorSign && <p className="text-xs text-red-600 font-bold">{errorSign}</p>}
          </div>

          <div className="flex flex-col gap-1 h-full relative">
            <div className="flex justify-between items-end mb-1">
              <label className="text-xs font-bold text-indigo-900 uppercase tracking-widest">
                Đệm Chữ Ký Sinh Ra (Base64)
              </label>
              {signatureOutput && signMode === 'file' && (
                <button 
                  onClick={() => {
                    const blob = new Blob([signatureOutput], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${fileToSign?.name || 'document'}.sig`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-[10px] font-bold text-indigo-600 hover:text-white hover:bg-indigo-600 px-2 py-1 rounded transition-colors flex items-center gap-1 border border-indigo-200 hover:border-transparent"
                >
                  <Download size={12} />
                  Tải File (.sig)
                </button>
              )}
            </div>
            <textarea 
              readOnly
              value={signatureOutput}
              className={cn(
                "flex-1 w-full min-h-[250px] p-4 text-[10px] font-mono leading-relaxed bg-indigo-900/5 border border-indigo-200 rounded-xl outline-none resize-none shadow-inner break-all",
                signatureOutput ? "text-indigo-800" : "text-indigo-900/30"
              )}
              placeholder="Chữ ký duy nhất kết hợp trực tiếp giữa nguồn dữ liệu và khóa bí mật sẽ xuất hiện tại đây sau khi ký..."
            />
          </div>
        </div>
      </div>

      {/* Verify Section */}
      <div className="border border-slate-200 rounded-2xl p-6 shadow-sm bg-white">
        <div className="mb-6 flex flex-col">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
              <ShieldCheck size={20} />
            </div>
            Đối Chiếu Xác Thực (Verification)
          </h2>
          <p className="text-sm text-slate-500 mt-2">Dùng thuật giải băm văn bản hiện hành, dùng khóa công khai mở khóa chữ ký, nếu 2 đoạn băm trùng khớp: Văn bản là nguyên vẹn và xuất phát từ chủ khóa.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                Khóa Công Khai (Kiểm định viên)
              </label>
              <textarea 
                value={pubKey} onChange={e => setPubKey(e.target.value)}
                className="w-full h-20 p-2 text-[10px] font-mono bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                placeholder="Dán Public Key của bên phát hành văn bản để đối chiếu..."
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-widest flex justify-between items-center">
                <div>Nguồn dữ liệu gốc</div>
                <div className="flex bg-slate-100 p-0.5 rounded-md">
                  <button onClick={() => setVerifyMode('text')} className={cn("px-2 py-1 text-[10px] uppercase tracking-wide font-bold rounded transition-colors", verifyMode === 'text' ? "bg-white text-slate-700 shadow-sm border border-slate-200" : "text-slate-500 hover:bg-slate-200")}>Văn bản</button>
                  <button onClick={() => setVerifyMode('file')} className={cn("px-2 py-1 text-[10px] uppercase tracking-wide font-bold rounded transition-colors", verifyMode === 'file' ? "bg-white text-slate-700 shadow-sm border border-slate-200" : "text-slate-500 hover:bg-slate-200")}>Tệp File</button>
                </div>
              </label>

              {verifyMode === 'text' ? (
                <textarea 
                  value={docToVerify} onChange={e => setDocToVerify(e.target.value)}
                  className="w-full h-24 p-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-y"
                  placeholder="Dán bản copy của tài liệu để kiểm định xem có ai thay đổi nội dung không..."
                />
              ) : (
                <div className="w-full h-24 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 flex flex-col items-center justify-center p-2 relative group hover:border-emerald-400 hover:bg-emerald-50/50 transition-all cursor-pointer">
                  <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => { if(e.target.files && e.target.files[0]) setFileToVerify(e.target.files[0]); }} />
                  {fileToVerify ? (
                    <div className="text-center flex flex-col items-center">
                      <FileText className="text-slate-600 mb-1" size={20} />
                      <p className="text-xs font-bold text-slate-800 truncate max-w-[200px]">{fileToVerify.name}</p>
                    </div>
                  ) : (
                    <div className="text-center flex flex-col items-center text-slate-500">
                      <Upload className="mb-1 opacity-50 group-hover:opacity-100 transition-opacity" size={20} />
                      <p className="text-[11px] font-bold">Chọn File gốc cần kiểm định</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-1 relative">
              <div className="flex justify-between items-end">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                  Chứng thư chữ ký (Base64)
                </label>
                {verifyMode === 'file' && (
                  <label className="text-[10px] font-bold text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1">
                    <Upload size={12} /> Tải .sig
                    <input type="file" accept=".sig,.txt" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if(!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const txt = ev.target?.result as string;
                        if(txt) setSignatureToVerify(txt);
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }} />
                  </label>
                )}
              </div>
              <textarea 
                value={signatureToVerify} onChange={e => setSignatureToVerify(e.target.value)}
                className="w-full h-24 p-2 text-[10px] font-mono bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-y break-all"
                placeholder="Dán chữ ký đính kèm kèm tài liệu vào đây (hoặc tải file .sig)..."
              />
            </div>
            <button 
              onClick={handleVerify}
              className="w-full h-12 bg-slate-800 hover:bg-slate-900 text-emerald-400 text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              Tiến Hành Đối Chiếu Dữ Liệu
            </button>
            {errorVerify && <p className="text-xs text-red-600 font-bold bg-red-50 p-2 rounded-md">{errorVerify}</p>}
          </div>

          <div className="flex flex-col gap-2 relative">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Hồ Sơ Giám Định</label>
            <div className={cn(
              "flex-1 w-full rounded-2xl flex flex-col items-center justify-center p-8 transition-all duration-300 border-4",
              verificationResult === true ? "bg-emerald-50 border-emerald-400 text-emerald-800 shadow-inner" :
              verificationResult === false ? "bg-rose-50 border-rose-400 text-rose-800 shadow-inner" :
              "bg-slate-50 border-slate-200/50 border-dashed text-slate-400"
            )}>
              {verificationResult === true && (
                <div className="text-center animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-5 mx-auto shadow-lg shadow-emerald-500/30 text-white">
                    <Check size={40} className="stroke-[3]" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 uppercase tracking-wider">Hợp Lệ Đoan Chính!</h3>
                  <div className="space-y-2 text-sm font-medium text-emerald-700 bg-emerald-100/50 p-4 rounded-xl text-left">
                    <p className="flex items-center gap-2"><Check size={14}/> Tài liệu nguyên vẹn 100%.</p>
                    <p className="flex items-center gap-2"><Check size={14}/> Trùng khớp hash SHA-256.</p>
                    <p className="flex items-center gap-2"><Check size={14}/> Nguồn gốc đã được định danh bởi Public Key cấp phát.</p>
                  </div>
                </div>
              )}
              {verificationResult === false && (
                <div className="text-center animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-rose-500 rounded-full flex items-center justify-center mb-5 mx-auto shadow-lg shadow-rose-500/30 text-white">
                    <svg className="w-10 h-10 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-3 uppercase tracking-wider">Từ Chối Xác Thực</h3>
                  <div className="space-y-2 text-sm font-medium text-rose-700 bg-rose-100/50 p-4 rounded-xl text-left">
                    <p className="flex items-start gap-2 max-w-xs"><strong>Cảnh báo cấp 1:</strong> Tài liệu đã bị chỉnh sửa phi pháp hoặc chữ ký này không thuộc về chủ sở hữu của Public Key. Dữ liệu này không đáng tin cậy.</p>
                  </div>
                </div>
              )}
              {verificationResult === null && (
                <div className="text-center">
                  <ShieldCheck size={48} className="opacity-20 mb-3 mx-auto" strokeWidth={1} />
                  <p className="text-sm font-semibold uppercase tracking-widest opacity-50">Cổng Đối Chiếu</p>
                  <p className="text-xs mt-1 max-w-[200px] text-center opacity-40">Đang chờ hệ thống nạp các thông số xác nhận...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Signature Library / Registry Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
              <ShieldCheck size={18} className="text-indigo-600" />
              Thư Viện Lưu Trữ Chữ Ký
            </h2>
            <p className="text-xs text-slate-500">
              Hệ thống tự động lưu trữ các chữ ký đã phát hành để ngăn chặn sự trùng lặp (tránh kẻ xấu lấy lại chữ ký cũ để đóng dấu cho văn bản khác nhưng cùng nội dung).
            </p>
          </div>
          <button 
            onClick={clearRegistry}
            disabled={signatureRegistry.length === 0}
            className="text-xs font-semibold px-4 py-2 bg-white border border-slate-300 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:pointer-events-none"
          >
            Xóa Thư Viện
          </button>
        </div>

        {signatureRegistry.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
            <p className="text-sm text-slate-400 font-medium">Thư viện trống. Chưa có chữ ký nào được phát hành.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
            {signatureRegistry.map((sig, idx) => (
              <div key={idx} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow relative group">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded border border-slate-200">
                    Bản Ghi #{(signatureRegistry.length - idx).toString().padStart(3, '0')}
                  </span>
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setSignatureToVerify(sig)}
                      className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded hover:bg-indigo-100 transition-colors mr-2"
                      title="Sử dụng để đối chiếu"
                    >
                      Xác thực
                    </button>
                    <button 
                      onClick={() => navigator.clipboard.writeText(sig)}
                      className="p-1 text-slate-400 hover:text-indigo-600 bg-slate-50 border border-slate-100 rounded"
                      title="Sao chép"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
                <p className="text-[9px] font-mono text-slate-500 break-all bg-slate-50 p-2 rounded border border-slate-100 leading-relaxed max-h-24 overflow-y-auto overflow-x-hidden">
                  {sig}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ----------------------------------------------------------------------
// MODULE 4: PDF VISUAL SIGNING
// ----------------------------------------------------------------------

function PdfVisualSignModule({ defaultPublicKey, defaultPrivateKey }: { defaultPublicKey: string, defaultPrivateKey: string }) {
  const [privKey, setPrivKey] = useState(defaultPrivateKey);
  const [pubKey, setPubKey] = useState(defaultPublicKey);
  
  const [pdfFileToSign, setPdfFileToSign] = useState<File | null>(null);
  const [signatureOutput, setSignatureOutput] = useState('');
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [signedPdfFileResult, setSignedPdfFileResult] = useState<File | null>(null);

  const [errorSign, setErrorSign] = useState('');
  
  const sigCanvas = useRef<SignatureCanvas>(null);

  const handleSign = async () => {
    setErrorSign('');
    if (!privKey) {
      setErrorSign('Vui lòng nhập Khóa Bí Mật (Private Key).');
      return;
    }
    if (!pdfFileToSign) {
       setErrorSign('Vui lòng chọn File PDF cần ký.');
       return;
    }
    
    if (!privKey.includes('BEGIN') || !privKey.includes('PRIVATE KEY')) {
      setErrorSign('Khóa bí mật không đúng định dạng chuẩn PEM.');
      return;
    }

    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
       setErrorSign('Vui lòng vẽ nét chữ ký vào bảng vẽ để đóng dấu.');
       return;
    }

    try {
      setSignedPdfUrl(null);
      setSignedPdfFileResult(null);

      const pdfBytes = await pdfFileToSign.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      const signatureImageUrl = sigCanvas.current.toDataURL('image/png');
      const signatureImageBytes = await fetch(signatureImageUrl).then(res => res.arrayBuffer());
      const pngImage = await pdfDoc.embedPng(signatureImageBytes);
      
      const pages = pdfDoc.getPages();
      const firstPage = pages[0]; // Stamp on first page
      const { width, height } = firstPage.getSize();
      
      // Fixed width for signature stamp
      const stampWidth = 150;
      const stampHeight = (pngImage.height / pngImage.width) * stampWidth;
      
      firstPage.drawImage(pngImage, {
        x: width - stampWidth - 50,
        y: 50,
        width: stampWidth,
        height: stampHeight,
      });
      
      const finalPdfBytes = await pdfDoc.save();
      const finalFile = new File([finalPdfBytes], `signed_${pdfFileToSign.name}`, { type: 'application/pdf' });
      
      const finalPdfUrl = URL.createObjectURL(finalFile);
      setSignedPdfUrl(finalPdfUrl);
      setSignedPdfFileResult(finalFile);

      // Web Crypto sign
      const result = await signFileWebCrypto(finalFile, privKey);
      
      setSignatureOutput(result);
    } catch (err: any) {
      setErrorSign('Lỗi hệ thống: ' + err.message);
    }
  };

  return (
    <div className="p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full flex flex-col gap-10">
      
      <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-100 rounded-2xl p-6 shadow-sm">
        <div className="mb-6 flex flex-col">
          <h2 className="text-xl font-bold text-rose-900 flex items-center gap-3">
            <div className="bg-rose-600 p-2 rounded-lg text-white shadow-md shadow-rose-600/20">
              <PenTool size={20} />
            </div>
            Quy trình Ký Trực Quan lên File PDF
          </h2>
          <p className="text-sm text-rose-700/70 mt-2">
            Vẽ chữ ký trực tiếp lên Canvas và xuất file PDF mới tích hợp con dấu hiển thị ở góc trang, đồng thời phát sinh chữ ký số ẩn bảo mật bằng hệ mã hóa RSA.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-rose-900 uppercase tracking-widest flex justify-between">
                Khóa Bí Mật (Private Key)
              </label>
              <textarea 
                value={privKey} onChange={e => setPrivKey(e.target.value)}
                className="w-full h-24 p-2.5 text-[11px] font-mono leading-relaxed bg-white border border-rose-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 resize-none shadow-inner"
                placeholder="Dán Private Key của Chủ thể cần định danh..."
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-rose-900 uppercase tracking-widest flex items-center justify-between">
                Nguồn Dữ Liệu (File PDF)
              </label>
              <div className="w-full h-28 border-2 border-dashed border-rose-200 rounded-xl bg-rose-50/50 flex flex-col items-center justify-center p-4 relative group hover:border-rose-400 hover:bg-rose-50 transition-all cursor-pointer">
                <input type="file" accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => { if(e.target.files && e.target.files[0]) setPdfFileToSign(e.target.files[0]); }} />
                {pdfFileToSign ? (
                  <div className="text-center flex flex-col items-center">
                    <FileText className="text-rose-600 mb-1" size={24} />
                    <p className="text-xs font-bold text-rose-900 truncate max-w-[200px]">{pdfFileToSign.name}</p>
                    <p className="text-[10px] text-rose-500 font-medium">Kích thước: {(pdfFileToSign.size / 1024).toFixed(2)} KB</p>
                  </div>
                ) : (
                  <div className="text-center flex flex-col items-center text-rose-500">
                    <Upload className="mb-2 opacity-50 group-hover:opacity-100 transition-opacity" size={24} />
                    <p className="text-xs font-bold">Kéo thả hoặc Chọn PDF để Ký</p>
                    <p className="text-[10px] mt-0.5 opacity-70">Chỉ hỗ trợ .pdf</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-rose-900 uppercase tracking-widest flex items-center justify-between">
                <div className="flex items-center gap-1">Bảng Vẽ Canvas</div>
                <button onClick={() => sigCanvas.current?.clear()} className="text-[10px] text-rose-600 hover:underline">Xóa chữ ký</button>
              </label>
              <div className="border border-rose-200 rounded-xl bg-white overflow-hidden shadow-inner flex flex-col">
                 <SignatureCanvas 
                    ref={sigCanvas} 
                    penColor="black"
                    canvasProps={{
                      className: 'w-full h-40 cursor-crosshair touch-none'
                    }}
                 />
                 <div className="w-full text-center text-[10px] text-slate-400 py-1 bg-slate-50 border-t border-slate-100">Ký vào đây - Ảnh sẽ được đóng lên góc tài liệu PDF</div>
              </div>
            </div>

            <button 
              onClick={handleSign}
              className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <PenTool size={18} />
              Ký & Phát Hành Bản PDF
            </button>
            {errorSign && <p className="text-xs text-red-600 font-bold bg-red-50 p-2 rounded-md border border-red-100">{errorSign}</p>}
          </div>

          <div className="flex flex-col gap-5 h-full">
            <div className="flex flex-col gap-1 relative min-h-[150px]">
              <div className="flex justify-between items-end mb-1">
                <label className="text-xs font-bold text-rose-900 uppercase tracking-widest">
                  File PDF Đã Ký (Chuẩn)
                </label>
                {signedPdfUrl && (
                  <button 
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = signedPdfUrl;
                      a.download = `Signed_${pdfFileToSign?.name || 'document.pdf'}`;
                      a.click();
                    }}
                    className="text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <Download size={14} />
                    Tải File Đã Ký (.pdf)
                  </button>
                )}
              </div>
              <div className={cn(
                "flex-1 w-full flex flex-col items-center justify-center p-4 border rounded-xl border-dashed transition-all origin-center",
                signedPdfUrl ? "bg-rose-50/50 border-rose-300" : "bg-slate-50 border-slate-200"
              )}>
                 {signedPdfUrl ? (
                   <>
                     <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-rose-600 mb-3 shadow-md">
                       <Check size={32} />
                     </div>
                     <p className="text-xs font-bold text-rose-900 text-center">Tài liệu đã được đóng dấu.</p>
                     <p className="text-[10px] text-rose-500 font-medium text-center mt-1">Dữ liệu gốc đã được sửa đổi và tích hợp nét ký trực quan của bạn.</p>
                   </>
                 ) : (
                   <div className="text-center flex flex-col items-center opacity-40">
                     <FileSignature size={32} className="mb-2" />
                     <p className="text-xs font-medium">File PDF đã đóng dấu sẽ hiển thị tại đây.</p>
                   </div>
                 )}
              </div>
            </div>

            <div className="flex flex-col gap-1 flex-1 relative">
              <div className="flex justify-between items-end mb-1">
                <label className="text-xs font-bold text-rose-900 uppercase tracking-widest">
                  Mã Hàm Băm & RSA (.sig)
                </label>
                {signatureOutput && (
                  <button 
                    onClick={() => {
                      const blob = new Blob([signatureOutput], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${pdfFileToSign?.name || 'document'}.sig`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="text-[10px] font-bold text-rose-600 hover:text-white hover:bg-rose-600 px-2 py-1 rounded transition-colors flex items-center gap-1 border border-rose-200 hover:border-transparent"
                  >
                    <Download size={12} />
                    Tải (.sig)
                  </button>
                )}
              </div>
              <textarea 
                readOnly
                value={signatureOutput}
                className={cn(
                  "flex-1 w-full min-h-[150px] p-4 text-[10px] font-mono leading-relaxed border rounded-xl outline-none resize-none shadow-inner break-all",
                  signatureOutput ? "bg-white text-rose-800 border-rose-200" : "bg-slate-50 text-slate-400 border-slate-200"
                )}
                placeholder="Chữ ký duy nhất kết hợp trực tiếp giữa File PDF (sau khi đóng dấu) và khóa bí mật..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

