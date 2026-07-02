import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Wifi,
  WifiOff,
  Terminal,
  ArrowRight,
  ArrowLeft,
  Check,
  Settings,
  X
} from 'lucide-react';

export default function App() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [groupName, setGroupName] = useState('');
  const [selectedLayout, setSelectedLayout] = useState<'4cut' | '2x2' | 'polaroid'>('4cut');

  // System diagnostic panel states
  const [backendStatus, setBackendStatus] = useState<'loading' | 'online' | 'offline'>('loading');
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [showSystemPanel, setShowSystemPanel] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    'System initialized in Minimal Warm mode.',
    'Docker connection ready.'
  ]);

  // DevTools & Right-click protection script
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12
      if (e.key === 'F12') {
        e.preventDefault();
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Disable Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Inspect elements)
      if (isCmdOrCtrl && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.key === 'i' || e.key === 'j' || e.key === 'c')) {
        e.preventDefault();
        return;
      }

      // Disable Ctrl+U (View Source)
      if (isCmdOrCtrl && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        return;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Admin Token configuration
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const urlToken = queryParams.get('token');

    if (urlToken) {
      localStorage.setItem('adminToken', urlToken);
      setIsAdmin(true);
      // Clear token query parameter from browser address bar
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      addLog('Admin authorization token registered successfully.');
    } else {
      const savedToken = localStorage.getItem('adminToken');
      if (savedToken) {
        setIsAdmin(true);
      }
    }
  }, []);

  const checkHealth = async () => {
    try {
      const token = localStorage.getItem('adminToken') || '';
      const response = await fetch(`/api/health?token=${token}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBackendStatus('online');
        setSystemInfo(data);
      } else {
        throw new Error();
      }
    } catch {
      setBackendStatus('offline');
      setSystemInfo(null);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${message}`, ...prev.slice(0, 9)]);
  };

  const startSession = async () => {
    if (!groupName.trim()) {
      alert('กรุณากรอกชื่อกลุ่มหรือชื่องานเพื่อระบุการสร้างโฟลเดอร์ภาพถ่าย');
      return;
    }

    const cleanGroupName = groupName.trim().replace(/[^a-zA-Z0-9_]/g, '_');
    addLog(`Requesting server directory creation for "${cleanGroupName}"...`);

    try {
      const token = localStorage.getItem('adminToken') || '';
      const response = await fetch('/api/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          groupName: cleanGroupName,
          layout: selectedLayout
        })
      });

      if (response.ok) {
        const data = await response.json();
        addLog(`Session directory created: ${data.folderName}`);
        setStep(2);
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Server authentication failed');
      }
    } catch (error: any) {
      addLog(`Fallback: Using Standalone mode. (Error: ${error.message || 'Server Offline'})`);
      setStep(2);
    }
  };

  const handleNextStep2 = () => {
    addLog(`Layout selected: ${selectedLayout}`);
    setStep(3);
  };

  return (
    <div className="min-h-screen warm-grid-bg text-stone-900 flex flex-col justify-between p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans">

      {/* Top Navbar */}
      <header className="w-full max-w-5xl mx-auto flex justify-between items-center z-10 py-3 border-b border-stone-200/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-stone-900 flex items-center justify-center text-white shadow-sm">
            <Camera className="w-5.5 h-5.5 stroke-[2]" />
          </div>
          <span className="font-heading font-extrabold tracking-wider text-base sm:text-xl text-stone-900">
            PHOTOBOOTH / MINIMAL
          </span>
        </div>

        {/* Info Icons */}
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-stone-200 bg-white/90 text-xs font-mono font-bold">
            <span className={`w-2.5 h-2.5 rounded-full ${backendStatus === 'online' ? 'bg-emerald-500 animate-pulse' : backendStatus === 'offline' ? 'bg-stone-400' : 'bg-amber-400 animate-pulse'
              }`} />
            <span>{backendStatus === 'online' ? 'ONLINE' : 'OFFLINE'}</span>
          </div>

          {/* Toggle System Drawer (Only visible/useful when Admin Mode is verified) */}
          {isAdmin && (
            <button
              onClick={() => setShowSystemPanel(true)}
              className="p-3 rounded border border-stone-200 bg-white/90 hover:bg-stone-50 active:scale-95 transition-all text-stone-600 hover:text-stone-900 cursor-pointer"
              title="System Diagnostics"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Main Wizard Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto flex flex-col justify-center items-center py-8 sm:py-16 z-10 px-1 sm:px-4">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full flex flex-col items-center"
            >
              <span className="text-xs sm:text-sm font-mono tracking-widest text-stone-400 uppercase mb-2.5 font-bold">STEP 01 / 03</span>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-stone-900 text-center mb-3 leading-tight font-heading">
                สร้างห้องถ่ายรูปของคุณ
              </h2>
              <p className="text-sm sm:text-base text-stone-500 font-medium text-center mb-8 max-w-md leading-relaxed">
                ป้อนชื่อเล่นของคุณหรือชื่อกลุ่มเพื่อสร้างคลังภาพแยกอย่างปลอดภัย
              </p>

              <div className="w-full bg-white border-2 border-stone-900 rounded-3xl p-6 sm:p-10 card-shadow flex flex-col gap-6">
                <div className="flex flex-col gap-2.5">
                  <label className="text-xs sm:text-sm font-mono font-bold tracking-wider text-stone-400 uppercase">ชื่อกลุ่ม / ชื่องาน</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="เช่น Grace_is_coming"
                    className="w-full border-2 border-stone-200 focus:border-stone-950 rounded-2xl px-5 py-4 sm:py-5 text-lg sm:text-xl focus:outline-none transition-all font-mono placeholder:text-stone-300 bg-stone-50/50 text-stone-900"
                    onKeyDown={(e) => e.key === 'Enter' && startSession()}
                  />
                </div>

                <button
                  onClick={startSession}
                  className="w-full py-4.5 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl font-extrabold text-base sm:text-lg tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer button-shadow"
                >
                  ถัดไป
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full flex flex-col items-center"
            >
              <span className="text-xs sm:text-sm font-mono tracking-widest text-stone-400 uppercase mb-2.5 font-bold">STEP 02 / 03</span>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-stone-900 text-center mb-3 leading-tight font-heading">
                เลือกรูปแบบภาพถ่าย
              </h2>
              <p className="text-sm sm:text-base text-stone-500 font-medium text-center mb-8 max-w-md leading-relaxed">
                เลือกโครงสร้างแผ่นภาพสติกเกอร์ที่ต้องการพิมพ์ออกมา
              </p>

              <div className="w-full bg-white border-2 border-stone-900 rounded-3xl p-6 sm:p-10 card-shadow flex flex-col gap-8">

                {/* Visual Layout Options */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      id: '4cut', title: '4-Cut Strip', desc: '4 ช่องแนวตั้ง', render: () => (
                        <div className="w-8 h-18 border-2 border-stone-850 rounded flex flex-col gap-0.5 p-0.5 justify-between bg-white shadow-sm">
                          <div className="bg-stone-100 flex-1 rounded-sm border border-stone-200" />
                          <div className="bg-stone-100 flex-1 rounded-sm border border-stone-200" />
                          <div className="bg-stone-100 flex-1 rounded-sm border border-stone-200" />
                          <div className="bg-stone-100 flex-1 rounded-sm border border-stone-200" />
                        </div>
                      )
                    },
                    {
                      id: '2x2', title: '2x2 Grid', desc: 'ตาราง 4 ช่อง', render: () => (
                        <div className="w-14 h-14 border-2 border-stone-850 rounded grid grid-cols-2 gap-0.5 p-0.5 bg-white shadow-sm">
                          <div className="bg-stone-100 rounded-sm border border-stone-200" />
                          <div className="bg-stone-100 rounded-sm border border-stone-200" />
                          <div className="bg-stone-100 rounded-sm border border-stone-200" />
                          <div className="bg-stone-100 rounded-sm border border-stone-200" />
                        </div>
                      )
                    },
                    {
                      id: 'polaroid', title: 'Polaroid', desc: 'ภาพเดี่ยวขอบหนา', render: () => (
                        <div className="w-14 h-16 border-2 border-stone-850 rounded flex flex-col gap-0.5 p-0.5 bg-white shadow-sm">
                          <div className="bg-stone-100 flex-1 rounded-sm border border-stone-200" />
                          <div className="h-3 w-full bg-stone-50 border-t border-stone-200" />
                        </div>
                      )
                    }
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedLayout(option.id as any)}
                      className={`p-5 rounded-2xl border-2 flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-4 sm:gap-4 transition-all cursor-pointer ${selectedLayout === option.id
                        ? 'border-stone-950 bg-stone-950 text-white shadow-md'
                        : 'border-stone-250 bg-stone-50/50 hover:bg-stone-50 text-stone-600 hover:text-stone-900'
                        }`}
                    >
                      {option.render()}
                      <div className="text-left sm:text-center flex-1 sm:flex-initial">
                        <p className="text-base font-extrabold leading-tight font-heading">{option.title}</p>
                        <p className={`text-xs ${selectedLayout === option.id ? 'text-stone-300' : 'text-stone-400'} font-medium`}>{option.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Back and Next Controls */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => setStep(1)}
                    className="py-4 border-2 border-stone-200 hover:border-stone-950 text-stone-600 hover:text-stone-950 rounded-2xl font-extrabold text-base tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer order-2 sm:order-1 sm:w-1/3"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    ย้อนกลับ
                  </button>
                  <button
                    onClick={handleNextStep2}
                    className="flex-1 py-4 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl font-extrabold text-base sm:text-lg tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer button-shadow order-1 sm:order-2"
                  >
                    ยืนยันเลือกเลย์เอาต์
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full flex flex-col items-center"
            >
              <span className="text-xs sm:text-sm font-mono tracking-widest text-stone-400 uppercase mb-2.5 font-bold">STEP 03 / 03</span>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-stone-900 text-center mb-3 leading-tight font-heading">
                ห้องถ่ายรูปพร้อมแล้ว
              </h2>
              <p className="text-sm sm:text-base text-stone-500 font-medium text-center mb-6 max-w-sm">
                กลุ่ม: <span className="font-mono text-stone-950 font-extrabold">{groupName}</span> | โหมด: <span className="font-heading text-stone-950 font-extrabold">{selectedLayout === '4cut' ? '4-Cut Strip' : selectedLayout === '2x2' ? '2x2 Grid' : 'Polaroid'}</span>
              </p>

              {/* Viewfinder Placeholder */}
              <div className="w-full bg-white border-2 border-stone-900 rounded-3xl p-5 sm:p-8 card-shadow flex flex-col gap-6">
                <div className="aspect-video w-full border-2 border-stone-900 rounded-2xl relative overflow-hidden bg-stone-950 flex flex-col justify-between p-4 scanlines">

                  {/* Viewfinder corner lines */}
                  <div className="absolute top-3.5 left-3.5 w-6 h-6 border-t-2 border-l-2 border-white/60" />
                  <div className="absolute top-3.5 right-3.5 w-6 h-6 border-t-2 border-r-2 border-white/60" />
                  <div className="absolute bottom-3.5 left-3.5 w-6 h-6 border-b-2 border-l-2 border-white/60" />
                  <div className="absolute bottom-3.5 right-3.5 w-6 h-6 border-b-2 border-r-2 border-white/60" />

                  {/* Grid Lines mockup */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                    <div className="border border-white/10 col-span-3 row-span-3" />
                  </div>

                  {/* Viewfinder Top bar */}
                  <div className="z-10 flex justify-between text-xs font-mono text-white/60 font-bold">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-stone-400 animate-pulse" />
                      <span>STANDBY</span>
                    </div>
                    <div>
                      <span>ISO 200</span>
                    </div>
                  </div>

                  {/* Minimal polaroid graphic centered inside black screen */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none scale-90 sm:scale-100">
                    <div className="w-24 h-28 bg-white p-2 shadow-2xl rounded flex flex-col justify-between border border-stone-700">
                      <div className="flex-1 bg-stone-100 border border-stone-200 flex items-center justify-center">
                        <Camera className="w-8 h-8 text-stone-400 stroke-[1.5]" />
                      </div>
                      <div className="h-4.5 flex items-center justify-center">
                        <span className="text-[8.5px] font-mono text-stone-500 font-extrabold uppercase tracking-wider">{groupName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Viewfinder Bottom bar */}
                  <div className="z-10 flex justify-between text-xs font-mono text-white/60 font-bold">
                    <span>F/2.0</span>
                    <span>BATTERY: 100%</span>
                  </div>
                </div>

                {/* Wizard finish options */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => setStep(2)}
                    className="py-4 border-2 border-stone-200 hover:border-stone-950 text-stone-600 hover:text-stone-950 rounded-2xl font-extrabold text-base tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer order-2 sm:order-1 sm:w-1/3"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    ย้อนกลับ
                  </button>
                  <button
                    onClick={() => {
                      alert('คุณสมบัติถ่ายรูปและการควบคุมกล้องจริงจะเริ่มต้นในเฟส 3 (Webcam Wizard)!');
                    }}
                    className="flex-1 py-4 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl font-extrabold text-base sm:text-lg tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer button-shadow order-1 sm:order-2"
                  >
                    <Camera className="w-5 h-5" />
                    เปิดหน้ากล้อง (CAPTURE)
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer copyright */}
      <footer className="w-full text-center py-4 text-xs font-mono text-stone-450 z-10 border-t border-stone-100 max-w-5xl mx-auto">
        &copy; {new Date().getFullYear()} NARATIP PHOTOBOOTH. ALL RIGHTS RESERVED.
      </footer>

      {/* Slide-over System Diagnostic Panel */}
      <AnimatePresence>
        {showSystemPanel && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSystemPanel(false)}
              className="absolute inset-0 bg-stone-900/40 z-40 cursor-pointer backdrop-blur-[2px]"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="absolute top-0 right-0 h-full w-full max-w-xs sm:max-w-sm bg-white border-l-2 border-stone-900 z-50 p-6 sm:p-8 flex flex-col justify-between shadow-2xl"
            >
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center border-b-2 border-stone-100 pb-4">
                  <span className="font-heading font-extrabold text-base tracking-wide text-stone-900 flex items-center gap-2">
                    <Terminal className="w-5.5 h-5.5" />
                    SYSTEM DIAGNOSTICS
                  </span>
                  <button
                    onClick={() => setShowSystemPanel(false)}
                    className="p-1 rounded hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* API Info */}
                <div className="flex flex-col gap-4">
                  <div className="bg-stone-50 border-2 border-stone-100 rounded-2xl p-4 flex flex-col gap-3 font-mono text-xs text-stone-700">
                    <div className="flex justify-between">
                      <span className="text-stone-450 font-bold">STATUS:</span>
                      <span className={`font-bold ${backendStatus === 'online' ? 'text-emerald-600' : 'text-stone-500'}`}>
                        {backendStatus === 'online' ? 'ONLINE (DOCKER)' : 'STANDALONE (OFFLINE)'}
                      </span>
                    </div>

                    {/* Only show system statistics if Admin Token is verified */}
                    {isAdmin ? (
                      systemInfo ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-stone-450 font-bold">SERVER CPU:</span>
                            <span className="text-stone-900 font-bold">{systemInfo.stats?.cpu}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-450 font-bold">SERVER RAM:</span>
                            <span className="text-stone-900 font-bold">{systemInfo.stats?.ram}</span>
                          </div>
                          <div className="flex flex-col gap-1 mt-1 pt-3 border-t border-stone-200/50">
                            <span className="text-stone-450 font-bold text-[10px]">GALLERY DIR:</span>
                            <span className="text-stone-850 text-[10px] break-all">{systemInfo.galleryPath}</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-[11px] text-stone-400 italic text-center py-2">
                          Loading diagnostics stats...
                        </div>
                      )
                    ) : (
                      <div className="text-[11.5px] text-stone-400 italic text-center py-2 border-t border-stone-100">
                        🔒 Diagnostics metrics are locked for guests. Visit with admin token to unlock.
                      </div>
                    )}
                  </div>

                  {/* Access Log View */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-stone-400 uppercase">System Events</span>
                    <div className="bg-stone-950 text-stone-300 rounded-xl p-3.5 h-44 overflow-y-auto font-mono text-[11px] flex flex-col gap-1.5 border-2 border-stone-900">
                      {logs.map((log, i) => (
                        <div key={i} className="truncate">
                          <span className="text-stone-600">&gt; </span>
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* LocalTunnel Info in sidebar */}
              <div className="bg-stone-50 border-2 border-stone-100 rounded-2xl p-4 flex flex-col gap-2 text-xs">
                <span className="font-heading font-extrabold text-stone-900 flex items-center gap-1.5 text-xs uppercase">
                  <WifiOff className="w-4 h-4 text-stone-600" />
                  LOCALTUNNEL REMOTE
                </span>
                <p className="text-[11px] text-stone-500 leading-relaxed font-sans">
                  รันคำสั่งด้านล่างบนคอมเพื่ออนุญาตให้เปิดกล้องมือถือสแกนพาสเวิร์ดถ่ายรูปภายนอกบ้าน:
                </p>
                <div className="bg-stone-900 text-stone-100 font-mono text-[11px] p-2.5 rounded select-all text-center border border-stone-800">
                  npx localtunnel --port 3001
                </div>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
