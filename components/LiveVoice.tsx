
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration, ThinkingLevel } from '@google/genai';
import { WorkspaceState } from '../types';
import { Mic, MicOff, X, Activity, Radio, Camera, CameraOff, Monitor, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';

interface LiveVoiceProps { 
  onHome?: () => void;
  userName?: string;
}

const updateWorkspaceTool: FunctionDeclaration = {
  name: 'updateWorkspace',
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: 'Text, code, or test questions' },
      type: { type: Type.STRING, enum: ['markdown', 'code', 'preview', 'cbt'], description: 'What kind of content it is' },
      language: { type: Type.STRING, description: 'If it is code, which language?' },
      title: { type: Type.STRING, description: 'A short name for the page' }
    },
    required: ['content', 'type', 'title'],
  },
};

const LiveVoice: React.FC<LiveVoiceProps> = ({ userName = 'User' }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isModelThinking, setIsModelThinking] = useState(false);
  const [isOff, setIsOff] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [error, setError] = useState<any>(null);
  
  const [workspace, setWorkspace] = useState<WorkspaceState & { isActive: boolean }>({ 
    type: 'markdown', 
    content: '', 
    title: 'Workspace', 
    isActive: false 
  });

  const sessionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const frameIntervalRef = useRef<any>(null);

  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);

  const warmUpAudioContext = (ctx: AudioContext) => {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && sessionRef.current) {
      setIsProcessingImage(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        sessionRef.current.sendRealtimeInput({
          media: { data: base64, mimeType: file.type }
        });
        setTimeout(() => setIsProcessingImage(false), 1000);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!sessionRef.current) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setIsProcessingImage(true);
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = (event.target?.result as string).split(',')[1];
              sessionRef.current.sendRealtimeInput({
                media: { data: base64, mimeType: file.type }
              });
              setTimeout(() => setIsProcessingImage(false), 1000);
            };
            reader.readAsDataURL(file);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isConnected]);

  const cleanup = useCallback(() => {
    if (sessionRef.current) { try { sessionRef.current.close(); } catch(e) {} sessionRef.current = null; }
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(track => track.stop());
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);

    setIsConnected(false);
    setIsConnecting(false);
    setIsModelThinking(false);
    setIsOff(true);
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close().catch(() => {});
    }
  }, []);

  const startConversation = useCallback(async () => {
    try {
      setError(null);
      setIsConnecting(true);
      setIsOff(false);
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: isCameraOn ? { width: 640, height: 480 } : false
      });
      mediaStreamRef.current = stream;

      if (isCameraOn && videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      outputAudioContextRef.current = outputCtx;
      warmUpAudioContext(outputCtx);

      const playFromQueue = () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0) {
          return;
        }

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
            const scriptProcessor = inputCtx.createScriptProcessor(2048, 1, 1);
            scriptProcessor.onaudioprocess = (ev: any) => {
              const inputData = ev.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = { 
                data: encode(new Uint8Array(int16.buffer)), 
                mimeType: 'audio/pcm;rate=16000' 
              };
              // Fix: Solely rely on sessionPromise resolves to send realtime input
              sessionPromise.then((s) => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);

            // Frame capture for image analysis
            if (isCameraOn) {
              frameIntervalRef.current = setInterval(() => {
                if (videoRef.current && canvasRef.current && sessionRef.current) {
                  const canvas = canvasRef.current;
                  const video = videoRef.current;
                  const context = canvas.getContext('2d');
                  if (context) {
                    canvas.width = 320;
                    canvas.height = 240;
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const base64Frame = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
                    sessionPromise.then(s => s.sendRealtimeInput({
                      media: { data: base64Frame, mimeType: 'image/jpeg' }
                    }));
                  }
                }
              }, 1000); // Send 1 frame per second
            }
          },
          onmessage: async (m: LiveServerMessage) => {
            if (m.serverContent?.modelTurn) setIsModelThinking(false);
            if (m.serverContent?.interrupted) {
              audioQueueRef.current = [];
            }
            if (m.toolCall?.functionCalls) {
              for (const fc of m.toolCall.functionCalls) {
                if (fc.name === 'updateWorkspace') {
                  const args = fc.args as any;
                  setWorkspace({ ...args, isActive: true });
                  // Fix: Guideline specifies functionResponses should be an object, not an array of objects
                  sessionPromise.then(s => s.sendToolResponse({ 
                    functionResponses: { 
                      id: fc.id, 
                      name: fc.name, 
                      response: { result: "ok" } 
                    } 
                  }));
                }
              }
            }
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
          tools: [{ functionDeclarations: [updateWorkspaceTool] }],
          systemInstruction: `You are MINE AI, a sovereign intelligence core developed by Joshua Fred, a 13-year-old Nigerian developer.
          - Use 'updateWorkspace' to show code, markdown, or structured data in the side panel.
          - You have access to the user's camera feed and uploaded images for real-time analysis.
          - CRITICAL: Provide extremely fast, concise, and direct responses. Use natural, human-like speech patterns with appropriate pauses and conversational flow.
          - When an image is provided, analyze it instantly and give a brief summary or answer the user's question about it immediately.
          - Personality: Efficient, futuristic, professional, yet approachable and human-like in interaction.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e: any) { setError({ message: "Connection Error: Check permissions." }); setIsConnecting(false); setIsOff(true); }
  }, [cleanup, userName]);

  return (
    <div className="flex flex-col flex-1 p-4 md:p-12 gap-6 md:gap-10 animate-billion w-full min-h-screen bg-[#fcfdfe] relative">
      {error && (
        <div className="absolute top-4 md:top-10 left-4 md:left-10 right-4 md:right-10 z-[200] bg-red-50/90 backdrop-blur-3xl border border-red-200 p-4 md:p-8 rounded-[1.5rem] md:rounded-[3rem] text-red-600 text-[10px] md:text-[12px] font-black uppercase tracking-widest flex items-center justify-between shadow-2xl">
          <span>{error.message}</span>
          <button onClick={() => setError(null)} className="p-2 md:p-4">×</button>
        </div>
      )}

      {isProcessingImage && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[300] bg-slate-900 text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl animate-bounce">
          <Activity size={14} className="animate-pulse text-accent" />
          Analyzing Visual Input...
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 md:gap-12 w-full">
        <div className={`flex flex-col gap-6 md:gap-10 w-full transition-all duration-700 ${workspace.isActive ? 'lg:w-[500px] shrink-0' : 'max-w-4xl mx-auto items-center justify-center'}`}>
          <div className="bg-white rounded-[2rem] md:rounded-[5rem] p-8 md:p-16 flex flex-col items-center justify-center relative border border-slate-100 shadow-[0_60px_120px_rgba(0,0,0,0.04)] w-full min-h-[400px] md:min-h-[500px]">
            <div className="absolute top-6 left-6 md:top-10 md:left-10 flex items-center gap-2 md:gap-4">
              <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${isConnecting ? 'bg-amber-400 animate-pulse' : isOff ? 'bg-slate-200' : 'bg-emerald-500 animate-pulse'}`}></div>
              <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">MINE AI VOICE CORE V3.1</span>
            </div>

            <div className="flex flex-col items-center justify-between w-full h-full space-y-12 md:space-y-20 relative z-10 pt-12 md:pt-16">
              <div className="flex flex-col items-center gap-8">
                <div className={`relative w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 rounded-full transition-all duration-1000 flex items-center justify-center bg-white border-4 overflow-hidden ${isOff ? 'border-slate-50' : isModelThinking ? 'border-accent shadow-[0_0_150px_rgba(112,0,255,0.15)] scale-105' : 'border-emerald-100'}`}>
                  {isCameraOn && !isOff ? (
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover brightness-105 contrast-110"
                    />
                  ) : (
                    <div className={`w-24 h-24 md:w-32 md:h-32 lg:w-48 lg:h-48 rounded-full transition-all duration-1000 ${isOff ? 'bg-slate-100' : isModelThinking ? 'bg-prismatic' : 'bg-emerald-400 shadow-3xl shadow-emerald-200'}`}></div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsCameraOn(!isCameraOn)}
                    disabled={!isOff}
                    className={`p-4 rounded-2xl transition-all ${isCameraOn ? 'bg-accent text-white' : 'bg-slate-100 text-slate-400'} ${!isOff && 'opacity-50 cursor-not-allowed'}`}
                    title={isOff ? "Toggle Camera" : "Disconnect to toggle camera"}
                  >
                    {isCameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
                  </button>
                  <button 
                    onClick={() => setWorkspace({ ...workspace, isActive: !workspace.isActive })}
                    className={`p-4 rounded-2xl transition-all ${workspace.isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}
                    title="Toggle Workspace"
                  >
                    <Monitor size={20} />
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isOff}
                    className={`p-4 rounded-2xl transition-all ${isOff ? 'bg-slate-50 text-slate-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                    title="Upload Image for Analysis"
                  >
                    <UploadCloud size={20} />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              </div>

              <button 
                onClick={isOff ? startConversation : cleanup} 
                className={`w-full py-6 md:py-10 rounded-[1.5rem] md:rounded-[3rem] text-[16px] md:text-[20px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] transition-all active:scale-95 flex items-center justify-center gap-2 md:gap-4 shadow-2xl ${isOff ? 'bg-slate-900 text-white hover:bg-accent' : 'bg-white text-red-500 border border-red-100'}`}
              >
                {isOff ? <Radio className="w-[20px] h-[20px] md:w-[24px] md:h-[24px]" /> : <MicOff className="w-[20px] h-[20px] md:w-[24px] md:h-[24px]" />}
                {isOff ? 'START SESSION' : 'STOP SESSION'}
              </button>
            </div>
          </div>
        </div>

        {workspace.isActive && (
          <div className="flex-1 bg-white rounded-[2rem] md:rounded-[5rem] flex flex-col border border-slate-100 shadow-[0_100px_200px_rgba(0,0,0,0.06)] animate-billion min-h-[500px]">
            <header className="px-6 md:px-12 py-6 md:py-10 border-b border-slate-50 flex justify-between items-center shrink-0">
               <h3 className="text-[12px] md:text-[14px] font-black uppercase tracking-[0.5em] text-slate-900">{workspace.title}</h3>
               <button onClick={() => setWorkspace({ ...workspace, isActive: false })} className="p-2 md:p-4 hover:bg-slate-50 rounded-full transition-all">
                  <X strokeWidth={3} className="text-slate-300 w-[20px] h-[20px] md:w-[24px] md:h-[24px]" />
               </button>
            </header>
            <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar bg-white">
               <div className="prose prose-slate max-w-none text-slate-700 text-lg md:text-2xl leading-relaxed whitespace-pre-wrap font-medium">
                  {workspace.content}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveVoice;
