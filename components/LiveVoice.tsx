import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { VisualContext, WorkspaceState, CBTData } from '../types';

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
    description: 'Update the workspace with markdown content.',
    properties: {
      content: { type: Type.STRING, description: 'Markdown content.' },
      language: { type: Type.STRING, description: 'Content format.' },
      title: { type: Type.STRING, description: 'Header title.' },
    },
    required: ['content', 'language', 'title'],
  },
};

const createCBTTool: FunctionDeclaration = {
  name: 'createCBT',
  parameters: {
    type: Type.OBJECT,
    description: 'Generate a full interactive Computer Based Test (CBT).',
    properties: {
      title: { type: Type.STRING },
      subject: { type: Type.STRING },
      timeLimit: { type: Type.NUMBER, description: 'Minutes allowed for the test.' },
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctIndex: { type: Type.NUMBER }
          },
          required: ['id', 'question', 'options', 'correctIndex']
        }
      }
    },
    required: ['title', 'subject', 'timeLimit', 'questions'],
  },
};

const LiveVoice: React.FC<LiveVoiceProps> = ({ onHome, isAcademic = false, isTeacher = false }) => {
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
    title: 'Ready', 
    isActive: false 
  });

  const [cbtProgress, setCbtProgress] = useState<{currentIdx: number, answers: number[], finished: boolean}>({
    currentIdx: 0,
    answers: [],
    finished: false
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

  const handleExportBundle = () => {
    if (!workspace.cbtData) return;
    const data = workspace.cbtData;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${data.title} - Standalone CBT</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>body{font-family:sans-serif;background:#f8fafc;}</style>
      </head>
      <body class="p-8">
        <div class="max-w-4xl mx-auto bg-white p-12 rounded-3xl shadow-2xl">
          <h1 class="text-4xl font-black mb-4">${data.title}</h1>
          <p class="text-slate-500 mb-8">Subject: ${data.subject} | Time: ${data.timeLimit}m</p>
          <div id="quiz-root"></div>
        </div>
        <script>
          const data = ${JSON.stringify(data)};
          let current = 0;
          let score = 0;
          function render() {
            const root = document.getElementById('quiz-root');
            if(current >= data.questions.length) {
              root.innerHTML = \`<div class='text-center py-20'><h2 class='text-6xl font-black mb-4'>Finished!</h2><p class='text-2xl'>Score: \${score}/\${data.questions.length}</p></div>\`;
              return;
            }
            const q = data.questions[current];
            root.innerHTML = \`
              <h2 class='text-2xl font-bold mb-8'>Question \${current+1} of \${data.questions.length}</h2>
              <p class='text-xl mb-12'>\${q.question}</p>
              <div class='space-y-4'>
                \${q.options.map((o, i) => \`<button onclick='submit(\${i})' class='w-full p-6 text-left border rounded-2xl hover:bg-slate-50'>\${o}</button>\`).join('')}
              </div>
            \`;
          }
          window.submit = (i) => {
            if(i === data.questions[current].correctIndex) score++;
            current++;
            render();
          };
          render();
        </script>
      </body>
      </html>
    `;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.title.replace(/\s+/g, '_')}_bundle.html`;
    a.click();
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

      let instruction = '';
      if (isTeacher) {
        instruction = `You are the MINE Teacher Assistant. Help teachers plan lessons and especially create CBT (Computer Based Tests). Use 'createCBT' tool to generate interactive exams. Encourage the teacher to download the CBT as an EXE/APK ready bundle.`;
      } else if (isAcademic) {
        instruction = `You are MINE AI Chancellor. Provide academic tutoring. You can use 'createCBT' to test the student on their knowledge.`;
      } else {
        instruction = `You are MINE AI. A hyper-advanced personal superintelligence.`;
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
                if (fc.name === 'createCBT') {
                  const args = fc.args as CBTData;
                  setWorkspace({ type: 'cbt', content: '', cbtData: args, language: 'json', title: args.title, isActive: true });
                  setCbtProgress({ currentIdx: 0, answers: [], finished: false });
                  sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "CBT Generated" } } }));
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
          tools: [{ functionDeclarations: [updateWorkspaceTool, createCBTTool] }],
          systemInstruction: instruction
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err: any) {
      setError({ title: "Hardware Blocked", message: "Neural peripheral access denied." });
      setIsConnecting(false);
    }
  };

  const submitCbtAnswer = (answerIdx: number) => {
    if (!workspace.cbtData) return;
    const newAnswers = [...cbtProgress.answers];
    newAnswers[cbtProgress.currentIdx] = answerIdx;
    
    if (cbtProgress.currentIdx + 1 < workspace.cbtData.questions.length) {
      setCbtProgress({ ...cbtProgress, currentIdx: cbtProgress.currentIdx + 1, answers: newAnswers });
    } else {
      setCbtProgress({ ...cbtProgress, answers: newAnswers, finished: true });
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
                  <h4 className="text-2xl font-black uppercase tracking-[1em] text-slate-900">{isTeacher ? 'TEACHER NUCLEUS' : isAcademic ? 'CHANCELLOR' : 'PERSONAL'}</h4>
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

        {/* Module: Workspace (Updated with CBT Support) */}
        {workspace.isActive && (
          <div className="w-full lg:w-[750px] glass-premium rounded-[4rem] animate-billion flex flex-col shadow-2xl border-white/90 bg-white/60 overflow-hidden">
            <header className="p-10 border-b border-black/[0.03] flex items-center justify-between bg-white/40">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{workspace.title}</h3>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-prismatic mt-2">{workspace.type === 'cbt' ? 'Interactive CBT' : 'Document'}</p>
              </div>
              <div className="flex gap-4">
                {workspace.type === 'cbt' && (
                  <button onClick={handleExportBundle} className="px-6 py-3 bg-prismatic text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg">
                    Export .EXE/.APK Bundle
                  </button>
                )}
                <button onClick={() => setWorkspace({...workspace, isActive: false})} className="p-3 bg-white rounded-full border border-black/[0.03] text-slate-300 hover:text-red-500 transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2}/></svg>
                </button>
              </div>
            </header>
            
            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
              {workspace.type === 'markdown' ? (
                <div className="whitespace-pre-wrap text-xl text-slate-700">{workspace.content}</div>
              ) : workspace.cbtData ? (
                <div className="space-y-12">
                  {cbtProgress.finished ? (
                    <div className="text-center py-20 space-y-10">
                      <h4 className="text-6xl font-black text-slate-900">Result Matrix</h4>
                      <div className="text-8xl font-black text-prismatic">
                        {cbtProgress.answers.filter((a, i) => a === workspace.cbtData!.questions[i].correctIndex).length} / {workspace.cbtData.questions.length}
                      </div>
                      <button onClick={() => setCbtProgress({currentIdx: 0, answers: [], finished: false})} className="px-12 py-5 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest">Restart Test</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>Question {cbtProgress.currentIdx + 1} of {workspace.cbtData.questions.length}</span>
                        <span>{workspace.cbtData.timeLimit} Minutes Remaining</span>
                      </div>
                      <div className="p-10 bg-white/40 rounded-[3rem] border border-black/[0.03] shadow-inner">
                        <p className="text-3xl font-bold text-slate-900 leading-tight">{workspace.cbtData.questions[cbtProgress.currentIdx].question}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-6">
                        {workspace.cbtData.questions[cbtProgress.currentIdx].options.map((opt, idx) => (
                          <button 
                            key={idx} 
                            onClick={() => submitCbtAnswer(idx)}
                            className="w-full p-8 text-left bg-white border border-black/[0.05] rounded-[2rem] text-xl font-medium hover:border-prismatic hover:bg-slate-50 transition-all group flex items-center gap-6"
                          >
                            <span className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[12px] font-black group-hover:bg-prismatic group-hover:text-white">{String.fromCharCode(65 + idx)}</span>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveVoice;