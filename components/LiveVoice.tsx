
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { VisualContext, WorkspaceState } from '../types';

interface LiveVoiceProps { onHome?: () => void; }

const updateWorkspaceTool: FunctionDeclaration = {
  name: 'updateWorkspace',
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: 'The high-quality code, markdown, or CBT questions' },
      type: { type: Type.STRING, enum: ['markdown', 'code', 'preview', 'cbt'], description: 'The format of the workspace content' },
      language: { type: Type.STRING, description: 'Programming language for code' },
      title: { type: Type.STRING, description: 'Short descriptive title' },
      downloadData: { type: Type.STRING, description: 'Plain text data for immediate download' },
      downloadFilename: { type: Type.STRING, description: 'Filename for the exported asset' }
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
  
  const visualContextRef = useRef<VisualContext | null>(visualContext);
  useEffect(() => { visualContextRef.current = visualContext; }, [visualContext]);

  const decode = (base64: string) => {
    try {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      return bytes;
    } catch (e) {
      console.error("Decode error:", e);
      return new Uint8Array(0);
    }
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
    } catch (e) {
      console.error("Audio decode error:", e);
      return null;
    }
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const cleanup = useCallback(() => {
    if (visionIntervalRef.current) {
      clearInterval(visionIntervalRef.current);
      visionIntervalRef.current = null;
    }
    if (sessionRef.current) { 
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null; 
    }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    setIsConnected(false);
    setIsConnecting(false);
    setIsModelThinking(false);
    setIsOff(true);
    setWorkspaceFull(false);
    nextStartTimeRef.current = 0;

    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close().catch(() => {});
    }
  }, []);

  const startConversation = useCallback(async () => {
    try {
      const nav = (navigator as any);
      const hasMedia = nav.mediaDevices && nav.mediaDevices.getUserMedia;
      const hasAudio = (window as any).AudioContext || (window as any).webkitAudioContext;
      
      if (!hasMedia || !hasAudio) {
        throw new Error("Neural features not supported on this device.");
      }

      setIsOff(false);
      setIsConnecting(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const stream = await nav.mediaDevices.getUserMedia({ audio: true });
      
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      outputAudioContextRef.current = outputCtx;

      if (outputCtx.state === 'suspended') await outputCtx.resume();
      if (inputCtx.state === 'suspended') await inputCtx.resume();

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => { 
            setIsConnected(true); 
            setIsConnecting(false); 
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (ev: any) => {
              const inputData = ev.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);

            visionIntervalRef.current = (window as any).setInterval(() => {
              if (visualContextRef.current) {
                sessionPromise.then((session) => {
                  session.sendRealtimeInput({ media: { data: visualContextRef.current!.data, mimeType: visualContextRef.current!.mimeType } });
                });
              }
            }, 3000);
          },
          onmessage: async (m: LiveServerMessage) => {
            if (m.serverContent?.modelTurn) setIsModelThinking(false);
            
            const interrupted = m.serverContent?.interrupted;
            if (interrupted) {
              for (const source of sourcesRef.current.values()) {
                try { source.stop(); } catch(e) {}
              }
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            if (m.toolCall) {
              for (const fc of m.toolCall.functionCalls) {
                if (fc.name === 'updateWorkspace') {
                  const args = fc.args as any;
                  setWorkspace({ ...args, isActive: true });
                  sessionPromise.then(session => session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "ok" } } }));
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
              
              source.onended = () => {
                sourcesRef.current.delete(source);
              };

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onerror: (e) => { 
            console.error("Live error:", e);
            setError(e); 
            cleanup(); 
          },
          onclose: () => cleanup()
        },
        config: { 
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [updateWorkspaceTool] }],
          systemInstruction: `You are MINE AI, a neural powerhouse built by Joshua, a 13-year-old Nigerian developer.
          GOAL: Instant responses, high-vibe coding, and professional CBT questions.
          - Use 'updateWorkspace' for ANY major output.
          - If the user asks for anything complex or sends an image, show analysis in the workspace IMMEDIATELY.`
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
    startConversation();
    return () => cleanup();
  }, [startConversation, cleanup]);

  // Enhanced Paste Handler: Just like Gemini
  useEffect(() => {
    const handlePaste = (event: any) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const res = e.target?.result;
              if (typeof res === 'string') {
                const base64Data = res.split(',')[1];
                setVisualContext({ id: Date.now().toString(), data: base64Data, mimeType: blob.type });
              }
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };
    const win = (window as any);
    win.addEventListener('paste', handlePaste);
    return () => win.removeEventListener('paste', handlePaste);
  }, []);

  // Direct Image Analysis Handler
  const analyzeVisualFeed = async () => {
    if (!visualContext) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { data: visualContext.data, mimeType: visualContext.mimeType } },
              { text: "Detailed analysis: Scan this image and provide a technical report. If there is code, extract it. If there are questions, provide answers." }
            ]
          }
        ]
      });
      
      const report = response.text || "Scan complete.";
      setWorkspace({
        title: 'Image Analysis Report',
        content: report,
        type: 'markdown',
        isActive: true,
        downloadData: report,
        downloadFilename: 'analysis.md'
      });
    } catch (err: any) {
      setError({ message: "Image analysis failed: " + err.message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownload = () => {
    if (!workspace.downloadData) return;
    try {
      const blob = new Blob([workspace.downloadData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const doc = (window as any).document;
      const a = doc.createElement('a');
      a.href = url;
      a.download = workspace.downloadFilename || 'mine-ai-export.txt';
      doc.body.appendChild(a);
      a.click();
      doc.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed:", e);
    }
  };

  return (
    <div className="flex flex-col flex-1 p-4 md:p-8 gap-8 animate-billion overflow-hidden max-w-full mx-auto w-full h-full bg-[#f8f9fa] relative">
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[150] bg-red-50 border border-red-200 p-4 rounded-xl text-red-600 text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth={3}/></svg>
          <span>{error.message}</span>
          <button onClick={() => setError(null)} className="ml-4 hover:text-red-800">Dismiss</button>
        </div>
      )}

      <div className={`flex flex-col lg:flex-row gap-8 transition-all duration-700 h-full overflow-hidden ${workspaceFull ? 'lg:gap-0' : ''}`}>
        
        {/* Left Control Panel */}
        <div className={`flex flex-col gap-6 w-full transition-all duration-700 ${workspaceFull ? 'lg:w-0 lg:opacity-0 lg:overflow-hidden lg:p-0' : workspace.isActive ? 'lg:w-[400px]' : 'max-w-4xl mx-auto items-center justify-center'}`}>
          <div className="bg-white rounded-3xl p-6 md:p-10 flex flex-col items-center justify-center relative overflow-hidden min-h-[400px] md:min-h-[500px] border border-slate-200 shadow-xl w-full">
            {isConnecting && (
              <div className="flex flex-col items-center gap-10 animate-billion">
                <div className="w-20 h-20 border-4 border-slate-100 border-t-accent rounded-full animate-spin"></div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[1em]">Connecting Hub...</h4>
              </div>
            )}

            {!isOff && isConnected && (
              <div className="flex flex-col items-center justify-center w-full h-full space-y-8 md:space-y-12">
                <div className={`relative w-48 h-48 md:w-80 md:h-80 rounded-full transition-all duration-300 flex items-center justify-center bg-white border-2 ${isModelThinking ? 'border-accent shadow-[0_0_60px_rgba(112,0,255,0.1)]' : 'border-slate-100'}`}>
                  <div className={`w-16 h-16 md:w-32 md:h-32 rounded-full ${isModelThinking ? 'bg-prismatic' : 'bg-slate-100'} animate-pulse shadow-xl`}></div>
                  <div className="absolute inset-0 border-t-2 border-slate-100 rounded-full animate-[spin_8s_linear_infinite]"></div>
                  <div className="absolute -bottom-4 bg-white px-6 py-2 rounded-full border border-slate-100 shadow-sm text-[8px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Voice Active</div>
                </div>

                {/* Upload / Paste Feed */}
                <div className="w-full space-y-6">
                  <div className="text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Paste Image Anywhere or Click Below</p>
                  </div>
                  
                  <div onClick={() => (window as any).document.getElementById('file-upload')?.click()} className={`h-40 md:h-56 w-full rounded-3xl overflow-hidden border-2 border-dashed transition-all relative group cursor-pointer ${visualContext ? 'border-accent shadow-lg' : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'}`}>
                    {visualContext ? (
                      <>
                        <img src={`data:${visualContext.mimeType};base64,${visualContext.data}`} className="w-full h-full object-cover" alt="feed" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-[10px] font-black uppercase">Click to Change</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setVisualContext(null); }} className="absolute top-4 right-4 p-2 bg-white rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-xl">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3}/></svg>
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-300">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeWidth={2}/></svg>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]">Drop / Paste Image</span>
                      </div>
                    )}
                    <input type="file" id="file-upload" className="hidden" accept="image/*" onChange={(e: any) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (re) => {
                          const res = re.target?.result;
                          if (typeof res === 'string') {
                            const base64Data = res.split(',')[1];
                            setVisualContext({ id: Date.now().toString(), data: base64Data, mimeType: file.type });
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </div>

                  {visualContext && (
                    <button onClick={analyzeVisualFeed} disabled={isAnalyzing} className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] hover:bg-accent hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4">
                      {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span>Analyze Image</span>}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {!workspaceFull && (
            <div className="flex flex-col gap-4">
               <button onClick={cleanup} className="px-8 py-5 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-red-500 hover:border-red-100 transition-all active:scale-95">Stop Session</button>
            </div>
          )}
        </div>

        {/* Workspace Focus Area */}
        {workspace.isActive && (
          <div className={`flex-1 h-full bg-white rounded-3xl flex flex-col overflow-hidden border border-slate-200 shadow-2xl animate-billion transition-all duration-700 ${workspaceFull ? 'm-0 rounded-none border-none lg:fixed lg:inset-0 lg:z-[100]' : ''}`}>
            <header className="px-4 md:px-8 py-4 md:py-6 border-b border-slate-100 flex flex-wrap justify-between items-center bg-[#fdfdfd] gap-4">
              <div className="flex items-center gap-4 md:gap-8">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                </div>
                <h3 className="text-[10px] md:text-sm font-black uppercase tracking-widest text-slate-800 truncate max-w-[150px] md:max-w-none">{workspace.title}</h3>
              </div>
              <div className="flex items-center gap-2 md:gap-4 ml-auto">
                <button 
                  onClick={() => setWorkspaceFull(!workspaceFull)} 
                  className={`px-3 md:px-6 py-2 md:py-2.5 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 ${workspaceFull ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" strokeWidth={3}/></svg>
                  <span className="hidden sm:inline">{workspaceFull ? "CLOSE FOCUS" : "FOCUS"}</span>
                </button>
                {workspace.downloadData && (
                  <button onClick={handleDownload} className="px-3 md:px-6 py-2 md:py-2.5 bg-accent text-white rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest hover:shadow-lg transition-all flex items-center gap-2 active:scale-95">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={3}/></svg>
                    <span className="hidden sm:inline">Download</span>
                  </button>
                )}
                {!workspaceFull && (
                  <button onClick={() => setWorkspace({ ...workspace, isActive: false })} className="p-2.5 hover:bg-slate-50 text-slate-400 rounded-xl transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3}/></svg>
                  </button>
                )}
              </div>
            </header>
            
            <div className="flex-1 relative bg-[#fafafa]">
              <div className="absolute inset-0 overflow-y-auto p-6 md:p-16 custom-scrollbar">
                <div className={`${workspaceFull ? 'max-w-7xl mx-auto' : 'max-w-5xl'}`}>
                  {workspace.type === 'code' ? (
                    <div className="bg-[#1e1e1e] rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-10 shadow-2xl overflow-hidden border border-slate-800">
                      <pre className="text-cyan-400 font-mono text-sm md:text-xl leading-relaxed overflow-x-auto">
                        <code>{workspace.content}</code>
                      </pre>
                    </div>
                  ) : (
                    <article className="prose prose-slate prose-lg md:prose-2xl max-w-none">
                      <div className="whitespace-pre-wrap text-slate-600 leading-relaxed px-2 md:px-4">{workspace.content}</div>
                    </article>
                  )}
                </div>
              </div>
            </div>
            
            <footer className="px-4 md:px-8 py-4 md:py-5 bg-[#f8f9fa] border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 gap-4">
               <div className="flex items-center gap-4 md:gap-6">
                  <span className="truncate">Active Hub</span>
                  <div className="hidden sm:block h-3 w-[1px] bg-slate-200"></div>
                  <span className="hidden sm:inline">Lagos Region</span>
               </div>
               <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                  <span>Secure Node</span>
               </div>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveVoice;
