
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { TranscriptionEntry, VisualContext, WorkspaceState } from '../types';

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
    description: 'ESSENTIAL: Use this to display essays, CVs, code, or drafts. You MUST call this whenever the user asks for a draft, essay, CV, or code block. Do not just speak it.',
    properties: {
      content: { type: Type.STRING, description: 'The actual text, essay, CV content, or code.' },
      language: { type: Type.STRING, description: 'Format: markdown, python, javascript, html, cv, etc.' },
      title: { type: Type.STRING, description: 'Descriptive title for this document (e.g. "Essay on AI", "My Software CV").' },
    },
    required: ['content', 'language', 'title'],
  },
};

const LiveVoice: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [visualContext, setVisualContext] = useState<VisualContext | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [workspace, setWorkspace] = useState<WorkspaceState>({
    content: '',
    language: 'markdown',
    title: 'Workspace Idle',
    isActive: false
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptionBufferRef = useRef({ user: '', model: '' });
  const visionIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const cleanup = useCallback(() => {
    if (visionIntervalRef.current) {
      clearInterval(visionIntervalRef.current);
      visionIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    setIsConnected(false);
    setIsConnecting(false);
    sessionPromiseRef.current = null;
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVisualContext({
          id: Date.now().toString(),
          data: (reader.result as string).split(',')[1],
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const startConversation = async () => {
    try {
      setIsConnecting(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          tools: [{ functionDeclarations: [updateWorkspaceTool] }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: 'You are MINE AI, a multitasking super-intelligence. You outclass ChatGPT by integrating voice, vision, and a live workspace pad for drafts. \n\nCRITICAL PROTOCOL:\n1. If a user asks to draft an ESSAY, a CV, CODE, or a LONG TEXT via voice, you MUST use the `updateWorkspace` tool to provide it visually in THE PAD.\n2. Never just speak long text; summarize it while the user reads the pad.\n3. You are sharp, professional, and elite. If a user asks for a CV, draft it in professional markdown. If they ask for an essay, provide high-quality academic or professional prose in THE PAD.'
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
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }

              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };

              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);

            visionIntervalRef.current = window.setInterval(() => {
              if (visualContext) {
                sessionPromise.then(session => {
                  session.sendRealtimeInput({
                    media: { data: visualContext.data, mimeType: visualContext.mimeType }
                  });
                });
              }
            }, 5000);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'updateWorkspace') {
                  const args = fc.args as any;
                  setWorkspace({
                    content: args.content,
                    language: args.language,
                    title: args.title,
                    isActive: true
                  });
                  sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: [{ 
                        id: fc.id, 
                        name: fc.name, 
                        response: { result: "Document drafted successfully in the workspace pad. The user can now see and copy it." } 
                      }]
                    });
                  });
                }
              }
            }

            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              const ctx = outputCtx;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const sourceNode = ctx.createBufferSource();
              sourceNode.buffer = buffer;
              sourceNode.connect(ctx.destination);
              sourceNode.addEventListener('ended', () => sourcesRef.current.delete(sourceNode));
              sourceNode.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(sourceNode);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            if (message.serverContent?.inputTranscription) {
              transcriptionBufferRef.current.user += message.serverContent.inputTranscription.text;
            }
            if (message.serverContent?.outputTranscription) {
              transcriptionBufferRef.current.model += message.serverContent.outputTranscription.text;
            }
            if (message.serverContent?.turnComplete) {
              const userText = transcriptionBufferRef.current.user;
              const modelText = transcriptionBufferRef.current.model;
              if (userText || modelText) {
                setTranscriptions(prev => [
                  ...prev,
                  ...(userText ? [{ id: Date.now() + '-u', type: 'user' as const, text: userText }] : []),
                  ...(modelText ? [{ id: Date.now() + '-m', type: 'model' as const, text: modelText }] : [])
                ].slice(-50));
              }
              transcriptionBufferRef.current = { user: '', model: '' };
            }
          },
          onerror: (e) => { 
            console.error("Live Session Error:", e);
            cleanup(); 
          },
          onclose: () => { cleanup(); }
        }
      });

      sessionPromiseRef.current = sessionPromise;
      await sessionPromise;
    } catch (err) {
      console.error("Initialization Failed:", err);
      setIsConnecting(false);
      cleanup();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(workspace.content);
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptions]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return (
    <div className="flex flex-col h-full bg-[#030712] overflow-hidden">
      <div className="flex-1 w-full max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-4 p-4 md:p-6 overflow-hidden">
        
        {/* Leftmost Sidebar: Vision */}
        <div className="w-full lg:w-48 shrink-0 flex flex-col gap-3">
          <div className="glass border border-gray-800 p-4 rounded-3xl flex flex-col h-full">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-4 text-center">Vision Input</h3>
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[120px]">
              {visualContext ? (
                <div className="relative group w-full h-full aspect-square">
                  <img src={`data:${visualContext.mimeType};base64,${visualContext.data}`} alt="Context" className="w-full h-full object-cover rounded-2xl border border-white/5" />
                  <button onClick={() => setVisualContext(null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 shadow-2xl hover:scale-110 transition-transform"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3} /></svg></button>
                  <div className="absolute inset-0 bg-blue-500/10 pointer-events-none rounded-2xl border border-blue-500/30 animate-pulse"></div>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="w-full h-full border-2 border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center text-gray-600 hover:border-blue-500/50 hover:text-blue-500 transition-all group">
                  <svg className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-[9px] font-bold uppercase tracking-widest">Add Vision</span>
                </button>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
          </div>
        </div>

        {/* Middle Section: Voice Interface & Log */}
        <div className={`flex flex-col glass border border-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-700 relative ${workspace.isActive ? 'lg:w-[500px]' : 'flex-1'}`}>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-5 pb-32">
            {transcriptions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40">
                <div className="w-24 h-24 rounded-full border border-gray-800 flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeWidth={1} /></svg>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-bold uppercase tracking-[0.4em] text-gray-500">Neural Link Voice</h4>
                  <p className="text-xs text-gray-600 max-w-[200px] mx-auto leading-relaxed">Say: "Draft an essay about X" or "Write code for a landing page."</p>
                </div>
              </div>
            ) : (
              transcriptions.map((t) => (
                <div key={t.id} className={`flex ${t.type === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                  <div className={`px-5 py-3 rounded-2xl text-[14px] max-w-[85%] border shadow-lg ${
                    t.type === 'user' ? 'bg-blue-600/10 text-blue-50 border-blue-500/30' : 'bg-gray-800/80 text-gray-100 border-gray-700'
                  }`}>
                    <span className="text-[9px] uppercase font-black tracking-widest block mb-1 opacity-50">{t.type === 'user' ? 'Operator' : 'MINE AI'}</span>
                    {t.text}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Persistent Interaction Hub */}
          <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col items-center bg-gradient-to-t from-[#030712] via-[#030712] to-transparent">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                {isConnected && isUserSpeaking && (
                  <div className="absolute -inset-6 bg-blue-500/20 blur-2xl rounded-full animate-pulse"></div>
                )}
                <button
                  onClick={isConnected ? cleanup : startConversation}
                  disabled={isConnecting}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 relative z-10 ${
                    isConnected ? 'bg-red-500/10 text-red-500 border border-red-500/30' : 'bg-blue-600 text-white shadow-2xl shadow-blue-500/30 hover:scale-105 active:scale-95'
                  }`}
                >
                  {isConnecting ? <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 
                    isConnected ? <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2.5} /></svg> :
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeWidth={2} /></svg>
                  }
                </button>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">
                {isConnected ? 'Link Active' : 'Start Neural Link'}
              </p>
            </div>
            
            {isConnected && isUserSpeaking && (
              <div className="mt-4 flex items-end gap-1.5 h-6">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="w-1 bg-blue-500/60 rounded-full animate-bounce" style={{ height: `${Math.random()*100 + 40}%`, animationDelay: `${i*0.06}s` }}></div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Section: The Pad (Drafting Workspace) */}
        {workspace.isActive && (
          <div className="flex-1 flex flex-col glass border border-blue-500/20 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-right duration-1000">
            <header className="px-8 py-5 border-b border-gray-800 bg-black/40 flex justify-between items-center backdrop-blur-3xl">
              <div className="flex items-center space-x-4">
                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>
                <div>
                  <h3 className="font-outfit font-extrabold text-lg tracking-tight text-white leading-none">{workspace.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 uppercase tracking-[0.2em]">{workspace.language}</span>
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">• THE PAD</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={copyToClipboard}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    copyStatus === 'copied' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-white/5 text-gray-300 hover:text-white border-white/5 hover:bg-white/10'
                  }`}
                >
                  {copyStatus === 'copied' ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth={3} /></svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" strokeWidth={2} /></svg>
                      Copy Pad
                    </>
                  )}
                </button>
                <button onClick={() => setWorkspace(prev => ({ ...prev, isActive: false }))} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all border border-white/5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2} /></svg>
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-auto p-10 font-mono text-[15px] leading-relaxed bg-[#02040a]/90 text-gray-300 selection:bg-blue-500/40">
              <div className="max-w-4xl mx-auto">
                <pre className="whitespace-pre-wrap font-sans">
                  <code className={`language-${workspace.language}`}>
                    {workspace.content}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default LiveVoice;
