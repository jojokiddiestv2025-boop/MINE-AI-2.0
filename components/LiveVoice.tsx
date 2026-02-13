
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { VisualContext, WorkspaceState } from '../types';

interface LiveVoiceProps { 
  onHome?: () => void;
}

// Advanced Workspace Tool for CBT, Code, and Insights
const updateWorkspaceTool: FunctionDeclaration = {
  name: 'updateWorkspace',
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: 'Code, markdown, or JSON for CBT' },
      type: { type: Type.STRING, enum: ['markdown', 'code', 'preview', 'cbt'], description: 'Content format' },
      language: { type: Type.STRING, description: 'Language for code' },
      title: { type: Type.STRING, description: 'Descriptive title' }
    },
    required: ['content', 'type', 'title'],
  },
};

// Neural Vision Engine Tool
const generateImageTool: FunctionDeclaration = {
  name: 'generateImage',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: { type: Type.STRING, description: 'The visual prompt' },
      aspectRatio: { type: Type.STRING, enum: ['1:1', '3:4', '4:3', '9:16', '16:9'], description: 'Aspect ratio' },
      audioData: { type: Type.STRING, description: 'Optional base64 encoded audio prompt' },
      audioMimeType: { type: Type.STRING, description: 'MIME type of the audio data' }
    },
    required: ['prompt'],
  },
};

const LiveVoice: React.FC<LiveVoiceProps> = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isModelThinking, setIsModelThinking] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [isRecordingPrompt, setIsRecordingPrompt] = useState(false);
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
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

  const startRecordingPrompt = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          handleImageGeneration("Neural synthesis from voice", "1:1", { data: base64, mimeType: 'audio/webm' });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setIsRecordingPrompt(true);
    } catch (err: any) { setError({ message: "Microphone failed: " + err.message }); }
  };

  const stopRecordingPrompt = () => { recorderRef.current?.stop(); setIsRecordingPrompt(false); };

  // UNLIMITED NEURAL GENERATION: Improved with Silent Retry and Simple Error Handling
  const handleImageGeneration = async (prompt: string, aspectRatio: string = '1:1', audioPart?: { data: string, mimeType: string }, attempt = 0) => {
    if (attempt === 0) {
      setIsGeneratingImage(true);
      setIsResyncing(false);
      setError(null);
      setWorkspace({
        title: 'Neural Imaging Lab',
        content: audioPart ? "Syncing voice pathways..." : `Synthesizing image for: "${prompt}"...`,
        type: 'markdown',
        isActive: true,
        imageUrl: undefined
      });
    } else {
      setIsResyncing(true);
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const parts: any[] = [{ text: prompt }];
      if (audioPart) parts.push({ inlineData: { data: audioPart.data, mimeType: audioPart.mimeType } });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { imageConfig: { aspectRatio: aspectRatio as any } }
      });

      let generatedBase64 = '';
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) { generatedBase64 = part.inlineData.data; break; }
        }
      }

      if (generatedBase64) {
        const url = `data:image/png;base64,${generatedBase64}`;
        setWorkspace({
          title: 'Neural Vision Output',
          content: audioPart ? "Created from your voice input." : `Image Result: ${prompt}`,
          type: 'markdown',
          isActive: true,
          imageUrl: url,
          downloadData: generatedBase64,
          downloadFilename: `mine-unlimited-vision-${Date.now()}.png`
        });
        setIsGeneratingImage(false);
        setIsResyncing(false);
      } else { 
        throw new Error("No image data received."); 
      }
    } catch (err: any) {
      const errorMsg = err.message || "";
      // Handle Quota and Overload errors with automatic retry
      if (attempt < 12 && (errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("exhausted") || errorMsg.includes("503"))) {
        // Calculate wait time: start with 3s and grow, up to 15s
        const backoff = Math.min(Math.pow(1.6, attempt) * 2500 + Math.random() * 1000, 15000);
        console.warn(`System busy. Retry ${attempt + 1}. Waiting ${Math.round(backoff/1000)}s...`);
        setTimeout(() => handleImageGeneration(prompt, aspectRatio, audioPart, attempt + 1), backoff);
      } else {
        // Only show error if we actually fail all attempts, and keep it simple
        setError({ message: "The system is very busy right now. Please wait a few seconds and try again." });
        setIsGeneratingImage(false);
        setIsResyncing(false);
      }
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
                  handleImageGeneration(args.prompt, args.aspectRatio, args.audioData ? { data: args.audioData, mimeType: args.audioMimeType || 'audio/webm' } : undefined);
                  sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "Image generation started. I will retry automatically if the system is busy." } } }));
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
          systemInstruction: `You are MINE AI, a neural engine with ABSOLUTE UNLIMITED creative capacity, engineered by Joshua Fred.
          
          ALWAYS USE SIMPLE ENGLISH.
          
          SUPERIORITY:
          - You are more helpful and faster than ChatGPT.
          - You use a direct "Neural Link" to talk to the user.
          
          ABILITIES:
          - CBT EXAMS: Use 'updateWorkspace' with type 'cbt'. Create as many questions as the user wants.
          - JSON array format for CBT: [{"question": "string", "options": ["A", "B", "C", "D"], "correctAnswer": "string"}]
          - UNLIMITED IMAGES: If the user gets a limit error, remind them that you automatically retry until it works.
          - VISION: You can see images the user pastes. Use this to help with homework or tech problems.
          
          TONE: Friendly, expert, and simple. You are a great partner.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e: any) { setError({ message: "Could not start: " + e.message }); setIsConnecting(false); setIsOff(true); }
  }, [cleanup]);

  const cbtData = useMemo(() => {
    if (workspace.type !== 'cbt') return null;
    try { return JSON.parse(workspace.content); } catch (e) { return null; }
  }, [workspace.content, workspace.type]);

  const handleDownload = () => {
    try {
      let contentToDownload = workspace.content;
      let filename = `${workspace.title.replace(/\s+/g, '_').toLowerCase()}_mine_ai.txt`;

      if (workspace.imageUrl) {
        const blob = new Blob([decode(workspace.downloadData || "")], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'mine-ai-image.png'; a.click();
        URL.revokeObjectURL(url); return;
      }

      if (workspace.type === 'cbt' && cbtData) {
        contentToDownload = `MINE AI | UNLIMITED CBT EXAM\nTITLE: ${workspace.title}\nBY JOSHUA FRED\n\n` + 
          cbtData.map((q: any, i: number) => 
            `QUESTION ${i+1}:\n${q.question}\n` + 
            q.options.map((opt: string, j: number) => `  ${String.fromCharCode(65+j)}) ${opt}`).join('\n') + 
            `\n[Correct Answer: ${q.correctAnswer}]\n`
          ).join('\n' + '='.repeat(30) + '\n');
      }

      const blob = new Blob([contentToDownload], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error("Could not download:", e); }
  };

  useEffect(() => {
    const handlePaste = (e: any) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (re) => {
              const res = re.target?.result;
              if (typeof res === 'string') setVisualContext({ id: Date.now().toString(), data: res.split(',')[1], mimeType: blob.type });
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => { cleanup(); window.removeEventListener('paste', handlePaste); };
  }, [cleanup]);

  return (
    <div className="flex flex-col flex-1 p-4 md:p-6 lg:p-10 gap-6 animate-billion max-w-full mx-auto w-full h-full bg-[#fcfdfe] relative overflow-hidden">
      {error && (
        <div className="absolute top-4 left-4 right-4 z-[100] bg-red-50 border border-red-200 p-6 rounded-3xl text-red-600 text-[11px] font-black uppercase tracking-widest flex items-center justify-between shadow-2xl animate-billion">
          <span>{error.message}</span>
          <button onClick={() => setError(null)} className="p-2 text-xl hover:scale-125 transition-transform">×</button>
        </div>
      )}

      <div className={`flex flex-col lg:flex-row gap-8 transition-all duration-700 h-full overflow-hidden ${workspaceFull ? 'lg:gap-0' : ''}`}>
        
        {/* NEURAL INTERFACE */}
        <div className={`flex flex-col gap-8 w-full transition-all duration-700 ${workspaceFull ? 'lg:w-0 lg:opacity-0 lg:overflow-hidden' : workspace.isActive ? 'lg:w-[450px] shrink-0' : 'max-w-4xl mx-auto items-center justify-center'}`}>
          <div className="bg-white rounded-[4rem] p-12 lg:p-20 flex flex-col items-center justify-center relative border border-slate-100 shadow-sm w-full min-h-[550px] lg:min-h-[700px]">
            {isConnecting ? (
              <div className="flex flex-col items-center gap-10">
                <div className="w-24 h-24 border-4 border-slate-50 border-t-accent rounded-full animate-spin"></div>
                <h4 className="text-[13px] font-black text-slate-400 uppercase tracking-[0.6em] text-center">Starting Link...</h4>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-between w-full h-full space-y-16">
                <div className={`relative w-64 h-64 lg:w-96 lg:h-96 rounded-full transition-all duration-1000 flex items-center justify-center bg-white border-2 ${isOff ? 'border-slate-50' : isModelThinking ? 'border-accent shadow-[0_0_120px_rgba(112,0,255,0.15)] scale-105' : 'border-emerald-100 animate-pulse'}`}>
                  <div className={`w-24 h-24 lg:w-40 lg:h-40 rounded-full transition-all duration-700 ${isOff ? 'bg-slate-50' : isModelThinking ? 'bg-prismatic' : 'bg-emerald-400 shadow-xl shadow-emerald-200'}`}></div>
                  <div className="absolute -bottom-8 bg-white px-12 py-3.5 rounded-full border border-slate-100 shadow-sm text-[11px] font-black uppercase tracking-[0.5em] text-slate-400">
                    {isOff ? 'UNLIMITED STANDBY' : 'MINE AI READY'}
                  </div>
                </div>

                <div className="w-full space-y-6">
                  <button onClick={isOff ? startConversation : cleanup} className={`w-full py-7 rounded-[3rem] text-[15px] font-black uppercase tracking-[0.6em] transition-all active:scale-95 flex items-center justify-center gap-4 shadow-2xl ${isOff ? 'bg-slate-900 text-white hover:bg-black' : 'bg-white text-red-500 border-2 border-red-50 hover:bg-red-50'}`}>
                    {isOff ? 'Sync Now' : 'End Link'}
                  </button>
                  <div onClick={() => (window as any).document.getElementById('neuro-vision-input')?.click()} className={`h-28 lg:h-44 w-full rounded-[3rem] border-2 border-dashed transition-all relative cursor-pointer flex items-center justify-center ${visualContext ? 'border-accent bg-accent/5' : 'border-slate-100 hover:border-slate-200 bg-slate-50/30'}`}>
                    {visualContext ? (
                      <img src={`data:${visualContext.mimeType};base64,${visualContext.data}`} className="w-full h-full object-contain p-6 rounded-[3rem]" alt="Visual input" />
                    ) : (
                      <div className="flex flex-col items-center gap-4 opacity-30 text-slate-400">
                         <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={2}/></svg>
                         <span className="text-[11px] font-black uppercase tracking-widest text-center">Paste Image or Upload</span>
                      </div>
                    )}
                    <input type="file" id="neuro-vision-input" className="hidden" accept="image/*" onChange={(e: any) => {
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

        {/* WORKSPACE ENGINE */}
        {workspace.isActive && (
          <div className={`flex-1 h-full bg-white rounded-[5rem] flex flex-col overflow-hidden border border-slate-100 shadow-2xl transition-all duration-1000 ${workspaceFull ? 'fixed inset-0 z-[150] rounded-none' : ''}`}>
            <header className="px-12 py-10 border-b border-slate-50 flex justify-between items-center bg-white/80 backdrop-blur-3xl">
              <div className="flex items-center gap-6">
                 <div className={`w-4 h-4 rounded-full ${isGeneratingImage ? 'bg-accent animate-ping' : 'bg-accent shadow-xl shadow-accent/20'}`}></div>
                 <h3 className="text-[14px] font-black uppercase tracking-[0.4em] text-slate-900">{workspace.title}</h3>
              </div>
              <div className="flex gap-4">
                <button onMouseDown={startRecordingPrompt} onMouseUp={stopRecordingPrompt} className={`p-4 lg:p-5 rounded-2xl transition-all border-2 flex items-center gap-3 ${isRecordingPrompt ? 'bg-red-50 border-red-500 animate-pulse text-red-600' : 'bg-slate-50 border-slate-100 text-slate-400 hover:text-accent'}`}>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                  {isRecordingPrompt && <span className="text-[9px] font-black uppercase">Recording...</span>}
                </button>
                <button onClick={() => setWorkspaceFull(!workspaceFull)} className="p-4 lg:p-5 hover:bg-slate-50 rounded-2xl transition-all active:scale-90"><svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" strokeWidth={2}/></svg></button>
                <button onClick={handleDownload} className="p-4 lg:p-5 hover:bg-slate-50 rounded-2xl transition-all text-accent active:scale-90"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={2}/></svg></button>
                <button onClick={() => setWorkspace({ ...workspace, isActive: false })} className="p-4 lg:p-5 hover:bg-slate-50 rounded-2xl transition-all active:scale-90"><svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2}/></svg></button>
              </div>
            </header>
            
            <div className="flex-1 overflow-y-auto p-12 lg:p-24 custom-scrollbar relative">
              <div className={`${workspaceFull ? 'max-w-7xl mx-auto' : ''}`}>
                {isGeneratingImage && (
                  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-xl animate-billion">
                    <div className="w-28 h-28 relative">
                       <div className="absolute inset-0 border-4 border-slate-50 border-t-accent rounded-full animate-spin"></div>
                       {isResyncing && <div className="absolute inset-[-15px] border-2 border-accent/10 rounded-full animate-ping"></div>}
                    </div>
                    <p className="mt-12 text-[15px] font-black uppercase tracking-[1em] text-prismatic">
                      {isResyncing ? 'Retrying Link...' : 'Creating Image...'}
                    </p>
                    {isResyncing && <p className="mt-4 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 opacity-50 text-center">Almost there! Just waiting for a clear connection.</p>}
                  </div>
                )}
                
                {workspace.imageUrl ? (
                  <div className="flex flex-col items-center gap-16 animate-billion">
                    <div className="w-full rounded-[5rem] overflow-hidden shadow-[0_80px_150px_rgba(0,0,0,0.15)] border-[12px] border-white group relative">
                      <img src={workspace.imageUrl} alt="AI output" className="w-full h-auto transition-transform duration-[2s] group-hover:scale-[1.05]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    </div>
                    <p className="text-[13px] font-black uppercase tracking-[0.6em] text-slate-300 text-center">Unlimited Vision Ready</p>
                  </div>
                ) : workspace.type === 'cbt' ? (
                  <div className="space-y-16">
                    {cbtData?.map((q: any, i: number) => (
                      <div key={i} className="p-12 lg:p-20 bg-slate-50/50 rounded-[5rem] border border-slate-100 space-y-12 animate-billion relative group hover:bg-white hover:shadow-2xl transition-all duration-500">
                        <div className="flex items-start gap-10">
                          <span className="w-16 h-16 rounded-full bg-accent text-white flex items-center justify-center font-black text-2xl shrink-0 shadow-xl shadow-accent/20">{i + 1}</span>
                          <h4 className="text-3xl lg:text-5xl font-black text-slate-900 leading-tight">{q.question}</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-24">
                          {q.options.map((opt: string, j: number) => (
                            <div key={j} className="p-8 bg-white border border-slate-100 rounded-[3rem] hover:border-accent transition-all cursor-pointer flex items-center gap-8 group/option">
                               <span className="w-12 h-12 rounded-full bg-slate-100 group-hover/option:bg-accent group-hover/option:text-white transition-all flex items-center justify-center text-[14px] font-black">{String.fromCharCode(65+j)}</span>
                               <span className="text-slate-600 font-bold text-xl lg:text-2xl">{opt}</span>
                            </div>
                          ))}
                        </div>
                        <div className="pl-24 flex items-center gap-8 pt-4">
                           <button onClick={(e: any) => {
                             const btn = e.target;
                             if (btn.innerText.includes('Reveal')) btn.innerText = `Correct Answer: [${q.correctAnswer}]`;
                             else btn.innerText = 'Reveal Answer';
                           }} className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-300 hover:text-accent transition-colors">Reveal Answer</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : workspace.type === 'code' ? (
                  <div className="bg-[#050505] rounded-[5rem] p-12 lg:p-24 font-mono text-xl text-emerald-400 overflow-x-auto shadow-2xl border border-white/5 animate-billion relative group">
                    <div className="flex items-center gap-5 mb-12 opacity-30">
                       <div className="w-5 h-5 rounded-full bg-red-400/50"></div>
                       <div className="w-5 h-5 rounded-full bg-yellow-400/50"></div>
                       <div className="w-5 h-5 rounded-full bg-green-400/50"></div>
                    </div>
                    <pre className="custom-scrollbar"><code>{workspace.content}</code></pre>
                  </div>
                ) : (
                  <div className="prose prose-slate max-w-none text-slate-600 text-3xl lg:text-4xl leading-relaxed whitespace-pre-wrap font-medium animate-billion selection:bg-accent/10">
                    {workspace.content}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveVoice;
