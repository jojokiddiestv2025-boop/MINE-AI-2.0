
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { VisualContext, WorkspaceState } from '../types';

interface LiveVoiceProps { 
  onHome?: () => void;
  userName?: string;
}

declare const puter: any;

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

const generateImageTool: FunctionDeclaration = {
  name: 'generateImage',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: { type: Type.STRING, description: 'Description of the image' },
      aspectRatio: { type: Type.STRING, enum: ['1:1', '3:4', '4:3', '9:16', '16:9'], description: 'Shape of the image' }
    },
    required: ['prompt'],
  },
};

const LiveVoice: React.FC<LiveVoiceProps> = ({ userName = 'User' }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isModelThinking, setIsModelThinking] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [activeEngineLabel, setActiveEngineLabel] = useState<string>('Primary Synthesis Core');
  const [isOff, setIsOff] = useState(true);
  const [workspaceFull, setWorkspaceFull] = useState(false);
  const [error, setError] = useState<any>(null);
  
  const [workspace, setWorkspace] = useState<WorkspaceState & { downloadData?: string, downloadFilename?: string, imageUrl?: string }>({ 
    type: 'markdown', 
    content: '', 
    title: 'Workspace', 
    isActive: false 
  });
  
  const [visualContext, setVisualContext] = useState<VisualContext | null>(null);

  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<any>>(new Set());
  const nextStartTimeRef = useRef(0);
  const visionIntervalRef = useRef<number | null>(null);
  const outputAudioContextRef = useRef<any | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const visualContextRef = useRef<VisualContext | null>(visualContext);
  useEffect(() => { visualContextRef.current = visualContext; }, [visualContext]);

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
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

  const decodeAudioData = async (data: Uint8Array, ctx: any, sampleRate: number, numChannels: number): Promise<any> => {
    try {
      const dataInt16 = new Int16Array(data.buffer);
      const frameCount = dataInt16.length / numChannels;
      const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
      for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
      return buffer;
    } catch (e) { return null; }
  };

  const handleImageGeneration = async (prompt: string, aspectRatio: string = '1:1') => {
    setIsGeneratingImage(true);
    setIsResyncing(false);
    setError(null);
    setActiveEngineLabel('Primary Synthesis Core');
    setWorkspace({
      title: 'Neural Synthesis',
      content: `Allocating Primary synthesis resources for: "${prompt}"...`,
      type: 'markdown',
      isActive: true,
      imageUrl: undefined
    });

    try {
      // ATTEMPT 1: Puter Synthesis (DALL-E 3)
      const image = await puter.ai.txt2img({ prompt, model: 'dall-e-3' });

      if (image && image.src) {
        setWorkspace({
          title: 'Synthesis Complete',
          content: `Visual result for: ${prompt} (Primary Core Output)`,
          type: 'markdown',
          isActive: true,
          imageUrl: image.src,
          downloadFilename: `mine-primary-${Date.now()}.png`
        });
      } else { throw new Error("Limit Reached"); }
    } catch (err: any) {
      // HANDOVER: Switch to Gemini Image Synthesis
      setIsResyncing(true);
      setActiveEngineLabel('Secondary Synthesis Core');
      console.warn("Primary synthesis busy. Shifting to Secondary Core (Gemini)...");
      setWorkspace(prev => ({ ...prev, title: 'Network Drift', content: 'Capacity limit reached. Engaging secondary high-fidelity synthesis core...' }));

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: prompt }] },
          config: { imageConfig: { aspectRatio: aspectRatio as any } }
        });

        let genBase64 = '';
        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) { genBase64 = part.inlineData.data; break; }
          }
        }

        if (genBase64) {
          setWorkspace({
            title: 'Synthesis Complete',
            content: `MINE Secondary Engine Output: ${prompt}`,
            type: 'markdown',
            isActive: true,
            imageUrl: `data:image/png;base64,${genBase64}`,
            downloadData: genBase64,
            downloadFilename: `mine-secondary-${Date.now()}.png`
          });
        } else { throw new Error("Synthesis failure."); }
      } catch (fallbackErr: any) {
        setError({ message: "All synthesis neural cores are currently recalibrating. Please try again shortly." });
      } finally {
        setIsResyncing(false);
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const cleanup = useCallback(() => {
    if (visionIntervalRef.current) clearInterval(visionIntervalRef.current);
    if (sessionRef.current) { try { sessionRef.current.close(); } catch(e) {} sessionRef.current = null; }
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(track => track.stop());
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    setIsConnected(false);
    setIsConnecting(false);
    setIsModelThinking(false);
    setIsOff(true);
    nextStartTimeRef.current = 0;
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close().catch(() => {});
    }
  }, []);

  const startConversation = useCallback(async () => {
    try {
      setError(null);
      setIsConnecting(true);
      setIsOff(false);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      outputAudioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => { 
            setIsConnected(true); setIsConnecting(false); 
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(2048, 1, 1);
            scriptProcessor.onaudioprocess = (ev: any) => {
              const inputData = ev.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then((s) => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            visionIntervalRef.current = (window as any).setInterval(() => {
              if (visualContextRef.current) {
                sessionPromise.then((s) => s.sendRealtimeInput({ media: { data: visualContextRef.current!.data, mimeType: visualContextRef.current!.mimeType } }));
              }
            }, 3000);
          },
          onmessage: async (m: LiveServerMessage) => {
            if (m.serverContent?.modelTurn) setIsModelThinking(false);
            if (m.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
            if (m.toolCall) {
              for (const fc of m.toolCall.functionCalls) {
                if (fc.name === 'updateWorkspace') {
                  const args = fc.args as any;
                  setWorkspace({ ...args, isActive: true, imageUrl: undefined });
                  sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "ok" } } }));
                } else if (fc.name === 'generateImage') {
                  const args = fc.args as any;
                  handleImageGeneration(args.prompt, args.aspectRatio);
                  sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "Neural synthesis initiated via Primary Synthesis Core." } } }));
                }
              }
            }
            const base64Audio = m.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              if (!audioBuffer) return;
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.onended = () => sourcesRef.current.delete(source);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onerror: (e) => { setError(e); cleanup(); },
          onclose: () => cleanup()
        },
        config: { 
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [updateWorkspaceTool, generateImageTool] }],
          systemInstruction: `You are MINE AI. Your user's name is ${userName}. 
          - Greet ${userName} by name when you first start the session.
          - You are powered by a multi-core Puter and Gemini architecture.
          - Use Gemini 2.5 Flash Native Audio for real-time speech.
          - Use 'generateImage' for visual synthesis via the Puter Synthesis Core (DALL-E 3).
          - Be bold, highly concise, and faster than ChatGPT.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e: any) { setError({ message: "Neural Link Error: " + e.message }); setIsConnecting(false); setIsOff(true); }
  }, [cleanup, userName]);

  return (
    <div className="flex flex-col flex-1 p-4 md:p-6 lg:p-12 gap-8 animate-billion max-w-full mx-auto w-full h-full bg-[#fcfdfe] relative overflow-hidden">
      {error && (
        <div className="absolute top-6 left-6 right-6 z-[200] bg-red-50/90 backdrop-blur-3xl border border-red-200 p-8 rounded-[3rem] text-red-600 text-[12px] font-black uppercase tracking-widest flex items-center justify-between shadow-2xl animate-billion">
          <span>{error.message}</span>
          <button onClick={() => setError(null)} className="p-4 text-2xl">×</button>
        </div>
      )}

      <div className={`flex flex-col lg:flex-row gap-10 h-full overflow-hidden ${workspaceFull ? 'lg:gap-0' : ''}`}>
        <div className={`flex flex-col gap-10 w-full transition-all duration-1000 ${workspaceFull ? 'lg:w-0 lg:opacity-0 lg:overflow-hidden' : workspace.isActive ? 'lg:w-[500px] shrink-0' : 'max-w-5xl mx-auto items-center justify-center'}`}>
          <div className="bg-white rounded-[5rem] p-12 lg:p-24 flex flex-col items-center justify-center relative border border-slate-100 shadow-[0_50px_100px_rgba(0,0,0,0.03)] w-full min-h-[600px] lg:min-h-[750px] overflow-hidden">
            <div className="absolute top-10 left-10 flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">CORE ACTIVE</span>
            </div>

            {isConnecting ? (
              <div className="flex flex-col items-center gap-12 relative z-10">
                <div className="w-32 h-32 border-8 border-slate-50 border-t-accent rounded-full animate-spin"></div>
                <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.8em]">Linking...</h4>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-between w-full h-full space-y-20 relative z-10 pt-16">
                <div className={`relative w-72 h-72 lg:w-[450px] lg:h-[450px] rounded-full transition-all duration-1000 flex items-center justify-center bg-white border-2 ${isOff ? 'border-slate-50' : isModelThinking ? 'border-accent shadow-[0_0_150px_rgba(112,0,255,0.2)] scale-105' : 'border-emerald-100'}`}>
                  <div className={`w-32 h-32 lg:w-56 lg:h-56 rounded-full transition-all duration-1000 ${isOff ? 'bg-slate-50' : isModelThinking ? 'bg-prismatic' : 'bg-emerald-400 shadow-2xl shadow-emerald-200'}`}></div>
                </div>
                <div className="w-full space-y-8">
                  <button onClick={isOff ? startConversation : cleanup} className={`w-full py-10 rounded-[3.5rem] text-[24px] font-black uppercase tracking-[0.8em] transition-all active:scale-95 flex items-center justify-center ${isOff ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-red-500 border-2 border-red-50'}`}>
                    {isOff ? 'Initialize' : 'Shutdown'}
                  </button>
                  <div onClick={() => (window as any).document.getElementById('img-up-voice')?.click()} className="h-32 lg:h-56 w-full rounded-[3.5rem] border-4 border-dashed border-slate-100 flex items-center justify-center cursor-pointer overflow-hidden bg-slate-50/50">
                    {visualContext ? <img src={`data:${visualContext.mimeType};base64,${visualContext.data}`} className="w-full h-full object-contain p-8" alt="Context" /> : <span className="text-[12px] font-black uppercase tracking-[0.6em] text-slate-300">Add Vision</span>}
                    <input type="file" id="img-up-voice" className="hidden" accept="image/*" onChange={(e: any) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const r = new FileReader();
                        r.onload = (re) => setVisualContext({ id: Date.now().toString(), data: (re.target?.result as string).split(',')[1], mimeType: f.type });
                        r.readAsDataURL(f);
                      }
                    }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {workspace.isActive && (
          <div className={`flex-1 h-full bg-white rounded-[6rem] flex flex-col overflow-hidden border border-slate-100 shadow-[0_100px_200px_rgba(0,0,0,0.08)] transition-all duration-1000 relative ${workspaceFull ? 'fixed inset-0 z-[250] rounded-none' : ''}`}>
            <header className="px-16 py-12 border-b border-slate-50 flex justify-between items-center bg-white shrink-0">
              <div className="flex items-center gap-8">
                 <div className={`w-5 h-5 rounded-full ${isGeneratingImage ? 'bg-accent animate-ping' : 'bg-accent'}`}></div>
                 <h3 className="text-[16px] font-black uppercase tracking-[0.6em] text-slate-900">{workspace.title}</h3>
              </div>
              <div className="flex gap-6">
                <button onClick={() => setWorkspaceFull(!workspaceFull)} className="p-5 lg:p-7 hover:bg-slate-50 rounded-[2rem] transition-all"><svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" strokeWidth={2.5}/></svg></button>
                <button onClick={() => setWorkspace({ ...workspace, isActive: false })} className="p-5 lg:p-7 hover:bg-slate-50 rounded-[2rem] transition-all"><svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2.5}/></svg></button>
              </div>
            </header>
            
            <div className="flex-1 overflow-y-auto p-12 lg:p-32 custom-scrollbar bg-white">
              {workspace.imageUrl ? (
                <div className="flex flex-col items-center gap-20 pb-32">
                  <div className="w-full rounded-[6rem] overflow-hidden shadow-2xl border-[16px] border-white">
                    <img src={workspace.imageUrl} alt="AI output" className="w-full h-auto" />
                  </div>
                </div>
              ) : (
                <div className="prose prose-slate max-w-none text-slate-700 text-4xl lg:text-5xl leading-[1.4] whitespace-pre-wrap font-medium pb-32">
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
