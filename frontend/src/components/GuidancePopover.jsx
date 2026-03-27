import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const GuidancePopover = ({ title, items, badgeColor = "#0B3D3D" }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <button 
        onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        className="w-8 h-8 rounded-full bg-white/50 border border-black/10 hover:bg-[#0B3D3D] hover:border-[#0B3D3D] transition-all group relative flex items-center justify-center shadow-sm hover:shadow-md"
      >
        <span className="text-[16px] font-serif italic font-black text-black/60 group-hover:text-white transition-colors antialiased">i</span>
      </button>

      {createPortal(
        <AnimatePresence>
          {show && (
            <div className="fixed inset-0 z-[9999]">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => { e.stopPropagation(); setShow(false); }}
                className="absolute inset-0 bg-black/40 backdrop-blur-md"
              />
              
              {/* Popover Content */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white/95 backdrop-blur-3xl p-8 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/20"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-[#0B3D3D] flex items-center justify-center shadow-lg shadow-[#0B3D3D]/20">
                    <span className="text-2xl font-serif italic font-black text-white">i</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif text-[#1A1D1A] leading-tight">{title}</h3>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#0B3D3D]/50 mt-1">Platform Guidance Module</p>
                  </div>
                </div>

                <div className="space-y-4 mb-10">
                  {items.map((item, idx) => (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      transition={{ delay: idx * 0.1 }}
                      className="p-5 rounded-3xl bg-black/[0.03] border border-black/[0.05] hover:bg-black/[0.05] transition-colors group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: item.color || badgeColor }} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#0B3D3D]">{item.label}</span>
                      </div>
                      <p className="text-[13px] text-black/70 leading-relaxed font-sans">{item.content}</p>
                    </motion.div>
                  ))}
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); setShow(false); }}
                  className="w-full py-5 bg-[#0B3D3D] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#082a2a] transition-all shadow-xl shadow-[#0B3D3D]/20 active:scale-[0.98]"
                >
                  Terminate Guidance
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default GuidancePopover;
