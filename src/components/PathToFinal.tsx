'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTournamentStore } from '../store/useTournamentStore';
import { TEAMS, KNOCKOUT_METADATA, getFlagUrl, getOfficialMatchNumber } from '../data/initialData';
import { Team, TeamStanding } from '../types/tournament';
import { Search, Sparkles, Trophy, RotateCcw, AlertCircle, Info, Check, Share2, User, Lock } from 'lucide-react';
import { toPng } from 'html-to-image';
import { fuzzySearchTeams } from '../utils/fuzzySearch';

interface TimelineStage {
  stage: 'R32' | 'R16' | 'QF' | 'SF' | 'final';
  stageLabel: string;
  matchId: string;
  matchNumber: number | string;
  isHome: boolean;
  opponentId: string;
  isInteractive: boolean;
  opponentMatchId?: string;
  contenderAId?: string;
  contenderBId?: string;
  predictionId?: string;
}

export default function PathToFinal() {
  const { standings, qualifiedTeams, userName, userAvatar, setBrandingDetails } = useTournamentStore();

  // State
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [scenario, setScenario] = useState<'1st' | '2nd' | '3rd'>('1st');
  const [pathPredictions, setPathPredictions] = useState<Record<string, string>>({});
  const [searchText, setSearchText] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'bracket'>('timeline');

  // Share modal states
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState<boolean>(false);
  const [generatedShareImageUrl, setGeneratedShareImageUrl] = useState<string | null>(null);
  const [shareErrorMessage, setShareErrorMessage] = useState<string | null>(null);

  const [isMounted, setIsMounted] = useState<boolean>(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Selected Team Object
  const selectedTeam = TEAMS.find((t) => t.id === selectedTeamId);

  const generateShareImage = async () => {
    setIsGeneratingShare(true);
    setShareErrorMessage(null);
    setGeneratedShareImageUrl(null);

    // Give DOM a small moment to render the off-screen export container
    await new Promise((resolve) => setTimeout(resolve, 350));

    const element = document.getElementById('export-path-card');
    if (!element) {
      setShareErrorMessage('Could not find road-to-final elements to export.');
      setIsGeneratingShare(false);
      return;
    }

    try {
      const isBracket = viewMode === 'bracket';
      const dataUrl = await toPng(element, {
        cacheBust: true,
        backgroundColor: '#050b18',
        width: isBracket ? 1280 : 800,
        height: isBracket ? 720 : 1000,
        pixelRatio: 3,
      });
      setGeneratedShareImageUrl(dataUrl);
    } catch (err) {
      console.error('Failed to generate image:', err);
      setShareErrorMessage('Failed to generate sharing image. Please try again.');
    } finally {
      setIsGeneratingShare(false);
    }
  };

  // Reset and generate sharing card when modal is opened
  useEffect(() => {
    if (isShareModalOpen) {
      setGeneratedShareImageUrl(null);
      setShareErrorMessage(null);
      generateShareImage();
    }
  }, [isShareModalOpen]);

  const handleDownload = () => {
    if (!generatedShareImageUrl || !selectedTeam) return;
    const scenarioLabel =
      scenario === '1st'
        ? 'Group_Winner'
        : scenario === '2nd'
          ? 'Group_Runner_up'
          : 'Third_Place';
    const filename = `${selectedTeam.name.replace(/\s+/g, '_')}_${scenarioLabel}_Road_To_The_Final.png`;
    const link = document.createElement('a');
    link.download = filename;
    link.href = generatedShareImageUrl;
    link.click();
  };

  const handleCopyToClipboard = async () => {
    if (!generatedShareImageUrl) return;
    try {
      const response = await fetch(generatedShareImageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      alert('Path to the final image copied to clipboard! You can now paste it in your chats.');
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      alert('Could not copy directly to clipboard. Please try right-clicking or long-pressing the preview image to save it.');
    }
  };

  const handleSystemShare = async () => {
    if (!generatedShareImageUrl) return;
    try {
      const response = await fetch(generatedShareImageUrl);
      const blob = await response.blob();
      const file = new File([blob], `road-to-final.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Road to the Final: ${selectedTeam?.name}`,
          text: `Check out my simulated path to the final for ${selectedTeam?.name}!`,
        });
      } else {
        if (navigator.share) {
          await navigator.share({
            title: `Road to the Final: ${selectedTeam?.name}`,
            text: `Check out my simulated path to the final for ${selectedTeam?.name}!`,
            url: window.location.href,
          });
        } else {
          alert('System sharing is not supported on this browser. Please download the image to share it.');
        }
      }
    } catch (err) {
      console.error('System share failed:', err);
      alert('System sharing failed. Please try downloading the image instead.');
    }
  };

  // Sync Search text with selected team on mount/change
  useEffect(() => {
    if (selectedTeam) {
      setSearchText(selectedTeam.name);
    } else {
      setSearchText('');
    }
  }, [selectedTeamId, selectedTeam]);

  // Handle clicking outside of the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset predictions when team or scenario changes
  const resetPredictions = () => {
    setPathPredictions({});
  };

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeamId(teamId);
    setSearchText(TEAMS.find((t) => t.id === teamId)?.name || '');
    setIsDropdownOpen(false);
    setPathPredictions({});
  };

  const handleScenarioChange = (newScenario: '1st' | '2nd' | '3rd') => {
    setScenario(newScenario);
    setPathPredictions({});
  };

  // Helper: Starting R32 match for a team based on group and scenario
  const getStartingMatch = (group: string, scen: '1st' | '2nd' | '3rd'): { matchId: string; isHome: boolean } => {
    if (scen === '1st') {
      const placeholder = `1${group}`;
      const match = KNOCKOUT_METADATA.find(
        (m) => m.stage === 'R32' && (m.placeholderHome === placeholder || m.placeholderAway === placeholder)
      );
      if (match) {
        return { matchId: match.id, isHome: match.placeholderHome === placeholder };
      }
    } else if (scen === '2nd') {
      const placeholder = `2${group}`;
      const match = KNOCKOUT_METADATA.find(
        (m) => m.stage === 'R32' && (m.placeholderHome === placeholder || m.placeholderAway === placeholder)
      );
      if (match) {
        return { matchId: match.id, isHome: match.placeholderHome === placeholder };
      }
    } else if (scen === '3rd') {
      let matchId = '';
      if (['A', 'D'].includes(group)) matchId = 'R32_1';
      else if (group === 'B') matchId = 'R32_7';
      else if (['C', 'G'].includes(group)) matchId = 'R32_2';
      else if (group === 'E') matchId = 'R32_11';
      else if (group === 'F') matchId = 'R32_15';
      else if (group === 'H') matchId = 'R32_8';
      else if (['I', 'K'].includes(group)) matchId = 'R32_12';
      else if (['J', 'L'].includes(group)) matchId = 'R32_16';

      return { matchId, isHome: false };
    }
    return { matchId: 'R32_1', isHome: true };
  };

  // Helper: Get path match IDs for team under current scenario
  const getPathMatchIds = (): string[] => {
    if (!selectedTeam) return [];
    const path: string[] = [];
    let current = getStartingMatch(selectedTeam.group, scenario);
    while (current) {
      path.push(current.matchId);
      const matchMetadata = KNOCKOUT_METADATA.find((m) => m.id === current.matchId);
      if (matchMetadata && matchMetadata.nextMatchId) {
        current = {
          matchId: matchMetadata.nextMatchId,
          isHome: matchMetadata.nextMatchIsHome || false,
        };
      } else {
        break;
      }
    }
    return path;
  };

  const pathMatchIds = getPathMatchIds();

  // Helper: Get sibling match IDs for the editable steps
  const getSiblingMatchIds = (): string[] => {
    if (!selectedTeam) return [];
    const siblings: string[] = [];
    let current = getStartingMatch(selectedTeam.group, scenario);
    while (current) {
      const matchMetadata = KNOCKOUT_METADATA.find((m) => m.id === current.matchId);
      if (!matchMetadata) break;
      const opponentPlaceholder = current.isHome ? matchMetadata.placeholderAway : matchMetadata.placeholderHome;
      if (opponentPlaceholder && opponentPlaceholder.startsWith('Winner ')) {
        siblings.push(opponentPlaceholder.replace('Winner ', ''));
      }
      if (matchMetadata.nextMatchId) {
        current = {
          matchId: matchMetadata.nextMatchId,
          isHome: matchMetadata.nextMatchIsHome || false,
        };
      } else {
        break;
      }
    }
    return siblings;
  };

  const siblingMatchIds = getSiblingMatchIds();
  const isPathComplete = siblingMatchIds.length > 0 && siblingMatchIds.every((id) => !!pathPredictions[id]);
  const activePredictMatchId = siblingMatchIds.find((id) => !pathPredictions[id]);

  // Play team winner audio when the path is fully predicted
  useEffect(() => {
    if (isPathComplete && selectedTeam) {
      const audioUrl = `/audio/${selectedTeam.id.toLowerCase()}_winner.mp3`;
      const audio = new Audio(audioUrl);
      audio.play().catch((err) => {
        console.warn(`Failed to play team winner audio for ${selectedTeam.name}:`, err);
      });
    }
  }, [isPathComplete, selectedTeamId, selectedTeam]);

  // Helper to check if a prediction is unlocked (all previous sibling predictions are completed)
  const isPredictionUnlocked = (opponentMatchId: string): boolean => {
    const idx = siblingMatchIds.indexOf(opponentMatchId);
    if (idx <= 0) return true; // First one is always unlocked
    for (let i = 0; i < idx; i++) {
      if (!pathPredictions[siblingMatchIds[i]]) {
        return false;
      }
    }
    return true;
  };

  // Helper to get the stage label representing the prediction target
  const getStageLabelForMatchId = (matchId: string): string => {
    const meta = KNOCKOUT_METADATA.find(m => m.id === matchId);
    if (!meta) return 'Previous Stage';
    const stageMap: Record<string, string> = {
      R32: 'Round of 16',
      R16: 'Quarter-finals',
      QF: 'Semi-finals',
      SF: 'The Final'
    };
    return stageMap[meta.stage] || meta.stage;
  };

  // Helper: Check if group stage standings are active
  const isGroupStageActive = (): boolean => {
    return Object.values(standings).some((groupStandings) =>
      groupStandings.some((s) => s.played > 0)
    );
  };

  // Helper: Resolve standard group winner/runner-up slot
  const resolveGroupSlot = (slot: string): string => {
    const match = slot.match(/^([12])([A-L])$/);
    if (!match) return '';

    const pos = parseInt(match[1], 10) - 1; // 0 for 1st, 1 for 2nd
    const group = match[2];

    const groupStandings = standings[group];
    const active = isGroupStageActive();

    let resolvedId = '';

    if (active && groupStandings && groupStandings[pos]) {
      resolvedId = groupStandings[pos].teamId;
    } else {
      // FIFA Rank fallback
      const groupTeams = TEAMS.filter((t) => t.group === group);
      const sorted = [...groupTeams].sort((a, b) => a.rank - b.rank);
      resolvedId = sorted[pos]?.id || '';
    }

    // Edge Case: Prevent selected team from appearing in duplicate group slots
    if (resolvedId === selectedTeamId && selectedTeam) {
      const assumedSlot = scenario === '1st' ? `1${selectedTeam.group}` : scenario === '2nd' ? `2${selectedTeam.group}` : '';
      if (slot !== assumedSlot) {
        if (active && groupStandings) {
          const filtered = groupStandings.filter((s) => s.teamId !== selectedTeamId);
          const actualPosOfSelected = groupStandings.findIndex((s) => s.teamId === selectedTeamId);
          const adjustedPos = actualPosOfSelected < pos ? pos - 1 : pos;
          resolvedId = filtered[adjustedPos]?.teamId || '';
        } else {
          const groupTeams = TEAMS.filter((t) => t.group === group && t.id !== selectedTeamId);
          const sorted = [...groupTeams].sort((a, b) => a.rank - b.rank);
          resolvedId = sorted[pos]?.id || '';
        }
      }
    }

    return resolvedId;
  };

  // Helper: Resolve 3rd place slot
  const resolveThirdPlaceSlot = (matchId: string): string => {
    const indexMap: Record<string, number> = {
      R32_1: 0,
      R32_2: 1,
      R32_11: 2,
      R32_12: 3,
      R32_8: 4,
      R32_7: 5,
      R32_15: 6,
      R32_16: 7,
    };
    const idx = indexMap[matchId];

    // Check if store qualifiedTeams has thirdPlaces populated
    if (idx !== undefined && qualifiedTeams.thirdPlaces && qualifiedTeams.thirdPlaces[idx]) {
      const qualifiedId = qualifiedTeams.thirdPlaces[idx];
      if (qualifiedId !== selectedTeamId) {
        return qualifiedId;
      }
    }

    // Otherwise, simulate 3rd place candidate selection by rank
    const groupsMap: Record<string, string[]> = {
      R32_1: ['A', 'B', 'C', 'D', 'F'],
      R32_2: ['C', 'D', 'F', 'G', 'H'],
      R32_11: ['C', 'E', 'F', 'H', 'I'],
      R32_12: ['E', 'H', 'I', 'J', 'K'],
      R32_8: ['A', 'E', 'H', 'I', 'J'],
      R32_7: ['B', 'E', 'F', 'I', 'J'],
      R32_15: ['E', 'F', 'G', 'I', 'J'],
      R32_16: ['D', 'E', 'I', 'J', 'L'],
    };

    const groups = groupsMap[matchId] || [];
    const active = isGroupStageActive();

    const candidates = groups
      .map((g) => {
        const groupStandings = standings[g];
        if (active && groupStandings && groupStandings[2]) {
          return groupStandings[2].teamId;
        } else {
          const groupTeams = TEAMS.filter((t) => t.group === g);
          const sorted = [...groupTeams].sort((a, b) => a.rank - b.rank);
          return sorted[2]?.id || '';
        }
      })
      .filter(Boolean)
      .filter((id) => id !== selectedTeamId); // Prevent duplicate selected team in 3rd place slots

    const sortedCandidates = candidates
      .map((id) => {
        const team = TEAMS.find((t) => t.id === id);
        return { id, rank: team ? team.rank : 999 };
      })
      .sort((a, b) => a.rank - b.rank);

    return sortedCandidates[0]?.id || '';
  };

  // Helper: Recursive match winner retriever
  const getMatchWinner = (matchId: string): string => {
    if (!selectedTeamId) return '';
    if (pathMatchIds.includes(matchId)) {
      return selectedTeamId;
    }

    if (pathPredictions[matchId]) {
      return pathPredictions[matchId];
    }

    // If it is a user-editable sibling match of our current path, and they haven't predicted it, return empty.
    if (siblingMatchIds.includes(matchId)) {
      return '';
    }

    const matchMetadata = KNOCKOUT_METADATA.find((m) => m.id === matchId);
    if (!matchMetadata) return '';

    let contenderA = '';
    let contenderB = '';

    if (matchMetadata.placeholderHome) {
      if (matchMetadata.placeholderHome.startsWith('Winner ')) {
        contenderA = getMatchWinner(matchMetadata.placeholderHome.replace('Winner ', ''));
      } else {
        contenderA = resolveGroupSlot(matchMetadata.placeholderHome);
      }
    }

    if (matchMetadata.placeholderAway) {
      if (matchMetadata.placeholderAway.startsWith('Winner ')) {
        contenderB = getMatchWinner(matchMetadata.placeholderAway.replace('Winner ', ''));
      } else if (matchMetadata.placeholderAway.startsWith('3rd ')) {
        contenderB = resolveThirdPlaceSlot(matchId);
      } else {
        contenderB = resolveGroupSlot(matchMetadata.placeholderAway);
      }
    }

    if (contenderA && contenderB) {
      const teamA = TEAMS.find((t) => t.id === contenderA);
      const teamB = TEAMS.find((t) => t.id === contenderB);
      const rankA = teamA ? teamA.rank : 999;
      const rankB = teamB ? teamB.rank : 999;
      return rankA < rankB ? contenderA : contenderB;
    }

    return contenderA || contenderB || '';
  };

  // Helper: Generate the full timeline stages
  const generateTimelineStages = (): TimelineStage[] => {
    if (!selectedTeam) return [];
    const timeline: TimelineStage[] = [];
    let current = getStartingMatch(selectedTeam.group, scenario);

    while (current) {
      const matchMetadata = KNOCKOUT_METADATA.find((m) => m.id === current.matchId);
      if (!matchMetadata) break;

      const isHome = current.isHome;
      const opponentPlaceholder = isHome ? matchMetadata.placeholderAway : matchMetadata.placeholderHome;

      let opponentId = '';
      let isInteractive = false;
      let opponentMatchId: string | undefined;
      let contenderAId: string | undefined;
      let contenderBId: string | undefined;
      let predictionId: string | undefined;

      if (opponentPlaceholder) {
        if (opponentPlaceholder.startsWith('Winner ')) {
          isInteractive = true;
          opponentMatchId = opponentPlaceholder.replace('Winner ', '');

          const oppMatchMetadata = KNOCKOUT_METADATA.find((m) => m.id === opponentMatchId);
          if (oppMatchMetadata) {
            if (oppMatchMetadata.placeholderHome) {
              if (oppMatchMetadata.placeholderHome.startsWith('Winner ')) {
                contenderAId = getMatchWinner(oppMatchMetadata.placeholderHome.replace('Winner ', ''));
              } else {
                contenderAId = resolveGroupSlot(oppMatchMetadata.placeholderHome);
              }
            }
            if (oppMatchMetadata.placeholderAway) {
              if (oppMatchMetadata.placeholderAway.startsWith('Winner ')) {
                contenderBId = getMatchWinner(oppMatchMetadata.placeholderAway.replace('Winner ', ''));
              } else if (oppMatchMetadata.placeholderAway.startsWith('3rd ')) {
                contenderBId = resolveThirdPlaceSlot(opponentMatchId!);
              } else {
                contenderBId = resolveGroupSlot(oppMatchMetadata.placeholderAway);
              }
            }
          }

          opponentId = getMatchWinner(opponentMatchId!);
          predictionId = pathPredictions[opponentMatchId!] || opponentId;
        } else if (opponentPlaceholder.startsWith('3rd ')) {
          opponentId = resolveThirdPlaceSlot(current.matchId);
        } else {
          opponentId = resolveGroupSlot(opponentPlaceholder);
        }
      }

      const stageLabels: Record<string, string> = {
        R32: 'Round of 32',
        R16: 'Round of 16',
        QF: 'Quarter-finals',
        SF: 'Semi-finals',
        final: 'The Final',
      };

      timeline.push({
        stage: matchMetadata.stage as any,
        stageLabel: stageLabels[matchMetadata.stage] || matchMetadata.stage,
        matchId: matchMetadata.id,
        matchNumber: getOfficialMatchNumber(matchMetadata.id),
        isHome,
        opponentId,
        isInteractive,
        opponentMatchId,
        contenderAId,
        contenderBId,
        predictionId,
      });

      if (matchMetadata.nextMatchId) {
        current = {
          matchId: matchMetadata.nextMatchId,
          isHome: matchMetadata.nextMatchIsHome || false,
        };
      } else {
        break;
      }
    }

    return timeline;
  };

  const timelineStages = generateTimelineStages();

  const getStageOpponentLabel = (label: string): string => {
    const lower = label.toLowerCase();
    if (lower.includes('round of 16')) return 'Round of 16';
    if (lower.includes('quarter')) return 'Quarter final';
    if (lower.includes('semi')) return 'semi final';
    if (lower.includes('final')) return 'final';
    return label;
  };

  const handlePredict = (matchId: string, teamId: string) => {
    const idx = siblingMatchIds.indexOf(matchId);
    if (idx === -1) return;

    // Enforce sequential prediction order: previous stages must be predicted
    for (let i = 0; i < idx; i++) {
      if (!pathPredictions[siblingMatchIds[i]]) {
        return;
      }
    }

    setPathPredictions((prev) => {
      const nextPredictions = { ...prev, [matchId]: teamId };
      // Clear subsequent predictions if a previous prediction changes
      for (let i = idx + 1; i < siblingMatchIds.length; i++) {
        delete nextPredictions[siblingMatchIds[i]];
      }
      return nextPredictions;
    });
  };

  // Filter teams for autocomplete search
  const filteredTeams = fuzzySearchTeams(TEAMS, searchText);

  return (
    <>
      <div className="w-full glass-panel rounded-3xl p-6 sm:p-8 border-[#FFD700]/10 bg-slate-950/40 shadow-xl flex flex-col gap-8 select-none relative overflow-hidden">
        {/* Background radial gold glow */}
        <div className="absolute -right-40 -top-40 w-96 h-96 bg-gradient-to-br from-[#FFD700]/5 to-transparent blur-[100px] rounded-full pointer-events-none -z-10" />

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center mt-1.5 flex-shrink-0">
              <img
                src="/world_cup_trophy.png"
                alt="World Cup Trophy"
                className="h-8 w-8 object-contain animate-pulse select-none filter drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]"
              />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider font-sports-header flex items-center gap-2">
                Path to the Final
                <span className="text-xs bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/35 px-2.5 py-0.5 rounded-full font-bold">
                  Interactive
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Visualize your team's knockout road and predict potential matchups.
              </p>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-1 leading-relaxed">
                আপনার প্রিয় টিমকে ফাইনাল পর্যন্ত যেতে হলে কোন কোন অপোনেন্টের সাথে মুখোমুখি হওয়া লাগবে? তা দেখতে সার্চ অপশনে গিয়ে আপনার প্রিয় দলের নাম লিখুন এবং যে ম্যাচের ওপর আপনার প্রতিপক্ষ নির্ভর করছে সেখান থেকে বিজয়ী দল বেছে নিন।
              </p>
            </div>
          </div>

          {/* Controls (Switcher & Actions) */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto self-start lg:self-center lg:justify-end">
            {/* Switcher */}
            <div className="h-9 sm:h-10 flex items-center gap-1.5 bg-transparent p-0 w-full sm:w-auto">
              <button
                onClick={() => setViewMode('timeline')}
                className={`flex-1 h-full flex items-center justify-center px-3 sm:px-5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border text-center whitespace-nowrap ${viewMode === 'timeline'
                  ? 'bg-transparent text-slate-300 border-slate-800'
                  : 'bg-transparent text-slate-500 hover:text-slate-400 border-transparent'
                  }`}
              >
                Timeline View
              </button>
              <button
                onClick={() => setViewMode('bracket')}
                className={`flex-1 h-full flex items-center justify-center px-3 sm:px-5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border text-center whitespace-nowrap ${viewMode === 'bracket'
                  ? 'bg-transparent text-slate-300 border-slate-800'
                  : 'bg-transparent text-slate-500 hover:text-slate-400 border-transparent'
                  }`}
              >
                Tournament Bracket View
              </button>
            </div>

            {/* Actions */}
            {(selectedTeamId || Object.keys(pathPredictions).length > 0) && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {selectedTeamId && (
                  isPathComplete ? (
                    <button
                      onClick={() => setIsShareModalOpen(true)}
                      className="flex-1 h-9 sm:h-10 flex items-center justify-center gap-1 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/30 text-[10px] sm:text-xs font-bold text-white transition-all shadow-md hover:shadow-emerald-500/10 cursor-pointer animate-fade-in text-center whitespace-nowrap"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share / Download
                    </button>
                  ) : (
                    <div
                      title="Complete all match predictions to unlock sharing"
                      className="flex-1 h-9 sm:h-10 flex items-center justify-center gap-1 px-3.5 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-500 text-[10px] sm:text-xs font-bold uppercase select-none cursor-not-allowed animate-fade-in text-center whitespace-nowrap"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Share / Download
                    </div>
                  )
                )}
                {Object.keys(pathPredictions).length > 0 && (
                  <button
                    onClick={resetPredictions}
                    className="flex-1 h-9 sm:h-10 flex items-center justify-center gap-1 px-3.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] sm:text-xs font-bold text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer text-center whitespace-nowrap"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset predictions
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selector Area (Autocomplete and Scenario Tabs) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Autocomplete Input */}
          <div className="lg:col-span-5 flex flex-col gap-2 relative" ref={dropdownRef}>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Select Your Team
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Search team (e.g. Argentina, Brazil)"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-800 bg-slate-950/60 text-sm font-semibold text-white focus:outline-none focus:border-[#FFD700]/50 focus:shadow-[0_0_12px_rgba(255,215,0,0.08)] transition-all"
              />
              {selectedTeam && (
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none select-none">
                  <img
                    src={getFlagUrl(selectedTeam.id)}
                    alt={selectedTeam.name}
                    className="w-6 h-4 object-cover rounded shadow-sm border border-slate-900"
                  />
                </div>
              )}
            </div>

            {/* Autocomplete Dropdown List */}
            {isDropdownOpen && (
              <div className="absolute top-[76px] left-0 w-full max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 shadow-2xl z-50 py-1">
                {filteredTeams.length > 0 ? (
                  filteredTeams.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleTeamSelect(t.id)}
                      className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-slate-900 transition-colors text-xs font-semibold ${t.id === selectedTeamId ? 'bg-slate-900/60 text-[#FFD700]' : 'text-slate-300'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={getFlagUrl(t.id)}
                          alt={t.name}
                          className="w-5.5 h-3.5 object-cover rounded shadow-sm border border-slate-950"
                        />
                        <span>{t.name}</span>
                        <span className="text-[10px] text-slate-500 font-bold">Group {t.group}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold font-sports-header">
                        Rank #{t.rank}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-xs text-slate-500 text-center">
                    No teams found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scenario Tabs */}
          <div className="lg:col-span-7 flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Group Finishing Scenario
            </label>
            <div className="grid grid-cols-3 gap-2 bg-slate-950/60 border border-slate-900 p-1.5 rounded-2xl">
              {(['1st', '2nd', '3rd'] as const).map((scen) => {
                const labelMap = { '1st': 'Winner (1st)', '2nd': 'Runner-up (2nd)', '3rd': 'Third (3rd)' };
                const isActive = scenario === scen;
                return (
                  <button
                    key={scen}
                    onClick={() => handleScenarioChange(scen)}
                    className={`w-full py-2 px-1 rounded-xl font-black uppercase tracking-normal sm:tracking-wider whitespace-nowrap leading-tight ${
                      scen === '2nd'
                        ? 'text-[8px] min-[380px]:text-[10px] sm:text-xs'
                        : 'text-[9px] min-[380px]:text-[10px] sm:text-xs'
                    } ${isActive
                      ? 'bg-gradient-to-r from-[#78350f] to-[#FFD700] text-white shadow-md border border-[#FFD700]/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent'
                      }`}
                  >
                    {labelMap[scen]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Disclaimers, Notifications & Timeline Section */}
        {selectedTeamId && selectedTeam ? (
          <div className="flex flex-col gap-8 animate-fade-in">
            {/* Disclaimers & Standing Notifications */}
            <div className="flex flex-col gap-2">
              {scenario === '3rd' && (
                <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 text-blue-400 text-[11px] p-3.5 rounded-xl">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="leading-relaxed">
                    <strong>Disclaimer for 3rd Place Finish:</strong> Mappings for 3rd place teams depend on a complex FIFA matrix matching the specific 8 groups that advance. For this simulator, we have assigned a safe, fixed path. *Assumes this team qualifies as one of the 8 best 3rd-place teams.*
                  </p>
                </div>
              )}
            </div>

            {viewMode === 'timeline' ? (
              // Timeline Section
              <div className="relative flex flex-col mt-4">
                {/* Glow track connector line */}
                <div className="absolute left-[16px] sm:left-[32px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-[#FFD700]/80 via-emerald-500/50 to-[#FFD700]/80" />

                {timelineStages.map((stage, idx) => {
                  const opponent = TEAMS.find((t) => t.id === stage.opponentId);
                  const contenderA = TEAMS.find((t) => t.id === stage.contenderAId);
                  const contenderB = TEAMS.find((t) => t.id === stage.contenderBId);

                  const isPredictionASelected = stage.predictionId === stage.contenderAId;
                  const isPredictionBSelected = stage.predictionId === stage.contenderBId;

                  return (
                    <div key={stage.matchId} className="relative pl-8 sm:pl-16 pb-10 last:pb-0 flex flex-col">
                      {/* Timeline dot badge */}
                      <div className="absolute left-[16px] sm:left-[32px] top-1.5 -translate-x-1/2 w-6 h-6 rounded-full bg-slate-950 border-2 border-[#FFD700] shadow-[0_0_8px_rgba(255,215,0,0.5)] flex items-center justify-center z-10">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      </div>

                      {/* Content row: aligned horizontally on desktop, stacked vertically on mobile */}
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-8 w-full">
                        {/* Stage label and Match tag */}
                        <div className="sm:w-44 flex-shrink-0 flex flex-col pt-1.5 text-left select-none">
                          <span className="text-sm sm:text-lg md:text-xl font-black uppercase tracking-wider text-[#FFD700] font-sports-header">
                            {stage.stageLabel}
                          </span>
                          <span className="text-xs font-bold text-slate-500 mt-0.5">
                            Match {stage.matchNumber}
                          </span>
                        </div>

                        {/* Match Card Container */}
                        <div className="flex-1 flex flex-col gap-3.5">
                          {/* Main Fixture Display */}
                          <div className="flex flex-col gap-3 glass-panel-clear border-slate-900 bg-slate-950/20 p-4 sm:p-5 rounded-2xl relative shadow-md hover:border-slate-800 transition-colors">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                              {/* Left Contender: Our Team */}
                              <div className="flex items-center gap-3 w-full md:w-5/12 bg-gradient-to-r from-emerald-950/25 to-slate-950/10 border border-emerald-500/20 p-2.5 rounded-xl">
                                <img
                                  src={getFlagUrl(selectedTeam.id)}
                                  alt={selectedTeam.name}
                                  className="w-8 h-5 object-cover rounded shadow-sm border border-slate-950 flex-shrink-0"
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-sm font-extrabold text-white truncate">
                                    {selectedTeam.name}
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] rounded ml-auto">
                                  YOU
                                </span>
                              </div>

                              {/* VS Badge */}
                              <div className="text-xs font-black text-[#FFD700] uppercase tracking-widest px-3 py-1 bg-slate-950 border border-slate-900 rounded-full select-none shadow-inner">
                                VS
                              </div>

                              {/* Right Contender: Opponent */}
                              <div className="flex items-center gap-3 w-full md:w-5/12 border border-slate-800 bg-slate-950/40 p-2.5 rounded-xl">
                                {opponent ? (
                                  <>
                                    <img
                                      src={getFlagUrl(opponent.id)}
                                      alt={opponent.name}
                                      className="w-8 h-5 object-cover rounded shadow-sm border border-slate-950 flex-shrink-0"
                                    />
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-sm font-extrabold text-white truncate">
                                        {opponent.name}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-bold ml-auto font-sports-header">
                                      #{opponent.rank}
                                    </span>
                                  </>
                                ) : (
                                  <div className="flex items-center justify-center py-2 w-full text-slate-500 text-xs font-bold uppercase tracking-wider">
                                    TBD Opponent
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Dedicated Interactive Prediction Card */}
                          {stage.isInteractive && contenderA && contenderB && (() => {
                            const unlocked = isPredictionUnlocked(stage.opponentMatchId!);
                            return (
                              <div className={`flex flex-col gap-3 bg-slate-950/40 border rounded-2xl p-4 sm:p-5 shadow-sm animate-fade-in transition-all duration-300 ${!unlocked
                                ? 'border-slate-900/60 opacity-40 select-none'
                                : activePredictMatchId && stage.opponentMatchId === activePredictMatchId
                                  ? 'animate-border-glow border-sky-500/35 shadow-[0_0_15px_rgba(56,189,248,0.15)]'
                                  : 'border-slate-800'
                                }`}>
                                {!unlocked ? (
                                  <div className="flex flex-col items-center justify-center py-2 text-slate-500 gap-1.5">
                                    <Lock className="h-4 w-4 text-amber-500/70" />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-center">
                                      Predict {getStageLabelForMatchId(siblingMatchIds[siblingMatchIds.indexOf(stage.opponentMatchId!) - 1])} First
                                    </span>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 text-[9px] min-[380px]:text-[10px] sm:text-xs font-black tracking-wider text-slate-400 uppercase text-center">
                                      <span>Predict Match {getOfficialMatchNumber(stage.opponentMatchId!)} Winner</span>
                                      <span className="text-[#FFD700] font-bold normal-case sm:whitespace-nowrap">
                                        (to see who will be your opponent in {getStageOpponentLabel(stage.stageLabel)})
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2.5">
                                      {/* Contender A Button */}
                                      <button
                                        onClick={() => handlePredict(stage.opponentMatchId!, contenderA.id)}
                                        className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all text-left cursor-pointer ${isPredictionASelected
                                          ? 'bg-sky-500/10 border-sky-500/40 text-white shadow-[0_0_12px_rgba(56,189,248,0.1)]'
                                          : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 hover:border-slate-800'
                                          }`}
                                      >
                                        <img
                                          src={getFlagUrl(contenderA.id)}
                                          alt={contenderA.name}
                                          className="w-5.5 h-3.5 object-cover rounded shadow-sm border border-slate-950"
                                        />
                                        <span className="text-xs font-extrabold truncate flex-1">{contenderA.name}</span>
                                        {isPredictionASelected && (
                                          <Check className="h-3.5 w-3.5 text-sky-400 flex-shrink-0" />
                                        )}
                                      </button>

                                      {/* Contender B Button */}
                                      <button
                                        onClick={() => handlePredict(stage.opponentMatchId!, contenderB.id)}
                                        className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all text-left cursor-pointer ${isPredictionBSelected
                                          ? 'bg-sky-500/10 border-sky-500/40 text-white shadow-[0_0_12px_rgba(56,189,248,0.1)]'
                                          : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 hover:border-slate-800'
                                          }`}
                                      >
                                        <img
                                          src={getFlagUrl(contenderB.id)}
                                          alt={contenderB.name}
                                          className="w-5.5 h-3.5 object-cover rounded shadow-sm border border-slate-950"
                                        />
                                        <span className="text-xs font-extrabold truncate flex-1">{contenderB.name}</span>
                                        {isPredictionBSelected && (
                                          <Check className="h-3.5 w-3.5 text-sky-400 flex-shrink-0" />
                                        )}
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Tournament Bracket Section
              <div className="w-full overflow-x-auto pb-4 no-scrollbar mt-4 animate-fade-in">
                <div className="min-w-[1240px] flex items-center justify-between py-6 px-4 relative">
                  {timelineStages.map((stage, idx) => {
                    const opponent = TEAMS.find((t) => t.id === stage.opponentId);
                    const contenderA = TEAMS.find((t) => t.id === stage.contenderAId);
                    const contenderB = TEAMS.find((t) => t.id === stage.contenderBId);

                    const isPredictionASelected = stage.predictionId === stage.contenderAId;
                    const isPredictionBSelected = stage.predictionId === stage.contenderBId;

                    const isFinal = stage.stage === 'final';
                    const stageHeaderColor = isFinal ? 'text-[#FFD700]' : 'text-emerald-400';

                    // Selected team is always rendered first, opponent is always second
                    const topTeam = selectedTeam;
                    const bottomTeam = opponent;

                    return (
                      <div key={stage.matchId} className="flex items-center flex-1">
                        {/* Bracket Node Wrapper */}
                        <div className="flex flex-col gap-2.5">
                          {/* Podium Header for Final */}
                          {isFinal && (
                            <div className="flex justify-center mb-1 animate-pulse">
                              <span className="text-[9px] font-black text-[#FFD700] bg-[#FFD700]/10 px-3 py-1 rounded-full border border-[#FFD700]/30 uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,215,0,0.2)]">
                                🏆 PODIUM
                              </span>
                            </div>
                          )}

                          {/* Bracket Node Card */}
                          <div className={`flex flex-col gap-3.5 w-64 bg-slate-950/70 border p-4 sm:p-5 rounded-2xl relative select-none transition-all duration-300 hover:scale-[1.02] ${activePredictMatchId && stage.opponentMatchId === activePredictMatchId
                            ? 'animate-border-glow border-sky-500/35 shadow-[0_0_20px_rgba(56,189,248,0.15)]'
                            : isFinal
                              ? 'border-[#FFD700]/35 shadow-[0_0_20px_rgba(255,215,0,0.06)]'
                              : 'border-slate-800/80 hover:border-emerald-500/20 shadow-[0_15px_30px_rgba(0,0,0,0.4)]'
                            }`}>
                            {/* Match Stage Title */}
                            <div className={`text-xs sm:text-lg font-black uppercase tracking-widest text-center border-b border-slate-900 pb-2.5 font-sports-header ${stageHeaderColor}`}>
                              {stage.stageLabel}
                            </div>

                            {/* Match Code Info */}
                            <div className="text-[8px] font-black text-slate-500 tracking-wider uppercase text-center mb-0.5">
                              MATCH {stage.matchNumber} • {opponent ? 'COMPLETED' : 'UPCOMING'}
                            </div>

                            {/* Teams list with inner gray border */}
                            <div className="flex flex-col p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-xl gap-2">
                              {/* Top Team Row (Selected Team) */}
                              {opponent ? (
                                <div className="flex items-center gap-2.5 p-2 rounded-xl border border-emerald-500/35 bg-emerald-950/20 text-white font-extrabold shadow-[0_0_8px_rgba(16,185,129,0.08)]">
                                  <img
                                    src={getFlagUrl(topTeam.id)}
                                    alt={topTeam.name}
                                    className="w-6 h-4 object-cover rounded shadow-sm border border-slate-950 flex-shrink-0"
                                  />
                                  <span className="text-xs truncate flex-1 tracking-wide uppercase font-extrabold">{topTeam.name}</span>
                                  <div className="flex items-center gap-1.5 ml-auto">
                                    <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">YOU</span>
                                    <div className="w-4.5 h-4.5 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                                      <Check className="h-3 w-3 text-slate-950 stroke-[4]" />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-800 bg-slate-950/40 text-slate-400 font-extrabold">
                                  <img
                                    src={getFlagUrl(topTeam.id)}
                                    alt={topTeam.name}
                                    className="w-6 h-4 object-cover rounded shadow-sm border border-slate-950 flex-shrink-0"
                                  />
                                  <span className="text-xs truncate flex-1 tracking-wide uppercase font-extrabold">{topTeam.name}</span>
                                  <div className="flex items-center gap-1.5 ml-auto">
                                    <span className="text-[8px] font-black text-slate-500 bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-800/80">YOU</span>
                                  </div>
                                </div>
                              )}

                              {/* VS Divider */}
                              <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest text-center select-none py-0.5">
                                VS
                              </div>

                              {/* Bottom Team Row (Opponent) */}
                              {bottomTeam ? (
                                <div className="flex items-center gap-2.5 p-2 rounded-xl border border-transparent bg-slate-950/30 text-slate-500 opacity-45 hover:opacity-60 transition-all">
                                  <img
                                    src={getFlagUrl(bottomTeam.id)}
                                    alt={bottomTeam.name}
                                    className="w-6 h-4 object-cover rounded shadow-sm border border-slate-950 flex-shrink-0"
                                  />
                                  <span className="text-xs truncate flex-1 tracking-wide uppercase font-extrabold">{bottomTeam.name}</span>
                                  <span className="text-[15px] font-bold text-slate-500 font-sports-header ml-auto">#{bottomTeam.rank}</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center p-2 bg-slate-950/30 border border-dashed border-slate-900 rounded-xl min-h-[38px] opacity-40">
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TBD OPPONENT</span>
                                </div>
                              )}
                            </div>

                            {/* Interactive Prediction Panel */}
                            {stage.isInteractive && contenderA && contenderB && (() => {
                              const unlocked = isPredictionUnlocked(stage.opponentMatchId!);
                              return (
                                <div className="mt-3 pt-3 border-t border-slate-900 flex flex-col gap-2 transition-all duration-300">
                                  {!unlocked ? (
                                    <div className="flex items-center justify-center gap-1 py-1.5 text-slate-500">
                                      <Lock className="h-3 w-3 text-amber-500/70" />
                                      <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-wider text-center">
                                        Predict {getStageLabelForMatchId(siblingMatchIds[siblingMatchIds.indexOf(stage.opponentMatchId!) - 1])} First
                                      </span>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider text-center">Predict Match Winner</span>
                                      <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                          onClick={() => handlePredict(stage.opponentMatchId!, contenderA.id)}
                                          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-[10px] font-extrabold transition-all cursor-pointer ${isPredictionASelected
                                            ? 'bg-sky-500/10 border-sky-500/40 text-white shadow-sm'
                                            : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:text-white hover:bg-slate-900'
                                            }`}
                                        >
                                          <img src={getFlagUrl(contenderA.id)} className="w-4 h-2.5 object-cover rounded-sm" />
                                          <span className="truncate text-center w-full">{contenderA.name}</span>
                                        </button>
                                        <button
                                          onClick={() => handlePredict(stage.opponentMatchId!, contenderB.id)}
                                          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-[10px] font-extrabold transition-all cursor-pointer ${isPredictionBSelected
                                            ? 'bg-sky-500/10 border-sky-500/40 text-white shadow-sm'
                                            : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:text-white hover:bg-slate-900'
                                            }`}
                                        >
                                          <img src={getFlagUrl(contenderB.id)} className="w-4 h-2.5 object-cover rounded-sm" />
                                          <span className="truncate text-center w-full">{contenderB.name}</span>
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Premium Connector Arrow pointing from Left to Right */}
                        {idx < timelineStages.length - 1 && (
                          <div className="flex items-center justify-center w-16 flex-shrink-0 relative">
                            {opponent ? (
                              <>
                                {/* Glowing line shaft */}
                                <div className="w-full h-[3px] bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                                {/* Glowing arrowhead on the right */}
                                <div className="absolute right-[-2px] flex items-center justify-center">
                                  <svg className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6" />
                                  </svg>
                                </div>
                              </>
                            ) : (
                              <>
                                {/* Dimmed dotted line shaft */}
                                <div className="w-full h-[1.5px] border-t border-dashed border-slate-800/80 opacity-40" />
                                {/* Dimmed arrowhead on the right */}
                                <div className="absolute right-[-2px] flex items-center justify-center opacity-40">
                                  <svg className="h-4 w-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6" />
                                  </svg>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Quick Share / Download Bar */}
            <div className="flex items-center justify-center gap-3 pt-6 border-t border-slate-900/80 mt-4 flex-shrink-0">
              {isPathComplete ? (
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-4.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/35 text-xs font-bold text-white uppercase tracking-wider transition-all shadow-md hover:shadow-emerald-500/20 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share / Download
                </button>
              ) : (
                <div
                  title="Complete all match predictions to unlock sharing"
                  className="flex items-center justify-center gap-1.5 px-4.5 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-500 text-xs font-bold uppercase tracking-wider select-none cursor-not-allowed"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Share / Download
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-950/10 select-none animate-fade-in">
            <Trophy className="h-10 w-10 text-[#FFD700] mb-3 opacity-60 animate-pulse" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sports-header">
              Select a Team to Begin
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
              Search and select your favorite country above to dynamically simulate their path to the 2026 World Cup Final.
            </p>
          </div>
        )}
      </div>

      {/* Hidden Export Card Container */}
      {selectedTeam && (
        <div className="absolute left-[-9999px] top-[-9999px] pointer-events-none select-none">
          <div
            id="export-path-card"
            className={`bg-[#050b18] text-white p-8 pt-10 pb-10 flex flex-col justify-between items-center relative overflow-hidden ${viewMode === 'bracket' ? 'w-[1280px] h-[720px]' : 'w-[800px] h-[1000px]'
              }`}
            style={{ fontFamily: 'sans-serif' }}
          >
            {/* Soccer field background design lines */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none border-[3px] border-slate-500/25 m-12 rounded-3xl flex items-center justify-center -z-10">
              <div className="w-72 h-72 rounded-full border-[3px] border-slate-500/25 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-slate-500/25" />
              </div>
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-slate-500/25" />
            </div>

            {/* Decorative Glowing Orbs */}
            <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-600/5 blur-[120px] -z-10" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-indigo-500/5 blur-[120px] -z-10" />

            {/* Conditionally Render Header & Summary Box */}
            {viewMode === 'bracket' ? (
              <div className="w-full flex items-center justify-between gap-6 border-b border-slate-800/80 pb-4 z-10 flex-shrink-0">
                <div className="flex flex-col items-start gap-1">
                  <div className="px-3.5 py-1.5 rounded-full bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30 text-[10px] font-black uppercase tracking-widest">
                    ⚽ FIFA WORLD CUP 2026 SIMULATOR
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-white uppercase mt-1">
                    Road to the Final
                  </h1>
                </div>

                <div className="flex items-center gap-4 bg-slate-900 border border-slate-700/80 px-4 py-2 rounded-xl shadow-[0_2px_15px_rgba(0,0,0,0.4)]">
                  <img
                    src={getFlagUrl(selectedTeam.id) + "?cors"}
                    alt=""
                    crossOrigin="anonymous"
                    className="w-12 h-8 object-cover rounded border border-slate-950 flex-shrink-0"
                  />
                  <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-wider leading-none">{selectedTeam.name}</h2>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider mt-1.5">
                      FIFA Rank #{selectedTeam.rank} • {scenario === '1st' ? 'Winner (1st)' : scenario === '2nd' ? 'Runner-up (2nd)' : 'Third (3rd)'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center z-10 flex flex-col items-center gap-4 w-full">
                  <div className="px-4 py-1.5 rounded-full bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30 text-xs font-black uppercase tracking-widest">
                    ⚽ FIFA WORLD CUP 2026 SIMULATOR
                  </div>
                  <h1 className="text-4xl font-black tracking-tight text-white uppercase mt-2">
                    Road to the Final
                  </h1>
                  <div className="w-24 h-1 bg-gradient-to-r from-[#FFD700] to-emerald-500 rounded-full mt-2" />
                </div>

                <div className="w-full flex items-center gap-6 bg-slate-900 border-2 border-slate-700/80 p-6 rounded-2xl mt-4 z-10 shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
                  <img
                    src={getFlagUrl(selectedTeam.id) + "?cors"}
                    alt=""
                    crossOrigin="anonymous"
                    className="w-24 h-15 object-cover rounded shadow-md border-2 border-slate-950 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-3xl font-black text-white uppercase tracking-wider truncate">{selectedTeam.name}</h2>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-wider mt-1">
                      FIFA Rank #{selectedTeam.rank} • Group {selectedTeam.group}
                    </p>
                  </div>
                  <div className="px-5 py-2.5 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/40 text-[#FFD700] text-sm font-black uppercase tracking-wider">
                    Group {scenario === '1st' ? 'Winner (1st)' : scenario === '2nd' ? 'Runner-up (2nd)' : 'Third (3rd)'}
                  </div>
                </div>
              </>
            )}

            {/* Conditionally Render Content */}
            {viewMode === 'bracket' ? (
              <div className="w-full flex items-center justify-between py-4 px-2 z-10 my-auto">
                {timelineStages.map((stage, idx) => {
                  const opponent = TEAMS.find((t) => t.id === stage.opponentId);
                  const isFinal = stage.stage === 'final';
                  const stageHeaderColor = isFinal ? 'text-[#FFD700]' : 'text-emerald-400';

                  const topTeam = selectedTeam;
                  const bottomTeam = opponent;

                  return (
                    <div key={stage.matchId} className="flex items-center flex-1">
                      <div className="flex flex-col gap-1.5 w-52 bg-slate-900 border border-slate-700/80 p-3.5 rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.5)]">
                        <div className={`text-[20px] font-black uppercase tracking-widest text-center border-b border-slate-800 pb-1.5 font-sports-header ${stageHeaderColor}`}>
                          {stage.stageLabel}
                        </div>
                        <div className="text-[8.5px] font-black text-slate-500 tracking-wider uppercase text-center mt-0.5">
                          MATCH {stage.matchNumber} • {opponent ? 'COMPLETED' : 'UPCOMING'}
                        </div>

                        <div className="flex flex-col p-2 bg-slate-950/45 border border-slate-800/80 rounded-lg gap-1.5 mt-1">
                          {opponent ? (
                            <div className="flex items-center gap-2 p-1.5 rounded-lg border border-emerald-500/35 bg-emerald-950/20 text-white font-extrabold shadow-[0_0_8px_rgba(16,185,129,0.08)]">
                              <img
                                src={getFlagUrl(topTeam.id) + "?cors"}
                                alt=""
                                crossOrigin="anonymous"
                                className="w-5.5 h-3.5 object-cover rounded border border-slate-950 flex-shrink-0"
                              />
                              <span className="text-[10px] truncate flex-1 tracking-wide uppercase font-extrabold">{topTeam.name}</span>
                              <div className="flex items-center gap-1 ml-auto">
                                <span className="text-[7px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">YOU</span>
                                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
                                  <Check className="h-2 w-2 text-slate-950 stroke-[4]" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-800 bg-slate-900/30 text-slate-400 font-extrabold">
                              <img
                                src={getFlagUrl(topTeam.id) + "?cors"}
                                alt=""
                                crossOrigin="anonymous"
                                className="w-5.5 h-3.5 object-cover rounded border border-slate-950 flex-shrink-0"
                              />
                              <span className="text-[10px] truncate flex-1 tracking-wide uppercase font-extrabold">{topTeam.name}</span>
                              <div className="flex items-center gap-1 ml-auto">
                                <span className="text-[7px] font-black text-slate-500 bg-slate-950 px-1 py-0.5 rounded border border-slate-800/60">YOU</span>
                              </div>
                            </div>
                          )}

                          <div className="text-[7px] font-black text-slate-600 uppercase tracking-widest text-center py-0.5">
                            VS
                          </div>

                          {bottomTeam ? (
                            <div className="flex items-center gap-2 p-1.5 rounded-lg border border-transparent bg-slate-950/20 text-slate-500 opacity-60">
                              <img
                                src={getFlagUrl(bottomTeam.id) + "?cors"}
                                alt=""
                                crossOrigin="anonymous"
                                className="w-5.5 h-3.5 object-cover rounded border border-slate-950 flex-shrink-0"
                              />
                              <span className="text-[10px] truncate flex-1 tracking-wide uppercase font-extrabold">{bottomTeam.name}</span>
                              <span className="text-[8px] font-bold text-slate-500 font-sports-header ml-auto">#{bottomTeam.rank}</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center p-1.5 bg-slate-950/20 border border-dashed border-slate-800/50 rounded-lg min-h-[30px] opacity-40">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">TBD OPPONENT</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {idx < timelineStages.length - 1 && (
                        <div className="flex items-center justify-center w-10 flex-shrink-0 relative">
                          {opponent ? (
                            <>
                              <div className="w-full h-[2.5px] bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                              <div className="absolute right-[-1px] flex items-center justify-center">
                                <svg className="h-3 w-3 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.9)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-full h-[1.5px] border-t border-dashed border-slate-800 opacity-40" />
                              <div className="absolute right-[-1px] flex items-center justify-center opacity-40">
                                <svg className="h-3 w-3 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="relative w-full flex-grow flex flex-col justify-between my-4 z-10 min-h-[520px]">
                <div className="absolute left-[36px] top-6 bottom-6 w-[3px] bg-gradient-to-b from-[#FFD700] via-emerald-500 to-[#FFD700] opacity-90" />

                {timelineStages.map((stage) => {
                  const opponent = TEAMS.find((t) => t.id === stage.opponentId);
                  return (
                    <div key={stage.matchId} className="relative pl-16 flex items-center">
                      <div className="absolute left-[36px] top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-slate-950 border-2 border-[#FFD700] flex items-center justify-center z-10 shadow-[0_0_8px_rgba(255,215,0,0.4)]">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      </div>

                      <div className="w-32 flex-shrink-0 flex flex-col text-left">
                        <span className="text-[20px] font-black uppercase tracking-wider text-[#FFD700] font-sports-header">
                          {stage.stageLabel}
                        </span>
                        <span className="text-[11px] font-extrabold text-slate-400 mt-0.5">
                          Match {stage.matchNumber}
                        </span>
                      </div>

                      <div className="flex-1 flex items-center justify-between bg-slate-900 border-2 border-slate-700/80 p-4 rounded-2xl gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                        <div className="flex items-center gap-3.5 w-[42%] min-w-0">
                          <img
                            src={getFlagUrl(selectedTeam.id) + "?cors"}
                            alt=""
                            crossOrigin="anonymous"
                            className="w-10 h-6.5 object-cover rounded border border-slate-950 flex-shrink-0 shadow-sm"
                          />
                          <span className="text-base font-black text-white truncate uppercase tracking-wide">{selectedTeam.name}</span>
                        </div>

                        <div className="text-[11px] font-black text-[#FFD700] px-2.5 py-0.5 bg-slate-950 border border-slate-800 rounded-full flex-shrink-0 shadow-inner">
                          VS
                        </div>

                        <div className="flex items-center justify-end gap-3.5 w-[42%] min-w-0 text-right">
                          {opponent ? (
                            <>
                              <span className="text-base font-black text-white truncate uppercase tracking-wide">{opponent.name}</span>
                              <img
                                src={getFlagUrl(opponent.id) + "?cors"}
                                alt=""
                                crossOrigin="anonymous"
                                className="w-10 h-6.5 object-cover rounded border border-slate-950 flex-shrink-0 shadow-sm"
                              />
                            </>
                          ) : (
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">TBD Opponent</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            <div className="text-center z-10 flex flex-col items-center gap-2 flex-shrink-0">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Simulated with FIFA World Cup 2026 Predictor
              </p>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                Developed by Rakib • A die-hard Messi fan
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SHARE PATH MODAL */}
      {isShareModalOpen && isMounted && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4 animate-fade-in select-none">
          <div className={`bg-slate-950 border border-slate-800/80 rounded-3xl p-6 md:p-8 w-full max-h-[95vh] overflow-y-auto flex flex-col gap-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${viewMode === 'bracket' ? 'max-w-2xl' : 'max-w-sm sm:max-w-md'
            }`}>

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-900 pb-4">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider">Share Road Card</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Generate a picture of your simulated road to the final.</p>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-900 p-2 rounded-xl transition-all cursor-pointer font-bold w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Preview Box */}
            <div className={`relative w-full rounded-2xl border border-slate-900 bg-slate-950 flex flex-col items-center justify-center p-4 overflow-hidden group shadow-inner max-h-[42vh] ${viewMode === 'bracket' ? 'aspect-[16/9]' : 'aspect-[4/5]'
              }`}>
              {isGeneratingShare ? (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <div className="h-8 w-8 rounded-full border-4 border-[#FFD700]/20 border-t-[#FFD700] animate-spin" />
                  <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 animate-pulse">Generating preview...</span>
                </div>
              ) : shareErrorMessage ? (
                <div className="text-center p-4">
                  <p className="text-xs text-rose-500 font-bold mb-2">⚠️ {shareErrorMessage}</p>
                  <button
                    onClick={generateShareImage}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-black uppercase tracking-wider underline cursor-pointer"
                  >
                    Retry Generation
                  </button>
                </div>
              ) : generatedShareImageUrl ? (
                <div className="w-full h-full flex items-center justify-center relative">
                  <img
                    src={generatedShareImageUrl}
                    alt="Road Card Preview"
                    className="max-h-full max-w-full rounded-lg object-contain shadow-md border border-slate-950"
                  />
                </div>
              ) : (
                <button
                  onClick={generateShareImage}
                  className="flex flex-col items-center gap-2 p-6 rounded-xl border border-dashed border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-slate-400 hover:text-[#FFD700] transition-all w-full h-full justify-center group cursor-pointer"
                >
                  <Share2 className="h-8 w-8 text-slate-600 group-hover:text-emerald-400 transition-all" />
                  <span className="text-[10px] uppercase font-black tracking-widest">Generate Preview</span>
                </button>
              )}
            </div>

            {/* Action Buttons */}
            {generatedShareImageUrl && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={handleDownload}
                    className="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-bold text-xs uppercase transition-all shadow-sm cursor-pointer hover:bg-slate-800"
                  >
                    <span>📥</span>
                    <span>Download</span>
                  </button>
                  <button
                    onClick={handleCopyToClipboard}
                    className="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-bold text-xs uppercase transition-all shadow-sm cursor-pointer hover:bg-slate-800"
                  >
                    <span>📋</span>
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={handleSystemShare}
                    className="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-[#FFD700] hover:bg-[#FFD700]/80 text-slate-950 font-black text-xs uppercase transition-all shadow-sm cursor-pointer"
                  >
                    <span>📤</span>
                    <span>Send</span>
                  </button>
                </div>
              </div>
            )}

            {/* Hint */}
            <p className="text-[9px] text-center text-slate-500 font-medium">
              * Note: Clipboard copy and native sharing depend on device support. If they fail, please right-click or long-press the preview image to save it.
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
