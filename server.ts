import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import https from "https";
import crypto from "crypto";
import Groq from "groq-sdk";
import axios from "axios";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize Groq lazily to avoid crash if key is missing
let groq: Groq | null = null;
function getGroq() {
  if (!groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not set in environment variables.");
    }
    groq = new Groq({ apiKey });
  }
  return groq;
}

// API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, model } = req.body;
    const client = getGroq();
    
    // Determine the best model: use vision model if any message contains an image
    const hasImage = messages.some((m: any) => 
      Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image_url')
    );
    
    const selectedModel = model || (hasImage ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile");
    
    const chatCompletion = await client.chat.completions.create({
      messages,
      model: selectedModel,
    });

    res.json(chatCompletion);
  } catch (error: any) {
    console.error("Groq API Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});

export default app;
