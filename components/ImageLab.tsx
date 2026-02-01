
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { GeneratedImage } from '../types';

const ImageLab: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>(() => {
    const saved = localStorage.getItem('mine_ai_images');
    return saved ? JSON.parse(saved) : [];
  });
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16" | "4:3" | "3:4">("1:1");

  useEffect(() => {
    localStorage.setItem('mine_ai_images', JSON.stringify(images));
  }, [images]);

  const generateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio
          },
        },
      });

      let imageUrl = '';
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (imageUrl) {
        const newImage: GeneratedImage = {
          id: Date.now().toString(),
          url: imageUrl,
          prompt,
          timestamp: new Date().toISOString()
        };
        setImages(prev => [newImage, ...prev]);
        setPrompt('');
      } else {
        throw new Error("Vision interface returned no data.");
      }
    } catch (error: any) {
      console.error("Image Gen Error:", error);
      alert(`Neural Vision Error: ${error?.message || 'Connection interrupted'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const clearImages = () => {
    if (confirm("Clear your entire image vault?")) {
      setImages([]);
      localStorage.removeItem('mine_ai_images');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#030712] p-6 md:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full">
        <div className="mb-10 text-center">
          <h2 className="text-4xl font-outfit font-extrabold mb-3 tracking-tight">The Imagination Lab</h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm">
            Powered by <b className="text-blue-400">Flash Vision Core</b>. Fast, accurate latent manifests.
          </p>
        </div>

        <div className="glass border border-gray-800 p-6 rounded-2xl mb-12 shadow-2xl">
          <form onSubmit={generateImage} className="space-y-6">
            <div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your vision..."
                className="w-full bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-gray-200 focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-none h-20 transition-all text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Aspect Ratio</span>
                  <div className="flex gap-2">
                    {(["1:1", "16:9", "9:16", "4:3", "3:4"] as const).map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setAspectRatio(ratio)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          aspectRatio === ratio ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-500 hover:text-gray-400'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="flex-1 md:flex-none px-12 py-3 rounded-xl font-bold text-white shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 shadow-blue-600/20"
              >
                {isGenerating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span>Manifest</span>}
              </button>
            </div>
          </form>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">Manifest Vault</h3>
          <button onClick={clearImages} className="text-[10px] uppercase font-bold text-gray-600 hover:text-red-400 transition-colors">Wipe Vault</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {images.map((img) => (
            <div key={img.id} className="group relative glass border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
              <img src={img.url} alt={img.prompt} className="w-full h-auto aspect-square object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                <p className="text-white text-[11px] line-clamp-2 mb-3 leading-relaxed">{img.prompt}</p>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-gray-400 font-bold uppercase">{new Date(img.timestamp).toLocaleDateString()}</span>
                  <a href={img.url} download={`mine-ai-${img.id}.png`} className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-white">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          ))}
          {images.length === 0 && !isGenerating && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-800 rounded-2xl text-gray-600 uppercase text-xs tracking-widest">
              Vault is currently empty
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageLab;
