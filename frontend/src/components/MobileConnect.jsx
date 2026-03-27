import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, X, ExternalLink, Info } from 'lucide-react';

export default function MobileConnect() {
  const [isOpen, setIsOpen] = useState(false);
  const [sysInfo, setSysInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSysInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`http://${window.location.hostname}:8000/system/info`);
      if (!resp.ok) throw new Error('Backend unreachable');
      const data = await resp.json();
      setSysInfo(data);
    } catch (err) {
      console.error(err);
      setError("Could not fetch local IP. Make sure backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const toggleModal = () => {
    if (!isOpen) fetchSysInfo();
    setIsOpen(!isOpen);
  };

  const mobileUrl = sysInfo ? `http://${sysInfo.local_ip}:${sysInfo.frontend_port}` : '';
  const qrImageUrl = mobileUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mobileUrl)}` : '';

  return (
    <>
      <button 
        onClick={toggleModal}
        className="flex items-center gap-2 px-4 py-2 bg-[#0B3D3D]/5 hover:bg-[#0B3D3D]/10 text-[#0B3D3D] rounded-full transition-all border border-[#0B3D3D]/10 group"
        title="Connect Mobile Device"
      >
        <Smartphone size={14} className="group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Connect Mobile</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[-1]"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-[#FAF9F6] rounded-[2.5rem] shadow-2xl overflow-hidden border border-black/5"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#0B3D3D] flex items-center justify-center">
                      <Smartphone className="text-white w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-serif text-[#1A1D1A]">Mobile View</h3>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-black/40">Connect your device</p>
                    </div>
                  </div>
                  <button onClick={toggleModal} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                    <X size={20} className="text-black/40" />
                  </button>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-8 h-8 border-2 border-[#0B3D3D]/20 border-t-[#0B3D3D] rounded-full animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Detecting Network...</span>
                  </div>
                ) : error ? (
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
                    <Info className="w-6 h-6 text-red-400 mx-auto mb-3" />
                    <p className="text-xs text-red-800 font-medium mb-4">{error}</p>
                    <button 
                      onClick={fetchSysInfo}
                      className="px-6 py-2 bg-red-600 text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all"
                    >
                      Retry Connection
                    </button>
                  </div>
                ) : sysInfo ? (
                  <div className="flex flex-col items-center">
                    <div className="bg-white p-4 rounded-3xl shadow-lg border border-black/5 mb-6">
                      <img 
                        src={qrImageUrl} 
                        alt="QR Code" 
                        className="w-48 h-48"
                      />
                    </div>
                    
                    <div className="w-full bg-[#0B3D3D]/5 rounded-2xl p-4 mb-6 border border-[#0B3D3D]/10">
                      <div className="text-[8px] font-bold uppercase tracking-widest text-[#0B3D3D]/40 mb-1 text-center">Your Local URL</div>
                      <div className="text-sm font-mono font-bold text-[#0B3D3D] text-center select-all">{mobileUrl}</div>
                    </div>

                    <div className="flex items-center gap-2 text-black/40 mb-6">
                      <Info size={12} />
                      <p className="text-[9px] font-medium leading-relaxed">
                        Ensure your mobile device is on the same <br /> WiFi network as this computer.
                      </p>
                    </div>

                    <a 
                      href={mobileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-4 bg-[#0B3D3D] text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#072a2a] transition-all shadow-xl shadow-[#0B3D3D]/20"
                    >
                      Open in Browser <ExternalLink size={12} />
                    </a>
                  </div>
                ) : null}
              </div>

              <div className="bg-black/[0.02] px-8 py-4 border-t border-black/5 flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/30">Secure Local Tunnel Active</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
