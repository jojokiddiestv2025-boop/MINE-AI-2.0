
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[]; 
  timestamp: number;
  engine?: 'MINE Primary (Puter)' | 'MINE Secondary (Gemini)';
}

declare const puter: any;

const TextChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I am MINE AI, a GPT-5 class intelligence powered by Puter's Developer Cloud. I'm optimized for unlimited speed and advanced vision. You can upload multiple images, paste directly from your clipboard, or ask me anything complex. How can I help you today?",
      timestamp: Date.now(),
    }
  ]);
  const [input, setInput] = useState('');
  const [pendingImages, setPendingImages] = useState<{url: string, blob: Blob}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeEngine, setActiveEngine] = useState<'Primary' | 'Secondary'>('Primary');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processFiles(Array.from(files));
  };

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

    try {
      // ENGINE 1: Puter.js (Primary - Developer Features)
      try {
        // Using the latest GPT-4o model available through Puter Cloud
        const response = await puter.ai.chat(
          currentInput || "Examine these images in depth and provide a technical summary.",
          userImagesBlobs,
          { model: 'gpt-4o' }
        );

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.toString(),
          timestamp: Date.now(),
          engine: 'MINE Primary (Puter)'
        };
        setMessages(prev => [...prev, assistantMessage]);
        setActiveEngine('Primary');
      } catch (puterError: any) {
        // ENGINE 2: Gemini Fallback (Secondary)
        console.warn("Primary engine limit or error, switching to MINE Secondary...", puterError);
        setActiveEngine('Secondary');
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        const parts: any[] = [{ text: currentInput || "Analyze the provided visual and textual content." }];
        
        if (userImagesUrls.length > 0) {
          for (const imgUrl of userImagesUrls) {
            const mimeType = imgUrl.split(';')[0].split(':')[1];
            const base64Data = imgUrl.split(',')[1];
            parts.push({
              inlineData: { data: base64Data, mimeType: mimeType }
            });
          }
        }

        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: { parts: parts }
        });

        const assistantMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: response.text || "Both systems are currently at capacity. Please refresh or wait a moment.",
          timestamp: Date.now(),
          engine: 'MINE Secondary (Gemini)'
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: 'critical-error',
        role: 'assistant',
        content: "I'm having trouble connecting to my neural cores. Please check your internet or try again.",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto bg-white overflow-hidden animate-billion">
      {/* Engine Control Center */}
      <div className="px-8 py-5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${activeEngine === 'Primary' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-amber-500 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.4)]'}`}></div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
            {activeEngine === 'Primary' ? 'Primary Neural Core' : 'Secondary Neural Core (Active)'}
          </span>
        </div>
        <div className="flex items-center gap-6">
           <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">V5.1 PLATINUM</span>
           <div className="h-4 w-[1px] bg-slate-200"></div>
           <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent">DEV ACCESS</span>
        </div>
      </div>

      {/* Neural Stream (Messages) */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-16 space-y-12 custom-scrollbar bg-white"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-billion`}
          >
            <div className={`relative max-w-[90%] md:max-w-[85%] rounded-[3.5rem] p-8 md:p-12 ${
              msg.role === 'user' 
                ? 'bg-slate-900 text-white shadow-[0_30px_60px_-15px_rgba(15,23,42,0.3)]' 
                : 'bg-white text-slate-800 border border-slate-100 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.03)]'
            }`}>
              {msg.images && msg.images.length > 0 && (
                <div className="flex flex-wrap gap-5 mb-10">
                  {msg.images.map((img, idx) => (
                    <div key={idx} className="relative group/img overflow-hidden rounded-[2rem] shadow-xl border-4 border-white transition-all hover:scale-105 active:scale-95 cursor-zoom-in">
                      <img 
                        src={img} 
                        alt="Visual context" 
                        className="w-44 h-44 md:w-72 md:h-72 object-cover" 
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="text-xl md:text-2xl leading-relaxed whitespace-pre-wrap font-medium selection:bg-accent/10">
                {msg.content}
              </div>
            </div>
            <div className="flex items-center gap-5 mt-6 px-10">
               <span className={`text-[10px] font-black uppercase tracking-[0.5em] ${msg.role === 'user' ? 'text-slate-400' : 'text-accent'}`}>
                {msg.role === 'assistant' ? 'MINE AI' : 'IDENTITY'}
              </span>
              {msg.engine && (
                <span className="text-[9px] font-black uppercase px-4 py-1.5 rounded-full bg-slate-50 text-slate-400 border border-slate-100">
                  {msg.engine}
                </span>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex flex-col items-start animate-pulse">
            <div className="bg-slate-50 border border-slate-100 rounded-[3rem] p-12 flex items-center gap-5">
              <div className="w-3.5 h-3.5 bg-accent rounded-full animate-bounce"></div>
              <div className="w-3.5 h-3.5 bg-accent rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-3.5 h-3.5 bg-accent rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
      </div>

      {/* Multi-Image Queue */}
      {pendingImages.length > 0 && (
        <div className="px-12 py-8 flex gap-6 overflow-x-auto bg-slate-50/70 border-t border-slate-100 backdrop-blur-3xl animate-billion">
          {pendingImages.map((img, idx) => (
            <div key={idx} className="relative group shrink-0">
              <img src={img.url} className="w-32 h-32 object-cover rounded-[3rem] shadow-2xl border-4 border-white group-hover:scale-105 transition-all" alt="Pending" />
              <button 
                onClick={() => removePendingImage(idx)}
                className="absolute -top-4 -right-4 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl shadow-2xl hover:bg-red-600 transition-all active:scale-90"
              >
                ×
              </button>
            </div>
          ))}
          <div className="flex flex-col justify-center px-6 border-l border-slate-200">
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Context Queued</span>
             <span className="text-[8px] font-black uppercase tracking-widest text-slate-300 mt-2">{pendingImages.length} Ready</span>
          </div>
        </div>
      )}

      {/* Neural Interface (Input) */}
      <div className="p-8 md:p-12 lg:p-16 bg-white border-t border-slate-50">
        <div className="relative glass-premium rounded-[4.5rem] border border-slate-200 shadow-[0_40px_80px_rgba(0,0,0,0.05)] overflow-hidden p-4 transition-all focus-within:ring-[20px] focus-within:ring-accent/5 focus-within:border-accent/20">
          <div className="flex items-end">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-6 md:p-9 text-slate-400 hover:text-accent transition-all active:scale-90 group relative"
              title="Upload Severally"
            >
              <svg className="w-14 h-14 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={2.5}/>
              </svg>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple 
              accept="image/*" 
              onChange={handleImageUpload} 
            />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              onPaste={handlePaste}
              placeholder="Message MINE AI (paste or drop images)..."
              className="flex-1 bg-transparent border-none outline-none py-10 px-6 text-2xl font-medium text-slate-800 placeholder:text-slate-200 resize-none max-h-80 custom-scrollbar"
              rows={1}
            />
            <button 
              onClick={sendMessage}
              disabled={isTyping || (!input.trim() && pendingImages.length === 0)}
              className={`p-7 md:p-10 rounded-full transition-all m-2 ${
                (input.trim() || pendingImages.length > 0) && !isTyping 
                  ? 'bg-slate-900 text-white shadow-2xl scale-100 hover:bg-black active:scale-95' 
                  : 'bg-slate-50 text-slate-200 scale-95 opacity-50 cursor-not-allowed'
              }`}
            >
              <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="mt-12 flex justify-center items-center gap-10">
           <div className="h-[1px] w-20 bg-slate-100"></div>
           <p className="text-[10px] font-black uppercase tracking-[1em] text-slate-200 text-center">
            Puter Dev Architecture
          </p>
           <div className="h-[1px] w-20 bg-slate-100"></div>
        </div>
      </div>
    </div>
  );
};

export default TextChat;
