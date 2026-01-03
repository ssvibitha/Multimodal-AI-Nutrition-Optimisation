import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import json5 from "json5";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("API_KEY not set in .env file");
}

// Initialize Google Generative AI client
const genAI = new GoogleGenerativeAI(API_KEY);
const geminiConfig = {
    // model: "gemini-1.5-flash", 
    model: "gemini-2.5-flash",
    temperature: 0.2,
    maxOutputTokens: 8192,
};

// Set up Express app
const app = express();
const port = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer
const upload = multer({ dest: 'uploads/' });

// Helper function for Gemini generation
async function generateContent(promptText, imageBuffer = null, mimeType = null) {
    try {
        let content;
        if (imageBuffer) {
            const imagePart = {
                inlineData: {
                    data: imageBuffer.toString('base64'),
                    mimeType: mimeType || 'image/jpeg'
                }
            };
            content = [promptText, imagePart];
        } else {
            content = promptText;
        }

        const model = genAI.getGenerativeModel({
            model: geminiConfig.model,
            generationConfig: geminiConfig
        });

        const result = await model.generateContent(content);
        return result.response.text();
    } catch (error) {
        console.error("Gemini Generation Error:", error);
        throw error;
    }
}

// --- API Endpoints ---

// 1. Chatbot API
const chatbotPrompt = fs.readFileSync(path.join(__dirname, 'prompts', 'ChatbotPrompt.txt'), 'utf8');

app.post("/api/query", async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: "No query" });

        const fullPrompt = `${chatbotPrompt}\n\nUser Question:\n${query}`;
        const reply = await generateContent(fullPrompt);
        res.json({ success: true, response: reply.trim() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Gemini error" });
    }
});

// 2. Vision (Ingredient Parser) API
const visionPrompt = fs.readFileSync(path.join(__dirname, 'prompts', 'VisionModulePrompt.txt'), 'utf8');

class UniversalIngredient {
    constructor(data = {}) {
        this.item_name = data.item_name ?? {};
        this.category = data.category ?? {};
        this.specific_type = data.specific_type ?? {};
        this.confidence = data.confidence ?? {};
        this.label_text_detected = data.label_text_detected ?? {};
    }
}

async function processIngredientResponse(text, res) {
    try {
        // Extract JSON if wrapped in code blocks
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : text;
        const reportData = json5.parse(jsonStr);

        const IngredientList = new UniversalIngredient(reportData);
        const reportFileName = `IngredienetList_${Date.now()}.json`;
        const reportJson = JSON.stringify(IngredientList, null, 2);

        // Save to root (or data dir?) - keeping root for now as per original
        fs.writeFileSync(path.join(__dirname, reportFileName), reportJson);

        res.json({ message: "Report generated and saved", file: reportFileName, data: IngredientList });
    } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        res.status(500).send(`Error parsing generated report data: ${parseError.message}`);
    }
}

app.post('/api/vision/parse-image', async (req, res) => {
    try {
        const { image, mimeType } = req.body;
        if (!image || !mimeType) return res.status(400).send("Image and mimeType required");

        const imageBuffer = Buffer.from(image, 'base64');
        const generatedText = await generateContent(visionPrompt, imageBuffer, mimeType);
        await processIngredientResponse(generatedText, res);
    } catch (error) {
        res.status(500).send("Error processing image");
    }
});

app.post('/api/vision/parse-text', async (req, res) => {
    try {
        const { ingredients } = req.body;
        if (!ingredients) return res.status(400).send("Ingredients list required");

        const documentText = Array.isArray(ingredients) ? ingredients.join(', ') : ingredients;
        const fullPrompt = `${visionPrompt}\n\nDocument Text:\n${documentText}\n\nPlease extract the relevant information and structure it in the Ingredient Parsing format.`;

        const generatedText = await generateContent(fullPrompt);
        await processIngredientResponse(generatedText, res);
    } catch (error) {
        res.status(500).send("Error processing text");
    }
});

// 3. Doc Parser API
const docPrompt = fs.readFileSync(path.join(__dirname, 'prompts', 'docParserPrompt.txt'), 'utf8');

class UniversalHealthReport {
    constructor(data = {}) {
        Object.assign(this, data);
        this.last_updated = new Date().toISOString();
    }
}

app.post('/api/doc/parse', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("No file uploaded");

        const filePath = req.file.path;
        const fileContent = fs.readFileSync(filePath, 'utf8'); // Assuming text files for now based on original code reading content
        // Note: Original code read file as utf8 text. If PDF/Image, we need multimodal or OCR.
        // Original acceptable types were .txt,.pdf,.jpg,.png but code did fs.readFileSync(path, 'utf8'). 
        // This only works for text files. For now preserving original logic but adding multimodal support if it's an image.

        const mimeType = req.file.mimetype;
        let generatedText;

        if (mimeType.startsWith('image/')) {
            const imageBuffer = fs.readFileSync(filePath);
            const fullPrompt = `${docPrompt}\n\nPlease extract the relevant information and structure it in the Universal Health Report format.`;
            generatedText = await generateContent(fullPrompt, imageBuffer, mimeType);
        } else {
            // Treat as text (including PDF if basic read works otherwise needs pdf parser)
            // Original just read as text.
            const documentText = fs.readFileSync(filePath, 'utf8');
            const fullPrompt = `${docPrompt}\n\nDocument Text:\n${documentText}\n\nPlease extract the relevant information and structure it in the Universal Health Report format.`;
            generatedText = await generateContent(fullPrompt);
        }

        // Clean up
        fs.unlinkSync(filePath);

        // Parse JSON
        const jsonMatch = generatedText.match(/```json\n([\s\S]*?)\n```/) || generatedText.match(/```\n([\s\S]*?)\n```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : generatedText;
        const reportData = json5.parse(jsonStr);

        const healthReport = new UniversalHealthReport(reportData);
        const reportFileName = `health_report_${Date.now()}.json`;
        fs.writeFileSync(path.join(__dirname, reportFileName), JSON.stringify(healthReport, null, 2));

        res.json({ message: "Report generated and saved", file: reportFileName, data: healthReport });

    } catch (error) {
        console.error("Error processing document:", error);
        res.status(500).send("Error processing document");
    }
});

// 4. Recipe Generator API (New)
// We need a prompt for this. I'll read it from file or define it here.
const recipePromptTemplate = `
You are a master chef and nutritionist. 
Based on the provided list of ingredients, suggest 3 healthy and delicious recipes.
For each recipe include:
- Recipe Name
- Ingredients (with quantities)
- Instructions (step-by-step)
- Nutritional Info (approximate calories, protein, etc.)

Format the output as a JSON array of recipe objects.
`;

app.post('/api/recipe/generate', async (req, res) => {
    try {
        const { ingredients, existingFile } = req.body;
        let ingredientsText = "";

        if (existingFile) {
            // Find the most recent ingredient list file if not specified
            const files = fs.readdirSync(__dirname).filter(f => f.startsWith('IngredienetList_') && f.endsWith('.json'));
            if (files.length > 0) {
                // Sort by time (filename has timestamp)
                files.sort().reverse();
                const latestFile = files[0];
                const data = JSON.parse(fs.readFileSync(path.join(__dirname, latestFile), 'utf8'));
                // Extract items
                if (data.item_name) ingredientsText = JSON.stringify(data.item_name);
                else ingredientsText = JSON.stringify(data); // Fallback
            } else {
                return res.status(404).json({ error: "No ingredient scans found." });
            }
        } else if (ingredients) {
            ingredientsText = ingredients;
        } else {
            return res.status(400).json({ error: "No ingredients provided." });
        }

        const fullPrompt = `${recipePromptTemplate}\n\nIngredients Available: ${ingredientsText}`;
        const generatedText = await generateContent(fullPrompt);

        const jsonMatch = generatedText.match(/```json\n([\s\S]*?)\n```/) || generatedText.match(/```\n([\s\S]*?)\n```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : generatedText;
        const recipes = json5.parse(jsonStr);

        res.json({ success: true, recipes: recipes });

    } catch (error) {
        console.error("Recipe Generation Error:", error);
        res.status(500).json({ error: "Error generating recipes" });
    }
});


// Start Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
