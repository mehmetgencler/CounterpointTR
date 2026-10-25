import React from 'react';
import { Music, Sliders, Wand2, BookOpen } from 'lucide-react';

export type MobileTab = 'staff' | 'mixer' | 'generator' | 'theory';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  trackCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  trackCount,
}) => {
  const tabs: { id: MobileTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'staff', label: 'Staff Editor', icon: <Music className="w-5 h-5" /> },
    { id: 'mixer', label: `Mixer (${trackCount})`, icon: <Sliders className="w-5 h-5" /> },
    { id: 'generator', label: 'Generator', icon: <Wand2 className="w-5 h-5" /> },
    { id: 'theory', label: 'Theory', icon: <BookOpen className="w-5 h-5" /> },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d121c]/95 backdrop-blur-md border-t border-[#1e273a] px-2 py-1.5 shadow-2xl"
    >
      <div className="grid grid-cols-4 gap-1 items-center h-14">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              aria-label={tab.label}
              className={`flex flex-col items-center justify-center h-full rounded-xl transition-all active:scale-95 min-h-[44px] ${
                isActive
                  ? 'text-sky-400 bg-sky-950/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.id === 'generator' && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight leading-none whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
