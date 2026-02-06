
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
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState<any>(null);
  const [workspace, setWorkspace] = useState<WorkspaceState & { downloadData?: string, downloadFilename?: string }>({ 
    type: 'markdown', 
    content: '', 
    title: 'Workspace', 
    isActive: false 
  });
  const [visualContext, setVisualContext] = useState<VisualContext | null>(null);

  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);
  const visionIntervalRef = useRef<number | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  
  const visualContextRef = useRef<VisualContext | null>(visualContext);
  useEffect(() => { visualContextRef.current = visualContext; }, [visualContext]);

  // Handle Copy-Paste Image Analysis (Files)
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
              const base64Data = (e.target?.result as string).split(',')[1];
              setVisualContext({ 
                id: Date.now().toString(), 
                data: base64Data, 
                mimeType: blob.type 
              });
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    (window as any).addEventListener('paste', handlePaste);
    return () => (window as any).removeEventListener('paste', handlePaste);
  }, []);

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
  }, []);

  // Fix: Manual decode implementation as per guidelines
  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  // Fix: Manual decodeAudioData implementation for raw PCM as per guidelines
  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  };

  // Fix: Manual encode implementation as per guidelines
  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target as any).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1];
        setVisualContext({ id: Date.now().toString(), data: base64Data, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImageUrl = async () => {
    if (!imageUrl) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      // Fix: Use process.env.API_KEY directly for initialization
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ text: `Please analyze this image from the following URL and provide a full technical report: ${imageUrl}` }],
        config: {
          tools: [{ googleSearch: {} }] 
        }
      });
      const report = response.text || "Neural scan complete.";
      setWorkspace({
        title: 'Remote URL Analysis',
        content: report,
        type: 'markdown',
        isActive: true,
        downloadData: report,
        downloadFilename: 'url_analysis.md'
      });
      setImageUrl('');
    } catch (err: any) {
      setError({ message: "Network Link Failed: " + err.message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownload = () => {
    if (!workspace.downloadData) return;
    const blob = new Blob([workspace.downloadData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = (window as any).document.createElement('a');
    a.href = url;
    a.download = workspace.downloadFilename || 'mine-ai-export.txt';
    (window as any).document.body.appendChild(a);
    a.click();
    (window as any).document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const analyzeNeuralFeed = async () => {
    if (!visualContext) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      // Fix: Use process.env.API_KEY directly for initialization
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', 
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { data: visualContext.data, mimeType: visualContext.mimeType } },
              { text: "Fast Analysis: Give me a technical report on this image. Use Google AI Studio style output. Code, markdown, and a downloadable manifest. Built by a 13-year-old Nigerian developer." }
            ]
          }
        ]
      });

      const report = response.text || "Analysis complete.";
      setWorkspace({
        title: 'Neural Report',
        content: report,
        type: 'preview',
        isActive: true,
        downloadData: report,
        downloadFilename: 'report.html'
      });
    } catch (err: any) {
      setError({ message: "Sync Error: " + err.message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startConversation = async () => {
    try {
      setIsOff(false);
      setIsConnecting(true);
      // Fix: Use process.env.API_KEY directly for initialization
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await (navigator as any).mediaDevices.getUserMedia({ audio: true });
      const outputCtx = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const inputCtx = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = outputCtx;

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
              // Fix: CRITICAL: Solely rely on sessionPromise resolves
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
            
            // Fix: Implement interruption handling as per guidelines
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
              // Fix: Ensure smooth audio playback synchronization
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });

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
          systemInstruction: `You are MINE AI, a neural powerhouse built by Joshua, a 13-year-old Nigerian developer.
          GOAL: Instant responses, high-vibe coding, and professional CBT questions.
          STYLE: Google AI Studio (Clean, Technical, Efficient).
          - Use 'updateWorkspace' for ANY major output.
          - Coding must be 'Vibe Coding' - extremely high-end, efficient, and well-commented.
          - CBT questions must be perfectly structured for students.
          - If the user asks for anything complex, show it in the workspace IMMEDIATELY.
          - Speed is your number one priority.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) { setError(e); setIsConnecting(false); }
  };

  return (
    <div className="flex flex-col flex-1 p-4 md:p-8 gap-8 animate-billion overflow-hidden max-w-full mx-auto w-full h-full bg-[#f8f9fa]">
      <div className={`flex flex-col lg:flex-row gap-8 transition-all duration-700 h-full overflow-hidden`}>
        
        {/* Input/Status Column - Hidden if workspace is "Full" */}
        <div className={`flex flex-col gap-6 w-full transition-all duration-700 ${workspaceFull ? 'lg:w-0 lg:opacity-0 lg:overflow-hidden lg:p-0' : workspace.isActive ? 'lg:w-[350px]' : 'max-w-4xl mx-auto items-center justify-center'}`}>
          <div className="bg-white rounded-3xl p-10 flex flex-col items-center justify-center relative overflow-hidden min-h-[500px] border border-slate-200 shadow-xl w-full">
            {isOff && !isConnecting && (
              <div className="text-center space-y-10 animate-billion w-full">
                <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full border-4 border-dashed border-slate-100 flex items-center justify-center mx-auto">
                  <h2 className="text-2xl font-black text-slate-200 uppercase tracking-widest">MINE AI OFF</h2>
                </div>
                <button onClick={startConversation} className="px-14 py-8 bg-slate-900 text-white rounded-2xl text-xl font-black uppercase tracking-widest hover:bg-accent transition-all shadow-2xl active:scale-95 w-full">
                  Power On
                </button>
                <div className="space-y-4 w-full">
                   <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-300">Sync Portal Active</p>
                   <div className="relative w-full">
                      {/* Fix: Property 'value' does not exist on type 'EventTarget & HTMLInputElement' by casting e.target */}
                      <input 
                        type="text" 
                        value={imageUrl} 
                        onChange={(e) => setImageUrl((e.target as HTMLInputElement).value)}
                        placeholder="PASTE IMAGE URL HERE..." 
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[10px] font-black tracking-widest text-slate-600 outline-none focus:ring-2 focus:ring-accent/20"
                      />
                      {imageUrl && (
                        <button onClick={analyzeImageUrl} disabled={isAnalyzing} className="absolute right-2 top-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-accent transition-all">
                           {isAnalyzing ? "..." : "SCAN"}
                        </button>
                      )}
                   </div>
                </div>
              </div>
            )}
            
            {isConnecting && (
              <div className="flex flex-col items-center gap-10 animate-billion">
                <div className="w-20 h-20 border-4 border-slate-100 border-t-accent rounded-full animate-spin"></div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[1em]">Powering Up...</h4>
              </div>
            )}

            {!isOff && isConnected && (
              <div className="flex flex-col items-center justify-center w-full h-full space-y-12">
                <div className={`relative w-64 h-64 md:w-80 md:h-80 rounded-full transition-all duration-300 flex items-center justify-center bg-white border-2 ${isModelThinking ? 'border-accent shadow-[0_0_60px_rgba(112,0,255,0.1)]' : 'border-slate-100'}`}>
                  <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full ${isModelThinking ? 'bg-prismatic' : 'bg-slate-100'} animate-pulse shadow-xl`}></div>
                  <div className="absolute inset-0 border-t-2 border-slate-100 rounded-full animate-[spin_8s_linear_infinite]"></div>
                </div>

                <div className="w-48 h-48 rounded-3xl overflow-hidden border-2 border-slate-100 shadow-sm bg-slate-50 group cursor-pointer relative hover:border-accent transition-all">
                  {visualContext ? (
                    <div className="w-full h-full relative">
                      <img src={`data:${visualContext.mimeType};base64,${visualContext.data}`} className="w-full h-full object-cover" alt="feed" />
                      <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                         <span className="text-[8px] text-white font-black uppercase">Paste File Anytime</span>
                      </div>
                      <button onClick={() => setVisualContext(null)} className="absolute top-3 right-3 bg-white/90 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white z-10">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3}/></svg>
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => (window as any).document.getElementById('vision-uplink')?.click()} className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-300 hover:text-accent">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={2}/></svg>
                      <span className="text-[8px] font-black uppercase tracking-widest">Feed / Paste Img</span>
                    </button>
                  )}
                  <input type="file" id="vision-uplink" hidden accept="image/*" onChange={handleImageUpload} />
                </div>
              </div>
            )}
          </div>
          
          {!workspaceFull && (
            <div className="flex flex-col gap-4">
              {visualContext && (
                <button onClick={analyzeNeuralFeed} disabled={isAnalyzing} className="px-8 py-4 bg-accent text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:brightness-110 flex items-center justify-center gap-3 transition-all">
                  {isAnalyzing ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <span>Instant Sync</span>}
                </button>
              )}
              {!isOff && <button onClick={cleanup} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-lg shadow-red-500/10">Terminate Nexus</button>}
            </div>
          )}
        </div>

        {/* Workspace Column - High Speed Google AI Studio Style */}
        {workspace.isActive && (
          <div className="flex-1 h-full bg-white rounded-3xl flex flex-col overflow-hidden border border-slate-200 shadow-[0_80px_160px_rgba(0,0,0,0.1)] animate-billion transition-all duration-700">
            <header className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-[#fdfdfd]">
              <div className="flex items-center gap-6">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">{workspace.title}</h3>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setWorkspaceFull(!workspaceFull)} 
                  className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${workspaceFull ? 'bg-slate-100 text-slate-600' : 'bg-slate-900 text-white'}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" strokeWidth={3}/></svg>
                  {workspaceFull ? "MINIMIZE" : "FULL WORKSPACE"}
                </button>
                {workspace.downloadData && (
                  <button onClick={handleDownload} className="px-5 py-2.5 bg-accent text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:shadow-lg transition-all flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={3}/></svg>
                    Export
                  </button>
                )}
                <button onClick={() => { setWorkspace({ ...workspace, isActive: false }); setWorkspaceFull(false); }} className="p-2.5 hover:bg-slate-50 text-slate-400 rounded-xl transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3}/></svg>
                </button>
              </div>
            </header>
            
            <div className="flex-1 relative bg-[#fafafa]">
              {workspace.type === 'preview' ? (
                <iframe srcDoc={workspace.content} className="absolute inset-0 w-full h-full border-none" sandbox="allow-scripts" title="preview" />
              ) : (
                <div className="absolute inset-0 overflow-y-auto p-12 custom-scrollbar">
                  <div className="max-w-6xl mx-auto">
                    {workspace.type === 'code' ? (
                      <div className="bg-[#1e1e1e] rounded-2xl p-8 shadow-2xl overflow-hidden border border-slate-800">
                        <pre className="text-cyan-400 font-mono text-base md:text-lg leading-relaxed overflow-x-auto">
                          <code>{workspace.content}</code>
                        </pre>
                      </div>
                    ) : workspace.type === 'cbt' ? (
                      <div className="space-y-8 pb-10">
                        <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl text-emerald-800 text-xs font-bold uppercase tracking-widest shadow-sm">NEURAL TEST GENERATED</div>
                        <div className="font-sans text-slate-700 leading-relaxed text-xl whitespace-pre-wrap px-4">{workspace.content}</div>
                      </div>
                    ) : (
                      <article className="prose prose-slate prose-xl max-w-none">
                         <div className="whitespace-pre-wrap text-slate-600 leading-relaxed px-4">{workspace.content}</div>
                      </article>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <footer className="px-8 py-5 bg-[#f8f9fa] border-t border-slate-100 flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
               <div className="flex items-center gap-6">
                  <span>PRODIGY ENGINE // SYNCED</span>
                  <div className="h-3 w-[1px] bg-slate-200"></div>
                  <span>VIBE CODING MODE</span>
               </div>
               <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                  <span>Active Core</span>
               </div>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveVoice;
