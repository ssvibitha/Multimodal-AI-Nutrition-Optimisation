import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error("API_KEY not set");

const genAI = new GoogleGenerativeAI(API_KEY);

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("chatbot"));

const prompt = fs.readFileSync("ChatbotPrompt.txt", "utf8");

async function generate(userText) {
    const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096
        }
    });

    const result = await model.generateContent(
        `${prompt}\n\nUser Question:\n${userText}`
    );

    return result.response.text().trim();
}

app.post("/api/query", async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: "No query" });

        const reply = await generate(query);
        res.json({ success: true, response: reply });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Gemini error" });
    }
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "chatbot", "index.html"));
});

app.listen(port, () => {
    console.log(`✅ Server running at http://localhost:${port}`);
});
