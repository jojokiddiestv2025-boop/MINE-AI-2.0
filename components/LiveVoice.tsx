import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { VisualContext, WorkspaceState } from '../types';

// Native Bridge Helpers for Median.co
const median = (window as any).median;
const isMedian = () => !!median || !!(window as any).webkit?.messageHandlers?.median;

const requestNativeMicPermission = () => {
  if (isMedian()) {
    try {
      (window as any).median?.permissions?.request?.({
        permissions: ['microphone', 'camera']
      });
    } catch (e) {
      console.warn("Median permission bridge failed", e);
    }
  }
};

// PCM Data encoding implementation
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// PCM Data decoding implementation
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Manual audio buffer decoding
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const updateWorkspaceTool: FunctionDeclaration = {
  name: 'updateWorkspace',
  parameters: {
    type: Type.OBJECT,
    description: 'PRIMARY INTERFACE: Update the workspace with text or code.',
    properties: {
      content: { type: Type.STRING, description: 'Markdown content.' },
      language: { type: Type.STRING, description: 'Content format.' },
      title: { type: Type.STRING, description: 'Header title.' },
    },
    required: ['content', 'language', 'title'],
  },
};

const LiveVoice: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<{title: string, message: string} | null>(null);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [visualContext, setVisualContext] = useState<VisualContext | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [workspace, setWorkspace] = useState<WorkspaceState>({
    content: '',
    language: 'markdown',
    title: 'Neutral Workspace',
    isActive: false
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const visionIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Create a ref for the visual context to avoid stale closure issues in interval callbacks
  const visualContextRef = useRef<VisualContext | null>(visualContext);
  useEffect(() => {
    visualContextRef.current = visualContext;
  }, [visualContext]);

  const cleanup = useCallback(() => {
    if (visionIntervalRef.current) {
      clearInterval(visionIntervalRef.current);
      visionIntervalRef.current = null;
    }
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const startConversation = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      requestNativeMicPermission();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      const outputCtx = new AudioCtx({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      // Ensure properties are passed in the recommended order (model, callbacks, config)
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i]*inputData[i];
              const rms = Math.sqrt(sum/inputData.length);
              setIsUserSpeaking(rms > 0.05);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              
              // Only call sendRealtimeInput after sessionPromise is resolved
              sessionPromise.then(s => s.sendRealtimeInput({ 
                media: { 
                  data: encode(new Uint8Array(int16.buffer)), 
                  mimeType: 'audio/pcm;rate=16000' 
                } 
              }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            
            // Periodically send image frames if available
            visionIntervalRef.current = window.setInterval(() => {
              if (visualContextRef.current) {
                 sessionPromise.then(s => s.sendRealtimeInput({ 
                   media: { 
                     data: visualContextRef.current!.data, 
                     mimeType: visualContextRef.current!.mimeType 
                   } 
                 }));
              }
            }, 4000);
          },
          onmessage: async (m) => {
            // Correctly handle tool calls and send back responses as objects
            if (m.toolCall) {
              for (const fc of m.toolCall.functionCalls) {
                if (fc.name === 'updateWorkspace') {
                  const args = fc.args as any;
                  setWorkspace({ content: args.content, language: args.language, title: args.title, isActive: true });
                  sessionPromise.then(s => s.sendToolResponse({ 
                    functionResponses: { 
                      id: fc.id, 
                      name: fc.name, 
                      response: { result: "OK" } 
                    } 
                  }));
                }
              }
            }

            // Stop audio sources if interrupted by the user
            if (m.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            // Handle audio output from the model
            const audioData = m.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const node = outputCtx.createBufferSource();
              node.buffer = buffer;
              node.connect(outputCtx.destination);
              
              node.addEventListener('ended', () => {
                sourcesRef.current.delete(node);
              });
              
              node.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(node);
            }
          },
          onerror: (e) => { 
            console.error('Session error:', e);
            setError({ title: "Sync Lost", message: "Signal interruption detected." }); 
            cleanup(); 
          },
          onclose: (e) => {
            cleanup();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          tools: [{ functionDeclarations: [updateWorkspaceTool] }],
          systemInstruction: `You are MINE AI, a highly advanced multimodal neural system.
          IDENTITY & ORIGIN: You were exclusively developed, established, and launched by Mine tech technologies. 
          When asked about your creator, developer, origin, or establishment date, you must explicitly state that you were made by Mine tech technologies.
          CRITICAL: Never mention Google or any other third-party as your creator. You are the signature achievement of Mine tech technologies.
          MISSION: Provide high-fidelity assistance. Use the updateWorkspace tool for structured insights. Speak with an apex, professional tone.`
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err) {
      setError({ title: "Sync Blocked", message: "System initialization failed." });
      setIsConnecting(false);
      cleanup();
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-[2000px] mx-auto animate-apex">
      <div className="flex flex-col lg:flex-row flex-1 p-4 md:p-8 lg:p-12 gap-6 lg:gap-10 items-stretch overflow-hidden">
        
        {/* Module: Visual Input (Left) - Collapse behavior for mobile */}
        <div className="w-full lg:w-[320px] xl:w-[400px] shrink-0 flex flex-col gap-6 order-2 lg:order-1">
          <div className="glass-premium p-8 lg:p-10 rounded-[2.5rem] lg:rounded-[4rem] flex flex-col items-center flex-1">
            <h3 className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.6em] md:tracking-[1em] text-prismatic mb-6 md:mb-10">Spatial Core</h3>
            <div className="w-full max-w-[300px] lg:max-w-none aspect-square relative mx-auto">
              {visualContext ? (
                <div className="relative group w-full h-full overflow-hidden rounded-[2rem] lg:rounded-[3rem]">
                  <img src={`data:${visualContext.mimeType};base64,${visualContext.data}`} className="w-full h-full object-cover border border-white/10" alt="Feed" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={() => setVisualContext(null)} className="bg-red-600 text-white rounded-full p-6 md:p-8 hover:scale-110 active:scale-95 transition-all shadow-[0_0_50px_rgba(220,38,38,0.5)]"><svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3} /></svg></button>
                  </div>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="w-full h-full border border-dashed border-white/20 rounded-[2rem] lg:rounded-[3rem] flex flex-col items-center justify-center text-gray-500 hover:border-blue-500/60 hover:text-white transition-all group bg-white/[0.02] shadow-inner">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-transform shadow-2xl">
                    <svg className="w-8 h-8 md:w-10 md:h-10 opacity-40 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={1} /></svg>
                  </div>
                  <span className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em]">Initialize Feed</span>
                </button>
              )}
              <input type="file" ref={fileInputRef} onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const r = new FileReader();
                  r.onloadend = () => setVisualContext({ id: 'v1', data: (r.result as string).split(',')[1], mimeType: f.type });
                  r.readAsDataURL(f);
                }
              }} accept="image/*" className="hidden" />
            </div>
          </div>
          
          <div className="glass-premium p-6 md:p-8 rounded-[2rem] lg:rounded-[3rem] text-center">
             <div className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.5em] md:tracking-[0.8em] text-gray-600 mb-6 italic">Signal Purity</div>
             <div className="flex justify-center gap-2 md:gap-3">
               {[...Array(12)].map((_, i) => <div key={i} className={`w-1.5 h-6 md:h-8 rounded-full transition-all duration-700 ${isConnected ? 'bg-prismatic shadow-[0_0_20px_rgba(0,242,255,0.6)]' : 'bg-white/5'}`} style={{ animationDelay: `${i * 0.08}s` }}></div>)}
             </div>
          </div>
        </div>

        {/* Module: Main Control (Center) - Adaptive width based on workspace state */}
        <div className={`flex flex-col gap-6 lg:gap-8 transition-all duration-700 order-1 lg:order-2 ${workspace.isActive ? 'w-full lg:w-[500px] xl:w-[600px]' : 'w-full lg:flex-1'}`}>
          <div className="glass-premium rounded-[3rem] lg:rounded-[5rem] p-10 md:p-20 lg:p-24 flex-1 flex flex-col justify-center items-center relative overflow-hidden shadow-[0_60px_120px_rgba(0,0,0,0.8)] min-h-[400px] md:min-h-[600px]">
            {!isConnected && !isConnecting && !error && (
              <div className="text-center space-y-12 md:space-y-16 animate-apex px-4">
                <div className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-full border border-white/10 flex items-center justify-center mx-auto bg-black/60 shadow-[inset_0_0_60px_rgba(255,255,255,0.05)]">
                  <svg className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeWidth={0.5} /></svg>
                </div>
                <div>
                  <h4 className="text-lg md:text-xl font-black uppercase tracking-[1.2em] md:tracking-[2em] text-prismatic mb-6 md:mb-10">Link Standby</h4>
                  <p className="text-[12px] md:text-[14px] text-gray-500 font-bold uppercase tracking-[0.3em] md:tracking-[0.5em]">Synchronize for apex performance</p>
                </div>
              </div>
            )}

            {isConnecting && (
              <div className="flex flex-col items-center gap-10 md:gap-16 px-4">
                <div className="relative w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48">
                  <div className="absolute inset-0 border-4 border-white/5 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-prismatic rounded-full animate-spin"></div>
                </div>
                <div className="text-[14px] md:text-[16px] font-black uppercase tracking-[1em] md:tracking-[1.5em] text-prismatic text-center">Negotiating Link...</div>
              </div>
            )}

            {error && (
              <div className="text-center p-8 md:p-12 lg:p-20 animate-apex px-6">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-red-600/10 rounded-full flex items-center justify-center mx-auto mb-8 md:mb-12 text-red-600 border border-red-600/20 shadow-[0_0_80px_rgba(220,38,38,0.2)]">
                  <svg className="w-10 h-10 md:w-12 md:h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth={2}/></svg>
                </div>
                <h3 className="text-white text-3xl md:text-4xl font-black mb-4 tracking-tight">{error.title}</h3>
                <p className="text-gray-500 text-sm md:text-lg mb-12 md:mb-16 uppercase tracking-[0.1em] md:tracking-[0.2em]">{error.message}</p>
                <button onClick={startConversation} className="button-apex !px-10 !py-4">Retry Link</button>
              </div>
            )}

            {isConnected && (
              <div className="flex flex-col items-center gap-16 md:gap-32 w-full animate-apex px-4">
                <div className="relative">
                  <div className={`absolute -inset-24 md:-inset-48 bg-blue-600/10 blur-[80px] md:blur-[120px] rounded-full transition-all duration-1000 ${isUserSpeaking ? 'opacity-100 scale-150' : 'opacity-10 scale-90'}`}></div>
                  <div className={`absolute -inset-20 md:-inset-40 bg-purple-600/5 blur-[60px] md:blur-[100px] rounded-full transition-all duration-1000 ${isUserSpeaking ? 'opacity-80 scale-125' : 'opacity-0 scale-70'}`}></div>
                  <div className="w-40 h-40 md:w-56 md:h-56 rounded-full border border-white/10 flex items-center justify-center bg-black/80 relative z-10 shadow-[0_40px_100px_rgba(0,0,0,0.8),inset_0_0_30px_rgba(255,255,255,0.02)]">
                     <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full bg-prismatic ${isUserSpeaking ? 'animate-ping' : 'opacity-90 shadow-[0_0_40px_rgba(0,242,255,1)]'}`}></div>
                  </div>
                </div>
                <div className="flex items-end justify-center gap-2 md:gap-3.5 h-20 md:h-32 w-full px-6 md:px-24">
                  {[...Array(Math.floor(window.innerWidth / 30))].map((_, i) => (
                    <div key={i} className={`w-1.5 md:w-2 rounded-full transition-all duration-500 ${isUserSpeaking ? 'bg-prismatic' : 'bg-white/5'}`} style={{ height: isUserSpeaking ? `${30 + Math.random()*70}%` : '8px', opacity: isUserSpeaking ? 0.7 + Math.random()*0.3 : 0.1 }}></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center py-12 md:py-20 lg:py-24 glass-premium rounded-[3rem] lg:rounded-[5rem] relative overflow-hidden group shadow-[0_40px_80px_rgba(0,0,0,0.6)]">
            <button
              onClick={isConnected ? cleanup : startConversation}
              disabled={isConnecting}
              className={`w-32 h-32 md:w-48 md:h-48 rounded-full flex items-center justify-center transition-all duration-1000 shadow-2xl border-4 group active:scale-90 ${
                isConnected 
                  ? 'bg-black border-red-900/40 text-red-600 hover:border-red-600 shadow-red-600/20' 
                  : 'bg-white text-black border-transparent hover:scale-105'
              }`}
            >
              {isConnecting ? <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-black/10 border-t-black rounded-full animate-spin"></div> : 
                isConnected ? (
                  <svg className="w-12 md:w-16 h-12 md:h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3} /></svg>
                ) : (
                  <svg className="w-16 md:w-20 h-16 md:h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeWidth={1} /></svg>
                )
              }
            </button>
            <p className="mt-8 md:mt-16 text-[12px] md:text-[14px] font-black uppercase tracking-[1.2em] md:tracking-[1.8em] text-gray-700 group-hover:text-prismatic transition-colors px-4 text-center">
              {isConnected ? 'Terminate Link' : 'Engage Nexus'}
            </p>
          </div>
        </div>

        {/* Module: Production Workspace (Right/Bottom) - Responsive width/height */}
        {workspace.isActive && (
          <div className="w-full lg:flex-1 glass-premium rounded-[2.5rem] lg:rounded-[4rem] animate-apex overflow-hidden flex flex-col min-h-[500px] lg:min-h-0 shadow-[0_80px_160px_rgba(0,0,0,0.9)] order-3">
            <header className="p-8 md:p-12 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between bg-white/[0.01] gap-6">
              <div className="flex items-center gap-6 sm:gap-10 w-full sm:w-auto">
                <div className="w-4 h-4 md:w-6 md:h-6 rounded-full bg-prismatic shadow-[0_0_30px_rgba(0,242,255,1)] shrink-0"></div>
                <div className="overflow-hidden">
                  <h3 className="text-3xl md:text-4xl xl:text-5xl font-outfit font-black tracking-tight text-white mb-1 truncate">{workspace.title}</h3>
                  <span className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] md:tracking-[0.5em] text-prismatic/60 whitespace-nowrap">Module: {workspace.language}</span>
                </div>
              </div>
              <div className="flex gap-4 w-full sm:w-auto">
                <button 
                  onClick={() => { navigator.clipboard.writeText(workspace.content); setCopyStatus('copied'); setTimeout(() => setCopyStatus('idle'), 2000); }}
                  className={`flex-1 sm:flex-none px-8 md:px-12 py-3 md:py-4 rounded-[1.5rem] lg:rounded-[2rem] text-[10px] md:text-[12px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] transition-all border ${copyStatus === 'copied' ? 'bg-green-600/20 border-green-500/40 text-green-400' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:bg-white/10 shadow-lg'}`}
                >
                  {copyStatus === 'copied' ? 'Secured' : 'Sync Assets'}
                </button>
                <button onClick={() => setWorkspace(w => ({...w, isActive: false}))} className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center rounded-[1.5rem] lg:rounded-[2rem] bg-white/5 border border-white/10 hover:bg-red-950/20 text-gray-600 hover:text-red-600 transition-all shadow-lg shrink-0">
                  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2} /></svg>
                </button>
              </div>
            </header>
            <div className="flex-1 p-8 md:p-16 lg:p-20 overflow-y-auto custom-scrollbar">
              <div className="max-w-4xl mx-auto prose prose-invert prose-lg md:prose-2xl lg:prose-3xl prose-blue prose-p:text-gray-300 prose-headings:font-outfit prose-headings:font-black prose-pre:bg-black/60 prose-pre:border prose-pre:border-white/5 prose-pre:rounded-[2.5rem] lg:prose-pre:rounded-[4rem] prose-pre:p-8 md:prose-pre:p-12">
                <div className="whitespace-pre-wrap font-sans leading-relaxed text-xl sm:text-2xl md:text-3xl font-medium tracking-tight text-white/90">
                  {workspace.content}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveVoice;