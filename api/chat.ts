import type { VercelRequest, VercelResponse } from '@vercel/node';
import Groq from 'groq-sdk';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, model } = req.body;
    
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GROQ_API_KEY is not set in environment variables." });
    }

    const groq = new Groq({ apiKey });
    
    // Determine the best model: use vision model if any message contains an image
    const hasImage = messages.some((m: any) => 
      Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image_url')
    );
    
    const selectedModel = model || (hasImage ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile");
    
    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: selectedModel,
    });

    res.status(200).json(chatCompletion);
  } catch (error: any) {
    console.error("Groq API Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
