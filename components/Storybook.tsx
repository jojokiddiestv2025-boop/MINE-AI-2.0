
import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Sparkles, Wand2, Loader2, ChevronLeft, ChevronRight, Trash2, Home, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StoryPage {
  text: string;
  imageUrl: string;
}

interface Story {
  title: string;
  pages: StoryPage[];
}

const Storybook: React.FC<{ userName: string }> = ({ userName }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [generationStep, setGenerationStep] = useState('');
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  const refreshImage = (index: number) => {
    if (!currentStory) return;
    
    const pageText = currentStory.pages[index].text;
    const imagePrompt = `Storybook illustration, whimsical style, vibrant colors, highly detailed: ${pageText}`;
    const newImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
    
    const newPages = [...currentStory.pages];
    newPages[index] = { ...newPages[index], imageUrl: newImageUrl };
    
    setCurrentStory({ ...currentStory, pages: newPages });
    setImageErrors(prev => ({ ...prev, [index]: false }));
  };

  const generateStory = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setCurrentStory(null);
    setCurrentPageIndex(0);
    setGenerationStep('Weaving the tale...');

    try {
      // Step 1: Generate the story text using Groq
      const storyPrompt = `Write a short, immersive storybook for children based on this prompt: "${prompt}". 
      The story should have exactly 4 distinct parts or pages. 
      Format the response as a JSON object with a "title" and an array "pages" where each element is a string of text for that page.
      Keep each page text under 60 words.
      JSON format: { "title": "...", "pages": ["page 1 text", "page 2 text", "page 3 text", "page 4 text"] }`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: storyPrompt }],
          model: "llama-3.3-70b-versatile"
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate story text');

      const content = data.choices[0].message.content;
      // Extract JSON from the response (sometimes models add markdown backticks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Failed to parse story structure');
      
      const storyData = JSON.parse(jsonMatch[0]);
      
      setGenerationStep('Painting the scenes...');
      
      // Step 2: Generate images for each page using Pollinations AI
      const pagesWithImages: StoryPage[] = [];
      for (let i = 0; i < storyData.pages.length; i++) {
        const pageText = storyData.pages[i];
        // Create a visual prompt based on the page text
        const imagePrompt = `Storybook illustration, whimsical style, vibrant colors, highly detailed: ${pageText}`;
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
        
        pagesWithImages.push({
          text: pageText,
          imageUrl: imageUrl
        });
      }

      setCurrentStory({
        title: storyData.title,
        pages: pagesWithImages
      });

    } catch (error: any) {
      console.error('Story generation error:', error);
      alert(`Failed to generate story: ${error.message}`);
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0502] text-[#e0d8d0] font-serif selection:bg-[#ff4e00]/30 overflow-hidden relative">
      {/* Immersive Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0f0a] to-[#0a0502]" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#ff4e00]/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#3a1510]/20 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ff4e00] to-[#3a1510] flex items-center justify-center shadow-[0_0_20px_rgba(255,78,0,0.3)]">
              <BookOpen size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-light tracking-widest uppercase">Mine AI Storybook</h1>
              <p className="text-[10px] tracking-[0.3em] uppercase opacity-40">Gemini Edition • Powered by Groq & Pollinations</p>
            </div>
          </div>
          {currentStory && (
            <button 
              onClick={() => setCurrentStory(null)}
              className="px-6 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-all text-xs uppercase tracking-widest"
            >
              New Story
            </button>
          )}
        </header>

        <main className="flex-1 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {!currentStory ? (
              <motion.div 
                key="input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-2xl text-center space-y-12"
              >
                <div className="space-y-4">
                  <h2 className="text-5xl md:text-7xl font-light tracking-tight leading-tight">
                    What tale shall we <span className="italic text-[#ff4e00]">weave</span> today?
                  </h2>
                  <p className="text-lg opacity-50 font-sans tracking-wide">Enter a spark of an idea, and we'll breathe life into a full storybook.</p>
                </div>

                <div className="relative group">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A brave cat exploring a floating island..."
                    className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 text-2xl focus:outline-none focus:ring-2 focus:ring-[#ff4e00]/50 transition-all resize-none min-h-[160px] placeholder:opacity-20"
                  />
                  <button
                    onClick={generateStory}
                    disabled={!prompt.trim() || isGenerating}
                    className={`absolute bottom-6 right-6 p-6 rounded-2xl transition-all ${
                      prompt.trim() && !isGenerating 
                        ? 'bg-[#ff4e00] text-white shadow-[0_0_30px_rgba(255,78,0,0.4)] hover:scale-105 active:scale-95' 
                        : 'bg-white/5 text-white/20 cursor-not-allowed'
                    }`}
                  >
                    {isGenerating ? <Loader2 size={32} className="animate-spin" /> : <Wand2 size={32} />}
                  </button>
                </div>

                {isGenerating && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-[#ff4e00]"
                        animate={{ x: [-200, 200] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      />
                    </div>
                    <p className="text-xs uppercase tracking-[0.4em] text-[#ff4e00] font-sans font-bold">{generationStep}</p>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="story"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
              >
                {/* Image Side */}
                <div className="relative aspect-square rounded-[40px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/10 group bg-white/5">
                  <AnimatePresence mode="wait">
                    {!imageErrors[currentPageIndex] ? (
                      <motion.img
                        key={currentStory.pages[currentPageIndex].imageUrl}
                        src={currentStory.pages[currentPageIndex].imageUrl}
                        alt="Story scene"
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 1 }}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={() => setImageErrors(prev => ({ ...prev, [currentPageIndex]: true }))}
                      />
                    ) : (
                      <motion.div 
                        key="error"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full h-full flex flex-col items-center justify-center p-12 text-center space-y-6"
                      >
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white/20">
                          <Sparkles size={40} />
                        </div>
                        <div className="space-y-2">
                          <p className="text-xl font-light italic">The canvas is still wet...</p>
                          <p className="text-xs opacity-40 font-sans uppercase tracking-widest">Image failed to render</p>
                        </div>
                        <button
                          onClick={() => refreshImage(currentPageIndex)}
                          className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 transition-all text-xs uppercase tracking-widest"
                        >
                          <RefreshCw size={14} />
                          <span>Repaint Scene</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Loading overlay for image */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-data-[loading=true]:opacity-100 transition-opacity">
                    <Loader2 className="animate-spin text-[#ff4e00]" size={40} />
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute bottom-8 left-8 right-8 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                    <span className="text-[10px] uppercase tracking-widest font-sans font-bold">Scene {currentPageIndex + 1} of {currentStory.pages.length}</span>
                    {!imageErrors[currentPageIndex] && (
                      <button 
                        onClick={() => refreshImage(currentPageIndex)}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
                        title="Refresh Image"
                      >
                        <RefreshCw size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Text Side */}
                <div className="space-y-12 lg:pl-12">
                  <div className="space-y-6">
                    <motion.h3 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xs uppercase tracking-[0.5em] text-[#ff4e00] font-sans font-black"
                    >
                      {currentStory.title}
                    </motion.h3>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentPageIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.8 }}
                        className="text-3xl md:text-4xl leading-relaxed font-light italic text-white/90"
                      >
                        {currentStory.pages[currentPageIndex].text}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center gap-8 pt-8 border-t border-white/5">
                    <button
                      onClick={() => setCurrentPageIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentPageIndex === 0}
                      className={`w-16 h-16 rounded-full border border-white/10 flex items-center justify-center transition-all ${
                        currentPageIndex === 0 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white/5 hover:border-[#ff4e00]/50'
                      }`}
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <div className="flex gap-2">
                      {currentStory.pages.map((_, idx) => (
                        <div 
                          key={idx}
                          className={`h-1 transition-all duration-500 rounded-full ${
                            idx === currentPageIndex ? 'w-8 bg-[#ff4e00]' : 'w-2 bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentPageIndex(prev => Math.min(currentStory.pages.length - 1, prev + 1))}
                      disabled={currentPageIndex === currentStory.pages.length - 1}
                      className={`w-16 h-16 rounded-full border border-white/10 flex items-center justify-center transition-all ${
                        currentPageIndex === currentStory.pages.length - 1 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white/5 hover:border-[#ff4e00]/50'
                      }`}
                    >
                      <ChevronRight size={24} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/5 flex justify-between items-center opacity-30 text-[9px] uppercase tracking-[0.3em] font-sans">
          <span>© 2026 Mine AI Creative Engine</span>
          <span>Immersive Storytelling Module v2.0</span>
        </footer>
      </div>
    </div>
  );
};

export default Storybook;
