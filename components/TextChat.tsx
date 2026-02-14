
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[]; 
  timestamp: number;
  engine?: 'MINE Primary' | 'MINE Secondary';
}

declare const puter: any;

const TextChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I am MINE AI, a GPT-5 class intelligence. I'm optimized for high-speed vision and complex reasoning. You can upload multiple images, paste from your clipboard, or ask me anything. How can I help you today?",
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
      // ENGINE 1: Puter.js Developer Feature (Primary)
      try {
        const response = await puter.ai.chat(
          currentInput || "Analyze the provided image(s) in detail.",
          userImagesBlobs,
          { model: 'gpt-4o' } // High-performance dev model
        );

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.toString(),
          timestamp: Date.now(),
          engine: 'MINE Primary'
        };
        setMessages(prev => [...prev, assistantMessage]);
        setActiveEngine('Primary');
      } catch (puterError: any) {
        // ENGINE 2: Gemini Fallback (Secondary)
        console.warn("Primary engine limit or error, switching to Secondary...", puterError);
        setActiveEngine('Secondary');
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        const parts: any[] = [{ text: currentInput || "Analyze the attached content." }];
        
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
          content: response.text || "I apologize, the neural link is busy. Please try again.",
          timestamp: Date.now(),
          engine: 'MINE Secondary'
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: 'critical-error',
        role: 'assistant',
        content: "Critical link failure. Re-establishing connection...",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto bg-white overflow-hidden animate-billion">
      {/* Dynamic Engine Status Bar */}
      <div className="px-10 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${activeEngine === 'Primary' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`}></div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
            {activeEngine === 'Primary' ? 'MINE Primary Engine' : 'MINE Secondary Engine (Fallback)'}
          </span>
        </div>
        <div className="flex items-center gap-4">
           <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">VISION v4.0</span>
           <div className="h-4 w-[1px] bg-slate-200"></div>
           <span className="text-[9px] font-black uppercase tracking-widest text-accent">GPT-5 CLASS</span>
        </div>
      </div>

      {/* Message Feed */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-16 space-y-12 custom-scrollbar"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-billion`}
          >
            <div className={`group relative max-w-[90%] md:max-w-[80%] rounded-[3rem] p-8 md:p-12 ${
              msg.role === 'user' 
                ? 'bg-slate-900 text-white shadow-2xl' 
                : 'bg-white text-slate-800 border border-slate-100 shadow-sm'
            }`}>
              {msg.images && msg.images.length > 0 && (
                <div className="flex flex-wrap gap-6 mb-10">
                  {msg.images.map((img, idx) => (
                    <div key={idx} className="relative group/img overflow-hidden rounded-[2rem] shadow-xl border-4 border-white transition-all hover:scale-105">
                      <img 
                        src={img} 
                        alt="Context" 
                        className="w-40 h-40 md:w-64 md:h-64 object-cover" 
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="text-xl md:text-2xl leading-relaxed whitespace-pre-wrap font-medium selection:bg-accent/20">
                {msg.content}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-5 px-8">
               <span className={`text-[10px] font-black uppercase tracking-widest ${msg.role === 'user' ? 'text-slate-400' : 'text-accent'}`}>
                {msg.role === 'assistant' ? 'MINE AI' : 'YOU'}
              </span>
              {msg.engine && (
                <span className="text-[9px] font-black uppercase px-3 py-1 rounded-full bg-slate-50 text-slate-400 border border-slate-100">
                  {msg.engine}
                </span>
              )}
              <span className="text-[9px] font-medium text-slate-200 uppercase tracking-widest">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex flex-col items-start animate-pulse">
            <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-12 flex items-center gap-4">
              <div className="w-3 h-3 bg-accent rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-accent rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-3 h-3 bg-accent rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
      </div>

      {/* Image Previewer (Severally Added) */}
      {pendingImages.length > 0 && (
        <div className="px-12 py-8 flex gap-6 overflow-x-auto bg-slate-50/80 border-t border-slate-100 backdrop-blur-md">
          {pendingImages.map((img, idx) => (
            <div key={idx} className="relative group shrink-0">
              <img src={img.url} className="w-28 h-28 object-cover rounded-[2.5rem] shadow-lg border-4 border-white group-hover:scale-105 transition-transform" alt="Pending" />
              <button 
                onClick={() => removePendingImage(idx)}
                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-9 h-9 flex items-center justify-center text-xl shadow-2xl hover:bg-red-600 transition-all active:scale-90"
              >
                ×
              </button>
            </div>
          ))}
          <div className="flex flex-col justify-center px-4 opacity-40">
             <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">Context Queued</span>
          </div>
        </div>
      )}

      {/* Input Console */}
      <div className="p-8 md:p-12 lg:p-16 bg-white border-t border-slate-50">
        <div className="relative glass-premium rounded-[4rem] border border-slate-200 shadow-[0_50px_100px_rgba(0,0,0,0.06)] overflow-hidden p-3 transition-all focus-within:ring-[15px] focus-within:ring-accent/5 focus-within:border-accent/20">
          <div className="flex items-end">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-6 md:p-8 text-slate-400 hover:text-accent transition-all active:scale-90 group"
              title="Add Image"
            >
              <svg className="w-12 h-12 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              placeholder="Message MINE AI (paste images here...)"
              className="flex-1 bg-transparent border-none outline-none py-8 px-6 text-2xl font-medium text-slate-800 placeholder:text-slate-200 resize-none max-h-72 custom-scrollbar"
              rows={1}
            />
            <button 
              onClick={sendMessage}
              disabled={isTyping || (!input.trim() && pendingImages.length === 0)}
              className={`p-6 md:p-8 rounded-full transition-all m-2 ${
                (input.trim() || pendingImages.length > 0) && !isTyping 
                  ? 'bg-slate-900 text-white shadow-2xl scale-100 hover:bg-black active:scale-95' 
                  : 'bg-slate-50 text-slate-200 scale-95 opacity-50 cursor-not-allowed'
              }`}
            >
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="mt-10 flex justify-center items-center gap-8">
           <div className="h-[1px] w-16 bg-slate-100"></div>
           <p className="text-[10px] font-black uppercase tracking-[0.8em] text-slate-200 text-center">
            Secured Developer Neural Link
          </p>
           <div className="h-[1px] w-16 bg-slate-100"></div>
        </div>
      </div>
    </div>
  );
};

export default TextChat;
