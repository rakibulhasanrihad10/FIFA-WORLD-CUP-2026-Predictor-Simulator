'use client';

import React from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import MatchCard from './MatchCard';
import { Trophy, Calendar, Share2 } from 'lucide-react';
import ShareModal from './ShareModal';

export default function KnockoutBracket() {
  const { matches, selectWinner, step, setStep, championId, runnerUpId, userName, userAvatar } = useTournamentStore();
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);

  // Filter matches for left and right columns
  const getMatch = (id: string) => matches.find((m) => m.id === id)!;

  // Left bracket matches
  const leftR32 = ['R32_1', 'R32_2', 'R32_3', 'R32_4', 'R32_5', 'R32_6', 'R32_7', 'R32_8'].map(getMatch);
  const leftR16 = ['R16_1', 'R16_2', 'R16_3', 'R16_4'].map(getMatch);
  const leftQF = ['QF_1', 'QF_2'].map(getMatch);
  const leftSF = ['SF_1'].map(getMatch);

  // Center Final match
  const finalMatch = getMatch('F');

  // Right bracket matches
  const rightSF = ['SF_2'].map(getMatch);
  const rightQF = ['QF_3', 'QF_4'].map(getMatch);
  const rightR16 = ['R16_5', 'R16_6', 'R16_7', 'R16_8'].map(getMatch);
  const rightR32 = ['R32_9', 'R32_10', 'R32_11', 'R32_12', 'R32_13', 'R32_14', 'R32_15', 'R32_16'].map(getMatch);

  // Compute knockout predictions completion
  const knockoutMatches = matches.filter((m) => m.type === 'knockout');
  const completedKnockouts = knockoutMatches.filter((m) => m.winnerId !== undefined).length;

  // Mobile navigation round state
  const [mobileRound, setMobileRound] = React.useState<'R32' | 'R16' | 'QF' | 'SF' | 'F'>('R32');

  // Define coordinate state for desktop overlay lines
  const [coords, setCoords] = React.useState<
    Record<string, { leftX: number; rightX: number; y: number }>
  >({});

  // Recalculate match coordinates relative to bracket-board container
  const updateCoords = React.useCallback(() => {
    const board = document.getElementById('bracket-board');
    if (!board) return;
    const boardRect = board.getBoundingClientRect();

    const newCoords: Record<string, { leftX: number; rightX: number; y: number }> = {};
    matches.forEach((m) => {
      const el = document.getElementById(`match-card-${m.id}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        newCoords[m.id] = {
          leftX: rect.left - boardRect.left,
          rightX: rect.right - boardRect.left,
          y: rect.top - boardRect.top + rect.height / 2,
        };
      }
    });
    setCoords(newCoords);
  }, [matches]);

  // Handle coords updates on mount and window resize
  React.useEffect(() => {
    // Initial measure after layout settles
    const timer = setTimeout(updateCoords, 150);

    window.addEventListener('resize', updateCoords);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateCoords);
    };
  }, [updateCoords]);

  // Hook to measure when step changes to bracket
  React.useEffect(() => {
    if (step === 'R32') {
      const timer = setTimeout(updateCoords, 350);
      return () => clearTimeout(timer);
    }
  }, [step, updateCoords]);

  // Define static list of connections
  const CONNECTIONS = React.useMemo(() => [
    // --- LEFT HALF ---
    // R32 -> R16
    { fromId: 'R32_1', toId: 'R16_1', isRight: false },
    { fromId: 'R32_2', toId: 'R16_1', isRight: false },
    { fromId: 'R32_3', toId: 'R16_2', isRight: false },
    { fromId: 'R32_4', toId: 'R16_2', isRight: false },
    { fromId: 'R32_5', toId: 'R16_3', isRight: false },
    { fromId: 'R32_6', toId: 'R16_3', isRight: false },
    { fromId: 'R32_7', toId: 'R16_4', isRight: false },
    { fromId: 'R32_8', toId: 'R16_4', isRight: false },
    // R16 -> QF
    { fromId: 'R16_1', toId: 'QF_1', isRight: false },
    { fromId: 'R16_2', toId: 'QF_1', isRight: false },
    { fromId: 'R16_3', toId: 'QF_2', isRight: false },
    { fromId: 'R16_4', toId: 'QF_2', isRight: false },
    // QF -> SF
    { fromId: 'QF_1', toId: 'SF_1', isRight: false },
    { fromId: 'QF_2', toId: 'SF_1', isRight: false },
    // SF -> F
    { fromId: 'SF_1', toId: 'F', isRight: false },

    // --- RIGHT HALF ---
    // R32 -> R16
    { fromId: 'R32_9', toId: 'R16_5', isRight: true },
    { fromId: 'R32_10', toId: 'R16_5', isRight: true },
    { fromId: 'R32_11', toId: 'R16_6', isRight: true },
    { fromId: 'R32_12', toId: 'R16_6', isRight: true },
    { fromId: 'R32_13', toId: 'R16_7', isRight: true },
    { fromId: 'R32_14', toId: 'R16_7', isRight: true },
    { fromId: 'R32_15', toId: 'R16_8', isRight: true },
    { fromId: 'R32_16', toId: 'R16_8', isRight: true },
    // R16 -> QF
    { fromId: 'R16_5', toId: 'QF_3', isRight: true },
    { fromId: 'R16_6', toId: 'QF_3', isRight: true },
    { fromId: 'R16_7', toId: 'QF_4', isRight: true },
    { fromId: 'R16_8', toId: 'QF_4', isRight: true },
    // QF -> SF
    { fromId: 'QF_3', toId: 'SF_2', isRight: true },
    { fromId: 'QF_4', toId: 'SF_2', isRight: true },
    // SF -> F
    { fromId: 'SF_2', toId: 'F', isRight: true }
  ], []);

  // Determine if both precursors feeding into the target match are completed
  const isConnectionActive = React.useCallback((toId: string) => {
    const precursors = CONNECTIONS.filter((c) => c.toId === toId).map((c) => c.fromId);
    if (precursors.length === 0) return false;
    return precursors.every((fromId) => {
      const match = matches.find((m) => m.id === fromId);
      return match !== undefined && match.winnerId !== undefined;
    });
  }, [CONNECTIONS, matches]);

  const renderLines = () => {
    return CONNECTIONS.map((conn, index) => {
      const fromCoords = coords[conn.fromId];
      const toCoords = coords[conn.toId];

      if (!fromCoords || !toCoords) return null;

      const isRight = conn.isRight;
      const x1 = isRight ? fromCoords.leftX : fromCoords.rightX;
      const y1 = fromCoords.y;
      const x2 = isRight ? toCoords.rightX : toCoords.leftX;
      const y2 = toCoords.y;

      const xMid = (x1 + x2) / 2;
      // Rigid, right-angle path formula
      const pathData = `M ${x1} ${y1} H ${xMid} V ${y2} H ${x2}`;

      const active = isConnectionActive(conn.toId);

      return (
        <path
          key={`${conn.fromId}-${conn.toId}-${index}`}
          d={pathData}
          fill="none"
          stroke={active ? 'url(#active-grad)' : '#6B7280'}
          strokeWidth={active ? '2.5' : '1.5'}
          strokeDasharray={active ? 'none' : '3 3'}
          filter={active ? 'url(#green-glow)' : 'none'}
          className={active ? 'active-line' : ''}
          opacity={active ? '1' : '0.35'}
        />
      );
    });
  };

  // Filter matches to display inside mobile list
  const getMobileMatches = () => {
    switch (mobileRound) {
      case 'R32':
        return [...leftR32, ...rightR32];
      case 'R16':
        return [...leftR16, ...rightR16];
      case 'QF':
        return [...leftQF, ...rightQF];
      case 'SF':
        return [...leftSF, ...rightSF];
      case 'F':
        return [finalMatch];
      default:
        return [];
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 max-w-full mx-auto py-6 animate-fade-in px-4">
      {/* Header Info */}
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800/60 flex-shrink-0">
        <div>
          <h2 className="text-xl font-black text-white">Knockout Stage Predictions</h2>
          <p className="text-xs text-slate-400 mt-1">
            Pick winners by clicking on teams. Predictions propagate automatically to the next round.
          </p>
        </div>
        
        <div className="flex flex-row items-center gap-3 flex-wrap md:flex-nowrap">
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase hover:shadow-[0_0_12px_rgba(16,185,129,0.25)] transition-all shadow-sm cursor-pointer flex-shrink-0 h-[46px]"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>

          <div className="flex items-center gap-3 bg-[#060a08] px-4 py-2.5 rounded-lg border border-[#22c55e]/15 flex-shrink-0 h-[46px]">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-500">Knockout Progress</div>
              <div className="text-sm font-black text-white">
                {completedKnockouts} <span className="text-slate-700">/</span> {knockoutMatches.length} Matches
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-xs text-emerald-400 font-extrabold flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-[#fbbf24] animate-bounce" />
              Find your Champion!
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE ROUND NAVIGATION TABS */}
      <div className="flex lg:hidden bg-slate-900/50 p-1.5 rounded-xl border border-slate-800/80 gap-1.5 w-full select-none">
        {(['R32', 'R16', 'QF', 'SF', 'F'] as const).map((r) => {
          const isActive = mobileRound === r;
          const label = r === 'F' ? 'Final' : r === 'SF' ? 'Semis' : r === 'QF' ? 'Quarters' : r;
          return (
            <button
              key={r}
              onClick={() => setMobileRound(r)}
              className={`flex-1 py-2.5 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 shadow-md transform scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* MOBILE VERTICAL MATCH LIST */}
      <div className="flex lg:hidden flex-col gap-4 w-full max-w-md mx-auto py-2">
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 px-1 mb-2">
          <Calendar className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            {mobileRound === 'R32' && 'Round of 32 Matches'}
            {mobileRound === 'R16' && 'Round of 16 Matches'}
            {mobileRound === 'QF' && 'Quarterfinals'}
            {mobileRound === 'SF' && 'Semifinals'}
            {mobileRound === 'F' && 'The World Cup Final'}
          </span>
        </div>
        {getMobileMatches().map((match) => (
          <div key={match.id} className="w-full">
            {/* Render full-sized cards on mobile for readability */}
            <MatchCard match={match} onSelectWinner={selectWinner} compact={false} />
          </div>
        ))}
      </div>

      {/* DESKTOP FULL BRACKET BOARD VIEW (Rendered off-screen on mobile to allow image export) */}
      <div className="w-full overflow-x-auto pb-4 no-scrollbar lg:relative lg:block lg:opacity-100 lg:pointer-events-auto lg:h-auto lg:z-auto absolute opacity-0 pointer-events-none -z-50 h-0 overflow-hidden flex justify-center">
        <div id="bracket-board" className="min-w-[1960px] inline-flex flex-col items-stretch justify-start py-8 px-16 h-[1220px] relative bg-[#060a08] mx-auto">
          
          {/* PREMIUM PERSONALIZED HEADER BAR - CENTERED VERTICAL */}
          <div className="w-full flex flex-col items-center justify-center border-b border-slate-800/80 pb-6 mb-8 flex-shrink-0 z-10 gap-3">
            {/* Creator Profile Image Badge */}
            {userAvatar ? (
              <img 
                src={userAvatar} 
                alt="" 
                className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500/50 flex-shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 font-extrabold text-2xl select-none flex-shrink-0">
                ⚽
              </div>
            )}
            
            {/* Verified Badge & Creator Name Inline */}
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center justify-center bg-emerald-500 text-slate-950 rounded-full w-4 h-4 text-[9px] font-extrabold select-none flex-shrink-0" title="Verified Simulation">
                ✓
              </span>
              <span className="text-lg font-black tracking-wide text-white uppercase">
                {userName || 'Football Fan'}'s Prediction
              </span>
            </div>
          </div>

          {/* INNER COLUMNS WRAPPER */}
          <div className="flex flex-row items-stretch justify-center gap-x-20 flex-1">
          
          {/* SVG Connector Lines Canvas */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <defs>
              <linearGradient id="active-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#00FF87" />
              </linearGradient>
              <filter id="green-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {renderLines()}
          </svg>

          {/* COLUMN 1: LEFT R32 */}
          <div className="w-36 flex-shrink-0 h-full flex flex-col">
            <div className="text-center text-[10px] uppercase font-bold text-slate-500 mb-4 tracking-widest border-b border-slate-900 pb-2 flex-shrink-0 h-8 flex items-center justify-center">R32 - Left</div>
            <div className="flex-1 flex flex-col justify-around">
              {leftR32.map((match) => (
                <div key={match.id} className="w-36 relative z-10">
                  <MatchCard id={`match-card-${match.id}`} match={match} onSelectWinner={selectWinner} compact={true} />
                </div>
              ))}
            </div>
          </div>

          {/* COLUMN 2: LEFT R16 */}
          <div className="w-36 flex-shrink-0 h-full flex flex-col">
            <div className="text-center text-[10px] uppercase font-bold text-slate-500 mb-4 tracking-widest border-b border-slate-900 pb-2 flex-shrink-0 h-8 flex items-center justify-center">R16 - Left</div>
            <div className="flex-1 flex flex-col justify-around">
              {leftR16.map((match) => (
                <div key={match.id} className="w-36 relative z-10">
                  <MatchCard id={`match-card-${match.id}`} match={match} onSelectWinner={selectWinner} compact={true} />
                </div>
              ))}
            </div>
          </div>

          {/* COLUMN 3: LEFT QF */}
          <div className="w-36 flex-shrink-0 h-full flex flex-col">
            <div className="text-center text-[10px] uppercase font-bold text-slate-500 mb-4 tracking-widest border-b border-slate-900 pb-2 flex-shrink-0 h-8 flex items-center justify-center">Quarters - Left</div>
            <div className="flex-1 flex flex-col justify-around">
              {leftQF.map((match) => (
                <div key={match.id} className="w-36 relative z-10">
                  <MatchCard id={`match-card-${match.id}`} match={match} onSelectWinner={selectWinner} compact={true} />
                </div>
              ))}
            </div>
          </div>

          {/* COLUMN 4: LEFT SF */}
          <div className="w-36 flex-shrink-0 h-full flex flex-col">
            <div className="text-center text-[10px] uppercase font-bold text-slate-500 mb-4 tracking-widest border-b border-slate-900 pb-2 flex-shrink-0 h-8 flex items-center justify-center">Semis - Left</div>
            <div className="flex-1 flex flex-col justify-around">
              {leftSF.map((match) => (
                <div key={match.id} className="w-36 relative z-10">
                  <MatchCard id={`match-card-${match.id}`} match={match} onSelectWinner={selectWinner} compact={true} />
                </div>
              ))}
            </div>
          </div>

          {/* COLUMN 5: CENTER FINAL */}
          <div className="w-40 flex-shrink-0 h-full flex flex-col">
            <div className="text-center text-[10px] uppercase font-bold text-slate-500 mb-4 tracking-widest border-b border-slate-900 pb-2 flex-shrink-0 h-8 flex items-center justify-center">The Final</div>
            <div className="flex-1 flex flex-col justify-center items-center gap-6 relative z-10">
              <div className="bg-[#fbbf24]/10 text-[#fbbf24] border border-[#fbbf24]/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 justify-center mb-1 flex-shrink-0">
                <Trophy className="h-3 w-3" />
                Podium
              </div>
              
              <div className="w-40 shadow-[0_0_50px_rgba(251,191,36,0.08)] rounded-2xl p-1 bg-gradient-to-b from-[#fbbf24]/20 to-transparent flex-shrink-0">
                <MatchCard id={`match-card-${finalMatch.id}`} match={finalMatch} onSelectWinner={selectWinner} compact={true} />
              </div>

              <div className="text-center max-w-[160px] text-[9px] text-slate-500 font-medium leading-relaxed select-none flex-shrink-0">
                Pick the final champion!
              </div>
            </div>
          </div>

          {/* COLUMN 6: RIGHT SF */}
          <div className="w-36 flex-shrink-0 h-full flex flex-col">
            <div className="text-center text-[10px] uppercase font-bold text-slate-500 mb-4 tracking-widest border-b border-slate-900 pb-2 flex-shrink-0 h-8 flex items-center justify-center">Semis - Right</div>
            <div className="flex-1 flex flex-col justify-around">
              {rightSF.map((match) => (
                <div key={match.id} className="w-36 relative z-10">
                  <MatchCard id={`match-card-${match.id}`} match={match} onSelectWinner={selectWinner} compact={true} />
                </div>
              ))}
            </div>
          </div>

          {/* COLUMN 7: RIGHT QF */}
          <div className="w-36 flex-shrink-0 h-full flex flex-col">
            <div className="text-center text-[10px] uppercase font-bold text-slate-500 mb-4 tracking-widest border-b border-slate-900 pb-2 flex-shrink-0 h-8 flex items-center justify-center">Quarters - Right</div>
            <div className="flex-1 flex flex-col justify-around">
              {rightQF.map((match) => (
                <div key={match.id} className="w-36 relative z-10">
                  <MatchCard id={`match-card-${match.id}`} match={match} onSelectWinner={selectWinner} compact={true} />
                </div>
              ))}
            </div>
          </div>

          {/* COLUMN 8: RIGHT R16 */}
          <div className="w-36 flex-shrink-0 h-full flex flex-col">
            <div className="text-center text-[10px] uppercase font-bold text-slate-500 mb-4 tracking-widest border-b border-slate-900 pb-2 flex-shrink-0 h-8 flex items-center justify-center">R16 - Right</div>
            <div className="flex-1 flex flex-col justify-around">
              {rightR16.map((match) => (
                <div key={match.id} className="w-36 relative z-10">
                  <MatchCard id={`match-card-${match.id}`} match={match} onSelectWinner={selectWinner} compact={true} />
                </div>
              ))}
            </div>
          </div>

          {/* COLUMN 9: RIGHT R32 */}
          <div className="w-36 flex-shrink-0 h-full flex flex-col">
            <div className="text-center text-[10px] uppercase font-bold text-slate-500 mb-4 tracking-widest border-b border-slate-900 pb-2 flex-shrink-0 h-8 flex items-center justify-center">R32 - Right</div>
            <div className="flex-1 flex flex-col justify-around">
              {rightR32.map((match) => (
                <div key={match.id} className="w-36 relative z-10">
                  <MatchCard id={`match-card-${match.id}`} match={match} onSelectWinner={selectWinner} compact={true} />
                </div>
              ))}
            </div>
          </div>

          </div> {/* Closing INNER COLUMNS WRAPPER */}

          {/* SUBTLE WATERMARK IN BOTTOM-CENTER */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none select-none text-center">
            <span className="text-xs font-black tracking-widest text-[#f2f7f5]/20 uppercase">
              ⚽ FIFA WORLD CUP 2026 PREDICTOR SIMULATOR
            </span>
          </div>
        </div>
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        championId={championId}
        runnerUpId={runnerUpId}
        bracketElementId="bracket-board"
      />
    </div>
  );
}
