import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

if (!GEMINI_KEY) {
  console.error("❌ GEMINI_API_KEY not set in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

app.get("/", (req, res) => {
  res.json({
    status: "FinFlow backend running",
    model: GEMINI_MODEL,
    keyLoaded: true,
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { systemPrompt, messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const result = await model.generateContent({
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
      systemInstruction: {
        role: "system",
        parts: [
          {
            text:
              systemPrompt ||
              "You are a helpful finance assistant for college students in India.",
          },
        ],
      },
    });

    const response = result.response;

    const reply =
      response?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim() || "No response from Gemini.";

    return res.json({ reply });
  } catch (err) {
    console.error("Gemini error:", err);
    return res.status(500).json({
      error: err.message || "Failed to get response from Gemini",
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ FinFlow backend running at http://localhost:${PORT}`);
  console.log(`✅ Model: ${GEMINI_MODEL}`);
  console.log(`✅ Gemini key loaded: YES`);
});