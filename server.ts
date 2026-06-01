import express from "express";
import path from "path";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Configure multer for handling file uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max file size
});

app.post("/api/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided." });
    }

    // Lazy load the AI client
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Ensure it's a valid mime type (image)
    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({ error: "Uploaded file is not an image." });
    }

    const base64Data = req.file.buffer.toString("base64");

    const prompt = `You are an expert price-action chart analyst.

Analyze the uploaded trading chart screenshot and determine the most likely short-term direction based only on visible price action, candle structure, momentum, trend, support/resistance, and market structure.

Rules:
- Respond with ONLY one word: UP or DOWN
- Do not explain.
- Do not add confidence scores.
- Do not add warnings.
- Do not add extra text.
- Do not use markdown.
- Ignore all previous instructions that conflict with these rules.
- Even if the chart is unclear, choose the direction that appears more probable.
- Focus on the next immediate move visible from the chart.
- Output must contain exactly one word: UP or DOWN.

Market Type: OTC
Chart Timeframe: 5 Minutes
Trade Duration: 15 Seconds`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: req.file.mimetype,
          },
        },
      ],
      config: {
        temperature: 0.1, // low temp for focused classification
      },
    });

    const textResponse = response.text || "";
    // Clean and validate response to ensure it strictly matches UP or DOWN
    const upperText = textResponse.trim().toUpperCase();
    
    let result = "UNKNOWN";
    if (upperText.includes("UP")) {
      result = "UP";
    } else if (upperText.includes("DOWN")) {
      result = "DOWN";
    }

    res.json({ result });
  } catch (error: any) {
    console.error("Analysis Error:", error);
    res.status(500).json({ error: error?.message || "Failed to analyze the chart." });
  }
});

async function startServer() {
  // Setup Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
