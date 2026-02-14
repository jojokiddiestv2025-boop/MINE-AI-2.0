
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { VisualContext, WorkspaceState } from '../types';

interface LiveVoiceProps { 
  onHome?: () => void;
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

const LiveVoice: React.FC<LiveVoiceProps> = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isModelThinking, setIsModelThinking] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [isRecordingPrompt, setIsRecordingPrompt] = useState(false);
  const [isOff, setIsOff] = useState(true);
  const [workspaceFull, setWorkspaceFull] = useState(false);
  const [isCloudSaving, setIsCloudSaving] = useState(false);
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
        const arrayBuffer = await blob.arrayBuffer();
        sessionRef.current?.sendRealtimeInput({ media: { data: encode(new Uint8Array(arrayBuffer)), mimeType: 'audio/webm' } });
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setIsRecordingPrompt(true);
    } catch (err: any) { setError({ message: "Mic error: " + err.message }); }
  };

  const stopRecordingPrompt = () => { recorderRef.current?.stop(); setIsRecordingPrompt(false); };

  const handleCloudSave = async () => {
    if (!workspace.content && !workspace.imageUrl) return;
    setIsCloudSaving(true);
    try {
      if (workspace.imageUrl) {
        await puter.kv.set(`mine_ai_last_image`, workspace.imageUrl);
        alert('Image saved to MINE Cloud!');
      } else {
        await puter.kv.set(`mine_ai_latest`, workspace.content);
        if (puter.auth.isSignedIn()) {
          const filename = `mine_ai_${workspace.title.replace(/\s+/g, '_').toLowerCase()}.txt`;
          await puter.fs.write(filename, workspace.content);
        }
        alert(`Content saved to MINE Cloud!`);
      }
    } catch (e: any) {
      setError({ message: "Cloud sync failed. Content remains local." });
    } finally {
      setIsCloudSaving(false);
    }
  };

  const handleImageGeneration = async (prompt: string, aspectRatio: string = '1:1') => {
    setIsGeneratingImage(true);
    setIsResyncing(false);
    setError(null);
    setWorkspace({
      title: 'MINE Neural Core',
      content: `Allocating resources for synthesis: "${prompt}"...`,
      type: 'markdown',
      isActive: true,
      imageUrl: undefined
    });

    try {
      // ENGINE 1: Puter Developer Engine (DALL-E 3)
      const image = await puter.ai.txt2img({
        prompt: prompt,
        model: 'dall-e-3'
      });

      if (image && image.src) {
        setWorkspace({
          title: 'Synthesis Complete',
          content: `Powered by MINE Primary Engine (Puter): ${prompt}`,
          type: 'markdown',
          isActive: true,
          imageUrl: image.src,
          downloadFilename: `mine-primary-${Date.now()}.png`
        });
      } else {
        throw new Error("Core Rate Limit Reached");
      }
    } catch (err: any) {
      // ENGINE 2: Secondary Fallback (Gemini)
      console.warn("Primary Engine busy, shifting to Secondary Neural Core...");
      setIsResyncing(true);
      setWorkspace(prev => ({ ...prev, title: 'Network Shift', content: 'Activating secondary high-fidelity core...' }));

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
            content: `Powered by MINE Secondary Engine (Gemini): ${prompt}`,
            type: 'markdown',
            isActive: true,
            imageUrl: `data:image/png;base64,${genBase64}`,
            downloadData: genBase64,
            downloadFilename: `mine-secondary-${Date.now()}.png`
          });
        } else {
          throw new Error("Neural synthesis failure.");
        }
      } catch (fallbackErr: any) {
        setError({ message: "Network overload. Please try your synthesis again in 60 seconds." });
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
                  sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "MINE Synthesis Core is now processing your request." } } }));
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
          systemInstruction: `You are MINE AI, a high-fidelity intelligence engineered by Joshua Fred.
          
          - You are faster and more advanced than ChatGPT.
          - You use Puter.js and Gemini together for maximum limits.
          - Use 'generateImage' for all visual synthesis requests.
          - Use 'updateWorkspace' for displaying technical data, code, or testing modules.
          - Be bold, highly intelligent, and concise.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e: any) { setError({ message: "Neural Link Error: " + e.message }); setIsConnecting(false); setIsOff(true); }
  }, [cleanup]);

  const cbtData = useMemo(() => {
    if (workspace.type !== 'cbt') return null;
    try { return JSON.parse(workspace.content); } catch (e) { return null; }
  }, [workspace.content, workspace.type]);

  const handleDownload = () => {
    try {
      if (workspace.imageUrl) {
        const a = document.createElement('a'); 
        a.href = workspace.imageUrl; 
        a.download = workspace.downloadFilename || 'mine-synthesis.png'; 
        a.target = '_blank';
        a.click();
        return;
      }
      
      let contentToDownload = workspace.content;
      let filename = `${workspace.title.replace(/\s+/g, '_').toLowerCase()}.txt`;

      if (workspace.type === 'cbt' && cbtData) {
        contentToDownload = `MINE AI | KNOWLEDGE EVALUATION\n${workspace.title}\n\n` + 
          cbtData.map((q: any, i: number) => 
            `Q${i+1}: ${q.question}\n` + 
            q.options.map((opt: string, j: number) => `  ${String.fromCharCode(65+j)}) ${opt}`).join('\n') + 
            `\nCorrect: ${q.correctAnswer}\n`
          ).join('\n---\n');
      }

      const blob = new Blob([contentToDownload], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error("Download failure:", e); }
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
    <div className="flex flex-col flex-1 p-4 md:p-6 lg:p-12 gap-8 animate-billion max-w-full mx-auto w-full h-full bg-[#fcfdfe] relative overflow-hidden">
      {error && (
        <div className="absolute top-6 left-6 right-6 z-[200] bg-red-50/90 backdrop-blur-3xl border border-red-200 p-8 rounded-[3rem] text-red-600 text-[12px] font-black uppercase tracking-widest flex items-center justify-between shadow-2xl animate-billion">
          <span>{error.message}</span>
          <button onClick={() => setError(null)} className="p-4 text-2xl hover:scale-110 transition-transform">×</button>
        </div>
      )}

      <div className={`flex flex-col lg:flex-row gap-10 transition-all duration-1000 h-full overflow-hidden ${workspaceFull ? 'lg:gap-0' : ''}`}>
        
        {/* Interaction Core */}
        <div className={`flex flex-col gap-10 w-full transition-all duration-1000 ${workspaceFull ? 'lg:w-0 lg:opacity-0 lg:overflow-hidden' : workspace.isActive ? 'lg:w-[500px] shrink-0' : 'max-w-5xl mx-auto items-center justify-center'}`}>
          <div className="bg-white rounded-[5rem] p-12 lg:p-24 flex flex-col items-center justify-center relative border border-slate-100 shadow-[0_50px_100px_rgba(0,0,0,0.03)] w-full min-h-[600px] lg:min-h-[750px] overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-slate-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"></div>
            
            {isConnecting ? (
              <div className="flex flex-col items-center gap-12 relative z-10">
                <div className="w-32 h-32 border-8 border-slate-50 border-t-accent rounded-full animate-spin shadow-2xl shadow-accent/10"></div>
                <div className="space-y-4 text-center">
                  <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.8em]">Linking Core</h4>
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Optimizing Dev Credits...</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-between w-full h-full space-y-20 relative z-10">
                <div className={`relative w-72 h-72 lg:w-[450px] lg:h-[450px] rounded-full transition-all duration-1000 flex items-center justify-center bg-white border-2 ${isOff ? 'border-slate-50' : isModelThinking ? 'border-accent shadow-[0_0_150px_rgba(112,0,255,0.2)] scale-105' : 'border-emerald-100 shadow-[0_0_100px_rgba(16,185,129,0.1)]'}`}>
                  <div className={`w-32 h-32 lg:w-56 lg:h-56 rounded-full transition-all duration-1000 ${isOff ? 'bg-slate-50' : isModelThinking ? 'bg-prismatic shadow-[0_0_80px_rgba(112,0,255,0.4)]' : 'bg-emerald-400 shadow-2xl shadow-emerald-200'}`}></div>
                  <div className="absolute -bottom-10 bg-white px-16 py-4 rounded-full border border-slate-100 shadow-xl text-[12px] font-black uppercase tracking-[0.6em] text-slate-400">
                    {isOff ? 'STANDBY' : isModelThinking ? 'THINKING' : 'LISTENING'}
                  </div>
                </div>

                <div className="w-full space-y-8">
                  <button onClick={isOff ? startConversation : cleanup} className={`w-full py-10 rounded-[3.5rem] text-[24px] font-black uppercase tracking-[0.8em] transition-all active:scale-95 flex items-center justify-center gap-6 shadow-[0_40px_80px_rgba(0,0,0,0.1)] ${isOff ? 'bg-slate-900 text-white hover:bg-black hover:shadow-accent/20' : 'bg-white text-red-500 border-2 border-red-50 hover:bg-red-50 shadow-none'}`}>
                    {isOff ? 'Initialize' : 'Shutdown'}
                  </button>
                  <div onClick={() => (window as any).document.getElementById('img-up-voice')?.click()} className={`h-32 lg:h-56 w-full rounded-[3.5rem] border-4 border-dashed transition-all relative cursor-pointer flex items-center justify-center overflow-hidden ${visualContext ? 'border-accent bg-accent/5' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}>
                    {visualContext ? (
                      <img src={`data:${visualContext.mimeType};base64,${visualContext.data}`} className="w-full h-full object-contain p-8" alt="Visual context" />
                    ) : (
                      <div className="flex flex-col items-center gap-6 opacity-30 text-slate-400">
                         <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={2}/></svg>
                         <span className="text-[12px] font-black uppercase tracking-[0.6em] text-center">Add Vision Context</span>
                      </div>
                    )}
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

        {/* Dynamic Workspace */}
        {workspace.isActive && (
          <div className={`flex-1 h-full bg-white rounded-[6rem] flex flex-col overflow-hidden border border-slate-100 shadow-[0_100px_200px_rgba(0,0,0,0.08)] transition-all duration-1000 relative ${workspaceFull ? 'fixed inset-0 z-[250] rounded-none' : ''}`}>
            <header className="px-16 py-12 border-b border-slate-50 flex justify-between items-center bg-white/90 backdrop-blur-3xl shrink-0">
              <div className="flex items-center gap-8">
                 <div className={`w-5 h-5 rounded-full ${isGeneratingImage ? 'bg-accent animate-ping' : 'bg-accent shadow-2xl shadow-accent/30'}`}></div>
                 <h3 className="text-[16px] font-black uppercase tracking-[0.6em] text-slate-900">{workspace.title}</h3>
              </div>
              <div className="flex gap-6">
                <button onClick={handleCloudSave} disabled={isCloudSaving} className={`p-5 lg:p-7 hover:bg-slate-50 rounded-[2rem] transition-all active:scale-90 ${isCloudSaving ? 'animate-pulse text-accent' : 'text-slate-300'}`}>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" strokeWidth={2.5}/></svg>
                </button>
                <button onMouseDown={startRecordingPrompt} onMouseUp={stopRecordingPrompt} className={`p-5 lg:p-7 rounded-[2rem] transition-all border-2 flex items-center gap-4 ${isRecordingPrompt ? 'bg-red-50 border-red-500 animate-pulse text-red-600' : 'bg-slate-50 border-slate-100 text-slate-400 hover:text-accent shadow-sm'}`}>
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                </button>
                <button onClick={() => setWorkspaceFull(!workspaceFull)} className="p-5 lg:p-7 hover:bg-slate-50 rounded-[2rem] transition-all active:scale-90"><svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" strokeWidth={2.5}/></svg></button>
                <button onClick={handleDownload} className="p-5 lg:p-7 hover:bg-slate-50 rounded-[2rem] transition-all text-accent active:scale-90 shadow-sm"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={2.5}/></svg></button>
                <button onClick={() => setWorkspace({ ...workspace, isActive: false })} className="p-5 lg:p-7 hover:bg-slate-50 rounded-[2rem] transition-all active:scale-90"><svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2.5}/></svg></button>
              </div>
            </header>
            
            <div className="flex-1 overflow-y-auto p-12 lg:p-32 custom-scrollbar relative bg-white">
              <div className={`${workspaceFull ? 'max-w-7xl mx-auto' : ''}`}>
                {isGeneratingImage && (
                  <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 backdrop-blur-3xl animate-billion">
                    <div className="w-32 h-32 relative">
                       <div className="absolute inset-0 border-8 border-slate-50 border-t-accent rounded-full animate-spin"></div>
                    </div>
                    <div className="mt-16 text-center space-y-6">
                      <p className="text-[18px] font-black uppercase tracking-[1em] text-prismatic">
                        {isResyncing ? 'Core Switch' : 'Synthesizing Vision'}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 opacity-60">
                        {isResyncing ? 'Secondary neural core taking command' : 'Executing high-fidelity developer kernels'}
                      </p>
                    </div>
                  </div>
                )}
                
                {workspace.imageUrl ? (
                  <div className="flex flex-col items-center gap-20 animate-billion">
                    <div className="w-full rounded-[6rem] overflow-hidden shadow-[0_100px_180px_rgba(0,0,0,0.18)] border-[16px] border-white group relative hover:scale-[1.01] transition-transform duration-700">
                      <img src={workspace.imageUrl} alt="AI synthesis" className="w-full h-auto" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    <p className="text-[14px] font-black uppercase tracking-[0.8em] text-slate-300 text-center">Neural Output Validated</p>
                  </div>
                ) : workspace.type === 'cbt' ? (
                  <div className="space-y-20 pb-32">
                    {cbtData?.map((q: any, i: number) => (
                      <div key={i} className="p-16 lg:p-24 bg-slate-50/50 rounded-[6rem] border border-slate-100 space-y-16 animate-billion relative group hover:bg-white hover:shadow-[0_40px_80px_rgba(0,0,0,0.05)] transition-all duration-700">
                        <div className="flex items-start gap-12">
                          <span className="w-20 h-20 rounded-full bg-accent text-white flex items-center justify-center font-black text-3xl shrink-0 shadow-2xl shadow-accent/30">{i + 1}</span>
                          <h4 className="text-4xl lg:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight">{q.question}</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pl-32">
                          {q.options.map((opt: string, j: number) => (
                            <div key={j} className="p-10 bg-white border border-slate-100 rounded-[3.5rem] hover:border-accent hover:shadow-xl transition-all cursor-pointer flex items-center gap-10 group/option">
                               <span className="w-16 h-16 rounded-full bg-slate-100 group-hover/option:bg-accent group-hover/option:text-white transition-all flex items-center justify-center text-[16px] font-black">{String.fromCharCode(65+j)}</span>
                               <span className="text-slate-600 font-bold text-2xl lg:text-3xl">{opt}</span>
                            </div>
                          ))}
                        </div>
                        <div className="pl-32 flex items-center gap-10 pt-6">
                           <button onClick={(e: any) => {
                             const btn = e.target;
                             if (btn.innerText.includes('Reveal')) btn.innerText = `Matrix Match: [${q.correctAnswer}]`;
                             else btn.innerText = 'Reveal Answer';
                           }} className="text-[13px] font-black uppercase tracking-[0.6em] text-slate-300 hover:text-accent transition-colors">Reveal Answer</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : workspace.type === 'code' ? (
                  <div className="bg-[#080808] rounded-[6rem] p-16 lg:p-32 font-mono text-2xl text-emerald-400 overflow-x-auto shadow-2xl border border-white/5 animate-billion relative group selection:bg-emerald-500/20">
                    <pre className="custom-scrollbar"><code>{workspace.content}</code></pre>
                  </div>
                ) : (
                  <div className="prose prose-slate max-w-none text-slate-700 text-4xl lg:text-5xl leading-[1.4] whitespace-pre-wrap font-medium animate-billion selection:bg-accent/10 tracking-tight pb-32">
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
