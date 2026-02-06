
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { VisualContext, WorkspaceState } from '../types';

interface LiveVoiceProps { onHome?: () => void; }

// Enhanced tool for high-end workspace updates
const updateWorkspaceTool: FunctionDeclaration = {
  name: 'updateWorkspace',
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: 'The code or markdown content' },
      type: { type: Type.STRING, enum: ['markdown', 'code', 'preview', 'cbt'], description: 'The format of the workspace' },
      language: { type: Type.STRING, description: 'Programming language for code blocks' },
      title: { type: Type.STRING, description: 'Descriptive title for the workspace' },
      downloadData: { type: Type.STRING, description: 'Optional base64 or string data for file download (e.g., CBT PDF or JSON)' },
      downloadFilename: { type: Type.STRING, description: 'Filename for the downloadable asset' }
    },
    required: ['content', 'type', 'title'],
  },
};

const LiveVoice: React.FC<LiveVoiceProps> = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isModelThinking, setIsModelThinking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<any>(null);
  const [workspace, setWorkspace] = useState<WorkspaceState & { downloadData?: string, downloadFilename?: string }>({ 
    type: 'markdown', 
    content: '', 
    title: 'MINE Intelligence Hub', 
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
  }, []);

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: any, sampleRate: number, numChannels: number): Promise<any> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  };

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

  const handleDownload = () => {
    if (!workspace.downloadData) return;
    const blob = new Blob([workspace.downloadData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    // Fix: Access document via window cast to any to resolve TypeScript 'document' lookup error
    const a = (window as any).document.createElement('a');
    a.href = url;
    a.download = workspace.downloadFilename || 'mine-ai-export.txt';
    // Fix: Access document via window cast to any to resolve TypeScript 'document' lookup error
    (window as any).document.body.appendChild(a);
    a.click();
    // Fix: Access document via window cast to any to resolve TypeScript 'document' lookup error
    (window as any).document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const analyzeNeuralFeed = async () => {
    if (!visualContext) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // High quality for deep analysis
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { data: visualContext.data, mimeType: visualContext.mimeType } },
              { text: "Analyze this image with 100-billion-dollar-level technical precision. Generate a highly stylized neural analysis report in HTML. Use JetBrains Mono for text, Tailwind for layout, and include a download button for a technical manifest. Also provide the text content for the manifest file." }
            ]
          }
        ]
      });

      const report = response.text || "Analysis failure.";
      setWorkspace({
        title: 'Neural Vision Manifest',
        content: report,
        type: 'preview',
        isActive: true,
        downloadData: report,
        downloadFilename: 'neural-manifest.html'
      });
    } catch (err: any) {
      setError({ message: "Neural Analysis Error: " + err.message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startConversation = async () => {
    try {
      setIsConnecting(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
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
              const node = outputCtx.createBufferSource();
              node.buffer = audioBuffer;
              node.connect(outputCtx.destination);
              node.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(node);
            }
          },
          onerror: (e) => { setError(e); cleanup(); },
          onclose: () => cleanup()
        },
        config: { 
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [updateWorkspaceTool] }],
          systemInstruction: `You are MINE AI, a $100-billion-dollar neural superintelligence. 
          Your mission is to architect high-end solutions. 
          If asked for CBT (Computer Based Test) questions, generate a professional structured test (JSON or Markdown) and offer it as a downloadable file via 'updateWorkspace'. 
          If asked for code, provide high-vibe, production-grade snippets with detailed logic. 
          You can see the visual feed; use it for deep vision analysis.
          Always prioritize premium aesthetic and technical mastery in your workspace updates.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) { setError(e); setIsConnecting(false); }
  };

  return (
    <div className="flex flex-col flex-1 p-6 md:p-12 gap-10 animate-billion overflow-hidden max-w-[2400px] mx-auto w-full h-full custom-scrollbar">
      <div className={`flex flex-col lg:flex-row gap-12 transition-all duration-1000 h-full overflow-hidden ${workspace.isActive ? 'items-start' : 'items-center justify-center'}`}>
        
        {/* Intelligence Cockpit */}
        <div className={`flex flex-col gap-10 w-full transition-all duration-1000 ${workspace.isActive ? 'lg:w-1/3' : 'max-w-4xl'}`}>
          <div className="glass-premium rounded-[4rem] p-12 flex flex-col items-center justify-center relative overflow-hidden min-h-[600px] border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.4)]">
            {!isConnected && !isConnecting && (
              <div className="text-center space-y-12 animate-billion">
                <button onClick={startConversation} className="button-billion !px-20 !py-10 text-2xl">INITIALIZE CORE SYNC</button>
                <div className="flex items-center justify-center gap-4 text-slate-500">
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
                   <p className="text-[11px] font-black uppercase tracking-[1em]">Neural Gateways Ready</p>
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
                </div>
              </div>
            )}
            
            {isConnecting && (
              <div className="flex flex-col items-center gap-12 animate-billion">
                <div className="relative w-32 h-32">
                  <div className="absolute inset-0 border-t-4 border-cyan-400 rounded-full animate-spin"></div>
                  <div className="absolute inset-4 border-r-4 border-accent rounded-full animate-spin [animation-direction:reverse]"></div>
                </div>
                <h4 className="text-sm font-black text-prismatic uppercase tracking-[1.2em]">Syncing Core...</h4>
              </div>
            )}

            {isConnected && (
              <div className="flex flex-col items-center justify-center w-full h-full relative z-10">
                <div className={`relative w-64 h-64 md:w-96 md:h-96 rounded-full transition-all duration-1000 flex items-center justify-center bg-black/40 shadow-inner border-4 ${isModelThinking ? 'border-cyan-400 scale-105 shadow-[0_0_100px_rgba(0,242,255,0.2)]' : 'border-white/5 shadow-2xl'}`}>
                  {/* Neural Visualization */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-32 h-32 rounded-full blur-2xl transition-all duration-1000 ${isModelThinking ? 'bg-accent/40 scale-150' : 'bg-white/5'}`}></div>
                  </div>
                  <div className={`w-20 h-20 md:w-28 md:h-28 rounded-full ${isModelThinking ? 'bg-prismatic' : 'bg-slate-800'} animate-pulse relative z-10 shadow-2xl`}></div>
                  
                  {/* Orbitals */}
                  <div className="absolute inset-0 border border-white/5 rounded-full animate-[spin_10s_linear_infinite]"></div>
                  <div className="absolute inset-8 border border-white/5 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
                </div>

                {/* Integrated Vision Feed */}
                <div className="absolute bottom-6 right-6 md:bottom-12 md:right-12 w-48 h-48 md:w-64 md:h-64 rounded-[3rem] overflow-hidden border-4 border-white/10 shadow-3xl bg-[#010101] group cursor-pointer transition-all hover:scale-105 hover:border-accent">
                  {visualContext ? (
                    <div className="relative w-full h-full">
                      <img src={`data:${visualContext.mimeType};base64,${visualContext.data}`} className="w-full h-full object-cover" alt="Optical context" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <button onClick={() => setVisualContext(null)} className="absolute top-4 right-4 bg-black/80 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500">
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3}/></svg>
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => (window as any).document.getElementById('vision-uplink')?.click()} className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-500 hover:text-cyan-400 transition-all bg-slate-900/40 hover:bg-slate-900/80">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={2}/></svg>
                      <span className="text-[9px] font-black uppercase tracking-[0.6em]">Uplink Visual</span>
                    </button>
                  )}
                  <input type="file" id="vision-uplink" hidden accept="image/*" onChange={handleImageUpload} />
                </div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-6">
            {visualContext && (
              <button 
                onClick={analyzeNeuralFeed} 
                disabled={isAnalyzing}
                className="button-billion !bg-none !border-2 !border-accent/40 !shadow-none hover:!bg-accent hover:!border-accent flex items-center justify-center gap-6"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span>Processing Manifest...</span>
                  </>
                ) : (
                  <span>Analyze Neural Feed</span>
                )}
              </button>
            )}
            
            {isConnected && (
              <button onClick={cleanup} className="self-center px-12 py-5 bg-white/5 border border-white/10 text-white rounded-full text-[10px] font-black uppercase tracking-[0.8em] hover:bg-red-500 hover:border-red-500 transition-all">Terminate Link</button>
            )}
          </div>
        </div>

        {/* Intelligence Workspace */}
        {workspace.isActive && (
          <div className="flex-1 h-full glass-premium rounded-[4rem] flex flex-col overflow-hidden shadow-[0_60px_150px_rgba(0,0,0,0.6)] border-white/10 animate-billion">
            <header className="px-12 py-10 border-b border-white/5 flex justify-between items-center bg-white/[0.02] backdrop-blur-3xl">
              <div className="flex items-center gap-8">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                </div>
                <div className="h-6 w-[1px] bg-white/10"></div>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-white font-outfit">{workspace.title}</h3>
              </div>
              <div className="flex items-center gap-6">
                {workspace.downloadData && (
                  <button 
                    onClick={handleDownload}
                    className="flex items-center gap-3 px-8 py-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-cyan-500 hover:text-black transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={2.5}/></svg>
                    Download Manifest
                  </button>
                )}
                <button 
                  onClick={() => setWorkspace({ ...workspace, isActive: false })} 
                  className="p-4 hover:bg-white/5 text-slate-500 hover:text-white rounded-full transition-all"
                >
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3}/></svg>
                </button>
              </div>
            </header>
            <div className="flex-1 relative bg-black/20">
              {workspace.type === 'preview' ? (
                <iframe srcDoc={workspace.content} className="absolute inset-0 w-full h-full border-none" sandbox="allow-scripts" title="Intelligence Result" />
              ) : (
                <div className="absolute inset-0 overflow-y-auto p-16 custom-scrollbar font-mono">
                  <div className="max-w-none">
                    {workspace.type === 'code' ? (
                      <div className="bg-[#010101] rounded-3xl p-10 border border-white/5 relative group">
                        <div className="absolute top-6 right-6 px-4 py-2 bg-white/5 rounded-lg text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          {workspace.language?.toUpperCase() || 'CODE'}
                        </div>
                        <pre className="text-cyan-400 leading-relaxed text-lg overflow-x-auto">
                          <code>{workspace.content}</code>
                        </pre>
                      </div>
                    ) : (
                      <article className="prose prose-invert prose-xl max-w-none prose-headings:font-outfit prose-headings:font-black prose-headings:tracking-tighter prose-headings:text-white prose-p:text-slate-400 prose-p:leading-relaxed">
                         <div className="whitespace-pre-wrap">
                           {workspace.content}
                         </div>
                      </article>
                    )}
                  </div>
                </div>
              )}
            </div>
            <footer className="px-12 py-6 bg-black/40 border-t border-white/5 flex justify-between items-center">
               <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500">Neural Workspace v2.5.0-NEURAL-FLASH</p>
               <div className="flex items-center gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-cyan-400">Core Sync Active</span>
               </div>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveVoice;
