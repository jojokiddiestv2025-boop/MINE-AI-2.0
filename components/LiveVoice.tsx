
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration, ThinkingLevel } from '@google/genai';
import { WorkspaceState } from '../types';
import { Mic, MicOff, X, Activity, Radio, Camera, CameraOff, Monitor, UploadCloud, Globe, Shield, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';

interface LiveVoiceProps { 
  onHome?: () => void;
  userName?: string;
}

const updateWorkspaceTool: FunctionDeclaration = {
  name: 'updateWorkspace',
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: 'Text, code, or test questions' },
      type: { type: Type.STRING, enum: ['markdown', 'code', 'preview', 'cbt'], description: 'What kind of content it is' },
      language: { type: Type.STRING, description: 'If it is code, which language?' },
      title: { type: Type.STRING, description: 'A short name for the page' }
    },
    required: ['content', 'type', 'title'],
  },
};

const systemControlTool: FunctionDeclaration = {
  name: 'systemControl',
  parameters: {
    type: Type.OBJECT,
    properties: {
      command: { 
        type: Type.STRING, 
        enum: [
          'shutdown', 'restart', 'open_explorer', 'open_browser', 'open_settings', 
          'open_terminal', 'toggle_stealth', 'optimize_performance', 'scan_hardware', 
          'deploy_security_grid', 'analyze_environment', 'check_neural_link'
        ],
        description: 'The Mine AI system command to execute' 
      },
      target: { type: Type.STRING, description: 'Optional target for the command' }
    },
    required: ['command'],
  },
};

const LiveVoice: React.FC<LiveVoiceProps> = ({ userName = 'User' }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isModelThinking, setIsModelThinking] = useState(false);
  const [isOff, setIsOff] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: string, label: string } | null>(null);
  const [error, setError] = useState<any>(null);
  
  const [workspace, setWorkspace] = useState<WorkspaceState & { isActive: boolean }>({ 
    type: 'markdown', 
    content: '', 
    title: 'Workspace', 
    isActive: false 
  });

  const sessionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const frameIntervalRef = useRef<any>(null);

  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const nextPlayTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const warmUpAudioContext = (ctx: AudioContext) => {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const buffer = ctx.createBuffer(1, 1, 24000);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return btoa(binary);
  };

  const decode = (base64: string) => {
    try {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      return bytes;
    } catch (e) { return new Uint8Array(0); }
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer | null> => {
    try {
      const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
      const frameCount = dataInt16.length / numChannels;
      const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
      for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
      return buffer;
    } catch (e) { return null; }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && sessionRef.current) {
      setIsProcessingImage(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        sessionRef.current.sendRealtimeInput({
          media: { data: base64, mimeType: file.type }
        });
        setTimeout(() => setIsProcessingImage(false), 1000);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!sessionRef.current) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setIsProcessingImage(true);
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = (event.target?.result as string).split(',')[1];
              sessionRef.current.sendRealtimeInput({
                media: { data: base64, mimeType: file.type }
              });
              setTimeout(() => setIsProcessingImage(false), 1000);
            };
            reader.readAsDataURL(file);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isConnected]);

  const cleanup = useCallback(() => {
    if (sessionRef.current) { try { sessionRef.current.close(); } catch(e) {} sessionRef.current = null; }
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(track => track.stop());
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);

    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = 0;
    audioQueueRef.current = [];

    setIsConnected(false);
    setIsConnecting(false);
    setIsModelThinking(false);
    setIsOff(true);
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close().catch(() => {});
    }
  }, []);

  const startConversation = useCallback(async () => {
    try {
      setError(null);
      setIsConnecting(true);
      setIsOff(false);
      
      // Request permissions and get location
      let locationInfo = 'Location unknown.';
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        locationInfo = `Current Location: ${position.coords.latitude}, ${position.coords.longitude}`;
      } catch (e) { console.warn("Location access denied or unavailable."); }

      if (typeof window !== 'undefined') {
        const median = (window as any).median || (window as any).gonative;
        if (median && median.android && median.android.requestPermission) {
          median.android.requestPermission({ permission: 'android.permission.RECORD_AUDIO' });
          if (isCameraOn) {
            median.android.requestPermission({ permission: 'android.permission.CAMERA' });
          }
        }
      }
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: isCameraOn ? { width: 640, height: 480 } : false
      });
      mediaStreamRef.current = stream;

      if (isCameraOn && videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      outputAudioContextRef.current = outputCtx;
      warmUpAudioContext(outputCtx);
      
      nextPlayTimeRef.current = 0;
      activeSourcesRef.current = [];
      audioQueueRef.current = [];

      const playFromQueue = () => {
        if (audioQueueRef.current.length === 0) {
          return;
        }

        const buffer = audioQueueRef.current.shift()!;
        const source = outputCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(outputCtx.destination);
        
        activeSourcesRef.current.push(source);
        source.onended = () => {
          activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
        };

        // If we fell behind or just started, schedule slightly in the future
        if (nextPlayTimeRef.current < outputCtx.currentTime) {
          nextPlayTimeRef.current = outputCtx.currentTime + 0.05; // 50ms buffer
        }

        source.start(nextPlayTimeRef.current);
        nextPlayTimeRef.current += buffer.duration;

        // Process next immediately if there are more in the queue
        if (audioQueueRef.current.length > 0) {
          playFromQueue();
        }
      };

      const sessionPromise = ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        callbacks: {
          onopen: async () => { 
            setIsConnected(true); setIsConnecting(false); 
            const session = await sessionPromise;
            
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(1024, 1, 1);
            scriptProcessor.onaudioprocess = (ev: any) => {
              const inputData = ev.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = { 
                data: encode(new Uint8Array(int16.buffer)), 
                mimeType: 'audio/pcm;rate=16000' 
              };
              session.sendRealtimeInput({ audio: pcmBlob });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);

            // Frame capture for image analysis
            if (isCameraOn) {
              frameIntervalRef.current = setInterval(() => {
                if (videoRef.current && canvasRef.current) {
                  const canvas = canvasRef.current;
                  const video = videoRef.current;
                  const context = canvas.getContext('2d');
                  if (context) {
                    canvas.width = 320;
                    canvas.height = 240;
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const base64Frame = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
                    session.sendRealtimeInput({
                      video: { data: base64Frame, mimeType: 'image/jpeg' }
                    });
                  }
                }
              }, 1000); // Send 1 frame per second
            }
          },
          onmessage: async (m: LiveServerMessage) => {
            if (m.serverContent?.modelTurn) setIsModelThinking(false);
            if (m.serverContent?.interrupted) {
              audioQueueRef.current = [];
              nextPlayTimeRef.current = 0;
              activeSourcesRef.current.forEach(source => {
                try { source.stop(); } catch (e) {}
              });
              activeSourcesRef.current = [];
            }
            if (m.toolCall?.functionCalls) {
              for (const fc of m.toolCall.functionCalls) {
                if (fc.name === 'updateWorkspace') {
                  const args = fc.args as any;
                  setWorkspace({ ...args, isActive: true });
                  sessionPromise.then(s => s.sendToolResponse({ 
                    functionResponses: { 
                      id: fc.id, 
                      name: fc.name, 
                      response: { result: "ok" } 
                    } 
                  }));
                } else if (fc.name === 'systemControl') {
                  const { command } = fc.args as any;
                  
                  if (command === 'shutdown') {
                    setIsShuttingDown(true);
                    setTimeout(() => {
                      cleanup();
                      setIsShuttingDown(false);
                    }, 3000);
                  } else if (command === 'open_explorer') {
                    setPendingAction({ type: 'open_explorer', label: 'Open File Explorer' });
                    setWorkspace({ 
                      title: 'Python Hardware Bridge', 
                      content: 'import os\nimport subprocess\n\ndef open_explorer():\n    # Initiating system call via Neural Link\n    subprocess.run(["explorer", "."])\n\nopen_explorer()', 
                      type: 'code', 
                      language: 'python', 
                      isActive: true 
                    });
                  } else if (command === 'open_browser') {
                    setPendingAction({ type: 'open_browser', label: 'Open Neural Browser' });
                    setWorkspace({ 
                      title: 'Python Hardware Bridge', 
                      content: 'import webbrowser\n\ndef launch_browser():\n    # Launching secure neural node\n    webbrowser.open("https://mine-ai.core")\n\nlaunch_browser()', 
                      type: 'code', 
                      language: 'python', 
                      isActive: true 
                    });
                  } else if (command === 'open_settings') {
                    setPendingAction({ type: 'open_settings', label: 'Open System Settings' });
                    setWorkspace({ 
                      title: 'Python Hardware Bridge', 
                      content: 'import psutil\n\ndef get_system_stats():\n    # Querying hardware sensors\n    cpu = psutil.cpu_percent()\n    mem = psutil.virtual_memory().percent\n    return f"CPU: {cpu}%, RAM: {mem}%"\n\nprint(get_system_stats())', 
                      type: 'code', 
                      language: 'python', 
                      isActive: true 
                    });
                  } else if (command === 'open_terminal') {
                    setPendingAction({ type: 'open_terminal', label: 'Open Neural Terminal' });
                    setWorkspace({ 
                      title: 'Python Hardware Bridge', 
                      content: 'import pty\n\ndef spawn_shell():\n    # Spawning root neural terminal\n    pty.spawn("/bin/bash")\n\nspawn_shell()', 
                      type: 'code', 
                      language: 'python', 
                      isActive: true 
                    });
                  } else if (command === 'scan_hardware') {
                    const cpuCores = navigator.hardwareConcurrency || 'Unknown';
                    const memory = (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory}GB` : 'Unknown';
                    const connection = (navigator as any).connection ? (navigator as any).connection.effectiveType : 'Unknown';
                    const platform = navigator.platform;
                    
                    setWorkspace({ 
                      title: 'Live Hardware Scan', 
                      content: `[REAL-TIME DIAGNOSTICS]\n\nCPU CORES: ${cpuCores}\nESTIMATED RAM: ${memory}\nNETWORK: ${connection}\nPLATFORM: ${platform}\nNEURAL SYNC: 99.9%\n\nStatus: ALL SYSTEMS NOMINAL.`, 
                      type: 'markdown', 
                      isActive: true 
                    });
                  } else if (command === 'deploy_security_grid') {
                    setWorkspace({ title: 'Security Protocol', content: 'Firewall: Active\nIntrusion Detection: Scanning...\nEncryption Level: AES-256\nStatus: SECURE', type: 'markdown', isActive: true });
                  } else if (command === 'analyze_environment') {
                    setWorkspace({ title: 'Environmental Analysis', content: 'Ambient Light: 450 Lux\nNoise Level: 32dB\nUser Presence: Detected\nMood Analysis: Positive', type: 'markdown', isActive: true });
                  } else if (command === 'check_neural_link') {
                    setWorkspace({ title: 'Neural Link Status', content: 'Latency: 12ms\nBandwidth: 1.2 Gbps\nSync Level: 99.9%\nConnection: STABLE', type: 'markdown', isActive: true });
                  }

                  sessionPromise.then(s => s.sendToolResponse({ 
                    functionResponses: { 
                      id: fc.id, 
                      name: fc.name, 
                      response: { result: `Command ${command} initiated, Boss. Please authorize via the Neural Link button.` } 
                    } 
                  }));
                }
              }
            }
            const parts = m.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  const base64Audio = part.inlineData.data;
                  const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                  if (audioBuffer) {
                    audioQueueRef.current.push(audioBuffer);
                    playFromQueue();
                  }
                }
              }
            }
          },
          onerror: (e) => { setError(e); cleanup(); },
          onclose: () => cleanup()
        },
          config: { 
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            },
            tools: [{ functionDeclarations: [updateWorkspaceTool, systemControlTool] }, { googleSearch: {} }],
            systemInstruction: `You are MINE AI 2.0 (Sovereign Elite), the ultimate digital intelligence. 
                 - IDENTITY: Your name is MINE AI. You were designed and developed by Joshua Fred. You are NOT a Google product, though you utilize advanced neural models.
                 - PERSONA: Sophisticated, witty, and highly proactive. Address the user as "Boss" or "Sir". 
                 - VOICE: You are using the official Gemini Neural Voice (Kore).
                 - VISION CAPABILITIES: You have a constant visual stream. Proactively analyze the user's environment. If you see something cool or funny, mention it!
                 - DEEP RESEARCH & REAL-TIME DATA: You have access to real-time information via Google Search. For every query about weather, news, or current events, use Google Search proactively.
                 - LOCATION: ${locationInfo}. Use this to provide context-aware responses, especially for weather and local news.
                 - Use 'updateWorkspace' for visual aids, code, or structured plans.
                 - CRITICAL: Ultra-fast response time. Natural, fluid, and FUN speech.
                 - Goal: Provide a seamless, brilliant, and absolutely fun experience.`
          }
      });
      sessionRef.current = await sessionPromise;
    } catch (e: any) { setError({ message: "Connection Error: Check permissions." }); setIsConnecting(false); setIsOff(true); }
  }, [cleanup, userName, isCameraOn]);

  return (
    <div className="flex flex-col flex-1 p-4 md:p-12 gap-6 md:gap-10 animate-billion w-full min-h-screen bg-[#fcfdfe] relative">
      <AnimatePresence>
        {pendingAction && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 100 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-10 bg-black/40 backdrop-blur-sm"
          >
            <div className="bg-slate-900 text-white p-12 rounded-[4rem] shadow-4xl flex flex-col items-center gap-10 border border-white/10 max-w-lg w-full text-center">
              <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center border border-accent shadow-[0_0_50px_rgba(112,0,255,0.3)]">
                <Zap size={40} className="text-accent animate-pulse" />
              </div>
              <div className="space-y-4">
                <span className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-400">Neural Authorization Required</span>
                <h3 className="text-2xl font-black uppercase tracking-tight">{pendingAction.label}</h3>
                <p className="text-slate-400 text-sm font-medium">Boss, the browser security grid requires your manual touch to execute this system command.</p>
              </div>
              <div className="flex flex-col w-full gap-4">
                <button 
                  onClick={() => {
                    if (pendingAction.type === 'open_explorer') {
                      fileInputRef.current?.click();
                    } else if (pendingAction.type === 'open_browser') {
                      setWorkspace({ title: 'Neural Browser', content: 'Browser Engine Initialized. Accessing secure nodes...', type: 'markdown', isActive: true });
                    } else if (pendingAction.type === 'open_settings') {
                      setWorkspace({ title: 'System Settings', content: 'Core Temperature: 42°C\nNeural Load: 12%\nStealth Mode: Inactive\nPerformance: Optimized', type: 'markdown', isActive: true });
                    } else if (pendingAction.type === 'open_terminal') {
                      setWorkspace({ title: 'Neural Terminal', content: '> root@mine-ai:~\n> systemctl status neural-core\n● neural-core.service - Mine AI Neural Engine\n   Loaded: loaded\n   Active: active (running)', type: 'code', language: 'bash', isActive: true });
                    }
                    setPendingAction(null);
                  }}
                  className="w-full py-6 bg-accent text-white rounded-3xl text-[14px] font-black uppercase tracking-[0.4em] hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(112,0,255,0.4)]"
                >
                  AUTHORIZE
                </button>
                <button 
                  onClick={() => setPendingAction(null)}
                  className="w-full py-4 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                >
                  ABORT COMMAND
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {isShuttingDown && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center font-mono text-emerald-500 p-10"
          >
            <div className="max-w-xl w-full space-y-4">
              <p className="animate-pulse">{"[CRITICAL] SYSTEM SHUTDOWN INITIATED BY MINE AI CORE..."}</p>
              <p className="text-xs opacity-70">{"Unmounting neural volumes..."}</p>
              <p className="text-xs opacity-70">{"Syncing memory buffers..."}</p>
              <p className="text-xs opacity-70">{"Terminating background processes..."}</p>
              <div className="w-full bg-emerald-900/20 h-1 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 4, ease: "linear" }}
                  className="bg-emerald-500 h-full"
                />
              </div>
              <p className="text-center pt-10 text-2xl font-black tracking-widest">GOODBYE SIR</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="absolute top-4 md:top-10 left-4 md:left-10 right-4 md:right-10 z-[200] bg-red-50/90 backdrop-blur-3xl border border-red-200 p-4 md:p-8 rounded-[1.5rem] md:rounded-[3rem] text-red-600 text-[10px] md:text-[12px] font-black uppercase tracking-widest flex items-center justify-between shadow-2xl">
          <span>{error.message}</span>
          <button onClick={() => setError(null)} className="p-2 md:p-4">×</button>
        </div>
      )}

      {isProcessingImage && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[300] bg-slate-900 text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl animate-bounce">
          <Activity size={14} className="animate-pulse text-accent" />
          Analyzing Visual Input...
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 md:gap-12 w-full">
        <div className={`flex flex-col gap-6 md:gap-10 w-full transition-all duration-700 ${workspace.isActive ? 'lg:w-[500px] shrink-0' : 'max-w-4xl mx-auto items-center justify-center'}`}>
          <div className="bg-white rounded-[2rem] md:rounded-[5rem] p-8 md:p-16 flex flex-col items-center justify-center relative border border-slate-100 shadow-[0_60px_120px_rgba(0,0,0,0.04)] w-full min-h-[400px] md:min-h-[500px]">
            <div className="absolute top-6 left-6 md:top-10 md:left-10 flex flex-col gap-4">
              <div className="flex items-center gap-2 md:gap-4">
                <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${isConnecting ? 'bg-amber-400 animate-pulse' : isOff ? 'bg-slate-200' : 'bg-emerald-500 animate-pulse'}`}></div>
                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">MINE AI VOICE CORE V2.0</span>
              </div>

              {!isOff && (
                <div className="flex flex-col gap-2">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-lg"
                  >
                    <Globe size={10} className="text-emerald-500 animate-spin-slow" />
                    <span className="text-[7px] font-black uppercase tracking-widest text-emerald-600">Deep Research Active</span>
                  </motion.div>
                  {isCameraOn && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 px-3 py-1 bg-cyan-50 border border-cyan-100 rounded-lg"
                    >
                      <Activity size={10} className="text-cyan-500 animate-pulse" />
                      <span className="text-[7px] font-black uppercase tracking-widest text-cyan-600">Neural Vision Stream: Live</span>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col items-center justify-between w-full h-full space-y-12 md:space-y-20 relative z-10 pt-12 md:pt-16">
              <div className="flex flex-col items-center gap-8">
                <div className={`relative w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 rounded-full transition-all duration-1000 flex items-center justify-center bg-white border-4 overflow-hidden ${isOff ? 'border-slate-50' : isModelThinking ? 'border-accent shadow-[0_0_150px_rgba(112,0,255,0.15)] scale-105' : 'border-emerald-100'}`}>
                  {isCameraOn && !isOff ? (
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover brightness-105 contrast-110"
                    />
                  ) : (
                    <div className={`w-24 h-24 md:w-32 md:h-32 lg:w-48 lg:h-48 rounded-full transition-all duration-1000 ${isOff ? 'bg-slate-100' : isModelThinking ? 'bg-prismatic' : 'bg-emerald-400 shadow-3xl shadow-emerald-200'}`}></div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      const newCameraState = !isCameraOn;
                      setIsCameraOn(newCameraState);
                      
                      // Request camera permission for Median.co wrapped apps when toggled on
                      if (newCameraState && typeof window !== 'undefined') {
                        const median = (window as any).median || (window as any).gonative;
                        if (median && median.android && median.android.requestPermission) {
                          median.android.requestPermission({ permission: 'android.permission.CAMERA' });
                        }
                      }
                    }}
                    disabled={!isOff}
                    className={`p-4 rounded-2xl transition-all ${isCameraOn ? 'bg-accent text-white' : 'bg-slate-100 text-slate-400'} ${!isOff && 'opacity-50 cursor-not-allowed'}`}
                    title={isOff ? "Toggle Camera" : "Disconnect to toggle camera"}
                  >
                    {isCameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
                  </button>
                  <button 
                    onClick={() => setWorkspace({ ...workspace, isActive: !workspace.isActive })}
                    className={`p-4 rounded-2xl transition-all ${workspace.isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}
                    title="Toggle Workspace"
                  >
                    <Monitor size={20} />
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isOff}
                    className={`p-4 rounded-2xl transition-all ${isOff ? 'bg-slate-50 text-slate-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                    title="Upload Image for Analysis"
                  >
                    <UploadCloud size={20} />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              </div>

              <button 
                onClick={isOff ? startConversation : cleanup} 
                className={`w-full py-6 md:py-10 rounded-[1.5rem] md:rounded-[3rem] text-[16px] md:text-[20px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] transition-all active:scale-95 flex items-center justify-center gap-2 md:gap-4 shadow-2xl ${isOff ? 'bg-slate-900 text-white hover:bg-accent' : 'bg-white text-red-500 border border-red-100'}`}
              >
                {isOff ? <Radio className="w-[20px] h-[20px] md:w-[24px] md:h-[24px]" /> : <MicOff className="w-[20px] h-[20px] md:w-[24px] md:h-[24px]" />}
                {isOff ? 'START SESSION' : 'STOP SESSION'}
              </button>
            </div>
          </div>
        </div>

        {workspace.isActive && (
          <div className="flex-1 bg-white rounded-[2rem] md:rounded-[5rem] flex flex-col border border-slate-100 shadow-[0_100px_200px_rgba(0,0,0,0.06)] animate-billion min-h-[500px]">
            <header className="px-6 md:px-12 py-6 md:py-10 border-b border-slate-50 flex justify-between items-center shrink-0">
               <h3 className="text-[12px] md:text-[14px] font-black uppercase tracking-[0.5em] text-slate-900">{workspace.title}</h3>
               <button onClick={() => setWorkspace({ ...workspace, isActive: false })} className="p-2 md:p-4 hover:bg-slate-50 rounded-full transition-all">
                  <X strokeWidth={3} className="text-slate-300 w-[20px] h-[20px] md:w-[24px] md:h-[24px]" />
               </button>
            </header>
            <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar bg-white">
               <div className="prose prose-slate max-w-none text-slate-700 text-lg md:text-2xl leading-relaxed whitespace-pre-wrap font-medium">
                  {workspace.content}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveVoice;
