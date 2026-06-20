'use client';

import React, { useEffect, useState } from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import Header from '../components/Header';
import HomeScreen from '../components/HomeScreen';
import GroupStage from '../components/GroupStage';
import Qualification from '../components/Qualification';
import KnockoutBracket from '../components/KnockoutBracket';
import ChampionScreen from '../components/ChampionScreen';

import { triggerHaptic } from '../utils/haptic';

export default function Home() {
  const { step } = useTournamentStore();
  const [mounted, setMounted] = useState(false);

  // Prevent Next.js hydration errors from localStorage persistence
  useEffect(() => {
    setMounted(true);
  }, []);

  // Global Haptic Feedback Listener
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Capture elements with native buttons, button role, links, or cursor pointer
      const clickable = target.closest('button, [role="button"], a, .cursor-pointer');
      if (clickable) {
        const hapticType = clickable.getAttribute('data-haptic') === 'winner' ? 'winner' : 'click';
        triggerHaptic(hapticType);
      }
    };
    document.addEventListener('click', handleGlobalClick, { capture: true });
    return () => document.removeEventListener('click', handleGlobalClick, { capture: true });
  }, []);

  // Scroll to top of the page when navigating between screens
  useEffect(() => {
    if (mounted) {
      window.scrollTo(0, 0);
    }
  }, [step, mounted]);

  // Synchronize history state with step transitions
  useEffect(() => {
    if (!mounted) return;

    // Initialize initial state for Home if not set
    if (window.history.state?.step === undefined) {
      window.history.replaceState({ step: 'home' }, '', '');
    }

    // Only push if the current history state is different from the active step
    if (window.history.state?.step !== step) {
      window.history.pushState({ step }, '', '');
    }
  }, [step, mounted]);

  // Listen to browser Back/Forward navigation clicks
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.step) {
        useTournamentStore.setState({ step: event.state.step });
      } else {
        useTournamentStore.setState({ step: 'home' });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
      <footer className="w-full text-center py-6 border-t border-slate-950/80 bg-slate-950/30 flex-shrink-0 select-none flex flex-col items-center gap-2">
        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
          FIFA World Cup 2026 Predictor Simulator
        </span>

        {/* Made by Rakib • ⚽❤️ */}
        <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-semibold tracking-wide">
          <span>Made by</span>
          <a
            href="mailto:rakibulhasanrihad@gmail.com"
            className="text-slate-200 font-bold hover:text-emerald-400 transition-colors duration-200 cursor-pointer"
          >
            Rakib
          </a>
          <span className="text-slate-500 ml-0.5">•</span>
          <span>⚽❤️</span>
        </div>

        {/* Social profile links */}
        <div className="flex items-center gap-4 text-xs font-bold mt-0.5">
          <a
            href="https://www.facebook.com/contexterror"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-emerald-400 hover:-translate-y-0.5 transform transition-all duration-200"
          >
            Facebook
          </a>
          <a
            href="https://x.com/iam_rakib_"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-emerald-400 hover:-translate-y-0.5 transform transition-all duration-200"
          >
            X
          </a>
          <a
            href="https://instagram.com/iam_rakib_"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-emerald-400 hover:-translate-y-0.5 transform transition-all duration-200"
          >
            Instagram
          </a>
        </div>
      </footer>
    </div>
  );
}
