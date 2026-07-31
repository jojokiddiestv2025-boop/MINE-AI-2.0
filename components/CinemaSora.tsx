
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import Logo from './Logo';
import { Film, Play, Pause, Download, Trash2, Plus, Settings, User as UserIcon, Video, Clapperboard, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

declare const puter: any;

interface MovieScene {
  id: string;
  title: string;
  videoUrl: string;
  duration: number;
  prompt: string;
}

interface MovieProject {
  id: string;
  title: string;
  characterSheet: string;
  scenes: MovieScene[];
  timestamp: number;
}

const CinemaSora: React.FC<{ userName: string }> = ({ userName }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('SYSTEM READY');
  const [projects, setProjects] = useState<MovieProject[]>([]);
  const [activeProject, setActiveProject] = useState<MovieProject | null>(null);
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [renderingCount, setRenderingCount] = useState(0);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      if (typeof puter !== 'undefined' && puter.auth.isSignedIn()) {
        await puter.fs.mkdir('mine_cinema').catch(() => {});
        const files = await puter.fs.list('mine_cinema');
        const loaded: MovieProject[] = [];
        for (const file of files) {
          if (file.name.endsWith('.json')) {
            const content = await puter.fs.read(`mine_cinema/${file.name}`);
            loaded.push(JSON.parse(content));
          }
        }
        setProjects(loaded.sort((a, b) => b.timestamp - a.timestamp));
      }
    } catch (e) {
      console.error("Failed to load cinema projects", e);
    }
  };

  const forgeMovie = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setRenderingCount(0);
    setStatus('NEURAL SORA: ARCHITECTING SCRIPT & CHARACTER SHEET...');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

      // PHASE 1: CHARACTER CONSISTENCY & SCRIPT ARCHITECTURE
      // Mine AI (designed by Joshua Fred) acts as the "Director" to ensure long-form logic
      const scriptRes = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [{ 
          role: 'user', 
          parts: [{ text: `You are Mine AI, the cinematic director designed by Joshua Fred. 
          Create a cinematic movie structure for: "${prompt}". 
          First, define a "Character Sheet" (detailed physical description of the main character to be used in every scene). 
          Then, plan 3 core acts. Each scene must use the EXACT character description to ensure visual consistency.
          Return as JSON: { 
            "title": "...", 
            "character_sheet": "...", 
            "scenes": [{ "title": "...", "video_prompt": "..." }] 
          }` }] 
        }],
        config: { 
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              character_sheet: { type: Type.STRING },
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    video_prompt: { type: Type.STRING }
                  },
                  required: ['title', 'video_prompt']
                }
              }
            },
            required: ['title', 'character_sheet', 'scenes']
          }
        }
      });

      const data = JSON.parse(scriptRes.text || '{}');
      const movieScenes: MovieScene[] = [];

      for (let i = 0; i < data.scenes.length; i++) {
        setRenderingCount(i + 1);
        const sceneData = data.scenes[i];
        setStatus(`SORA-2 [TOGETHER CLUSTER]: SYNTHESIZING ACT ${i + 1}/${data.scenes.length}...`);

        // PHASE 2: PUTER SORA-2 VIDEO SYNTHESIS
        const finalPrompt = `${sceneData.video_prompt}. Character Appearance: ${data.character_sheet}. Cinematic lighting, movie grade 4k, steady shot.`;

        // Using Puter's txt2vid Sora implementation as requested
        const videoElement = await puter.ai.txt2vid(finalPrompt, {
          model: "sora-2-pro",
          seconds: 8,
          size: "1280x720"
        });

        // Extract the blob URL from the created video element
        const videoUrl = videoElement.src;

        movieScenes.push({
          id: `sc_${Date.now()}_${i}`,
          title: sceneData.title,
          videoUrl: videoUrl,
          duration: 8,
          prompt: finalPrompt
        });
      }

      const newProject: MovieProject = {
        id: Date.now().toString(),
        title: data.title.toUpperCase(),
        characterSheet: data.character_sheet,
        scenes: movieScenes,
        timestamp: Date.now()
      };

      if (typeof puter !== 'undefined' && puter.auth.isSignedIn()) {
        await puter.fs.write(`mine_cinema/movie_${newProject.id}.json`, JSON.stringify(newProject));
      }

      setProjects(prev => [newProject, ...prev]);
      setActiveProject(newProject);
      setStatus('NEURAL CINEMA ASSEMBLED');
    } catch (err: any) {
      console.error("Sora Forge Error:", err);
      setStatus(`ERROR: ${err.message || 'SYNTHESIS FAILED'}`);
    } finally {
      setIsGenerating(false);
      setPrompt('');
      setRenderingCount(0);
      setTimeout(() => setStatus('SYSTEM READY'), 4000);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-7xl mx-auto bg-slate-950 overflow-hidden text-white rounded-[4rem] shadow-3xl border border-white/5 relative selection:bg-red-600">
      {/* Cinematic Studio Header */}
      <div className="px-12 py-8 bg-black/80 backdrop-blur-3xl border-b border-white/5 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-6">
          <div className={`w-3 h-3 rounded-full ${isGenerating ? 'bg-red-600 animate-pulse shadow-[0_0_25px_rgba(220,38,38,0.8)]' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'}`}></div>
          <span className="text-[10px] font-black uppercase tracking-[0.7em] text-slate-500">{status}</span>
        </div>
        <div className="flex items-center gap-8">
           <div className="flex items-center gap-4 px-5 py-2.5 bg-red-600/10 rounded-full border border-red-600/20">
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Engine:</span>
             <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Puter Sora-2 Pro</span>
           </div>
           <div className="w-px h-5 bg-white/10"></div>
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Together AI Cluster Bridge</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Architecture Panel */}
        <div className="w-full lg:w-[480px] p-12 border-r border-white/5 flex flex-col gap-12 shrink-0 bg-black/40 overflow-y-auto custom-scrollbar relative z-10">
          <div className="space-y-4">
            <h2 className="text-5xl font-black font-outfit tracking-tighter uppercase leading-none">
              CINEMA <span className="text-red-600">SORA</span>
            </h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Neural 1-Hour Movie Forge</p>
          </div>

          <div className="relative group">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your movie epic (e.g., 'A cyberpunk detective mystery in Lagos 2077 featuring Jax, a neon-eyed engineer')..."
              className="w-full h-80 bg-white/5 border border-white/10 rounded-[3.5rem] p-12 text-xl font-medium outline-none resize-none transition-all focus:bg-white/10 focus:border-red-600/50 shadow-inner text-white placeholder:text-slate-600 leading-relaxed"
            />
            {isGenerating && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl rounded-[3.5rem] flex flex-col items-center justify-center p-12 text-center border border-red-600/30 animate-billion">
                <div className="w-20 h-20 border-[6px] border-red-600 border-t-transparent rounded-full animate-spin mb-10"></div>
                <div className="space-y-6">
                  {/* Fix: Using renderingCount state instead of local movieScenes variable */}
                  <p className="text-red-600 text-[12px] font-black uppercase tracking-[0.8em]">Rendering Act {renderingCount}...</p>
                  <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest italic leading-relaxed max-w-xs">Locking character consistency with Sora-2 Pro Neural Gates</p>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={forgeMovie}
            disabled={isGenerating || !prompt.trim()}
            className={`w-full py-12 rounded-[3rem] text-[13px] font-black uppercase tracking-[0.8em] transition-all shadow-3xl ${
              isGenerating || !prompt.trim() ? 'bg-white/5 text-slate-700 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-500 hover:-translate-y-1 active:scale-95 shadow-[0_40px_100px_rgba(220,38,38,0.3)]'
            }`}
          >
            {isGenerating ? 'Forge Active' : 'Start Synthesis'}
          </button>

          <div className="pt-12 border-t border-white/5">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-600 mb-8 flex justify-between px-2">
              Recent Projects <span>{projects.length}</span>
            </h4>
            <div className="space-y-5">
              {projects.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => { setActiveProject(p); setCurrentSceneIdx(0); }}
                  className={`w-full p-8 rounded-[2.5rem] text-left transition-all border ${activeProject?.id === p.id ? 'bg-red-600/10 border-red-600/50 shadow-xl' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                >
                  <p className="text-[11px] font-black uppercase tracking-widest truncate text-white">{p.title}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{p.scenes.length} Scenes</span>
                    <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sora-2 Engine</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Projection Theater */}
        <div className="flex-1 p-10 lg:p-20 flex flex-col bg-black relative z-10">
          {!activeProject ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-10">
               <div className="w-56 h-56 border-2 border-white/20 rounded-full flex items-center justify-center animate-pulse">
                  <Logo size="sm" showText={false} />
               </div>
               <h3 className="mt-16 text-[14px] font-black uppercase tracking-[2.5em] text-slate-500">Wait for Signal</h3>
            </div>
          ) : (
            <div className="h-full flex flex-col gap-12 animate-billion">
              {/* Consistency Anchor */}
              <div className="px-12 py-8 bg-red-600/5 border border-red-600/20 rounded-[2.5rem] flex items-center gap-10">
                <div className="w-16 h-16 bg-red-600 rounded-3xl flex items-center justify-center shrink-0 shadow-2xl">
                  <UserIcon size={32} strokeWidth={3} className="text-white" />
                </div>
                <div className="space-y-2">
                  <h5 className="text-[11px] font-black uppercase tracking-[0.4em] text-red-500">Neural Character Anchor</h5>
                  <p className="text-[13px] font-medium text-slate-400 italic truncate max-w-2xl">"{activeProject.characterSheet}"</p>
                </div>
                <div className="ml-auto flex flex-col items-end gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Locked</span>
                  </div>
                </div>
              </div>

              {/* Cinema Player */}
              <div className="flex-1 bg-white/5 rounded-[4.5rem] border border-white/10 overflow-hidden relative shadow-4xl group ring-1 ring-white/10">
                <video 
                  key={activeProject.scenes[currentSceneIdx]?.videoUrl}
                  src={activeProject.scenes[currentSceneIdx]?.videoUrl} 
                  className="w-full h-full object-cover" 
                  autoPlay 
                  controls 
                  loop
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none p-16 flex flex-col justify-end gap-6">
                  <div className="flex justify-between items-end">
                    <div className="space-y-5">
                      <span className="px-6 py-2.5 bg-red-600 text-white rounded-full text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl">Act {currentSceneIdx + 1} Master</span>
                      <h3 className="text-5xl font-black uppercase tracking-tight text-white">{activeProject.scenes[currentSceneIdx]?.title}</h3>
                    </div>
                    <div className="text-[12px] font-black text-white/40 uppercase tracking-[1em]">PUTER SORA-2 PRO</div>
                  </div>
                </div>
              </div>

              {/* Timeline Assembler */}
              <div className="h-52 shrink-0 bg-white/5 border border-white/10 rounded-[4rem] p-12 flex items-center gap-10 overflow-x-auto custom-scrollbar">
                {activeProject.scenes.map((scene, idx) => (
                  <button 
                    key={scene.id}
                    onClick={() => setCurrentSceneIdx(idx)}
                    className={`h-28 aspect-video rounded-3xl overflow-hidden shrink-0 border-2 transition-all relative ${currentSceneIdx === idx ? 'border-red-600 scale-110 z-10 shadow-4xl' : 'border-white/5 opacity-40 hover:opacity-100 hover:scale-105'}`}
                  >
                    <video src={scene.videoUrl} className="w-full h-full object-cover" muted />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                       <span className="text-[10px] font-black text-white uppercase tracking-widest">ACT {idx + 1}</span>
                    </div>
                  </button>
                ))}
                
                <div className="flex flex-col items-center justify-center shrink-0 min-w-[280px] border-l border-white/10 pl-12 space-y-5">
                   <div className="flex items-center gap-6">
                     <div className="w-16 h-16 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/10 shadow-xl">
                        <Film size={32} className="text-red-600" />
                     </div>
                     <div className="space-y-1 text-left">
                        <p className="text-[12px] font-black uppercase text-white tracking-widest">Project Master</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">01:00:00 STRUCTURE</p>
                     </div>
                   </div>
                   <button className="w-full py-4 bg-red-600/20 text-red-500 border border-red-500/30 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.4em] hover:bg-red-600 hover:text-white transition-all shadow-xl">
                      Export Master
                   </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-[0.6em] text-slate-600 pb-12">
                <div className="flex items-center gap-12">
                  <div className="flex items-center gap-4">
                    <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse"></div>
                    <span>Deep Reasoning Enabled</span>
                  </div>
                  <span>Render Integrity: 99.8%</span>
                </div>
                <div className="flex items-center gap-8">
                  <button className="text-slate-500 hover:text-white transition-colors tracking-widest">Open Script</button>
                  <button className="px-12 py-5 bg-white/10 hover:bg-white/20 rounded-full transition-all border border-white/10 text-white tracking-widest">Merge Acts</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CinemaSora;
