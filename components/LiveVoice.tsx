
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { VisualContext, WorkspaceState } from '../types';

interface LiveVoiceProps { onHome?: () => void; }

const updateWorkspaceTool: FunctionDeclaration = {
  name: 'updateWorkspace',
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING },
      type: { type: Type.STRING, enum: ['markdown', 'code', 'preview'] },
      language: { type: Type.STRING },
      title: { type: Type.STRING },
    },
    required: ['content', 'type', 'title'],
  },
};

const LiveVoice: React.FC<LiveVoiceProps> = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isModelThinking, setIsModelThinking] = useState(false);
  const [error, setError] = useState<any>(null);
  const [workspace, setWorkspace] = useState<WorkspaceState>({ type: 'markdown', content: '', title: 'MINE Hub', isActive: false });
  const [visualContext, setVisualContext] = useState<VisualContext | null>(null);

  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<any>>(new Set());
  const nextStartTimeRef = useRef(0);
  const outputAudioContextRef = useRef<AudioContext | null>(null);

  const cleanup = useCallback(() => {
    if (sessionRef.current) { sessionRef.current = null; }
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const startConversation = async () => {
    try {
      setIsConnecting(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputAudioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => { setIsConnected(true); setIsConnecting(false); },
          onmessage: async (m: LiveServerMessage) => {
            if (m.serverContent?.modelTurn) setIsModelThinking(false);
            if (m.toolCall) {
              for (const fc of m.toolCall.functionCalls) {
                if (fc.name === 'updateWorkspace') {
                  const args = fc.args as any;
                  setWorkspace({ ...args, isActive: true });
                  sessionRef.current?.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "ok" } } });
                }
              }
            }
            const audio = m.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              const bytes = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
              const dataInt16 = new Int16Array(bytes.buffer);
              const buffer = outputCtx.createBuffer(1, dataInt16.length, 24000);
              const channel = buffer.getChannelData(0);
              for (let i = 0; i < dataInt16.length; i++) channel[i] = dataInt16[i] / 32768.0;
              const node = outputCtx.createBufferSource();
              node.buffer = buffer;
              node.connect(outputCtx.destination);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              node.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(node);
            }
          },
          onerror: (e) => { setError(e); cleanup(); },
          onclose: () => cleanup()
        },
        config: { 
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [updateWorkspaceTool] }],
          systemInstruction: "You are MINE AI, a top-tier engineer. Provide full HTML/JS apps in updateWorkspace."
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) { setError(e); setIsConnecting(false); }
  };

  return (
    <div className="flex flex-col flex-1 p-8 gap-8 animate-billion overflow-hidden">
      <div className={`flex flex-col items-center justify-center glass-premium rounded-[3rem] p-12 transition-all duration-700 ${workspace.isActive ? 'flex-[0.5]' : 'flex-1'}`}>
        {!isConnected && !isConnecting && (
          <button onClick={startConversation} className="button-billion text-xl">Initialize Core</button>
        )}
        {isConnecting && <div className="animate-spin w-16 h-16 border-4 border-prismatic rounded-full border-t-transparent"></div>}
        {isConnected && (
          <div className={`w-64 h-64 rounded-full border-4 flex items-center justify-center transition-all ${isModelThinking ? 'border-purple-500 scale-110' : 'border-slate-100'}`}>
            <div className="w-16 h-16 bg-prismatic rounded-full animate-pulse"></div>
          </div>
        )}
      </div>

      {workspace.isActive && (
        <div className="flex-1 glass-premium rounded-[3rem] flex flex-col overflow-hidden shadow-2xl border-white bg-white/80">
          <header className="p-8 border-b flex justify-between items-center">
            <h3 className="text-2xl font-black uppercase">{workspace.title}</h3>
            <button onClick={() => setWorkspace({ ...workspace, isActive: false })} className="p-3 bg-slate-100 rounded-full">Close</button>
          </header>
          <iframe srcDoc={workspace.content} className="flex-1 border-none bg-white" sandbox="allow-scripts" />
        </div>
      )}
    </div>
  );
};

export default LiveVoice;
