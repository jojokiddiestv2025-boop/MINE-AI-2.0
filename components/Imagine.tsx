import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Download, Zap, AlertCircle, Image as ImageIcon, Send, UploadCloud, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Imagine: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageType, setUploadedImageType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
        setUploadedImageType(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateImage = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setResultImage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const parts: any[] = [{ text: prompt }];

      if (uploadedImage && uploadedImageType) {
        parts.unshift({
          inlineData: {
            data: uploadedImage.split(',')[1], // Base64 data
            mimeType: uploadedImageType
          }
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts }
      });

      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part?.inlineData) {
        const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        setResultImage(imageUrl);
      } else {
        setError("Neural core returned no visual data. Refine your prompt.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Synthesis failed. Neural link unstable.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `mine-ai-vision-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full w-full bg-white flex flex-col overflow-hidden animate-billion">
      <header className="px-12 py-10 border-b border-slate-50 flex justify-between items-center shrink-0">
        <div className="flex flex-col">
          <h2 className="text-[14px] font-black uppercase tracking-[0.5em] text-slate-900">Visual Synthesis</h2>
          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Mine AI Core V3.1 • Nano Banana (Flash)</span>
        </div>
        <div className="flex items-center gap-4">
          <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-accent animate-pulse' : 'bg-emerald-500'}`}></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isGenerating ? 'Synthesizing...' : 'Ready'}</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-12 custom-scrollbar flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-12">
          {/* Main Visual Display */}
          <div className="relative aspect-square w-full bg-slate-50 rounded-[4rem] border border-slate-100 overflow-hidden shadow-2xl flex items-center justify-center group transition-all duration-700">
            {resultImage ? (
              <>
                <img src={resultImage} alt="Synthesized Vision" className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <button 
                    onClick={downloadImage}
                    className="bg-white text-slate-900 px-10 py-5 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.4em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                  >
                    <Download size={20} strokeWidth={2.5} />
                    Download Master
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-6 opacity-20 group-hover:opacity-30 transition-opacity">
                <ImageIcon size={96} strokeWidth={1.5} className="text-slate-300" />
                <span className="text-xl font-black uppercase tracking-[0.5em]">Awaiting Instruction</span>
              </div>
            )}

            {isGenerating && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-3xl flex flex-col items-center justify-center gap-8">
                <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.6em] text-accent animate-pulse">Forging Pixels...</p>
              </div>
            )}
          </div>

          {/* Upload & Prompt Engine */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-3">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative aspect-square w-full bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 hover:border-accent/50 transition-all cursor-pointer flex flex-col items-center justify-center text-slate-300 hover:text-accent"
              >
                {uploadedImage ? (
                  <>
                    <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover rounded-[3rem]" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); setUploadedImage(null); setUploadedImageType(null); }}
                      className="absolute top-4 right-4 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <UploadCloud size={40} strokeWidth={1.5} />
                    <span className="text-[10px] font-black uppercase tracking-widest mt-2">Upload Image</span>
                  </>
                )}
              </div>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
            </div>

            <div className="col-span-9 relative bg-slate-50 rounded-[3rem] border border-slate-100 p-4 focus-within:border-accent/40 transition-all shadow-xl">
              <div className="flex items-center gap-4 h-full">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Architect a masterpiece (e.g., 'Add a futuristic helmet to the character')..."
                  className="flex-1 bg-transparent border-none outline-none py-6 px-8 text-lg font-medium text-slate-900 placeholder:text-slate-300 resize-none h-full custom-scrollbar"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generateImage(); } }}
                />
                <button 
                  onClick={generateImage}
                  disabled={isGenerating || !prompt.trim()}
                  className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center transition-all self-end ${isGenerating || !prompt.trim() ? 'bg-slate-200 text-white' : 'bg-accent text-white shadow-2xl hover:scale-105 active:scale-95'}`}
                >
                  <Send size={32} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-8 bg-red-50 border border-red-100 rounded-[2rem] text-red-600 text-center font-bold uppercase tracking-widest text-[10px]">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Imagine;
