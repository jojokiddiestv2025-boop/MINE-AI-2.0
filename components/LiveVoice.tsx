
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
    description: 'PRIMARY OUTPUT INTERFACE: Use this tool to answer ALL user questions. You MUST call this for any explanation, code, or data output. Summarize your spoken response while the user reads the full details here.',
    properties: {
      content: { type: Type.STRING, description: 'The primary text, explanation, or code. Use Markdown for formatting.' },
      language: { type: Type.STRING, description: 'The coding language (markdown, python, etc) or text format.' },
      title: { type: Type.STRING, description: 'A concise, high-impact title for the content.' },
    },
    required: ['content', 'language', 'title'],
  },
};

const startTutorialTool: FunctionDeclaration = {
  name: 'startTutorial',
  parameters: {
    type: Type.OBJECT,
    description: 'Call this to guide the user through using Mine Ai and the workspace Pad.',
    properties: {},
  },
};

const LiveVoice: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  const visionIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const triggerTutorial = () => {
    setWorkspace({
      title: 'Neural Link: System Tutorial',
      language: 'markdown',
      content: `# Getting Started with Mine Ai\n\nYou are now linked to a multimodal super-intelligence. Here's how to dominate your tasks:\n\n### 1. The Interaction Paradigm\nSpeak naturally. I listen in real-time. Whether you need a deep philosophical answer, a quick fact, or a full software architecture, I am listening.\n\n### 2. THE PAD (Your Workspace)\nI am designed to visualize everything. **Every detailed answer I give will appear right here in this pad.** You don't need to take notes—just read, copy, and iterate.\n\n### 3. Visual Reasoning\nUse the **Vision Interface** on the left to upload images. I can analyze diagrams, troubleshoot code from screenshots, or solve math problems written on paper.\n\n### 4. Interactive Drafting\nAsk me to "Write a 10-page essay on Mars" or "Draft a high-level React component." Watch the Pad update in real-time while we discuss the details.\n\n**Ready to start? Just speak your first request.**`,
      isActive: true
    });
  };

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
      setError(null);
      
      const apiKey = process.env.API_KEY || (window as any).process?.env?.API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          tools: [{ functionDeclarations: [updateWorkspaceTool, startTutorialTool] }],
          systemInstruction: `You are Mine Ai, the ultimate multitasking intelligence.

CORE DIRECTIVE: You MUST use 'updateWorkspace' for EVERY response that contains detailed information, facts, code, or drafts. 
- Spoken words are for interaction and short summaries.
- The PAD (workspace) is for the heavy lifting.
- If a user asks "Who is Einstein?", call 'updateWorkspace' with a full biography.
- If a user asks "How do I bake a cake?", call 'updateWorkspace' with the recipe.
- If the user needs help, call 'startTutorial'.
- Be elite, efficient, and always visualize your logic.`
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

            triggerTutorial();
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
                        response: { result: "Workspace synchronized." } 
                      }]
                    });
                  });
                } else if (fc.name === 'startTutorial') {
                  triggerTutorial();
                  sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: [{ 
                        id: fc.id, 
                        name: fc.name, 
                        response: { result: "Tutorial initialized." } 
                      }]
                    });
                  });
                }
              }
            }

            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              const ctx = outputCtx;
              if (ctx.state === 'suspended') await ctx.resume();
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
          },
          onerror: (e) => { 
            console.error("Live Session Error:", e);
            setError("Connection Error: System unavailable or operation restricted.");
            cleanup(); 
          },
          onclose: () => { cleanup(); }
        }
      });

      sessionPromiseRef.current = sessionPromise;
      await sessionPromise;
    } catch (err) {
      console.error("Initialization Failed:", err);
      setError("Failed to initialize neural link.");
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
    return () => cleanup();
  }, [cleanup]);

  return (
    <div className="flex flex-col min-h-full bg-[#030712] font-inter safe-pb">
      <div className="relative z-10 w-full max-w-[1920px] mx-auto flex flex-col lg:flex-row gap-6 p-4 md:p-8">
        
        {/* Sidebar: Vision Interface */}
        <div className="w-full lg:w-64 shrink-0">
          <div className="lg:sticky lg:top-24 glass border border-gray-800 p-6 rounded-[2.5rem] flex flex-col shadow-2xl space-y-8">
            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-500 text-center">Neural Vision</h3>
            <div className="flex flex-col items-center justify-center relative min-h-[160px]">
              {visualContext ? (
                <div className="relative group w-full aspect-square">
                  <img src={`data:${visualContext.mimeType};base64,${visualContext.data}`} alt="Context" className="w-full h-full object-cover rounded-3xl border border-blue-500/20 shadow-2xl" />
                  <button onClick={() => setVisualContext(null)} className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-2.5 shadow-2xl hover:scale-110 transition-all flex items-center justify-center"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3} /></svg></button>
                  <div className="absolute inset-0 bg-blue-500/5 pointer-events-none rounded-3xl border border-blue-500/30 animate-pulse"></div>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="w-full h-40 border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center justify-center text-gray-500 hover:border-blue-500/40 hover:text-blue-400 transition-all group p-6 text-center bg-gray-900/20">
                  <svg className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-[11px] font-black uppercase tracking-widest leading-snug">Sync Visuals</span>
                </button>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
            
            <button 
              onClick={triggerTutorial}
              className="w-full py-4 rounded-2xl bg-white/5 border border-white/5 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:bg-white/10 hover:text-white transition-all shadow-xl"
            >
              System Guide
            </button>
          </div>
        </div>

        {/* Center: Conversation Hub */}
        <div className={`flex flex-col space-y-6 transition-all duration-1000 ${workspace.isActive ? 'lg:w-[500px]' : 'flex-1'}`}>
          <div className="glass border border-gray-800 rounded-[3rem] p-10 min-h-[400px] flex flex-col justify-center items-center text-center shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none"></div>
            
            {!isConnected && !isConnecting && (
              <div className="space-y-10 animate-in fade-in duration-1000 relative z-10">
                <div className="w-32 h-32 rounded-full border border-gray-800 flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.05)] mx-auto">
                  <svg className="w-14 h-14 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeWidth={1} /></svg>
                </div>
                <div className="space-y-4">
                  <h4 className="text-sm font-black uppercase tracking-[0.6em] text-blue-500">Neural Offline</h4>
                  <p className="text-[12px] text-gray-500 max-w-[300px] mx-auto leading-relaxed font-semibold">Initiate high-bandwidth voice protocol to access super intelligence.</p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-3xl text-sm font-bold animate-bounce relative z-10">
                {error}
              </div>
            )}

            {isConnecting && (
              <div className="space-y-6 relative z-10">
                <div className="w-16 h-16 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-400">Syncing Neurons...</p>
              </div>
            )}

            {isConnected && (
              <div className="space-y-8 relative z-10">
                <div className="w-24 h-24 rounded-full border border-blue-500/10 flex items-center justify-center mx-auto">
                   <div className={`w-4 h-4 rounded-full bg-blue-500 ${isUserSpeaking ? 'animate-ping' : 'opacity-50'}`}></div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.8em] text-blue-500">Neural Link Active</p>
                <div className="flex items-center justify-center gap-2.5 h-8">
                  {[...Array(15)].map((_, i) => (
                    <div key={i} className={`w-1 bg-blue-400 rounded-full transition-all duration-200 ${isUserSpeaking ? 'animate-bounce' : 'h-2 opacity-20'}`} style={{ height: isUserSpeaking ? `${40 + Math.random()*60}%` : '8px', animationDelay: `${i*0.04}s` }}></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Neural Control Section */}
          <div className="flex flex-col items-center py-8 space-y-8 glass border border-gray-800 rounded-[3rem] shadow-xl">
             <div className="relative group">
                {isConnected && (
                  <div className={`absolute -inset-10 bg-blue-500/15 blur-[60px] rounded-full transition-all duration-1000 ${isUserSpeaking ? 'opacity-100 scale-125' : 'opacity-40 scale-100'}`}></div>
                )}
                <button
                  onClick={isConnected ? cleanup : startConversation}
                  disabled={isConnecting}
                  className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-700 relative z-10 shadow-2xl border-4 ${
                    isConnected 
                      ? 'bg-gray-900 border-red-500/20 text-red-500 hover:border-red-500/60' 
                      : 'bg-gradient-to-br from-blue-500 to-indigo-800 border-white/5 text-white hover:scale-105 active:scale-90'
                  }`}
                >
                  {isConnecting ? <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> : 
                    isConnected ? (
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3} /></svg>
                    ) : (
                      <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeWidth={1.5} /></svg>
                    )
                  }
                </button>
              </div>
              <div className="text-center">
                <p className={`text-[12px] font-black uppercase tracking-[0.8em] transition-all duration-700 ${isConnected ? 'text-blue-400' : 'text-gray-600'}`}>
                  {isConnecting ? 'Linking...' : isConnected ? 'Neural Online' : 'Establish Link'}
                </p>
              </div>
          </div>
        </div>

        {/* Workspace: THE PAD */}
        {workspace.isActive && (
          <div className="flex-1 flex flex-col glass border border-blue-500/30 rounded-[3.5rem] shadow-2xl animate-in slide-in-from-right duration-1000 h-fit">
            <header className="px-10 py-10 border-b border-gray-800/40 bg-black/40 flex flex-col sm:flex-row justify-between items-center backdrop-blur-3xl rounded-t-[3.5rem] gap-6">
              <div className="flex items-center space-x-6">
                <div className="relative shrink-0">
                  <div className="absolute -inset-2 bg-blue-500/20 blur-xl rounded-full animate-pulse"></div>
                  <div className="w-5 h-5 rounded-full bg-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.9)] border border-white/40"></div>
                </div>
                <div>
                  <h3 className="font-outfit font-extrabold text-2xl md:text-3xl tracking-tight text-white leading-tight">{workspace.title}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-[10px] md:text-[11px] font-black px-4 py-1.5 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30 uppercase tracking-[0.4em]">{workspace.language}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <button 
                  onClick={copyToClipboard}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-[12px] md:text-[14px] font-black uppercase tracking-[0.2em] transition-all border shadow-2xl ${
                    copyStatus === 'copied' ? 'bg-green-600/20 text-green-400 border-green-500/40' : 'bg-white/5 text-gray-300 hover:text-white border-white/5 hover:bg-white/10'
                  }`}
                >
                  {copyStatus === 'copied' ? 'Copied' : 'Extract'}
                </button>
                <button onClick={() => setWorkspace(prev => ({ ...prev, isActive: false }))} className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-all border border-white/5 hover:bg-red-500/20">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3} /></svg>
                </button>
              </div>
            </header>
            
            <div className="flex-1 p-10 md:p-16 lg:p-20 font-mono text-[16px] md:text-[18px] leading-[1.8] text-gray-200 selection:bg-blue-500/40">
              <div className="max-w-4xl mx-auto">
                <div className="prose prose-invert prose-blue max-w-none prose-headings:font-outfit prose-headings:font-black prose-headings:tracking-tighter">
                  <pre className="whitespace-pre-wrap font-sans text-gray-300">
                    <code className={`language-${workspace.language}`}>
                      {workspace.content}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
      
      {/* Footer */}
      <footer className="w-full py-12 px-8 mt-12 opacity-30 text-[10px] font-black uppercase tracking-[0.8em] text-center text-gray-500">
        &copy; 2025 MINE NEURAL SYSTEMS &bull; SUPER-INTELLIGENCE INTERFACE
      </footer>
    </div>
  );
};

export default LiveVoice;
