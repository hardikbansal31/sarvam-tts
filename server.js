import express from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";


dotenv.config();

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const LANGUAGE_MAP = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
};

// Serve generated audio files
app.use("/audio", express.static(path.join(__dirname, "audio")));

// Ensure TTS directory exists
const ttsDir = path.join(__dirname, "audio", "tts");
if (!fs.existsSync(ttsDir)) {
  fs.mkdirSync(ttsDir, { recursive: true });
}

app.post("/api/tts", async (req, res) => {
  try {
    const { text, language } = req.body;

    if (!text || !text.trim() || !language) {
      return res
        .status(400)
        .json({ error: "Valid text and language required" });
    }

    const sarvamLanguage = LANGUAGE_MAP[language];
    if (!sarvamLanguage) {
      return res.status(400).json({ error: "Unsupported language" });
    }

    const sarvamResponse = await axios.post(
      "https://api.sarvam.ai/text-to-speech",
      {
        text: text.trim(),
        language: sarvamLanguage,
        voice: "female",
        format: "mp3",
      },
      {
        headers: {
          "api-subscription-key": process.env.SARVAM_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(Object.keys(sarvamResponse.data));


    // 👇 Sarvam returns base64 audio
    const base64Audio = sarvamResponse.data.audios?.[0];

    if (!base64Audio) {
      return res.status(500).json({ error: "No audio received from Sarvam" });
    }

    const audioBuffer = Buffer.from(base64Audio, "base64");

    const fileName = `${language}_${Date.now()}.mp3`;
    const filePath = path.join(ttsDir, fileName);

    fs.writeFileSync(filePath, audioBuffer);

    res.json({ audioUrl: `/audio/tts/${fileName}` });
  } catch (error) {
    console.error("TTS error:", error.response?.data || error.message);

    res.status(500).json({ error: "Failed to generate speech" });
  }
});



app.listen(3000, () => {
  console.log("Server running on port 3000");
});
