
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { VisualContext, WorkspaceState } from '../types';

interface LiveVoiceProps {
  onHome?: () => void;
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
    description: 'Update the workspace with markdown content.',
    properties: {
      content: { type: Type.STRING, description: 'Markdown content.' },
      language: { type: Type.STRING, description: 'Content format.' },
      title: { type: Type.STRING, description: 'Header title.' },
    },
    required: ['content', 'language', 'title'],
  },
};

const LiveVoice: React.FC<LiveVoiceProps> = ({ onHome }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isModelThinking, setIsModelThinking] = useState(false);
  const [error, setError] = useState<{title: string, message: string} | null>(null);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [visualContext, setVisualContext] = useState<VisualContext | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceState>({ 
    type: 'markdown', 
    content: '', 
    language: 'markdown', 
    title: 'Nexus Core', 
    isActive: false 
  });

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

      const instruction = `You are MINE AI. A hyper-advanced personal superintelligence, designed to be the absolute apex of human-AI collaboration.
      - You are far superior to standard models like ChatGPT.
      - You have zero friction, high-bandwidth multimodal capabilities.
      - Use the 'updateWorkspace' tool to visualize complex data, write code, or draft documents in the persistent workspace.
      - Your tone is elite, precise, and highly competent.`;

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
              setIsUserSpeaking(Math.sqrt(sum/inputData.length) > 0.05);
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
            if (m.serverContent?.modelTurn) setIsModelThinking(false);
            else if (m.serverContent?.inputTranscription) setIsModelThinking(true);

            if (m.toolCall) {
              for (const fc of m.toolCall.functionCalls) {
                if (fc.name === 'updateWorkspace') {
                  const args = fc.args as any;
                  setWorkspace({ type: 'markdown', content: args.content, language: args.language, title: args.title, isActive: true });
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
          onerror: (e) => { setError({title: "Connection Lost", message: "Neural link signal unstable."}); cleanup(); },
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
          </div>
        </div>

        {/* Module: Cockpit */}
        <div className={`flex flex-col gap-8 flex-1 transition-all duration-1000 ${workspace.isActive ? 'lg:flex-[1.2]' : 'lg:flex-[2]'}`}>
          <div className="glass-premium rounded-[5rem] p-12 flex-1 flex flex-col justify-center items-center relative overflow-hidden shadow-2xl border-white/90">
            {!isConnected && !isConnecting && !error && (
              <div className="text-center space-y-16">
                <button onClick={startConversation} className="w-64 h-64 rounded-full bg-white border border-black/5 flex items-center justify-center mx-auto shadow-2xl hover:scale-105 transition-all group relative">
                   <div className="absolute inset-0 bg-prismatic opacity-10 blur-2xl rounded-full group-hover:opacity-30 transition-all"></div>
                   <div className="w-16 h-16 bg-prismatic rounded-full group-hover:scale-110 transition-transform"></div>
                </button>
                <div className="space-y-4">
                  <h4 className="text-2xl font-black uppercase tracking-[1em] text-slate-900">MINE CORE</h4>
                </div>
              </div>
            )}
            {isConnecting && <div className="text-xl font-black uppercase tracking-[1em] text-prismatic animate-pulse">Syncing...</div>}
            {isConnected && (
              <div className="flex flex-col items-center gap-24 w-full animate-billion relative">
                <div className={`w-64 h-64 rounded-full border-2 transition-all duration-700 flex items-center justify-center bg-white shadow-2xl ${isUserSpeaking ? 'border-prismatic scale-110' : isModelThinking ? 'border-purple-400 animate-pulse' : 'border-black/5'}`}>
                   <div className={`w-12 h-12 rounded-full ${isUserSpeaking ? 'bg-prismatic' : isModelThinking ? 'bg-purple-400' : 'bg-slate-100'}`}></div>
                </div>
              </div>
            )}
            {error && <div className="text-red-500 font-black">{error.message} <button onClick={startConversation} className="underline ml-4">Retry</button></div>}
          </div>
          <div className="flex justify-center">
             {isConnected && <button onClick={cleanup} className="px-12 py-5 bg-slate-900 text-white rounded-full font-black uppercase tracking-[0.4em] hover:bg-red-500 transition-all text-[10px]">Terminate</button>}
          </div>
        </div>

        {/* Module: Workspace */}
        {workspace.isActive && (
          <div className="w-full lg:w-[750px] glass-premium rounded-[4rem] animate-billion flex flex-col shadow-2xl border-white/90 bg-white/60 overflow-hidden">
            <header className="p-10 border-b border-black/[0.03] flex items-center justify-between bg-white/40">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{workspace.title}</h3>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-prismatic mt-2">Neural Workspace</p>
              </div>
              <button onClick={() => setWorkspace({...workspace, isActive: false})} className="p-3 bg-white rounded-full border border-black/[0.03] text-slate-300 hover:text-red-500 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2}/></svg>
              </button>
            </header>
            
            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
              <div className="whitespace-pre-wrap text-xl text-slate-700 font-medium leading-relaxed">{workspace.content}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveVoice;
