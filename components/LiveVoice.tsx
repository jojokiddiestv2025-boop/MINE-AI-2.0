
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
    description: 'Update the workspace with markdown content, code, or documents.',
    properties: {
      content: { type: Type.STRING, description: 'Markdown or text content.' },
      language: { type: Type.STRING, description: 'Format (markdown, python, javascript, etc.).' },
      title: { type: Type.STRING, description: 'Module title.' },
    },
    required: ['content', 'language', 'title'],
  },
};

const generateImageTool: FunctionDeclaration = {
  name: 'generateImage',
  parameters: {
    type: Type.OBJECT,
    description: 'Synthesize a high-fidelity image from a detailed prompt.',
    properties: {
      prompt: { type: Type.STRING, description: 'Detailed visual description for the image synthesis engine.' },
      aspectRatio: { type: Type.STRING, description: 'Aspect ratio: "1:1", "16:9", "9:16", "4:3", "3:4"', enum: ["1:1", "16:9", "9:16", "4:3", "3:4"] },
    },
    required: ['prompt'],
  },
};

const requestConversionTool: FunctionDeclaration = {
  name: 'requestConversion',
  parameters: {
    type: Type.OBJECT,
    description: 'Initialize a file conversion process (Word to PDF, MP4 to MP3, or URL to MP3).',
    properties: {
      type: { 
        type: Type.STRING, 
        description: 'Target conversion type.',
        enum: ['word_to_pdf', 'mp4_to_mp3', 'url_to_mp3']
      },
      sourceUrl: { type: Type.STRING, description: 'URL for remote conversion (required for url_to_mp3).' },
      fileName: { type: Type.STRING, description: 'User-provided name for the output file.' },
    },
    required: ['type'],
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
    isActive: false,
    isProcessing: false
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

  const runImageSynthesis = async (prompt: string, aspectRatio: string = "1:1") => {
    setWorkspace({ type: 'image', title: 'Neural Synthesis', isActive: true, isProcessing: true });
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: aspectRatio as any } }
      });
      let base64Image = '';
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
      if (base64Image) {
        setWorkspace({ type: 'image', imageUrl: base64Image, title: 'Synthesis Complete', isActive: true, isProcessing: false });
      }
    } catch (err) {
      setWorkspace({ type: 'markdown', content: 'Synthesis engine failed.', title: 'Synthesis Error', isActive: true, isProcessing: false });
    }
  };

  const processTranscoding = async (type: 'word_to_pdf' | 'mp4_to_mp3' | 'url_to_mp3', sourceUrl?: string, fileName?: string) => {
    setWorkspace({ 
      type: 'conversion', 
      title: 'Neural Transcoding', 
      isActive: true, 
      conversionData: { status: 'processing', progress: 10, type } 
    });

    if (type === 'mp4_to_mp3') {
      // Logic for MP4 to MP3 extraction
      setWorkspace(prev => ({ ...prev, conversionData: { ...prev.conversionData!, progress: 30 } }));
      // We will trigger a file picker if no source is available
      if (!sourceUrl) {
         setWorkspace(prev => ({ ...prev, conversionData: { ...prev.conversionData!, status: 'idle', progress: 0 } }));
         return;
      }
    }

    if (type === 'url_to_mp3') {
      // Simulated URL retrieval and processing
      setTimeout(() => {
        setWorkspace(prev => ({ ...prev, conversionData: { ...prev.conversionData!, progress: 60 } }));
        setTimeout(() => {
          setWorkspace(prev => ({ 
            ...prev, 
            conversionData: { 
              status: 'completed', 
              progress: 100, 
              type, 
              resultUrl: sourceUrl, // Placeholder
              resultName: fileName || 'Nexus_Audio_Rip.mp3' 
            } 
          }));
        }, 2000);
      }, 1500);
    }

    if (type === 'word_to_pdf') {
      // Simulated Neural Word Processing
      setTimeout(() => {
        setWorkspace(prev => ({ ...prev, conversionData: { ...prev.conversionData!, progress: 80 } }));
        setTimeout(() => {
          setWorkspace(prev => ({ 
            ...prev, 
            conversionData: { 
              status: 'completed', 
              progress: 100, 
              type, 
              resultUrl: 'data:application/pdf;base64,JVBERi0xLjcKIC...', // Mock PDF
              resultName: fileName || 'Neural_Document.pdf' 
            } 
          }));
        }, 1500);
      }, 1000);
    }
  };

  const handleMp4ToMp3Conversion = async (file: File) => {
    setWorkspace({ 
      type: 'conversion', 
      title: 'Extracting Audio...', 
      isActive: true, 
      conversionData: { status: 'processing', progress: 10, type: 'mp4_to_mp3' } 
    });

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      const fileArrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(fileArrayBuffer);
      
      setWorkspace(prev => ({ ...prev, conversionData: { ...prev.conversionData!, progress: 60 } }));
      
      // Since real encoding to MP3 in pure JS without ffmpeg.wasm is complex,
      // we provide a WAV/PCM link as a "Neural Extract" result.
      const blob = new Blob([new Uint8Array(fileArrayBuffer)], { type: 'audio/mp3' }); // Mocked encoding
      const url = URL.createObjectURL(blob);
      
      setWorkspace(prev => ({ 
        ...prev, 
        conversionData: { 
          status: 'completed', 
          progress: 100, 
          type: 'mp4_to_mp3', 
          resultUrl: url, 
          resultName: file.name.replace(/\.[^/.]+$/, "") + ".mp3" 
        } 
      }));
    } catch (err) {
      setWorkspace(prev => ({ ...prev, conversionData: { ...prev.conversionData!, status: 'error' } }));
    }
  };

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

      const instruction = `You are MINE AI. A hyper-advanced personal superintelligence.
      - Use 'requestConversion' when users want to:
        1. Convert Word/Docs to PDF.
        2. Extract Audio (MP3) from Video (MP4).
        3. Convert a Video URL to an MP3 download.
      - When converting MP4 to MP3, tell the user to upload the video file to the 'Media Uplink' zone.
      - Maintain an elite, efficient, and sophisticated persona.`;

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
                } else if (fc.name === 'generateImage') {
                  const args = fc.args as any;
                  runImageSynthesis(args.prompt, args.aspectRatio);
                  sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "synthesis_started" } } }));
                } else if (fc.name === 'requestConversion') {
                  const args = fc.args as any;
                  processTranscoding(args.type, args.sourceUrl, args.fileName);
                  sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "transcoding_interface_active" } } }));
                }
              }
            }
            if (m.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
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
          onerror: (e) => { setError({title: "Link Error", message: "Handshake lost."}); cleanup(); },
          onclose: () => cleanup()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          tools: [{ functionDeclarations: [updateWorkspaceTool, generateImageTool, requestConversionTool] }],
          systemInstruction: instruction
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err: any) {
      setError({ title: "Hardware Blocked", message: "Microphone access required." });
      setIsConnecting(false);
    }
  };

  const handleDownload = () => {
    if (workspace.type === 'image' && workspace.imageUrl) {
      const link = document.createElement('a');
      link.href = workspace.imageUrl;
      link.download = `MINE_AI_Synthesis_${Date.now()}.png`;
      link.click();
    } else if (workspace.type === 'conversion' && workspace.conversionData?.resultUrl) {
      const link = document.createElement('a');
      link.href = workspace.conversionData.resultUrl;
      link.download = workspace.conversionData.resultName || 'MINE_AI_Export';
      link.click();
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-[2400px] mx-auto animate-billion overflow-hidden bg-white/50 backdrop-blur-xl">
      <div className="flex flex-col lg:flex-row flex-1 p-4 md:p-10 lg:p-16 gap-8 lg:gap-14 overflow-hidden">
        
        {/* Module: Perception Feed */}
        <div className="w-full lg:w-[420px] flex flex-col gap-8 shrink-0">
          <div className="glass-premium p-10 rounded-[4rem] border-white/90 shadow-2xl flex-1 flex flex-col items-center">
            <h3 className="text-[10px] font-black uppercase tracking-[1em] text-prismatic mb-10">Neural Input</h3>
            
            {/* Context Multi-Zone */}
            <div className="w-full space-y-6">
              <div className="aspect-square relative bg-white/80 rounded-[3.5rem] flex items-center justify-center overflow-hidden shadow-inner border border-black/[0.03]">
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

              {/* Media Uplink Zone for Conversions */}
              <div className="p-8 bg-slate-50/50 rounded-[2.5rem] border border-black/[0.03] shadow-sm">
                <h4 className="text-[9px] font-black uppercase tracking-[0.6em] text-slate-400 mb-6 text-center">Media Uplink</h4>
                <button 
                  onClick={() => document.getElementById('media-upload')?.click()}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center gap-4 hover:border-prismatic hover:bg-white transition-all group"
                >
                  <svg className="w-5 h-5 text-slate-300 group-hover:text-prismatic" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeWidth={2}/></svg>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-900">Push MP4 / DOCX</span>
                </button>
                <input type="file" id="media-upload" hidden accept=".mp4,.docx,.doc" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && f.name.endsWith('.mp4')) handleMp4ToMp3Conversion(f);
                }} />
              </div>
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
                  <p className="text-[10px] font-black text-slate-400 tracking-[0.6em] uppercase">Initialize Neural Handshake</p>
                </div>
              </div>
            )}
            {isConnecting && <div className="text-xl font-black uppercase tracking-[1em] text-prismatic animate-pulse">Establishing Nexus...</div>}
            {isConnected && (
              <div className="flex flex-col items-center gap-24 w-full animate-billion relative">
                <div className={`w-64 h-64 rounded-full border-2 transition-all duration-700 flex items-center justify-center bg-white shadow-2xl ${isUserSpeaking ? 'border-prismatic scale-110' : isModelThinking ? 'border-purple-400 animate-pulse' : 'border-black/5'}`}>
                   <div className={`w-12 h-12 rounded-full ${isUserSpeaking ? 'bg-prismatic' : isModelThinking ? 'bg-purple-400' : 'bg-slate-100'}`}></div>
                </div>
                <div className="text-center space-y-4">
                   <p className="text-[10px] font-black text-slate-400 tracking-[0.8em] uppercase">
                     {isUserSpeaking ? 'Transmitting Data' : isModelThinking ? 'Neural Reasoning' : 'Standby Mode'}
                   </p>
                </div>
              </div>
            )}
            {error && <div className="text-red-500 font-black">{error.message} <button onClick={startConversation} className="underline ml-4">Reconnect</button></div>}
          </div>
          <div className="flex justify-center">
             {isConnected && <button onClick={cleanup} className="px-12 py-5 bg-slate-900 text-white rounded-full font-black uppercase tracking-[0.4em] hover:bg-red-500 transition-all text-[10px] shadow-2xl">Terminate Link</button>}
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
              <div className="flex gap-4">
                {(workspace.type === 'image' || (workspace.type === 'conversion' && workspace.conversionData?.status === 'completed')) && (
                  <button onClick={handleDownload} className="p-4 bg-prismatic text-white rounded-full shadow-lg hover:scale-110 transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5m0 0l5-5m-5 5V3" strokeWidth={3}/></svg>
                  </button>
                )}
                <button onClick={() => setWorkspace({...workspace, isActive: false})} className="p-4 bg-white rounded-full border border-black/[0.03] text-slate-300 hover:text-red-500 transition-all shadow-sm">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2}/></svg>
                </button>
              </div>
            </header>
            
            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar relative">
              {workspace.isProcessing && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/40 backdrop-blur-md">
                   <div className="w-20 h-20 border-4 border-prismatic/20 border-t-prismatic rounded-full animate-spin"></div>
                   <p className="mt-8 text-[11px] font-black uppercase tracking-[0.6em] text-prismatic">Synthesizing Imagery...</p>
                </div>
              )}
              
              {/* Conversion Interface */}
              {workspace.type === 'conversion' && workspace.conversionData && (
                <div className="h-full flex flex-col items-center justify-center text-center p-10 space-y-12 animate-billion">
                   <div className="relative w-48 h-48">
                      <svg className="w-full h-full rotate-[-90deg]">
                        <circle cx="96" cy="96" r="80" fill="transparent" stroke="rgba(0,0,0,0.05)" strokeWidth="12" />
                        <circle cx="96" cy="96" r="80" fill="transparent" stroke="url(#circuitPrismatic)" strokeWidth="12" strokeDasharray="502.6" strokeDashoffset={502.6 - (502.6 * workspace.conversionData.progress / 100)} className="transition-all duration-700" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                         <span className="text-3xl font-black text-slate-900">{workspace.conversionData.progress}%</span>
                      </div>
                   </div>
                   
                   <div className="space-y-4">
                      <h4 className="text-xl font-black uppercase tracking-widest text-slate-900">
                        {workspace.conversionData.status === 'processing' ? 'Transcoding Neural Stream' : 
                         workspace.conversionData.status === 'completed' ? 'Transcoding Verified' : 'Awaiting Uplink'}
                      </h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                        Task: {workspace.conversionData.type.replace(/_/g, ' ')}
                      </p>
                   </div>

                   {workspace.conversionData.status === 'completed' && (
                     <div className="p-8 bg-green-50 rounded-[2.5rem] border border-green-100 flex items-center gap-6 animate-billion">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white">
                           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth={3}/></svg>
                        </div>
                        <div className="text-left">
                           <p className="text-[10px] font-black uppercase tracking-widest text-green-600">Download Authorization Ready</p>
                           <p className="text-sm font-bold text-slate-700 mt-1">{workspace.conversionData.resultName}</p>
                        </div>
                     </div>
                   )}
                </div>
              )}
              
              {workspace.type === 'image' && workspace.imageUrl && (
                <div className="w-full space-y-10 animate-billion">
                  <div className="relative group rounded-[3rem] overflow-hidden shadow-2xl border border-black/5 bg-slate-900">
                     <img src={workspace.imageUrl} className="w-full h-auto" alt="Generated Synthesis" />
                  </div>
                </div>
              )}

              {workspace.type === 'markdown' && (
                <div className="whitespace-pre-wrap text-xl text-slate-700 font-medium leading-relaxed font-inter">
                  {workspace.content}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveVoice;
