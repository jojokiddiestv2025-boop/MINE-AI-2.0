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
    description: 'PRIMARY OUTPUT INTERFACE: Respond to the user by updating the persistent workspace. Be detailed.',
    properties: {
      content: { type: Type.STRING, description: 'The text or code in Markdown.' },
      language: { type: Type.STRING, description: 'Format (markdown, python, javascript, etc.)' },
      title: { type: Type.STRING, description: 'Concise title.' },
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
      
      const apiKey = process.env.API_KEY || (window as any).process?.env?.API_KEY;
      if (!apiKey) throw new Error("API_KEY_MISSING");

      const ai = new GoogleGenAI({ apiKey });
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
          systemInstruction: "You are MINE AI, a hyper-intelligent neural interface. Respond via voice and use 'updateWorkspace' for text/code results."
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
                  sessionPromise.then(s => s.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: { result: "Success" } }] }));
                }
              }
            }
            const audioData = m.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const node = outputCtx.createBufferSource();
              node.buffer = buffer;
              node.connect(outputCtx.destination);
              node.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(node);
            }
          },
          onerror: (e) => { setError({ title: "Signal Lost", message: "Interface interrupted." }); cleanup(); },
          onclose: () => cleanup()
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err) {
      setError({ title: "Sync Failed", message: "Check microphone permissions." });
      setIsConnecting(false);
      cleanup();
    }
  };

  return (
    <div className="flex flex-col min-h-full safe-pb font-inter animate-in fade-in duration-1000">
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 p-6 md:p-12">
        
        {/* Module: Visuals */}
        <div className="w-full lg:w-72 shrink-0 space-y-6">
          <div className="glass-strong border-white/10 p-8 rounded-[3rem] shadow-2xl flex flex-col items-center">
            <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 mb-8">Neural Vision</h3>
            <div className="w-full aspect-square relative flex items-center justify-center">
              {visualContext ? (
                <div className="relative group w-full h-full">
                  <img src={`data:${visualContext.mimeType};base64,${visualContext.data}`} className="w-full h-full object-cover rounded-[2rem] border border-blue-500/20 shadow-xl" alt="Feed" />
                  <button onClick={() => setVisualContext(null)} className="absolute -top-3 -right-3 bg-red-600/90 text-white rounded-full p-2 hover:scale-110 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3} /></svg></button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="w-full h-full border-2 border-dashed border-gray-800 rounded-[2.5rem] flex flex-col items-center justify-center text-gray-600 hover:border-blue-500/40 hover:text-blue-400 transition-all group bg-white/5">
                  <svg className="w-10 h-10 mb-3 opacity-20 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={1.5} /></svg>
                  <span className="text-[9px] font-black uppercase tracking-widest">Capture Frame</span>
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
            <p className="mt-8 text-[9px] text-gray-500 font-bold uppercase tracking-widest text-center">Context syncs every 4s</p>
          </div>
          
          <div className="glass p-6 rounded-[2.5rem] text-center space-y-4">
             <div className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600">Signal Integrity</div>
             <div className="flex justify-center gap-1">
               {[1,2,3,4,5].map(i => <div key={i} className={`w-1 h-3 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-800'}`}></div>)}
             </div>
          </div>
        </div>

        {/* Module: Communication Hub */}
        <div className={`flex flex-col gap-8 transition-all duration-700 ${workspace.isActive ? 'lg:w-[480px]' : 'flex-1'}`}>
          <div className="glass-strong border-white/10 rounded-[3.5rem] p-12 min-h-[480px] flex flex-col justify-center items-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-30"></div>
            
            {!isConnected && !isConnecting && !error && (
              <div className="text-center space-y-10">
                <div className="w-24 h-24 rounded-full border border-white/5 flex items-center justify-center mx-auto shadow-inner bg-black/20">
                  <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeWidth={1} /></svg>
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-[0.8em] text-blue-500 mb-3">Sync Required</h4>
                  <p className="text-xs text-gray-500 font-medium">Initialize neural link to begin dialogue.</p>
                </div>
              </div>
            )}

            {isConnecting && (
              <div className="flex flex-col items-center gap-6">
                <div className="w-16 h-16 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-400">Negotiating Bridge...</div>
              </div>
            )}

            {error && (
              <div className="text-center bg-red-500/5 p-10 rounded-[2.5rem] border border-red-500/20">
                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth={2}/></svg>
                </div>
                <h3 className="text-white font-bold mb-2">{error.title}</h3>
                <p className="text-gray-500 text-xs mb-8">{error.message}</p>
                <button onClick={startConversation} className="px-8 py-3 bg-red-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-red-500/20">Retry Sync</button>
              </div>
            )}

            {isConnected && (
              <div className="flex flex-col items-center gap-12 w-full">
                <div className="relative">
                  <div className={`absolute -inset-16 bg-blue-500/10 blur-[50px] rounded-full transition-all duration-1000 ${isUserSpeaking ? 'opacity-100 scale-125' : 'opacity-20 scale-100'}`}></div>
                  <div className="w-20 h-20 rounded-full border border-blue-500/20 flex items-center justify-center bg-black/40 relative z-10 shadow-2xl">
                     <div className={`w-3 h-3 rounded-full bg-blue-500 ${isUserSpeaking ? 'animate-ping' : 'opacity-40 shadow-[0_0_10px_rgba(59,130,246,1)]'}`}></div>
                  </div>
                </div>
                <div className="flex items-end justify-center gap-2 h-12 w-full px-10">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className={`w-1 rounded-full transition-all duration-300 ${isUserSpeaking ? 'bg-blue-400' : 'bg-gray-800'}`} style={{ height: isUserSpeaking ? `${20 + Math.random()*80}%` : '8px', opacity: isUserSpeaking ? 0.6 + Math.random()*0.4 : 0.2 }}></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center py-10 glass-strong border-white/10 rounded-[3.5rem] shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <button
              onClick={isConnected ? cleanup : startConversation}
              disabled={isConnecting}
              className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl border-4 group active:scale-95 ${
                isConnected 
                  ? 'bg-gray-950 border-red-500/20 text-red-500 hover:border-red-500/40 shadow-red-500/10' 
                  : 'bg-white text-black border-transparent hover:shadow-white/20'
              }`}
            >
              {isConnecting ? <div className="w-10 h-10 border-4 border-black/10 border-t-black rounded-full animate-spin"></div> : 
                isConnected ? (
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3} /></svg>
                ) : (
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeWidth={1.5} /></svg>
                )
              }
            </button>
            <p className="mt-8 text-[10px] font-black uppercase tracking-[0.8em] text-gray-500 group-hover:text-blue-400 transition-colors">
              {isConnected ? 'Disconnect' : 'Sync Interface'}
            </p>
          </div>
        </div>

        {/* Module: Workspace Output */}
        {workspace.isActive && (
          <div className="flex-1 glass-strong border-blue-500/20 rounded-[4rem] shadow-2xl animate-in slide-in-from-right-12 duration-1000 overflow-hidden flex flex-col">
            <header className="p-10 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-3xl">
              <div className="flex items-center gap-6">
                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]"></div>
                <div>
                  <h3 className="text-2xl font-outfit font-black tracking-tight text-white">{workspace.title}</h3>
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-400/60">{workspace.language} module active</span>
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => { navigator.clipboard.writeText(workspace.content); setCopyStatus('copied'); setTimeout(() => setCopyStatus('idle'), 2000); }}
                  className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${copyStatus === 'copied' ? 'bg-green-600/20 border-green-500/40 text-green-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`}
                >
                  {copyStatus === 'copied' ? 'Stored' : 'Copy'}
                </button>
                <button onClick={() => setWorkspace(w => ({...w, isActive: false}))} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2.5} /></svg></button>
              </div>
            </header>
            <div className="flex-1 p-12 md:p-16 overflow-y-auto">
              <div className="max-w-3xl mx-auto prose prose-invert prose-blue prose-p:text-gray-300 prose-headings:font-outfit prose-headings:font-black prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/5 prose-pre:rounded-[2rem]">
                <div className="whitespace-pre-wrap font-sans leading-relaxed text-lg">
                  {workspace.content}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-auto py-12 text-center">
        <p className="text-[9px] font-black uppercase tracking-[1em] text-gray-700">Multi-modal Neural Grid Access</p>
      </div>
    </div>
  );
};

export default LiveVoice;