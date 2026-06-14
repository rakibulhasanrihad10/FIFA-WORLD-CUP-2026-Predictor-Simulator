'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Award, Medal, Share2, User } from 'lucide-react';
import { toPng } from 'html-to-image';
import { TEAMS, getFlagUrl } from '../data/initialData';
import { useTournamentStore } from '../store/useTournamentStore';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  championId: string | undefined;
  runnerUpId: string | undefined;
  bracketElementId: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  championId,
  runnerUpId,
  bracketElementId,
}: ShareModalProps) {
  const { userName, userAvatar, setBrandingDetails } = useTournamentStore();
  
  // Reusable modal states
  const [modalStep, setModalStep] = useState<'branding' | 'preview'>('branding');
  const [nameInput, setNameInput] = useState(userName || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(userAvatar || null);

  const [shareTab, setShareTab] = useState<'summary' | 'bracket'>('summary');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const champion = championId ? TEAMS.find((t) => t.id === championId) : undefined;
  const runnerUp = runnerUpId ? TEAMS.find((t) => t.id === runnerUpId) : undefined;

  // Reset steps and values when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      setModalStep('branding');
      setNameInput(userName || '');
      setAvatarPreview(userAvatar || null);
      setGeneratedImageUrl(null);
      setErrorMessage(null);
    }
  }, [isOpen, userName, userAvatar]);

  const generateShareImage = async (type: 'summary' | 'bracket') => {
    setIsGenerating(true);
    setErrorMessage(null);
    setGeneratedImageUrl(null);

    // Give DOM a small moment to render/update elements
    await new Promise((resolve) => setTimeout(resolve, 350));

    const targetId = type === 'summary' ? 'export-summary-card' : bracketElementId;
    const element = document.getElementById(targetId);

    if (!element) {
      setErrorMessage('Could not find prediction elements to export.');
      setIsGenerating(false);
      return;
    }

    try {
      const dataUrl = await toPng(element, {
        cacheBust: true,
        backgroundColor: '#060a08',
        ...(type === 'summary' ? { width: 800, height: 1200 } : {}),
      });
      setGeneratedImageUrl(dataUrl);
    } catch (err) {
      console.error('Failed to generate image:', err);
      setErrorMessage('Failed to generate sharing image. Please check permissions or try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate preview image when transitioning to preview step or switching tabs
  useEffect(() => {
    if (isOpen && modalStep === 'preview') {
      generateShareImage(shareTab);
    }
  }, [isOpen, modalStep, shareTab]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size exceeds 2MB limit. Please upload a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBrandingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = nameInput.trim() || 'Football Fan';
    setBrandingDetails(finalName, avatarPreview || undefined);
    setModalStep('preview');
  };

  const handleDownload = () => {
    if (!generatedImageUrl) return;
    const link = document.createElement('a');
    link.download = `world_cup_2026_prediction_${shareTab}.png`;
    link.href = generatedImageUrl;
    link.click();
  };

  const handleCopyToClipboard = async () => {
    if (!generatedImageUrl) return;
    try {
      const response = await fetch(generatedImageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      alert('Prediction image copied to clipboard! You can now paste it in your chats.');
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      alert('Could not copy directly to clipboard. Please try right-clicking or long-pressing the preview image to save it.');
    }
  };

  const handleSystemShare = async () => {
    if (!generatedImageUrl) return;
    try {
      const response = await fetch(generatedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], `world-cup-prediction.png`, { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My FIFA World Cup 2026 Prediction',
          text: `Check out my simulated FIFA World Cup 2026 champion!`,
        });
      } else {
        if (navigator.share) {
          await navigator.share({
            title: 'My FIFA World Cup 2026 Prediction',
            text: champion 
              ? `My predicted champion is ${champion.name}! Simulate yours too!` 
              : `Check out my World Cup bracket simulation!`,
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

  if (!isOpen) return null;

  return (
    <>
      {/* Hidden Export Card Container */}
      <div className="absolute left-[-9999px] top-[-9999px] pointer-events-none select-none">
        <div 
          id="export-summary-card" 
          className="w-[800px] h-[1200px] bg-[#060a08] text-white p-12 flex flex-col justify-between items-center relative overflow-hidden"
          style={{ fontFamily: 'sans-serif' }}
        >
          {/* Soccer field background design lines */}
          <div className="absolute inset-0 opacity-5 pointer-events-none border-[8px] border-white m-6 rounded-3xl flex items-center justify-center">
            <div className="w-80 h-80 rounded-full border-[8px] border-white flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-white" />
            </div>
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-white" />
          </div>

          {/* Decorative Glowing Orbs */}
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px]" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-amber-500/10 blur-[120px]" />

          {/* Header */}
          <div className="text-center z-10 flex flex-col items-center gap-4 mt-8">
            <div className="px-4 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-widest">
              ⚽ FIFA WORLD CUP 2026
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white uppercase mt-2">
              Tournament Prediction
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full mt-2" />

            {/* Personalized branding badge */}
            <div className="flex items-center gap-3 bg-slate-950/60 px-4 py-2 rounded-2xl border border-slate-800/80 mt-4">
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="" 
                  className="w-8 h-8 rounded-full object-cover border border-emerald-500/50 flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 font-extrabold text-sm select-none flex-shrink-0">
                  ⚽
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white">{nameInput || 'Football Fan'}'s Prediction</span>
                <span className="flex items-center justify-center bg-emerald-500 text-slate-950 rounded-full w-3 h-3 text-[7px] font-black select-none">
                  ✓
                </span>
              </div>
            </div>
          </div>

          {/* Champion Podium */}
          <div className="w-full flex flex-col items-center justify-center gap-10 z-10 my-auto">
            {/* Champion Card */}
            <div className="w-[450px] rounded-3xl p-8 border-2 border-amber-400/40 bg-gradient-to-b from-amber-500/10 to-slate-950 flex flex-col items-center text-center gap-6 shadow-[0_12px_40px_rgba(251,191,36,0.15)]">
              <div className="relative">
                <div className="h-32 w-32 rounded-full bg-gradient-to-tr from-amber-500/20 to-amber-500/40 border-4 border-amber-400 flex items-center justify-center shadow-[0_0_35px_rgba(251,191,36,0.3)]">
                  <Trophy className="h-16 w-16 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]" />
                </div>
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                  Champion
                </span>
              </div>
              
              <div>
                <h3 className="font-extrabold text-sm text-amber-400 uppercase tracking-widest flex items-center gap-1.5 justify-center">
                  <Award className="h-5 w-5" />
                  Winner Prediction
                </h3>
                <div className="font-black text-4xl text-white mt-3 flex items-center justify-center gap-3">
                  {champion ? (
                    <>
                      <img 
                        src={getFlagUrl(champion.id) + "?cors"} 
                        alt="" 
                        crossOrigin="anonymous"
                        className="w-11 h-7 object-cover rounded shadow-md border border-amber-400/20"
                      />
                      {champion.name}
                    </>
                  ) : (
                    'To Be Decided'
                  )}
                </div>
                {champion && (
                  <div className="text-xs text-slate-400 font-extrabold uppercase mt-2">Group {champion.group} • Rank {champion.rank}</div>
                )}
              </div>
            </div>

            {/* Runner-up Card */}
            <div className="w-[380px] rounded-2xl p-5 border border-slate-700 bg-gradient-to-b from-slate-900/40 to-slate-950/90 flex flex-col items-center text-center gap-4 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-2">
                <Medal className="h-6 w-6 text-slate-400" />
                <span className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Runner-up</span>
              </div>
              <div className="font-extrabold text-xl text-white flex items-center justify-center gap-2">
                {runnerUp ? (
                  <>
                    <img 
                      src={getFlagUrl(runnerUp.id) + "?cors"} 
                      alt="" 
                      crossOrigin="anonymous"
                      className="w-8 h-5 object-cover rounded shadow border border-slate-800"
                    />
                    {runnerUp.name}
                  </>
                ) : (
                  'To Be Decided'
                )}
              </div>
            </div>
          </div>

          {/* Footer Details */}
          <div className="text-center z-10 mb-8 flex flex-col items-center gap-2">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Simulated with FIFA World Cup 2026 Predictor
            </p>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
              ⚽ 48 Teams • 104 Matches • Complete Bracket Simulation
            </p>
          </div>
        </div>
      </div>

      {/* SHARE PREDICTION MODAL */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4 animate-fade-in select-none">
        <div className="bg-slate-950 border border-slate-800/80 rounded-3xl p-6 md:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto flex flex-col gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          
          {modalStep === 'branding' ? (
            <>
              {/* branding form header */}
              <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">Personalize Prediction</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Enter your details to brand your prediction cards.</p>
                </div>
                <button 
                  onClick={onClose}
                  className="text-slate-400 hover:text-white hover:bg-slate-900 p-2 rounded-xl transition-all cursor-pointer font-bold w-8 h-8 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Branding Form */}
              <form onSubmit={handleBrandingSubmit} className="flex flex-col gap-6">
                {/* Profile Image Zone */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase font-extrabold tracking-wider text-slate-400">Profile Picture</label>
                  <div className="flex items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/40">
                    {avatarPreview ? (
                      <img 
                        src={avatarPreview} 
                        alt="Avatar Preview" 
                        className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 font-extrabold text-3xl select-none flex-shrink-0">
                        ⚽
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <label className="px-3.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-605 text-white font-extrabold text-xs uppercase cursor-pointer hover:bg-slate-700 transition-colors w-fit">
                        Choose File
                        <input 
                          type="file" 
                          accept="image/png, image/jpeg" 
                          className="hidden" 
                          onChange={handleFileChange} 
                        />
                      </label>
                      <span className="text-[9px] text-slate-500 font-bold">Supports PNG, JPG. Max size 2MB.</span>
                      {avatarPreview && (
                        <button 
                          type="button"
                          onClick={() => setAvatarPreview(null)}
                          className="text-[9px] text-left text-rose-500 hover:underline font-bold uppercase w-fit"
                        >
                          Remove photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Full Name input */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase font-extrabold tracking-wider text-slate-400">Your Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rakib Hasan"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    maxLength={25}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 mt-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer text-center"
                >
                  Generate Prediction Image
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">Share Prediction</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Generate a picture of your predicted World Cup results.</p>
                </div>
                <button 
                  onClick={onClose}
                  className="text-slate-400 hover:text-white hover:bg-slate-900 p-2 rounded-xl transition-all cursor-pointer font-bold w-8 h-8 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Modal Tabs */}
              <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-800/40 gap-1">
                <button
                  onClick={() => {
                    setShareTab('summary');
                    setGeneratedImageUrl(null);
                  }}
                  className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    shareTab === 'summary'
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Summary Card
                </button>
                <button
                  onClick={() => {
                    setShareTab('bracket');
                    setGeneratedImageUrl(null);
                  }}
                  className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    shareTab === 'bracket'
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Knockout Bracket
                </button>
              </div>

              {/* Preview Box */}
              <div className="relative aspect-[4/3] w-full rounded-2xl border border-slate-900 bg-slate-950 flex flex-col items-center justify-center p-4 overflow-hidden group shadow-inner">
                {isGenerating ? (
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <div className="h-8 w-8 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 animate-pulse">Generating preview...</span>
                  </div>
                ) : errorMessage ? (
                  <div className="text-center p-4">
                    <p className="text-xs text-rose-500 font-bold mb-2">⚠️ {errorMessage}</p>
                    <button 
                      onClick={() => generateShareImage(shareTab)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-black uppercase tracking-wider underline cursor-pointer"
                    >
                      Retry Generation
                    </button>
                  </div>
                ) : generatedImageUrl ? (
                  <div className="w-full h-full flex items-center justify-center relative">
                    <img 
                      src={generatedImageUrl} 
                      alt="Prediction Preview" 
                      className="max-h-full max-w-full rounded-lg object-contain shadow-md border border-slate-900"
                    />
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-[8px] text-slate-400 font-extrabold uppercase px-2 py-1 rounded">
                      Right click / Long press to save
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => generateShareImage(shareTab)}
                    className="flex flex-col items-center gap-2 p-6 rounded-xl border border-dashed border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-slate-400 hover:text-emerald-400 transition-all w-full h-full justify-center group cursor-pointer"
                  >
                    <Share2 className="h-8 w-8 text-slate-600 group-hover:text-emerald-400 transition-all" />
                    <span className="text-[10px] uppercase font-black tracking-widest">Generate Prediction Image</span>
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              {generatedImageUrl && (
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
                      className="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all shadow-sm cursor-pointer"
                    >
                      <span>📤</span>
                      <span>Send</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setModalStep('branding');
                      setGeneratedImageUrl(null);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-white font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer text-center"
                  >
                    ✎ Edit Name & Photo
                  </button>
                </div>
              )}

              {/* Hint */}
              <p className="text-[9px] text-center text-slate-500 font-medium">
                * Note: Clipboard copy and native sharing depend on device support. If they fail, please right-click or long-press the preview image to save it.
              </p>
            </>
          )}

        </div>
      </div>
    </>
  );
}
