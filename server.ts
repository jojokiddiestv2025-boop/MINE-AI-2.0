import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Freepik Proxy Route
app.post("/api/generate-image", async (req, res) => {
  const { prompt, image } = req.body;
  const apiKey = process.env.FREEPIK_API_KEY;

  if (!apiKey) {
    console.error("Missing FREEPIK_API_KEY");
    return res.status(500).json({ error: "FREEPIK_API_KEY not configured on server." });
  }

  try {
    const isImageToImage = !!image;
    const endpoint = "https://api.freepik.com/v1/ai/text-to-image";

    const body: any = {
      prompt,
      num_images: 1,
      image: isImageToImage ? { base64: image.split(',')[1] } : { size: "square_1_1" }
    };

    if (isImageToImage) {
      body.strength = 0.3; 
    }

    console.log(`Calling Freepik: ${endpoint} (img2img: ${isImageToImage})`);
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-freepik-api-key": apiKey,
        "Accept": "application/json"
      },
      body: JSON.stringify(body)
    });

    const contentType = response.headers.get("content-type");
    let data;
    
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error("Freepik Non-JSON Response:", text);
      return res.status(response.status).json({ 
        error: `Freepik API returned non-JSON response (Status ${response.status}).`, 
        details: text.substring(0, 200) 
      });
    }

    if (!response.ok) {
      console.error("Freepik API Error:", data);
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error: any) {
    console.error("Proxy Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// API 404 Handler
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
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

// Only start the server if we're not in a Vercel environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  setupVite().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
} else {
  // In production/Vercel, we still need to handle the static files
  // but setupVite is called differently or handled by rewrites
  setupVite();
}

export default app;
