export default function Watermark() {
  return (
    <aside aria-label="Developer Attribution" className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 pointer-events-auto select-none print:hidden">
      <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#212B1C]/90 hover:bg-[#212B1C] backdrop-blur-md text-[#FAF7F2] border border-[#F5E8D0]/30 shadow-lg shadow-black/20 text-[11px] font-mono tracking-wide transition-all duration-300 hover:scale-105 hover:border-[#F5E8D0]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[#E2DACB]">Developed by</span>
        <span className="font-bold text-[#F5E8D0]">Mohith BM</span>
      </div>
    </aside>
  )
}
