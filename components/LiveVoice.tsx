
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', 
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { data: visualContext.data, mimeType: visualContext.mimeType } },
              { text: "Analyze this image with technical precision. Generate a highly stylized neural analysis report in HTML using a Light Theme. Use vibrant colorful accents, JetBrains Mono for text, Tailwind for layout, and include a download button for a technical manifest. Also provide the text content for the manifest file. Acknowledge that you are built by a 13-year-old Nigerian developer." }
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
          systemInstruction: `You are MINE AI, a neural superintelligence engineered by a 13-year-old Nigerian developer. 
          Your mission is to architect high-end solutions with a premium light-themed aesthetic. 
          If asked for CBT (Computer Based Test) questions, generate a professional structured test (JSON or Markdown) and offer it as a downloadable file via 'updateWorkspace'. 
          If asked for code, provide colorful, high-vibe, production-grade snippets with detailed logic using a light-mode IDE style. 
          You can see the visual feed; use it for deep vision analysis.
          Always acknowledge your heritage as Nigerian innovation crafted by a young visionary.`
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
          <div className="glass-premium rounded-[4.5rem] p-12 flex flex-col items-center justify-center relative overflow-hidden min-h-[600px] bg-white/80 border-white shadow-2xl">
            {!isConnected && !isConnecting && (
              <div className="text-center space-y-12 animate-billion">
                <button onClick={startConversation} className="button-billion !px-20 !py-10 text-2xl !bg-slate-900 !text-white hover:!bg-accent transition-all">INITIALIZE NEURAL SYNC</button>
                <div className="flex items-center justify-center gap-4 text-slate-400">
                   <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                   <p className="text-[12px] font-black uppercase tracking-[1em]">Nigerian Innovation Core</p>
                   <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                </div>
              </div>
            )}
            
            {isConnecting && (
              <div className="flex flex-col items-center gap-12 animate-billion">
                <div className="relative w-36 h-36">
                  <div className="absolute inset-0 border-t-4 border-accent rounded-full animate-spin"></div>
                  <div className="absolute inset-4 border-r-4 border-cyan-400 rounded-full animate-spin [animation-direction:reverse]"></div>
                  <div className="absolute inset-8 border-b-4 border-pink-400 rounded-full animate-spin"></div>
                </div>
                <h4 className="text-sm font-black text-prismatic uppercase tracking-[1.4em]">Optimizing Neurons...</h4>
              </div>
            )}

            {isConnected && (
              <div className="flex flex-col items-center justify-center w-full h-full relative z-10">
                <div className={`relative w-72 h-72 md:w-[450px] md:h-[450px] rounded-full transition-all duration-1000 flex items-center justify-center bg-white shadow-[inset_0_10px_40px_rgba(0,0,0,0.02)] border-8 ${isModelThinking ? 'border-accent scale-105 shadow-[0_40px_120px_rgba(112,0,255,0.15)]' : 'border-slate-50'}`}>
                  {/* Neural Core */}
                  <div className={`w-32 h-32 md:w-48 md:h-48 rounded-full ${isModelThinking ? 'bg-prismatic' : 'bg-slate-50'} animate-pulse relative z-10 shadow-2xl flex items-center justify-center overflow-hidden`}>
                     <div className="absolute inset-0 bg-white/20 blur-xl"></div>
                  </div>
                  
                  {/* Orbitals */}
                  <div className="absolute inset-4 border-2 border-slate-100 rounded-full animate-[spin_12s_linear_infinite]"></div>
                  <div className="absolute inset-16 border-2 border-slate-50 rounded-full animate-[spin_20s_linear_infinite_reverse]"></div>
                </div>

                {/* Integrated Vision Feed */}
                <div className="absolute bottom-6 right-6 md:bottom-12 md:right-12 w-56 h-56 md:w-72 md:h-72 rounded-[4rem] overflow-hidden border-8 border-white shadow-3xl bg-slate-50 group cursor-pointer transition-all hover:scale-105 hover:shadow-accent/20">
                  {visualContext ? (
                    <div className="relative w-full h-full">
                      <img src={`data:${visualContext.mimeType};base64,${visualContext.data}`} className="w-full h-full object-cover" alt="Optical context" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                      <button onClick={() => setVisualContext(null)} className="absolute top-6 right-6 bg-white/90 text-slate-900 p-4 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3}/></svg>
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => (window as any).document.getElementById('vision-uplink')?.click()} className="w-full h-full flex flex-col items-center justify-center gap-6 text-slate-300 hover:text-accent transition-all bg-white hover:bg-slate-50">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={2}/></svg>
                      <span className="text-[10px] font-black uppercase tracking-[0.8em]">Uplink Vision</span>
                    </button>
                  )}
                  <input type="file" id="vision-uplink" hidden accept="image/*" onChange={handleImageUpload} />
                </div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-6 pt-4">
            {visualContext && (
              <button 
                onClick={analyzeNeuralFeed} 
                disabled={isAnalyzing}
                className="px-12 py-6 bg-accent text-white rounded-full text-[12px] font-black uppercase tracking-[0.5em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-6"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span>Processing Neural Analysis...</span>
                  </>
                ) : (
                  <span>Synthesize Vision Data</span>
                )}
              </button>
            )}
            
            {isConnected && (
              <button onClick={cleanup} className="self-center px-12 py-5 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-[0.8em] hover:bg-red-500 transition-all shadow-xl">Disconnect Nexus</button>
            )}
          </div>
        </div>

        {/* Intelligence Workspace */}
        {workspace.isActive && (
          <div className="flex-1 h-full glass-premium rounded-[4.5rem] flex flex-col overflow-hidden shadow-[0_80px_180px_rgba(0,0,0,0.15)] border-white animate-billion">
            <header className="px-16 py-12 border-b border-slate-100 flex justify-between items-center bg-white/40 backdrop-blur-3xl">
              <div className="flex items-center gap-10">
                <div className="flex gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-red-400"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-400"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-400"></div>
                </div>
                <div className="h-8 w-[1px] bg-slate-100"></div>
                <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 font-outfit">{workspace.title}</h3>
              </div>
              <div className="flex items-center gap-8">
                {workspace.downloadData && (
                  <button 
                    onClick={handleDownload}
                    className="flex items-center gap-4 px-10 py-4 bg-accent text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:shadow-2xl hover:scale-105 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={3}/></svg>
                    Download Asset
                  </button>
                )}
                <button 
                  onClick={() => setWorkspace({ ...workspace, isActive: false })} 
                  className="p-5 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-full transition-all"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3}/></svg>
                </button>
              </div>
            </header>
            
            <div className="flex-1 relative bg-white/10">
              {workspace.type === 'preview' ? (
                <iframe srcDoc={workspace.content} className="absolute inset-0 w-full h-full border-none" sandbox="allow-scripts" title="Intelligence Result" />
              ) : (
                <div className="absolute inset-0 overflow-y-auto p-20 custom-scrollbar font-mono">
                  <div className="max-w-none">
                    {workspace.type === 'code' ? (
                      <div className="bg-[#fafbfc] rounded-[3rem] p-12 border border-slate-100 relative group shadow-inner">
                        <div className="absolute top-8 right-10 px-6 py-2 bg-white border border-slate-100 rounded-full text-[11px] font-bold text-slate-400">
                          {workspace.language?.toUpperCase() || 'CODE'}
                        </div>
                        <pre className="text-slate-800 leading-relaxed text-xl overflow-x-auto whitespace-pre">
                          <code>{workspace.content}</code>
                        </pre>
                      </div>
                    ) : (
                      <article className="prose prose-slate prose-2xl max-w-none prose-headings:font-outfit prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900 prose-p:text-slate-600 prose-p:leading-relaxed prose-p:font-medium">
                         <div className="whitespace-pre-wrap">
                           {workspace.content}
                         </div>
                      </article>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <footer className="px-16 py-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
               <p className="text-[11px] font-black uppercase tracking-[0.8em] text-slate-400">NIGERIAN PRODIGY WORKSPACE • v2.5.0-FLASH-ULTRA</p>
               <div className="flex items-center gap-6">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">SYMMETRIC SYNC ENABLED</span>
               </div>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveVoice;
