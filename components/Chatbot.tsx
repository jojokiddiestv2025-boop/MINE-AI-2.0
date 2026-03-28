
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Trash2, Sparkles, Image as ImageIcon, X, Wand2, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string; // Base64 or URL image for display in UI
  isGenerated?: boolean;
}

const Chatbot: React.FC<{ userName: string; onStoryMode?: () => void }> = ({ userName, onStoryMode }) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('mine_ai_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse chat history', e);
      }
    }
    return [
      { role: 'assistant', content: `Hello ${userName}, I am the Mine AI Text Core. How can I assist you today?` }
    ];
  });
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Persist messages to localStorage
  useEffect(() => {
    localStorage.setItem('mine_ai_chat_history', JSON.stringify(messages));
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateImage = async () => {
    if (!input.trim() || isGenerating) return;

    const prompt = input.trim();
    setInput('');
    setIsGenerating(true);
    
    const userMessage: Message = { 
      role: 'user', 
      content: `Generate an image of: ${prompt}`,
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Use the URL directly to avoid CORS issues with fetch
      // Pollinations AI URLs are stable and can be used directly in <img> tags
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: `I've generated an image based on your description: "${prompt}"`,
        image: imageUrl,
        isGenerated: true
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Image generation error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: `I failed to generate the image: ${error.message}. Please try again.` }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage: Message = { 
      role: 'user', 
      content: input,
      image: selectedImage || undefined
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    const currentImage = selectedImage;
    
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      if (!process.env.GROQ_API_KEY && !window.location.hostname.includes('localhost')) {
        // In production/preview, the key is in the environment
      }

      // Prepare messages for the API - limit to last 20 messages to avoid context window issues
      const apiMessages = messages.concat(userMessage).slice(-20).map(m => {
        if (m.role === 'user' && m.image) {
          return {
            role: m.role,
            content: [
              { type: 'text', text: m.content || "Analyze this image." },
              {
                type: 'image_url',
                image_url: {
                  url: m.image
                }
              }
            ]
          };
        }
        return { role: m.role, content: m.content };
      });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to fetch response';
        if (errorMessage.includes('API key')) {
          throw new Error('Invalid or missing GROQ_API_KEY. Please check your Settings.');
        }
        throw new Error(errorMessage);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.choices[0].message.content
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I encountered an error: ${error.message}. Please ensure your GROQ_API_KEY is set correctly in the Settings menu.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    const initialMessage: Message[] = [{ role: 'assistant', content: `History cleared. How can I help you now, ${userName}?` }];
    setMessages(initialMessage);
    localStorage.removeItem('mine_ai_chat_history');
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-4 md:p-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl">
            <Bot size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">Mine AI Text Core</h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Powered by Groq Vision</span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">•</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Image Gen Active</span>
            </div>
            <p className="text-[9px] text-slate-400 font-medium mt-1">Type a prompt & click the wand to generate images</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onStoryMode}
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all text-xs font-black uppercase tracking-widest"
            title="Switch to Storybook"
          >
            <BookOpen size={16} />
            <span>Story Mode</span>
          </button>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">System Ready</span>
          </div>
          <button 
            onClick={clearChat}
            className="p-3 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-all"
            title="Clear History"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto mb-6 space-y-6 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] md:max-w-[70%] p-4 rounded-2xl shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-slate-900 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
              }`}>
                <div className="flex items-center gap-2 mb-2 opacity-50">
                  {msg.role === 'user' ? <User size={12} /> : <Sparkles size={12} />}
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {msg.role === 'user' ? userName : 'Mine AI'}
                  </span>
                </div>
                {msg.image && (
                  <div className="relative group mb-3">
                    <img 
                      src={msg.image} 
                      alt="Mine AI Visual" 
                      className="w-full max-h-96 object-contain rounded-xl border border-slate-700/10 bg-slate-50"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://picsum.photos/seed/error/800/600?blur=2';
                        target.alt = 'Image failed to load';
                      }}
                    />
                    <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/5 pointer-events-none" />
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="flex justify-start"
          >
            <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
              <Loader2 size={16} className="animate-spin text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Analyzing...</span>
            </div>
          </motion.div>
        )}
        {isGenerating && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="flex justify-start"
          >
            <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
              <Loader2 size={16} className="animate-spin text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Generating Image...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="space-y-4">
        {/* Image Preview */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="relative inline-block"
            >
              <img 
                src={selectedImage} 
                alt="Preview" 
                className="w-20 h-20 object-cover rounded-xl border-2 border-slate-900 shadow-lg"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors"
              >
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex items-end gap-2">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all shadow-sm"
            title="Upload Image"
          >
            <ImageIcon size={20} />
          </button>
          
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your message or ask about an image..."
              className="w-full bg-white border border-slate-200 rounded-2xl p-4 pr-28 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all resize-none shadow-sm min-h-[60px] max-h-[200px]"
              rows={1}
            />
            <div className="absolute right-2 bottom-2 flex gap-2">
              <button
                onClick={handleGenerateImage}
                disabled={!input.trim() || isGenerating || isLoading}
                className={`p-3 rounded-xl transition-all ${
                  input.trim() && !isGenerating && !isLoading
                    ? 'bg-indigo-600 text-white shadow-lg hover:scale-105 active:scale-95' 
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
                title="Generate Image"
              >
                {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}
              </button>
              <button
                onClick={handleSend}
                disabled={(!input.trim() && !selectedImage) || isLoading || isGenerating}
                className={`p-3 rounded-xl transition-all ${
                  (input.trim() || selectedImage) && !isLoading && !isGenerating
                    ? 'bg-slate-900 text-white shadow-lg hover:scale-105 active:scale-95' 
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
                title="Send Message"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
