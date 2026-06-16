'use client';

import React, { useEffect, useState } from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import Header from '../components/Header';
import HomeScreen from '../components/HomeScreen';
import GroupStage from '../components/GroupStage';
import Qualification from '../components/Qualification';
import KnockoutBracket from '../components/KnockoutBracket';
import ChampionScreen from '../components/ChampionScreen';

export default function Home() {
  const { step } = useTournamentStore();
  const [mounted, setMounted] = useState(false);

  // Prevent Next.js hydration errors from localStorage persistence
  useEffect(() => {
    setMounted(true);
  }, []);

  // Scroll to top of the page when navigating between screens
  useEffect(() => {
    if (mounted) {
      window.scrollTo(0, 0);
    }
  }, [step, mounted]);

  if (!mounted) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-[#060a08] text-slate-400 select-none">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <span className="text-4xl">⚽</span>
          <span className="text-sm font-extrabold tracking-widest uppercase">Loading World Cup Simulator...</span>
        </div>
      </div>
    );
  }

  const renderStepComponent = () => {
    switch (step) {
      case 'home':
        return <HomeScreen />;
      case 'group':
        return <GroupStage />;
      case 'qualification':
        return <Qualification />;
      case 'champion':
        return <ChampionScreen />;
      default:
        // Covers 'R32', 'R16', 'QF', 'SF', 'final'
        return <KnockoutBracket />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#060a08] text-[#f2f7f5]">
      {step !== 'home' && <Header />}
      <main className="flex-1 w-full flex flex-col items-center">
        {renderStepComponent()}
      </main>
      
      {/* Footer copyright */}
      <footer className="w-full text-center py-6 border-t border-slate-950/80 bg-slate-950/30 flex-shrink-0 select-none flex flex-col gap-1.5">
        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
          ⚽ FIFA World Cup 2026 Predictor Simulator
        </span>
        <span className="text-[9px] text-slate-600 font-semibold tracking-wider">
          Developed by <span className="text-slate-500 font-bold hover:text-emerald-400 transition-colors duration-200 cursor-default">Rakibul Hasan</span>
        </span>
      </footer>
    </div>
  );
}
