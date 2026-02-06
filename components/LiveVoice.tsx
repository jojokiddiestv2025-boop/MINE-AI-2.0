
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { VisualContext, WorkspaceState } from '../types';

interface LiveVoiceProps { onHome?: () => void; }

const updateWorkspaceTool: FunctionDeclaration = {
  name: 'updateWorkspace',
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: 'Code, markdown, or results' },
      type: { type: Type.STRING, enum: ['markdown', 'code', 'preview', 'cbt'], description: 'Content format' },
      language: { type: Type.STRING, description: 'Language for code' },
      title: { type: Type.STRING, description: 'Descriptive title' }
    },
    required: ['content', 'type', 'title'],
  },
};

const LiveVoice: React.FC<LiveVoiceProps> = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isModelThinking, setIsModelThinking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOff, setIsOff] = useState(true);
  const [workspaceFull, setWorkspaceFull] = useState(false);
  const [error, setError] = useState<any>(null);
  const [workspace, setWorkspace] = useState<WorkspaceState & { downloadData?: string, downloadFilename?: string }>({ 
    type: 'markdown', 
    content: '', 
    title: 'Workspace', 
    isActive: false 
  });
  const [visualContext, setVisualContext] = useState<VisualContext | null>(null);

  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<any>>(new Set());
  const nextStartTimeRef = useRef(0);
  const visionIntervalRef = useRef<number | null>(null);
  const outputAudioContextRef = useRef<any | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  const visualContextRef = useRef<VisualContext | null>(visualContext);
  useEffect(() => { visualContextRef.current = visualContext; }, [visualContext]);

  // Optimized binary encoding for "no lag"
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

  const decodeAudioData = async (data: Uint8Array, ctx: any, sampleRate: number, numChannels: number): Promise<any> => {
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
    if (visionIntervalRef.current) clearInterval(visionIntervalRef.current);
    if (sessionRef.current) { 
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null; 
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    setIsConnected(false);
    setIsConnecting(false);
    setIsModelThinking(false);
    setIsOff(true);
    nextStartTimeRef.current = 0;

    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close().catch(() => {});
    }
  }, []);

  const startConversation = useCallback(async () => {
    try {
      setError(null);
      setIsConnecting(true);
      setIsOff(false);

      const nav = (navigator as any);
      if (!nav.mediaDevices?.getUserMedia) throw new Error("Audio input not supported.");

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const stream = await nav.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      outputAudioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => { 
            setIsConnected(true); 
            setIsConnecting(false); 
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(2048, 1, 1); // Smaller buffer for lower latency
            scriptProcessor.onaudioprocess = (ev: any) => {
              const inputData = ev.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then((s) => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);

            visionIntervalRef.current = (window as any).setInterval(() => {
              if (visualContextRef.current) {
                sessionPromise.then((s) => s.sendRealtimeInput({ media: { data: visualContextRef.current!.data, mimeType: visualContextRef.current!.mimeType } }));
              }
            }, 3000);
          },
          onmessage: async (m: LiveServerMessage) => {
            if (m.serverContent?.modelTurn) setIsModelThinking(false);
            if (m.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
            if (m.toolCall) {
              for (const fc of m.toolCall.functionCalls) {
                if (fc.name === 'updateWorkspace') {
                  const args = fc.args as any;
                  setWorkspace({ ...args, isActive: true });
                  sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "ok" } } }));
                }
              }
            }
            const base64Audio = m.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              if (!audioBuffer) return;
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.onended = () => sourcesRef.current.delete(source);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onerror: (e) => { setError(e); cleanup(); },
          onclose: () => cleanup()
        },
        config: { 
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [updateWorkspaceTool] }],
          systemInstruction: `You are MINE AI, a powerful neural assistant built by Joshua Fred, a 13-year-old Nigerian developer.
          GOAL: Help users solve code, math, and technical problems instantly.
          STYLE: Professional, efficient, and precise. Always use 'updateWorkspace' for technical outputs.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e: any) { 
      setError({ message: e.message || "Initialization failed." }); 
      setIsConnecting(false); 
      setIsOff(true);
    }
  }, [cleanup]);

  useEffect(() => {
    const handlePaste = (e: any) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (re) => {
              const res = re.target?.result;
              if (typeof res === 'string') setVisualContext({ id: Date.now().toString(), data: res.split(',')[1], mimeType: blob.type });
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => { cleanup(); window.removeEventListener('paste', handlePaste); };
  }, [cleanup]);

  const analyzeVisualFeed = async () => {
    if (!visualContext) return;
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ inlineData: { data: visualContext.data, mimeType: visualContext.mimeType } }, { text: "Analyze this image. Extract any code or text." }] }]
      });
      const report = response.text || "Analysis complete.";
      setWorkspace({ title: 'Intelligence Feed', content: report, type: 'markdown', isActive: true });
    } catch (err: any) { setError({ message: "Analysis failed." }); }
    finally { setIsAnalyzing(false); }
  };

  return (
    <div className="flex flex-col flex-1 p-4 md:p-6 lg:p-8 gap-6 animate-billion max-w-full mx-auto w-full h-full bg-[#fcfdfe] relative overflow-hidden">
      {error && (
        <div className="absolute top-4 left-4 right-4 z-[100] bg-red-50 border border-red-200 p-3 rounded-2xl text-red-600 text-[10px] font-bold uppercase tracking-widest flex items-center justify-between shadow-xl animate-billion">
          <span>{error.message}</span>
          <button onClick={() => setError(null)} className="p-2">×</button>
        </div>
      )}

      <div className={`flex flex-col lg:flex-row gap-6 transition-all duration-500 h-full overflow-hidden ${workspaceFull ? 'lg:gap-0' : ''}`}>
        
        {/* Interaction Hub */}
        <div className={`flex flex-col gap-6 w-full transition-all duration-500 ${workspaceFull ? 'lg:w-0 lg:opacity-0 lg:overflow-hidden lg:p-0' : workspace.isActive ? 'lg:w-[380px] shrink-0' : 'max-w-3xl mx-auto items-center justify-center'}`}>
          <div className="bg-white rounded-[2rem] p-6 lg:p-10 flex flex-col items-center justify-center relative overflow-hidden border border-slate-100 shadow-sm w-full min-h-[350px] lg:min-h-[500px]">
            {isConnecting ? (
              <div className="flex flex-col items-center gap-6">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-accent rounded-full animate-spin"></div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Waking Neural Hub...</h4>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-between w-full h-full space-y-8">
                {/* Neural Indicator */}
                <div className={`relative w-40 h-40 lg:w-64 lg:h-64 rounded-full transition-all duration-500 flex items-center justify-center bg-white border-2 ${isOff ? 'border-slate-50' : isModelThinking ? 'border-accent shadow-[0_0_40px_rgba(112,0,255,0.1)]' : 'border-emerald-100'}`}>
                  <div className={`w-12 h-12 lg:w-24 lg:h-24 rounded-full transition-all duration-500 ${isOff ? 'bg-slate-50' : isModelThinking ? 'bg-prismatic' : 'bg-emerald-400'} ${!isOff && 'animate-pulse'}`}></div>
                  <div className="absolute -bottom-4 bg-white px-4 py-1.5 rounded-full border border-slate-100 shadow-sm text-[8px] font-black uppercase tracking-widest text-slate-400">
                    {isOff ? 'OFFLINE' : 'SYSTEM ACTIVE'}
                  </div>
                </div>

                <div className="w-full space-y-4">
                  <button onClick={isOff ? startConversation : cleanup} className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 ${isOff ? 'bg-accent text-white shadow-lg' : 'bg-slate-50 text-slate-500 border border-slate-100 hover:text-red-500'}`}>
                    {isOff ? 'Start Session' : 'Stop Session'}
                  </button>
                  
                  <div className="flex flex-col gap-3">
                    <div onClick={() => (window as any).document.getElementById('file-up')?.click()} className={`h-24 lg:h-32 w-full rounded-2xl border-2 border-dashed transition-all relative cursor-pointer flex items-center justify-center ${visualContext ? 'border-accent bg-accent/5' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}>
                      {visualContext ? (
                        <img src={`data:${visualContext.mimeType};base64,${visualContext.data}`} className="w-full h-full object-contain p-2" alt="Intelligence" />
                      ) : (
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Drop / Paste Image</span>
                      )}
                      <input type="file" id="file-up" className="hidden" accept="image/*" onChange={(e: any) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const r = new FileReader();
                          r.onload = (re) => setVisualContext({ id: Date.now().toString(), data: (re.target?.result as string).split(',')[1], mimeType: f.type });
                          r.readAsDataURL(f);
                        }
                      }} />
                    </div>
                    {visualContext && (
                      <button onClick={analyzeVisualFeed} disabled={isAnalyzing} className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all flex items-center justify-center gap-2">
                        {isAnalyzing ? "Analyzing..." : "Analyze Image"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results Hub */}
        {workspace.isActive && (
          <div className={`flex-1 h-full bg-white rounded-[2rem] flex flex-col overflow-hidden border border-slate-100 shadow-xl transition-all duration-500 ${workspaceFull ? 'fixed inset-0 z-[150] rounded-none' : ''}`}>
            <header className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-white/50 backdrop-blur-md">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800">{workspace.title}</h3>
              <div className="flex gap-2">
                <button onClick={() => setWorkspaceFull(!workspaceFull)} className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" strokeWidth={2}/></svg>
                </button>
                <button onClick={() => setWorkspace({ ...workspace, isActive: false })} className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2}/></svg>
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-6 lg:p-12 custom-scrollbar">
              <div className={`${workspaceFull ? 'max-w-4xl mx-auto' : ''}`}>
                {workspace.type === 'code' ? (
                  <div className="bg-[#1e1e1e] rounded-2xl p-6 lg:p-8 font-mono text-xs lg:text-sm text-cyan-400 overflow-x-auto shadow-2xl">
                    <pre><code>{workspace.content}</code></pre>
                  </div>
                ) : (
                  <div className="prose prose-slate max-w-none text-slate-600 text-sm lg:text-base leading-relaxed whitespace-pre-wrap">
                    {workspace.content}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveVoice;
