
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Wind, Sparkles, ArrowLeft, Play, Pause, RefreshCcw, Mic, MicOff, Activity } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality, ThinkingLevel } from '@google/genai';

interface HealingProps {
  onBack: () => void;
}

const Healing: React.FC<HealingProps> = ({ onBack }) => {
  const [isMeditating, setIsMeditating] = useState(false);
  const [timer, setTimer] = useState(0);
  const [phase, setPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Rest'>('Inhale');
  
  // Live Voice State
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isModelThinking, setIsModelThinking] = useState(false);
  const [error, setError] = useState<any>(null);

  const sessionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);

  // Breathing Timer Logic
  useEffect(() => {
    let interval: any;
    if (isMeditating) {
      interval = setInterval(() => {
        setTimer((prev) => {
          const next = prev + 1;
          if (next % 16 < 4) setPhase('Inhale');
          else if (next % 16 < 8) setPhase('Hold');
          else if (next % 16 < 12) setPhase('Exhale');
          else setPhase('Rest');
          return next;
        });
      }, 1000);
    } else {
      setTimer(0);
      setPhase('Inhale');
    }
    return () => clearInterval(interval);
  }, [isMeditating]);

  // Audio Utilities
  const warmUpAudioContext = (ctx: AudioContext) => {
    if (ctx.state === 'suspended') ctx.resume();
    const buffer = ctx.createBuffer(1, 1, 24000);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const decode = (base64: string) => {
    try {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      return bytes;
    } catch (e) { return new Uint8Array(0); }
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer | null> => {
    try {
      const dataInt16 = new Int16Array(data.buffer);
      const frameCount = dataInt16.length / numChannels;
      const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
      for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
      return buffer;
    } catch (e) { return null; }
  };

  const cleanup = useCallback(() => {
    if (sessionRef.current) { try { sessionRef.current.close(); } catch(e) {} sessionRef.current = null; }
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(track => track.stop());
    
    setIsConnected(false);
    setIsConnecting(false);
    setIsModelThinking(false);
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close().catch(() => {});
    }
  }, []);

  const startCounselling = useCallback(async () => {
    try {
      setError(null);
      setIsConnecting(true);
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      outputAudioContextRef.current = outputCtx;
      warmUpAudioContext(outputCtx);

      const playFromQueue = () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
        isPlayingRef.current = true;
        const buffer = audioQueueRef.current.shift()!;
        const source = outputCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(outputCtx.destination);
        source.onended = () => {
          isPlayingRef.current = false;
          playFromQueue();
        };
        source.start();
      };

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => { 
            setIsConnected(true); setIsConnecting(false); 
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(512, 1, 1);
            scriptProcessor.onaudioprocess = (ev: any) => {
              const inputData = ev.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = { 
                data: encode(new Uint8Array(int16.buffer)), 
                mimeType: 'audio/pcm;rate=16000' 
              };
              sessionPromise.then((s) => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (m: LiveServerMessage) => {
            if (m.serverContent?.modelTurn) setIsModelThinking(false);
            if (m.serverContent?.interrupted) audioQueueRef.current = [];
            
            const base64Audio = m.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              if (audioBuffer) {
                audioQueueRef.current.push(audioBuffer);
                playFromQueue();
              }
            }
          },
          onerror: (e) => { setError(e); cleanup(); },
          onclose: () => cleanup()
        },
        config: { 
          responseModalities: [Modality.AUDIO],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: `You are MMA Healing Core, a sovereign AI live voice counsellor.
          - CRITICAL: Provide extremely fast, one-sentence, direct responses.
          - NO LONG EXPLANATIONS.
          - Personality: Calm, empathetic, non-judgmental, and deeply supportive.
          - Goal: Help the user find mental restoration, neural balance, and emotional clarity.
          - Tone: Soft, steady, and reassuring.
          - Instructions: Listen deeply. Provide short, meaningful reflections. Encourage the user to breathe. You are a safe space.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e: any) { 
      setError({ message: "Connection Error: Check microphone permissions." }); 
      setIsConnecting(false); 
    }
  }, [cleanup]);

  return (
    <div className="min-h-screen bg-[#0a0502] text-[#e0d8d0] relative overflow-hidden flex flex-col items-center justify-center p-6">
      {/* Atmospheric Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#ff4e00]/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#3a1510]/20 rounded-full blur-[150px] [animation-delay:2s] animate-pulse"></div>
      </div>

      {/* Header */}
      <nav className="absolute top-0 w-full p-8 flex justify-between items-center z-50">
        <button 
          onClick={() => { cleanup(); onBack(); }}
          className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.4em] text-[#e0d8d0]/40 hover:text-[#e0d8d0] transition-colors group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back to Core
        </button>
        <div className="flex items-center gap-6">
          <img 
            src="https://lh3.googleusercontent.com/d/10P339qAplGMcC5io0w2F2qFmKfIGw3ZM" 
            alt="Healing Logo" 
            className="w-8 h-8 object-contain brightness-200"
          />
          <div className="flex items-center gap-3">
            <Heart className="text-[#ff4e00] animate-pulse" size={20} />
            <span className="text-[11px] font-black uppercase tracking-[0.6em]">Healing Core</span>
          </div>
        </div>
      </nav>

      {/* Error Display */}
      {error && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[100] bg-red-950/50 backdrop-blur-xl border border-red-500/30 px-6 py-3 rounded-full text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl">
          <Activity size={14} className="animate-pulse" />
          {error.message}
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-2xl w-full flex flex-col items-center text-center space-y-12 z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h2 className="text-5xl md:text-8xl font-black font-outfit uppercase tracking-tighter leading-none">
            Healing <br/><span className="text-[#ff4e00]">with MMA.</span>
          </h2>
          <p className="text-[#e0d8d0]/50 text-lg md:text-xl font-medium max-w-md mx-auto italic">
            {isConnected ? '"I am listening. Take a deep breath."' : '"A sovereign space for mental restoration and neural balance."'}
          </p>
        </motion.div>

        {/* Breathing / Voice Circle */}
        <div className="relative w-64 h-64 md:w-96 md:h-96 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: isConnected ? (isModelThinking ? 1.1 : 1) : (phase === 'Inhale' ? 1.2 : phase === 'Exhale' ? 0.8 : 1),
                opacity: 1 
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: isConnected ? 0.5 : 4, ease: "easeInOut" }}
              className={`absolute inset-0 rounded-full border transition-colors duration-1000 ${isConnected ? 'border-[#ff4e00]/40 bg-[#ff4e00]/10 shadow-[0_0_100px_rgba(255,78,0,0.1)]' : 'border-[#ff4e00]/20 bg-[#ff4e00]/5 backdrop-blur-3xl'}`}
            />
          </AnimatePresence>
          
          <div className="relative z-20 flex flex-col items-center gap-4">
            {isConnected ? (
              <div className="flex flex-col items-center gap-6">
                <div className="flex gap-1 items-center h-8">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ height: isModelThinking ? [8, 24, 8] : 8 }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                      className="w-1 bg-[#ff4e00] rounded-full"
                    />
                  ))}
                </div>
                <span className="text-2xl md:text-4xl font-black uppercase tracking-[0.2em]">
                  {isModelThinking ? 'Thinking...' : 'Listening'}
                </span>
              </div>
            ) : (
              <>
                <Wind className={`text-[#ff4e00] transition-transform duration-1000 ${isMeditating ? 'animate-bounce' : ''}`} size={48} />
                <span className="text-2xl md:text-4xl font-black uppercase tracking-[0.2em]">
                  {isMeditating ? phase : 'Ready?'}
                </span>
                {isMeditating && (
                  <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#e0d8d0]/30">
                    {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-10">
          <div className="flex items-center gap-8">
            {/* Meditate Toggle */}
            <button 
              onClick={() => setIsMeditating(!isMeditating)}
              disabled={isConnected}
              className={`w-16 h-16 rounded-full border flex items-center justify-center transition-all ${isMeditating ? 'bg-[#ff4e00]/20 border-[#ff4e00] text-[#ff4e00]' : 'border-[#e0d8d0]/10 text-[#e0d8d0]/40 hover:bg-white/5'} ${isConnected ? 'opacity-20 cursor-not-allowed' : ''}`}
              title="Breathing Guide"
            >
              <Wind size={24} />
            </button>

            {/* Voice Counselling Toggle */}
            <button 
              onClick={isConnected ? cleanup : startCounselling}
              disabled={isConnecting}
              className={`w-24 h-24 md:w-32 md:h-32 rounded-full flex flex-col items-center justify-center transition-all shadow-2xl active:scale-95 ${isConnected ? 'bg-white text-red-600 shadow-[0_0_60px_rgba(255,255,255,0.2)]' : 'bg-[#ff4e00] text-white shadow-[0_0_60px_rgba(255,78,0,0.3)]'}`}
            >
              {isConnecting ? (
                <RefreshCcw className="animate-spin" size={32} />
              ) : isConnected ? (
                <>
                  <MicOff size={32} />
                  <span className="text-[8px] font-black uppercase tracking-widest mt-2">Stop</span>
                </>
              ) : (
                <>
                  <Mic size={32} />
                  <span className="text-[8px] font-black uppercase tracking-widest mt-2">Start Voice</span>
                </>
              )}
            </button>
            
            <button 
              onClick={() => { setIsMeditating(false); setTimer(0); cleanup(); }}
              className="w-16 h-16 rounded-full border border-[#e0d8d0]/10 flex items-center justify-center hover:bg-white/5 transition-colors"
              title="Reset"
            >
              <RefreshCcw size={24} className="text-[#e0d8d0]/40" />
            </button>
          </div>
          
          <div className="flex items-center gap-4 px-6 py-3 bg-white/5 rounded-full border border-white/5">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-[#ff4e00]/30'}`}></div>
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#e0d8d0]/40">
              {isConnected ? 'Session Active: MMA Healing Core' : 'Voice Protocol: Standby'}
            </span>
          </div>
        </div>

        {/* Guidance */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full pt-12">
          {['Empathy', 'Breathe', 'Restore', 'Listen'].map((step, i) => (
            <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/5 flex flex-col items-center gap-3 group hover:border-[#ff4e00]/30 transition-colors">
              <Sparkles size={16} className="text-[#ff4e00]/40 group-hover:text-[#ff4e00] transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-widest">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Quote */}
      <footer className="absolute bottom-12 text-center opacity-20">
        <p className="text-[9px] font-black uppercase tracking-[0.8em]">MINE AI • SOVEREIGN HEALING PROTOCOL • 2025</p>
      </footer>
    </div>
  );
};

export default Healing;
