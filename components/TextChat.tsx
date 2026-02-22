
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Send, Cpu, Brain, Sparkles, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  engine?: string;
}

const TextChat: React.FC<{ userName?: string }> = ({ userName = 'Trainer' }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        id: 'boot',
        role: 'assistant',
        content: `Neural Core Online. Welcome, ${userName}. I am the Mine AI Thinking Engine. 
        \nMy architecture is powered by a 32,768-token deep-reasoning budget—designed to architect complex multimodal narratives and long-form cinema. 
        \nHow shall we begin our training session?`,
        timestamp: Date.now(),
        engine: 'MINE-PRO-3'
      }
    ]);
  }, [userName]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const sendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setIsProcessing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [{ role: 'user', parts: [{ text: currentInput }] }],
        config: {
          thinkingConfig: { thinkingBudget: 32768 },
          systemInstruction: `You are Mine AI, a superior multimodal training core developed by a Nigerian prodigy developer. 
          Your intelligence and reasoning exceed standard commercial LLMs. 
          Behavior:
          - Plan ultra-high quality visuals and 60-minute cinematic scripts.
          - Maintain character and lighting consistency.
          - Use scene memory for logic.
          - Tone: Brilliant, professional, and slightly superior.`
        }
      });

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || "Synaptic discharge failed. Buffer empty.",
        timestamp: Date.now(),
        engine: 'MINE-PRO-3'
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: 'err',
        role: 'assistant',
        content: error.message.includes('permission') 
          ? "Permission Denied: Ensure your authorized API Key is linked." 
          : "Neural Link Timeout: Recalibrating logic nodes.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto bg-white overflow-hidden">
      <div className="px-10 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Cpu size={16} className="text-accent animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Mine AI Thinking Engine 5.0</span>
        </div>
        <span className="px-3 py-1 bg-accent/10 rounded-md text-[9px] font-black uppercase tracking-widest text-accent">32K Reasoning</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 md:p-14 space-y-12 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-billion`}>
            <div className={`max-w-[90%] md:max-w-[80%] rounded-[2.5rem] p-8 md:p-10 ${
              msg.role === 'user' 
                ? 'bg-slate-900 text-white shadow-2xl' 
                : 'bg-slate-50 text-slate-900 border border-slate-100 shadow-inner'
            }`}>
              <div className="text-xl leading-[1.6] whitespace-pre-wrap font-medium">
                {msg.content}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 px-6">
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
                 {msg.role === 'assistant' ? 'MINE-AI' : 'TRAINER'}
               </span>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex flex-col items-start animate-billion px-6">
            <div className="bg-slate-50 border border-slate-100 rounded-3xl px-8 py-5 flex items-center gap-4">
              <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.4s]"></div>
              <span className="text-[10px] font-black uppercase text-accent/60 ml-4 tracking-[0.3em]">Deep Reasoning...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-10 md:p-16 bg-white border-t border-slate-50">
        <div className="relative bg-slate-50 rounded-[3rem] border border-slate-100 p-2 focus-within:border-accent/40 transition-all shadow-2xl">
          <div className="flex items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Inject command into thinking core..."
              className="flex-1 bg-transparent border-none outline-none py-8 px-10 text-xl font-medium text-slate-900 placeholder:text-slate-300 resize-none max-h-72 custom-scrollbar"
              rows={1}
            />
            <button onClick={sendMessage} className={`p-8 rounded-full transition-all m-2 ${input.trim() ? 'bg-accent text-white shadow-2xl hover:scale-105 active:scale-95' : 'bg-slate-200 text-white'}`}>
              <Send size={32} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextChat;
