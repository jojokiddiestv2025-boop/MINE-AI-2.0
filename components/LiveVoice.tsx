import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { VisualContext, WorkspaceState } from '../types';

interface LiveVoiceProps {
  onHome?: () => void;
  isAcademic?: boolean;
  isTeacher?: boolean;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
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

const LiveVoice: React.FC<LiveVoiceProps> = ({ onHome, isAcademic = false, isTeacher = false }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isModelThinking, setIsModelThinking] = useState(false);
  const [error, setError] = useState<{title: string, message: string} | null>(null);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [visualContext, setVisualContext] = useState<VisualContext | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceState>({ content: '', language: 'markdown', title: 'Ready', isActive: false });

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const visionIntervalRef = useRef<number | null>(null);
  const visualContextRef = useRef<VisualContext | null>(visualContext);

  useEffect(() => { visualContextRef.current = visualContext; }, [visualContext]);

  const cleanup = useCallback(() => {
    if (visionIntervalRef.current) clearInterval(visionIntervalRef.current);
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    setIsConnected(false);
    setIsConnecting(false);
    setIsModelThinking(false);
    nextStartTimeRef.current = 0;
  }, []);

  const startConversation = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      const outputCtx = new AudioCtx({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      let instruction = '';
      if (isTeacher) {
        instruction = `You are the MINE Teacher Assistant. Help teachers plan lessons, grade assignments, and track student performance. Use updateWorkspace for syllabi and lesson plans. Be supportive and professional.`;
      } else if (isAcademic) {
        instruction = `You are MINE AI Chancellor. Provide academic tutoring for students. Use updateWorkspace for study guides and quiz questions. Use Socratic method.`;
      } else {
        instruction = `You are MINE AI. A hyper-advanced neural link for personal superintelligence. Be creative, fluid, and extremely precise.`;
      }

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
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            
            visionIntervalRef.current = window.setInterval(() => {
              if (visualContextRef.current) sessionPromise.then(s => s.sendRealtimeInput({ media: { data: visualContextRef.current!.data, mimeType: visualContextRef.current!.mimeType } }));
            }, 3000);
          },
          onmessage: async (m: LiveServerMessage) => {
            if (m.serverContent?.modelTurn) {
              setIsModelThinking(false);
            } else if (m.serverContent?.inputTranscription) {
              setIsModelThinking(true);
            }

            if (m.toolCall) {
              for (const fc of m.toolCall.functionCalls) {
                if (fc.name === 'updateWorkspace') {
                  const args = fc.args as any;
                  setWorkspace({ content: args.content, language: args.language, title: args.title, isActive: true });
                  sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "ok" } } }));
                }
              }
            }
            if (m.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
            const audio = m.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(audio), outputCtx, 24000, 1);
              const node = outputCtx.createBufferSource();
              node.buffer = buffer;
              node.connect(outputCtx.destination);
              node.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(node);
            }
          },
          onerror: (e) => { setError({title: "Neural Deficit", message: "Uplink signal unstable."}); cleanup(); },
          onclose: () => cleanup()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          tools: [{ functionDeclarations: [updateWorkspaceTool] }],
          systemInstruction: instruction
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err: any) {
      setError({ title: "Hardware Blocked", message: "Neural peripheral access denied." });
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-[2400px] mx-auto animate-billion overflow-hidden bg-white/50 backdrop-blur-xl">
      <div className="flex flex-col lg:flex-row flex-1 p-4 md:p-10 lg:p-16 gap-8 lg:gap-14 overflow-hidden">
        
        {/* Module: Perception Feed */}
        <div className="w-full lg:w-[420px] flex flex-col gap-8 shrink-0">
          <div className="glass-premium p-10 rounded-[4rem] border-white/90 shadow-2xl flex-1 flex flex-col items-center">
            <h3 className="text-[10px] font-black uppercase tracking-[1em] text-prismatic mb-10">Neural Input</h3>
            <div className="w-full aspect-square relative bg-white/80 rounded-[3.5rem] flex items-center justify-center overflow-hidden shadow-inner border border-black/[0.03]">
              {visualContext ? (
                <div className="relative group w-full h-full">
                  <img src={`data:${visualContext.mimeType};base64,${visualContext.data}`} className="w-full h-full object-cover" />
                  <button onClick={() => setVisualContext(null)} className="absolute top-4 right-4 bg-white/40 backdrop-blur-md p-4 rounded-full hover:bg-red-500 hover:text-white transition-all text-slate-900 shadow-xl">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2}/></svg>
                  </button>
                </div>
              ) : (
                <button onClick={() => document.getElementById('cam-upload')?.click()} className="flex flex-col items-center gap-6 text-slate-300 hover:text-prismatic transition-all group">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={1} /></svg>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.5em]">Sync Visual Frame</span>
                </button>
              )}
              <input type="file" id="cam-upload" hidden onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const r = new FileReader();
                  r.onloadend = () => setVisualContext({ id: 'v1', data: (r.result as string).split(',')[1], mimeType: f.type });
                  r.readAsDataURL(f);
                }
              }} />
            </div>
            <div className="mt-12 w-full space-y-4">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Node Sensitivity</div>
              <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full bg-prismatic transition-all duration-300 ${isUserSpeaking ? 'w-full' : 'w-12'}`}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Module: Synaptic Cockpit */}
        <div className={`flex flex-col gap-8 flex-1 transition-all duration-1000 ${workspace.isActive ? 'lg:flex-[1.5]' : 'lg:flex-[2.5]'}`}>
          <div className="glass-premium rounded-[5rem] p-12 md:p-24 flex-1 flex flex-col justify-center items-center relative overflow-hidden shadow-2xl border-white/90 bg-white/20">
            {error && <div className="text-center p-12 animate-billion"><h3 className="text-red-500 text-5xl font-black mb-6 uppercase tracking-tighter">{error.title}</h3><p className="text-slate-400 text-lg mb-10 font-medium">{error.message}</p><button onClick={startConversation} className="button-billion">Re-Establish</button></div>}
            
            {!isConnected && !isConnecting && !error && (
              <div className="text-center space-y-16 animate-billion">
                <button onClick={startConversation} className="w-64 h-64 rounded-full bg-white border border-black/5 flex items-center justify-center mx-auto shadow-2xl hover:scale-105 transition-all group relative">
                   <div className="absolute inset-0 bg-prismatic opacity-10 blur-2xl rounded-full group-hover:opacity-30 transition-all"></div>
                   <div className="w-20 h-20 bg-prismatic rounded-full group-hover:scale-110 transition-transform"></div>
                </button>
                <div className="space-y-6">
                  <h4 className="text-2xl font-black uppercase tracking-[1.5em] text-slate-900">{isTeacher ? 'TEACHER NUCLEUS' : isAcademic ? 'CHANCELLOR' : 'PERSONAL APEX'}</h4>
                  <p className="text-slate-400 font-bold uppercase tracking-[0.8em] text-[12px]">Ready for High-Bandwidth Link</p>
                </div>
              </div>
            )}

            {isConnecting && (
              <div className="flex flex-col items-center gap-16">
                <div className="w-32 h-32 border-[6px] border-t-prismatic border-slate-100 rounded-full animate-spin shadow-xl"></div>
                <div className="text-xl font-black uppercase tracking-[2em] text-prismatic animate-pulse">Syncing...</div>
              </div>
            )}

            {isConnected && (
              <div className="flex flex-col items-center gap-32 w-full animate-billion relative">
                <div className={`absolute -inset-40 bg-prismatic/5 blur-[120px] rounded-full transition-all duration-1000 ${isModelThinking ? 'opacity-100 scale-125' : 'opacity-0 scale-90'}`}></div>
                <div className={`w-72 h-72 rounded-full border-2 transition-all duration-700 flex items-center justify-center bg-white shadow-2xl ${isUserSpeaking ? 'border-prismatic scale-110 shadow-[0_0_80px_rgba(0,242,255,0.2)]' : isModelThinking ? 'border-purple-400 animate-pulse' : 'border-black/5'}`}>
                   <div className={`w-16 h-16 rounded-full transition-all duration-500 ${isUserSpeaking ? 'bg-prismatic' : isModelThinking ? 'bg-purple-400 scale-75' : 'bg-slate-100'}`}></div>
                </div>
                <div className="flex items-end justify-center gap-2 h-40 w-full px-20">
                  {[...Array(40)].map((_, i) => (
                    <div key={i} className={`w-2 rounded-full transition-all duration-300 ${isUserSpeaking ? 'bg-prismatic' : isModelThinking ? 'bg-purple-300' : 'bg-slate-100'}`} style={{ height: isUserSpeaking ? `${20 + Math.random()*80}%` : isModelThinking ? `${40 + Math.sin(i*0.5)*30}%` : '8px' }}></div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-center py-12 gap-8">
             {isConnected && (
               <>
                 <button onClick={cleanup} className="px-16 py-6 bg-slate-900 text-white rounded-full font-black uppercase tracking-[0.4em] hover:bg-red-500 transition-all shadow-2xl active:scale-95 text-[11px]">Terminate Session</button>
                 <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
               </>
             )}
          </div>
        </div>

        {/* Module: Production Synapse */}
        {workspace.isActive && (
          <div className="w-full lg:w-[650px] glass-premium rounded-[4rem] animate-billion flex flex-col shadow-2xl border-white/90 bg-white/60 overflow-hidden">
            <header className="p-12 border-b border-black/[0.03] flex items-center justify-between bg-white/40">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{workspace.title}</h3>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-prismatic mt-2">Format: {workspace.language}</p>
              </div>
              <button onClick={() => setWorkspace({...workspace, isActive: false})} className="p-4 hover:bg-red-50 rounded-full transition-colors text-slate-300 hover:text-red-500 shadow-sm border border-black/[0.03] bg-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2}/></svg>
              </button>
            </header>
            <div className="flex-1 p-12 overflow-y-auto font-sans leading-relaxed text-2xl text-slate-800 whitespace-pre-wrap selection:bg-cyan-100 custom-scrollbar">
              {workspace.content}
            </div>
            <footer className="p-8 border-t border-black/[0.03] bg-white/40 flex justify-end">
              <button className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Neural Assets Saved</button>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveVoice;