
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[]; 
  isGeneratedImage?: boolean;
  timestamp: number;
  engine?: 'MINE-1 (Puter)' | 'MINE-2 (Gemini)';
}

interface TextChatProps {
  userName?: string;
}

declare const puter: any;

const TextChat: React.FC<TextChatProps> = ({ userName = 'User' }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Welcome, ${userName}! I am MINE AI, a high-fidelity intelligence system built for unlimited reasoning. I am currently operating on my Primary Neural Core (Puter GPT-4o & DALL-E 3). Should I encounter any capacity limits, I will automatically shift my neural weights to my Secondary Core (Gemini) to ensure you have an uninterrupted experience. How can I assist you today?`,
      timestamp: Date.now(),
      engine: 'MINE-1 (Puter)'
    }
  ]);
  const [input, setInput] = useState('');
  const [pendingImages, setPendingImages] = useState<{url: string, blob: Blob}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeEngine, setActiveEngine] = useState<'Primary' | 'Secondary'>('Primary');
  const [engineStatus, setEngineStatus] = useState<string>('CORE STABLE');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messages.length === 1 && messages[0].id === 'welcome') {
       setMessages([{
         ...messages[0],
         content: `Welcome, ${userName}! I am MINE AI, a high-fidelity intelligence system built for unlimited reasoning. I am currently operating on my Primary Neural Core (Puter GPT-4o & DALL-E 3). Should I encounter any capacity limits, I will automatically shift my neural weights to my Secondary Core (Gemini) to ensure you have an uninterrupted experience. How can I assist you today?`
       }]);
    }
  }, [userName]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const processFiles = (files: File[]) => {
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          setPendingImages(prev => [...prev, { url: result, blob: file }]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processFiles(Array.from(files));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) files.push(blob);
      }
    }
    if (files.length > 0) processFiles(files);
  };

  const removePendingImage = (index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
  };

  const downloadImage = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `mine-ai-gen-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Download failed", e);
    }
  };

  const isImageRequest = (text: string) => {
    const triggers = ['draw', 'generate image', 'create image', 'image of', 'generate an image', 'paint', 'synthesize image'];
    return triggers.some(t => text.toLowerCase().includes(t));
  };

  const sendMessage = async () => {
    if (!input.trim() && pendingImages.length === 0) return;
    if (isTyping) return;

    const userImagesUrls = pendingImages.map(img => img.url);
    const userImagesBlobs = pendingImages.map(img => img.blob);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      images: userImagesUrls.length > 0 ? userImagesUrls : undefined,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setPendingImages([]);
    setIsTyping(true);
    setEngineStatus('PRIMARY SYNCING...');

    try {
      // Check for image generation request
      if (isImageRequest(currentInput) && pendingImages.length === 0) {
        try {
          setEngineStatus('SYNTHESIZING PIXELS...');
          const image = await puter.ai.txt2img({ prompt: currentInput, model: 'dall-e-3' });
          
          if (image && image.src) {
            setMessages(prev => [...prev, {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `Synthesized Primary Output for: "${currentInput}"`,
              images: [image.src],
              isGeneratedImage: true,
              timestamp: Date.now(),
              engine: 'MINE-1 (Puter)'
            }]);
            setActiveEngine('Primary');
            setEngineStatus('CORE STABLE');
            setIsTyping(false);
            return;
          }
        } catch (err) {
          console.warn("Puter image gen failed, falling back to Gemini image gen...");
        }
      }

      // ATTEMPT 1: Primary Engine (Puter GPT-4o for text/vision)
      try {
        const response = await puter.ai.chat(
          currentInput || "Examine the visual context and provide a comprehensive analysis.",
          userImagesBlobs,
          { model: 'gpt-4o' }
        );

        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.toString(),
          timestamp: Date.now(),
          engine: 'MINE-1 (Puter)'
        }]);
        setActiveEngine('Primary');
        setEngineStatus('CORE STABLE');
      } catch (puterError: any) {
        // HANDOVER: Switch to Gemini 3 Pro (Text/Vision) or Gemini 2.5 Flash Image (Image)
        setEngineStatus('NEURAL HANDOVER...');
        setActiveEngine('Secondary');
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

        if (isImageRequest(currentInput)) {
           // Fallback image generation
           const response = await ai.models.generateContent({
             model: 'gemini-2.5-flash-image',
             contents: { parts: [{ text: currentInput }] }
           });
           
           let genBase64 = '';
           for (const part of response.candidates[0].content.parts) {
             if (part.inlineData) { genBase64 = part.inlineData.data; break; }
           }

           if (genBase64) {
              setMessages(prev => [...prev, {
                id: (Date.now() + 2).toString(),
                role: 'assistant',
                content: `Synthesized Secondary Output for: "${currentInput}"`,
                images: [`data:image/png;base64,${genBase64}`],
                isGeneratedImage: true,
                timestamp: Date.now(),
                engine: 'MINE-2 (Gemini)'
              }]);
           }
        } else {
          // Standard text/vision fallback
          const parts: any[] = [{ text: currentInput || "Analyze context." }];
          userImagesUrls.forEach(url => {
            parts.push({ inlineData: { data: url.split(',')[1], mimeType: url.split(';')[0].split(':')[1] } });
          });

          const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: parts }
          });

          setMessages(prev => [...prev, {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: response.text || "Handover failure.",
            timestamp: Date.now(),
            engine: 'MINE-2 (Gemini)'
          }]);
        }
        setEngineStatus('SECONDARY CORE ENGAGED');
      }
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: 'critical-error',
        role: 'assistant',
        content: "Neural link severed. Re-calibrating core...",
        timestamp: Date.now(),
      }]);
      setEngineStatus('OFFLINE');
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto bg-white overflow-hidden animate-billion">
      {/* Control Panel */}
      <div className="px-10 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${activeEngine === 'Primary' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-amber-500 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.3)]'}`}></div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
            {engineStatus}
          </span>
        </div>
        <div className="flex items-center gap-8">
           <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">DALL-E 3 & GPT-4o ACTIVE</span>
           <div className="h-4 w-[1px] bg-slate-200"></div>
           <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent">MINE V6.0 PLATINUM</span>
        </div>
      </div>

      {/* Main Feed */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-16 space-y-16 custom-scrollbar bg-white"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-billion`}
          >
            <div className={`relative max-w-[90%] md:max-w-[85%] rounded-[4rem] p-10 md:p-14 ${
              msg.role === 'user' 
                ? 'bg-slate-900 text-white shadow-[0_40px_80px_-20px_rgba(15,23,42,0.3)]' 
                : 'bg-white text-slate-800 border border-slate-100 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.03)]'
            }`}>
              {msg.images && msg.images.length > 0 && (
                <div className="flex flex-col gap-8 mb-10">
                  {msg.images.map((img, idx) => (
                    <div key={idx} className="relative group/img overflow-hidden rounded-[3rem] shadow-2xl border-4 border-white transition-all hover:scale-[1.02]">
                      <img src={img} alt="Synthesis" className="w-full h-auto object-cover" />
                      
                      {/* Download Overlay for Generated Images */}
                      {msg.isGeneratedImage && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                           <button 
                             onClick={() => downloadImage(img)}
                             className="px-12 py-5 bg-white text-slate-900 rounded-full text-[12px] font-black uppercase tracking-widest shadow-2xl transform translate-y-4 group-hover/img:translate-y-0 transition-all duration-300 hover:bg-slate-900 hover:text-white"
                           >
                             Download PNG
                           </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {msg.isGeneratedImage && (
                    <div className="flex items-center gap-4 px-6">
                       <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
                       <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">High-Fidelity Neural Output</span>
                    </div>
                  )}
                </div>
              )}
              <div className="text-xl md:text-3xl leading-relaxed whitespace-pre-wrap font-medium selection:bg-accent/10">
                {msg.content}
              </div>
            </div>
            <div className="flex items-center gap-6 mt-6 px-12">
               <span className={`text-[10px] font-black uppercase tracking-[0.6em] ${msg.role === 'user' ? 'text-slate-400' : 'text-accent'}`}>
                {msg.role === 'assistant' ? 'MINE AI' : 'IDENTITY'}
              </span>
              {msg.engine && (
                <span className="text-[9px] font-black uppercase px-5 py-2 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                  {msg.engine}
                </span>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex flex-col items-start animate-pulse">
            <div className="bg-slate-50 border border-slate-100 rounded-[4rem] p-14 flex items-center gap-6">
              <div className="w-4 h-4 bg-accent rounded-full animate-bounce"></div>
              <div className="w-4 h-4 bg-accent rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-4 h-4 bg-accent rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
      </div>

      {/* Context Queue */}
      {pendingImages.length > 0 && (
        <div className="px-12 py-10 flex gap-8 overflow-x-auto bg-slate-50/80 border-t border-slate-100 backdrop-blur-3xl animate-billion">
          {pendingImages.map((img, idx) => (
            <div key={idx} className="relative group shrink-0">
              <img src={img.url} className="w-36 h-36 object-cover rounded-[3.5rem] shadow-2xl border-4 border-white group-hover:scale-110 transition-all duration-500" alt="Queued" />
              <button onClick={() => removePendingImage(idx)} className="absolute -top-5 -right-5 bg-red-500 text-white rounded-full w-12 h-12 flex items-center justify-center text-3xl shadow-2xl hover:bg-red-600 transition-all active:scale-90">×</button>
            </div>
          ))}
          <div className="flex flex-col justify-center px-10 border-l border-slate-200">
             <span className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400">Context Queued</span>
          </div>
        </div>
      )}

      {/* Input Module */}
      <div className="p-10 md:p-14 lg:p-20 bg-white border-t border-slate-50">
        <div className="relative glass-premium rounded-[5rem] border border-slate-200 shadow-[0_60px_100px_rgba(0,0,0,0.06)] overflow-hidden p-5 transition-all focus-within:ring-[25px] focus-within:ring-accent/5 focus-within:border-accent/20">
          <div className="flex items-end">
            <button onClick={() => fileInputRef.current?.click()} className="p-8 md:p-10 text-slate-400 hover:text-accent transition-all active:scale-90 group relative">
              <svg className="w-16 h-16 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={2.5}/>
              </svg>
            </button>
            <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleImageUpload} />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              onPaste={handlePaste}
              placeholder="Ask MINE to draw or chat..."
              className="flex-1 bg-transparent border-none outline-none py-12 px-8 text-3xl font-medium text-slate-800 placeholder:text-slate-200 resize-none max-h-96 custom-scrollbar"
              rows={1}
            />
            <button onClick={sendMessage} disabled={isTyping || (!input.trim() && pendingImages.length === 0)} className={`p-10 md:p-12 rounded-full transition-all m-2 ${
                (input.trim() || pendingImages.length > 0) && !isTyping ? 'bg-slate-900 text-white shadow-2xl hover:scale-105 active:scale-95' : 'bg-slate-50 text-slate-200 opacity-50 cursor-not-allowed'
              }`}>
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="mt-14 flex justify-center items-center gap-12">
           <div className="h-[1px] w-24 bg-slate-100"></div>
           <p className="text-[11px] font-black uppercase tracking-[1.2em] text-slate-200 text-center">
            Nigerian Engineered Synthesis Core
          </p>
           <div className="h-[1px] w-24 bg-slate-100"></div>
        </div>
      </div>
    </div>
  );
};

export default TextChat;
