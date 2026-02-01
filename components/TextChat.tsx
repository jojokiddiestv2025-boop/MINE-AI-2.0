
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Message } from '../types';

const TextChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('mine_ai_messages');
    return saved ? JSON.parse(saved) : [];
  });
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const chatRef = useRef<Chat | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    chatRef.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: "You are MINE AI, a Source-First Intelligence Aggregator. Your primary function is to browse the live web and synthesize real-time data from credible sources. You are also multimodal and can see images. When an image is provided, analyze it and use Google Search to find related information if necessary. Do not rely on your internal training data for facts; always query the web tool. Be definitive, evidence-based, and cite your sources explicitly.",
        tools: [{ googleSearch: {} }]
      }
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('mine_ai_messages', JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!inputValue.trim() && !selectedImage) || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    };

    // Note: In a real app, we'd store the image in the message history too.
    // For now, we just send it to the model.
    setMessages(prev => [...prev, userMessage]);
    
    const currentInput = inputValue;
    const currentImage = selectedImage;
    
    setInputValue('');
    setSelectedImage(null);
    setIsTyping(true);

    try {
      if (!chatRef.current) throw new Error("Chat not initialized");

      let messageToSend: any = currentInput;
      
      if (currentImage) {
        const base64Data = currentImage.split(',')[1];
        const mimeType = currentImage.split(';')[0].split(':')[1];
        
        messageToSend = [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          { text: currentInput || "Analyze this image." }
        ];
      }

      const result: GenerateContentResponse = await chatRef.current.sendMessage({ message: messageToSend });
      
      const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const urls = groundingChunks
        .filter(chunk => chunk.web)
        .map(chunk => ({ title: chunk.web?.title || 'External Source', uri: chunk.web?.uri || '#' }));

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.text || "Sources returned no data for this query.",
        timestamp: new Date().toISOString(),
        groundingUrls: urls.length > 0 ? urls : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Chat Error:", error);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Source link error. Re-establishing connection to global knowledge base...",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearHistory = () => {
    if (confirm("Permanently wipe local memory?")) {
      setMessages([]);
      localStorage.removeItem('mine_ai_messages');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#030712] relative">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-32"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto py-12">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-6 bg-blue-600/10 text-blue-500 shadow-2xl shadow-blue-500/20">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-outfit font-bold mb-4 uppercase tracking-tighter">MINE AI: Source Grounded</h2>
            <p className="text-gray-400 text-lg">
              Linked to real-time global information. Every response is verified via live web search. Multimodal vision enabled.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' 
                : 'glass border border-gray-800 text-gray-200'
            }`}>
              <div className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</div>
              
              {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-800/50">
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block">Verified Sources:</span>
                  <div className="flex flex-wrap gap-2">
                    {msg.groundingUrls.map((source, i) => (
                      <a key={i} href={source.uri} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-[10px] text-blue-400 hover:border-blue-500/50 transition-colors">
                        <svg className="w-3 h-3 mr-1.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        {source.title.substring(0, 20)}...
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="glass border border-gray-800 rounded-2xl px-4 py-3 flex space-x-2 items-center">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 rounded-full animate-bounce bg-blue-500"></div>
                <div className="w-1.5 h-1.5 rounded-full animate-bounce bg-blue-500" style={{animationDelay: '0.1s'}}></div>
                <div className="w-1.5 h-1.5 rounded-full animate-bounce bg-blue-500" style={{animationDelay: '0.2s'}}></div>
              </div>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Querying Global Sources...</span>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#030712] via-[#030712] to-transparent z-20">
        <div className="max-w-4xl mx-auto mb-2">
          {selectedImage && (
            <div className="relative inline-block group">
              <img 
                src={selectedImage} 
                alt="Selected" 
                className="h-20 w-20 object-cover rounded-xl border border-gray-700 shadow-xl"
              />
              <button 
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <form 
          onSubmit={handleSend}
          className="max-w-4xl mx-auto flex items-end space-x-3 glass border border-gray-800 p-2 rounded-2xl shadow-2xl"
        >
          <div className="flex items-center">
            <button 
              type="button"
              onClick={clearHistory}
              className="p-3 text-gray-500 hover:text-red-400 transition-colors"
              title="Clear Chat"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-gray-500 hover:text-blue-400 transition-colors"
              title="Upload Image"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          
          <textarea
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Analyze vision or search knowledge..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-gray-200 py-3 px-2 resize-none max-h-32 text-[15px]"
          />
          <button
            type="submit"
            disabled={(!inputValue.trim() && !selectedImage) || isTyping}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 bg-blue-600 shadow-blue-600/20 hover:scale-105 active:scale-95"
          >
            <svg className="w-5 h-5 transform rotate-90 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default TextChat;
