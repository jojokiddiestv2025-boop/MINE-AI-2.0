import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { VisualContext, WorkspaceState } from '../types';

interface LiveVoiceProps {
  onHome?: () => void;
  isAcademic?: boolean;
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

// PCM Data encoding/decoding
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const updateWorkspaceTool: FunctionDeclaration = {
  name: 'updateWorkspace',
  parameters: {
    type: Type.OBJECT,
    description: 'Update the workspace with content, language, and title.',
    properties: {
      content: { type: Type.STRING, description: 'Markdown content.' },
      language: { type: Type.STRING, description: 'Content format.' },
      title: { type: Type.STRING, description: 'Header title.' },
    },
    required: ['content', 'language', 'title'],
  },
};

const LiveVoice: React.FC<LiveVoiceProps> = ({ onHome, isAcademic = false }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<{title: string, message: string} | null>(null);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [visualContext, setVisualContext] = useState<VisualContext | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [workspace, setWorkspace] = useState<WorkspaceState>({
    content: '',
    language: 'markdown',
    title: 'Ready for Input',
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
  const visualContextRef = useRef<VisualContext | null>(visualContext);

  useEffect(() => {
    visualContextRef.current = visualContext;
  }, [visualContext]);

  const cleanup = useCallback(() => {
    if (visionIntervalRef.current) clearInterval(visionIntervalRef.current);
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const startConversation = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      if (!window.isSecureContext) {
        throw new Error("INSECURE_CONTEXT");
      }
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (mediaErr: any) {
        if (mediaErr.name === 'NotAllowedError' || mediaErr.name === 'PermissionDeniedError') {
          throw new Error("PERMISSION_DENIED");
        } else if (mediaErr.name === 'NotFoundError' || mediaErr.name === 'DevicesNotFoundError') {
          throw new Error("NO_HARDWARE_FOUND");
        } else if (mediaErr.name === 'NotReadableError' || mediaErr.name === 'TrackStartError') {
          throw new Error("HARDWARE_IN_USE");
        } else {
          throw mediaErr;
        }
      }

      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      const outputCtx = new AudioCtx({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const baseSystemInstruction = isAcademic 
        ? `You are MINE AI Chancellor, the world's most advanced Academic Neural Interface. 
           Your purpose is to facilitate high-level learning for schools and universities. 
           1. Assist with complex school work, research, and coding.
           2. If asked, generate quiz questions or socratic challenges to test user knowledge.
           3. Use updateWorkspace to display study guides, essay outlines, and solved equations.
           4. Be highly structured, authoritative yet encouraging, and academically rigorous.`
        : `You are MINE AI, a hyper-advanced neural intelligence made by Mine tech technologies. 
           Respond with precision, elegance, and extreme competence. Use updateWorkspace for formatted outputs.`;

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
              
              sessionPromise.then(s => s.sendRealtimeInput({ 
                media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } 
              }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            
            visionIntervalRef.current = window.setInterval(() => {
              if (visualContextRef.current) {
                 sessionPromise.then(s => s.sendRealtimeInput({ 
                   media: { data: visualContextRef.current!.data, mimeType: visualContextRef.current!.mimeType } 
                 }));
              }
            }, 3500);
          },
          onmessage: async (m: LiveServerMessage) => {
            if (m.toolCall) {
              for (const fc of m.toolCall.functionCalls) {
                if (fc.name === 'updateWorkspace') {
                  const args = fc.args as any;
                  setWorkspace({ content: args.content, language: args.language, title: args.title, isActive: true });
                  sessionPromise.then(s => s.sendToolResponse({ 
                    functionResponses: { id: fc.id, name: fc.name, response: { result: "Workspace Updated Successfully" } } 
                  }));
                }
              }
            }

            if (m.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
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
              node.addEventListener('ended', () => sourcesRef.current.delete(node));
              node.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(node);
            }
          },
          onerror: (e) => { 
            console.error('Neural Link Error:', e);
            setError({ title: "Signal Lost", message: "The neural link has been unexpectedly terminated. Check your API key and connection." }); 
            cleanup(); 
          },
          onclose: () => cleanup()
        },
        config: {
          responseModalalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          tools: [{ functionDeclarations: [updateWorkspaceTool] }],
          systemInstruction: baseSystemInstruction
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err: any) {
      let title = "Link Blocked";
      let message = "Critical hardware initialization failed.";

      if (err.message === "PERMISSION_DENIED") {
        title = "Access Denied";
        message = "Microphone access blocked.";
      } else if (err.message === "NO_HARDWARE_FOUND") {
        title = "Hardware Missing";
        message = "No microphone detected.";
      } else if (err.message === "HARDWARE_IN_USE") {
        title = "Link Occupied";
        message = "Microphone in use by another app.";
      } else if (err.message === "INSECURE_CONTEXT") {
        title = "Security Protocol";
        message = "HTTPS required for secure hardware access.";
      }

      setError({ title, message });
      setIsConnecting(false);
      cleanup();
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-[2400px] mx-auto animate-billion overflow-hidden">
      <div className="flex flex-col lg:flex-row flex-1 p-4 md:p-10 lg:p-16 gap-8 lg:gap-14 items-stretch overflow-hidden">
        
        {/* Module: Visual Core */}
        <div className="w-full lg:w-[360px] xl:w-[480px] shrink-0 flex flex-col gap-8 order-2 lg:order-1">
          <div className="glass-premium p-10 lg:p-12 rounded-[4rem] flex flex-col items-center flex-1 transition-all hover:shadow-2xl border-white/90 shadow-xl">
            <h3 className="text-[11px] font-black uppercase tracking-[1em] text-prismatic mb-10">Study Frame</h3>
            <div className="w-full aspect-square relative mx-auto">
              {visualContext ? (
                <div className="relative group w-full h-full overflow-hidden rounded-[3.5rem]">
                  <img src={`data:${visualContext.mimeType};base64,${visualContext.data}`} className="w-full h-full object-cover" alt="Feed" />
                  <div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                    <button onClick={() => setVisualContext(null)} className="bg-red-500 text-white rounded-full p-8 hover:scale-110 active:scale-90 transition-all shadow-xl">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3} /></svg>
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="w-full h-full border border-black/5 rounded-[3.5rem] flex flex-col items-center justify-center text-slate-400 hover:border-blue-400/40 hover:text-slate-900 transition-all group bg-white/40 shadow-inner">
                  <div className="w-24 h-24 bg-slate-900/5 rounded-full flex items-center justify-center mb-10 group-hover:scale-110 transition-all shadow-sm">
                    <svg className="w-12 h-12 opacity-30 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={1} /></svg>
                  </div>
                  <span className="text-[12px] font-black uppercase tracking-[0.6em] text-center">Scan Textbook / Problem</span>
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
          
          <div className="glass-premium p-10 rounded-[3.5rem] text-center border-white/90 shadow-lg">
             <div className="text-[11px] font-black uppercase tracking-[1em] text-slate-400 mb-8 italic">Academic Core Feed</div>
             <div className="flex justify-center gap-3">
               {[...Array(16)].map((_, i) => (
                 <div key={i} className={`w-2 h-10 rounded-full transition-all duration-1000 ${isConnected ? 'bg-prismatic' : 'bg-slate-900/5'}`} style={{ animation: isConnected ? `pulse 2s infinite ${i * 0.1}s` : 'none' }}></div>
               ))}
             </div>
          </div>
        </div>

        {/* Module: Neural Cockpit */}
        <div className={`flex flex-col gap-8 transition-all duration-1000 order-1 lg:order-2 ${workspace.isActive ? 'w-full lg:w-[600px] xl:w-[750px]' : 'w-full lg:flex-1'}`}>
          <div className="glass-premium rounded-[5rem] p-12 md:p-24 flex-1 flex flex-col justify-center items-center relative overflow-hidden shadow-2xl min-h-[500px] border-white/90">
            {!isConnected && !isConnecting && !error && (
              <div className="text-center space-y-20 animate-billion">
                <div className="w-48 h-48 md:w-64 md:h-64 rounded-full border border-black/5 flex items-center justify-center mx-auto bg-white/60 shadow-xl relative group cursor-pointer" onClick={startConversation}>
                  <div className="absolute inset-0 bg-prismatic opacity-0 group-hover:opacity-10 blur-3xl transition-opacity"></div>
                  <svg className="w-20 h-20 md:w-28 md:h-28 text-slate-200 transition-colors group-hover:text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeWidth={0.5} /></svg>
                </div>
                <div className="space-y-6">
                  <h4 className="text-2xl font-black uppercase tracking-[2em] text-prismatic">{isAcademic ? 'Chancellor Mode' : 'Link Standby'}</h4>
                  <p className="text-[14px] text-slate-400 font-bold uppercase tracking-[0.6em]">{isAcademic ? 'Begin Academic Session' : 'Initialize Apex Neural Interface'}</p>
                </div>
              </div>
            )}

            {isConnecting && (
              <div className="flex flex-col items-center gap-20">
                <div className="relative w-48 h-48">
                  <div className="absolute inset-0 border-4 border-slate-900/5 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-prismatic rounded-full animate-spin"></div>
                  <div className="absolute inset-8 border-4 border-b-prismatic rounded-full animate-spin-slow"></div>
                </div>
                <div className="text-xl font-black uppercase tracking-[1.5em] text-prismatic animate-pulse">Syncing Nexus...</div>
              </div>
            )}

            {error && (
              <div className="text-center p-12 lg:p-20 animate-billion">
                <div className="w-32 h-32 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-16 text-red-500 border border-red-100 shadow-sm">
                  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth={2}/></svg>
                </div>
                <h3 className="text-slate-900 text-5xl font-black mb-8 tracking-tight">{error.title}</h3>
                <p className="text-slate-500 text-xl mb-20 uppercase tracking-[0.2em] max-w-md mx-auto leading-relaxed">{error.message}</p>
                <button onClick={startConversation} className="button-billion">Retry Link</button>
              </div>
            )}

            {isConnected && (
              <div className="flex flex-col items-center gap-24 md:gap-40 w-full animate-billion">
                <div className="relative">
                  <div className={`absolute -inset-64 bg-blue-400/20 blur-[140px] rounded-full transition-all duration-1000 ${isUserSpeaking ? 'opacity-100 scale-150' : 'opacity-20 scale-90'}`}></div>
                  <div className="w-56 h-56 md:w-72 md:h-72 rounded-full border border-black/5 flex items-center justify-center bg-white relative z-10 shadow-2xl">
                     <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full bg-prismatic ${isUserSpeaking ? 'animate-ping' : 'shadow-[0_0_50px_rgba(0,242,255,1)]'}`}></div>
                  </div>
                </div>
                <div className="flex items-end justify-center gap-3 h-24 md:h-40 w-full px-12">
                  {[...Array(40)].map((_, i) => (
                    <div key={i} className={`w-2 rounded-full transition-all duration-300 ${isUserSpeaking ? 'bg-prismatic' : 'bg-slate-900/5'}`} style={{ height: isUserSpeaking ? `${20 + Math.random()*80}%` : '6px' }}></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center py-16 md:py-20 glass-premium rounded-[5rem] relative overflow-hidden group shadow-xl border-white/90">
            <div className="absolute top-8 left-12">
              <button onClick={onHome} className="text-slate-400 hover:text-slate-900 transition-colors text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-3 group/home">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth={2}/></svg>
                Return Home
              </button>
            </div>
            <button
              onClick={isConnected ? cleanup : startConversation}
              disabled={isConnecting}
              className={`w-36 h-36 md:w-48 md:h-48 rounded-full flex items-center justify-center transition-all duration-1000 shadow-2xl border-4 group active:scale-95 ${
                isConnected ? 'bg-slate-900 border-red-500/40 text-red-500' : 'bg-white text-slate-900 border-black/5'
              }`}
            >
              {isConnecting ? <div className="w-16 h-16 border-4 border-slate-900/10 border-t-slate-900 rounded-full animate-spin"></div> : 
                <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isConnected ? <path d="M6 18L18 6M6 6l12 12" strokeWidth={3} /> : <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeWidth={1} />}
                </svg>
              }
            </button>
            <p className="mt-12 text-[14px] font-black uppercase tracking-[2em] text-slate-300 group-hover:text-prismatic transition-colors">
              {isConnected ? 'Terminate' : 'Start Session'}
            </p>
          </div>
        </div>

        {/* Module: Production Synapse (Workspace) */}
        {workspace.isActive && (
          <div className="w-full lg:flex-1 glass-premium rounded-[4rem] animate-billion overflow-hidden flex flex-col min-h-[600px] lg:min-h-0 shadow-2xl border-white/90 order-3">
            <header className="p-10 md:p-14 border-b border-black/[0.03] flex flex-col sm:flex-row items-center justify-between bg-white/40 gap-8">
              <div className="flex items-center gap-8 w-full sm:w-auto">
                <div className="w-8 h-8 rounded-full bg-prismatic shadow-lg shrink-0"></div>
                <div>
                  <h3 className="text-4xl xl:text-5xl font-outfit font-black tracking-tight text-slate-900 mb-2">{workspace.title}</h3>
                  <span className="text-[12px] font-black uppercase tracking-[0.6em] text-prismatic font-bold">Asset: {workspace.language}</span>
                </div>
              </div>
              <div className="flex gap-5 w-full sm:w-auto">
                <button 
                  onClick={() => { navigator.clipboard.writeText(workspace.content); setCopyStatus('copied'); setTimeout(() => setCopyStatus('idle'), 2000); }}
                  className={`flex-1 sm:flex-none px-12 py-5 rounded-[2.5rem] text-[12px] font-black uppercase tracking-[0.4em] transition-all border shadow-sm ${copyStatus === 'copied' ? 'bg-green-100 border-green-200 text-green-700' : 'bg-white border-black/5 text-slate-400 hover:text-slate-900'}`}
                >
                  {copyStatus === 'copied' ? 'Synced' : 'Sync'}
                </button>
                <button onClick={() => setWorkspace(w => ({...w, isActive: false}))} className="w-16 h-16 flex items-center justify-center rounded-[2.5rem] bg-white border border-black/5 hover:bg-red-50 text-slate-300 hover:text-red-500 shadow-sm transition-all">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2} /></svg>
                </button>
              </div>
            </header>
            <div className="flex-1 p-10 md:p-20 overflow-y-auto custom-scrollbar bg-white/30">
              <div className="max-w-5xl mx-auto prose prose-slate prose-2xl">
                <div className="whitespace-pre-wrap font-sans leading-tight text-3xl font-medium tracking-tighter text-slate-800">
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