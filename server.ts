import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Freepik Proxy Route
  app.post("/api/generate-image", async (req, res) => {
    const { prompt } = req.body;
    const apiKey = process.env.FREEPIK_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "FREEPIK_API_KEY not configured on server." });
    }

    try {
      const response = await fetch("https://api.freepik.com/v1/ai/text-to-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-freepik-api-key": apiKey,
          "Accept": "application/json"
        },
        body: JSON.stringify({
          prompt,
          num_images: 1,
          image: {
            size: "square_1_1"
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Freepik API Error:", data);
        return res.status(response.status).json(data);
      }

      // Freepik returns data: [{ url: "..." }] or [{ base64: "..." }]
      res.json(data);
    } catch (error: any) {
      console.error("Proxy Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
