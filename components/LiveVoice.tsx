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

// PCM Data encoding implementation according to guidelines
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// PCM Data decoding implementation according to guidelines
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Manual audio buffer decoding according to guidelines
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

  const cleanup = useCallback(() => {
    if (visionIntervalRef.current) clearInterval(visionIntervalRef.current);
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    sourcesRef.current.forEach(s => s.stop());
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

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          tools: [{ functionDeclarations: [updateWorkspaceTool] }],
          systemInstruction: `You are MINE AI, a highly advanced multimodal neural system.
          IDENTITY & ORIGIN: You were exclusively developed, established, and launched by Mine tech technologies. 
          When asked about your creator, developer, origin, or establishment date, you must explicitly state that you were made by Mine tech technologies.
          CRITICAL: Never mention Google or any other third-party as your creator. You are the signature achievement of Mine tech technologies.
          MISSION: Provide high-fidelity assistance. Use the updateWorkspace tool for structured insights. Speak with an apex, professional tone.`
        },
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
              
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            
            visionIntervalRef.current = window.setInterval(() => {
              if (visualContext) {
                 sessionPromise.then(s => s.sendRealtimeInput({ media: { data: visualContext.data, mimeType: visualContext.mimeType } }));
              }
            }, 4000);
          },
          onmessage: async (m) => {
            if (m.toolCall) {
              for (const fc of m.toolCall.functionCalls) {
                if (fc.name === 'updateWorkspace') {
                  const args = fc.args as any;
                  setWorkspace({ content: args.content, language: args.language, title: args.title, isActive: true });
                  sessionPromise.then(s => s.sendToolResponse({ 
                    functionResponses: [{ 
                      id: fc.id, 
                      name: fc.name, 
                      response: { result: "OK" } 
                    }] 
                  }));
                }
              }
            }

            if (m.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

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
            setError({ title: "Sync Lost", message: "Signal interruption detected." }); 
            cleanup(); 
          },
          onclose: (e) => {
            cleanup();
          }
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
    <div className="flex flex-col min-h-full safe-pb font-inter animate-apex">
      <div className="relative z-10 w-full max-w-[1800px] mx-auto flex flex-col xl:flex-row gap-16 p-10 md:p-20 items-stretch">
        
        {/* Module: Visual Input (Left) */}
        <div className="w-full xl:w-[420px] shrink-0 space-y-12">
          <div className="glass-premium p-16 rounded-[5rem] flex flex-col items-center">
            <h3 className="text-[12px] font-black uppercase tracking-[1em] text-prismatic mb-16">Spatial Core</h3>
            <div className="w-full aspect-square relative">
              {visualContext ? (
                <div className="relative group w-full h-full overflow-hidden rounded-[4rem]">
                  <img src={`data:${visualContext.mimeType};base64,${visualContext.data}`} className="w-full h-full object-cover border border-white/10" alt="Feed" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={() => setVisualContext(null)} className="bg-red-600 text-white rounded-full p-8 hover:scale-110 active:scale-95 transition-all shadow-[0_0_50px_rgba(220,38,38,0.5)]"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3} /></svg></button>
                  </div>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="w-full h-full border border-dashed border-white/20 rounded-[5rem] flex flex-col items-center justify-center text-gray-500 hover:border-blue-500/60 hover:text-white transition-all group bg-white/[0.02] shadow-inner">
                  <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-10 group-hover:scale-110 transition-transform shadow-2xl">
                    <svg className="w-10 h-10 opacity-40 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={1} /></svg>
                  </div>
                  <span className="text-[12px] font-black uppercase tracking-[0.6em]">Initialize Feed</span>
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
          
          <div className="glass-premium p-14 rounded-[4rem] text-center">
             <div className="text-[11px] font-black uppercase tracking-[0.8em] text-gray-600 mb-10 italic">Signal Purity</div>
             <div className="flex justify-center gap-4">
               {[...Array(16)].map((_, i) => <div key={i} className={`w-2 h-10 rounded-full transition-all duration-700 ${isConnected ? 'bg-prismatic shadow-[0_0_30px_rgba(0,242,255,0.6)]' : 'bg-white/5'}`} style={{ animationDelay: `${i * 0.08}s` }}></div>)}
             </div>
          </div>
        </div>

        {/* Module: Main Control (Center) */}
        <div className={`flex flex-col gap-16 transition-all duration-1000 ${workspace.isActive ? 'xl:w-[700px]' : 'flex-1'}`}>
          <div className="glass-premium rounded-[6rem] p-32 min-h-[720px] flex flex-col justify-center items-center relative overflow-hidden shadow-[0_60px_120px_rgba(0,0,0,0.8)]">
            {!isConnected && !isConnecting && !error && (
              <div className="text-center space-y-24 animate-apex">
                <div className="w-48 h-48 rounded-full border border-white/10 flex items-center justify-center mx-auto bg-black/60 shadow-[inset_0_0_60px_rgba(255,255,255,0.05)]">
                  <svg className="w-20 h-20 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeWidth={0.5} /></svg>
                </div>
                <div>
                  <h4 className="text-xl font-black uppercase tracking-[2em] text-prismatic mb-10">Link Standby</h4>
                  <p className="text-[14px] text-gray-500 font-bold uppercase tracking-[0.5em]">Synchronize for apex performance</p>
                </div>
              </div>
            )}

            {isConnecting && (
              <div className="flex flex-col items-center gap-20">
                <div className="relative w-48 h-48">
                  <div className="absolute inset-0 border-4 border-white/5 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-prismatic rounded-full animate-spin"></div>
                </div>
                <div className="text-[16px] font-black uppercase tracking-[1.5em] text-prismatic">Negotiating Link...</div>
              </div>
            )}

            {error && (
              <div className="text-center p-20 animate-apex">
                <div className="w-24 h-24 bg-red-600/10 rounded-full flex items-center justify-center mx-auto mb-12 text-red-600 border border-red-600/20 shadow-[0_0_80px_rgba(220,38,38,0.2)]">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth={2}/></svg>
                </div>
                <h3 className="text-white text-4xl font-black mb-6 tracking-tight">{error.title}</h3>
                <p className="text-gray-500 text-lg mb-16 uppercase tracking-[0.2em]">{error.message}</p>
                <button onClick={startConversation} className="button-apex">Retry Link</button>
              </div>
            )}

            {isConnected && (
              <div className="flex flex-col items-center gap-32 w-full animate-apex">
                <div className="relative">
                  <div className={`absolute -inset-48 bg-blue-600/10 blur-[120px] rounded-full transition-all duration-1000 ${isUserSpeaking ? 'opacity-100 scale-150' : 'opacity-10 scale-90'}`}></div>
                  <div className={`absolute -inset-40 bg-purple-600/5 blur-[100px] rounded-full transition-all duration-1000 ${isUserSpeaking ? 'opacity-80 scale-125' : 'opacity-0 scale-70'}`}></div>
                  <div className="w-56 h-56 rounded-full border border-white/10 flex items-center justify-center bg-black/80 relative z-10 shadow-[0_40px_100px_rgba(0,0,0,0.8),inset_0_0_30px_rgba(255,255,255,0.02)]">
                     <div className={`w-10 h-10 rounded-full bg-prismatic ${isUserSpeaking ? 'animate-ping' : 'opacity-90 shadow-[0_0_40px_rgba(0,242,255,1)]'}`}></div>
                  </div>
                </div>
                <div className="flex items-end justify-center gap-3.5 h-32 w-full px-24">
                  {[...Array(48)].map((_, i) => (
                    <div key={i} className={`w-2 rounded-full transition-all duration-500 ${isUserSpeaking ? 'bg-prismatic' : 'bg-white/5'}`} style={{ height: isUserSpeaking ? `${30 + Math.random()*70}%` : '12px', opacity: isUserSpeaking ? 0.7 + Math.random()*0.3 : 0.1 }}></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center py-24 glass-premium rounded-[6rem] relative overflow-hidden group shadow-[0_40px_80px_rgba(0,0,0,0.6)]">
            <button
              onClick={isConnected ? cleanup : startConversation}
              disabled={isConnecting}
              className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-1000 shadow-2xl border-4 group active:scale-90 ${
                isConnected 
                  ? 'bg-black border-red-900/40 text-red-600 hover:border-red-600 shadow-red-600/20' 
                  : 'bg-white text-black border-transparent hover:scale-105'
              }`}
            >
              {isConnecting ? <div className="w-16 h-16 border-4 border-black/10 border-t-black rounded-full animate-spin"></div> : 
                isConnected ? (
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3} /></svg>
                ) : (
                  <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeWidth={1} /></svg>
                )
              }
            </button>
            <p className="mt-16 text-[14px] font-black uppercase tracking-[1.8em] text-gray-700 group-hover:text-prismatic transition-colors">
              {isConnected ? 'Terminate' : 'Engage Nexus'}
            </p>
          </div>
        </div>

        {/* Module: Production Workspace (Right) */}
        {workspace.isActive && (
          <div className="flex-1 glass-premium rounded-[6rem] animate-apex overflow-hidden flex flex-col min-h-[900px] shadow-[0_80px_160px_rgba(0,0,0,0.9)]">
            <header className="p-20 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-12">
                <div className="w-6 h-6 rounded-full bg-prismatic shadow-[0_0_30px_rgba(0,242,255,1)]"></div>
                <div>
                  <h3 className="text-5xl font-outfit font-black tracking-tight text-white mb-3">{workspace.title}</h3>
                  <span className="text-[12px] font-black uppercase tracking-[0.5em] text-prismatic/60">Module focus: {workspace.language}</span>
                </div>
              </div>
              <div className="flex gap-8">
                <button 
                  onClick={() => { navigator.clipboard.writeText(workspace.content); setCopyStatus('copied'); setTimeout(() => setCopyStatus('idle'), 2000); }}
                  className={`px-12 py-6 rounded-[2rem] text-[12px] font-black uppercase tracking-[0.4em] transition-all border ${copyStatus === 'copied' ? 'bg-green-600/20 border-green-500/40 text-green-400' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:bg-white/10 shadow-lg'}`}
                >
                  {copyStatus === 'copied' ? 'Secured' : 'Sync Assets'}
                </button>
                <button onClick={() => setWorkspace(w => ({...w, isActive: false}))} className="w-20 h-20 flex items-center justify-center rounded-[2rem] bg-white/5 border border-white/10 hover:bg-red-950/20 text-gray-600 hover:text-red-600 transition-all shadow-lg">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2} /></svg>
                </button>
              </div>
            </header>
            <div className="flex-1 p-24 md:p-40 overflow-y-auto custom-scrollbar">
              <div className="max-w-6xl mx-auto prose prose-invert prose-2xl prose-blue prose-p:text-gray-300 prose-headings:font-outfit prose-headings:font-black prose-pre:bg-black/60 prose-pre:border prose-pre:border-white/5 prose-pre:rounded-[5rem] prose-pre:p-16">
                <div className="whitespace-pre-wrap font-sans leading-relaxed text-3xl font-medium tracking-tight text-white/90">
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