import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import json5 from 'json5';  // Added for lenient JSON parsing

// Load environment variables
dotenv.config();
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("API_KEY not set in .env file");
}
// Initialize Google Generative AI client
const genAI = new GoogleGenerativeAI(API_KEY);
const geminiConfig = {
    model: "gemini-2.5-flash",
    // model: "gemini-3-flash-preview",  
    temperature: 0.2,
    maxOutputTokens: 40960,  // Increased to handle longer JSON responses
};
// Set up Express app
const app = express();
const port = 3000;
app.use(express.urlencoded({ extended: true }));
app.use(express.static('ingredientParser'));
app.listen(port, () => {
    console.log(`Vision Module app listening at http://localhost:${port}`);
});
// Initialize multer for file uploads
const upload = multer({ dest: 'photoUploads/' });
const prompt = fs.readFileSync('VisionModulePrompt.txt', 'utf8');

// Define Universal Ingredient Report structure
class UniversalIngredient {
    constructor(data = {}) {
        this.item_name = data.item_name ?? {};
        this.category = data.category ?? {};
        this.specific_type = data.specific_type ?? {};
        this.confidence = data.confidence ?? {};
        this.label_text_detected = data.label_text_detected ?? {};
    }
}

const generate = async (documentText, imageBuffer = null, mimeType = null) => {
    try {
        let content;
        if (imageBuffer) {
            // For images, use multimodal content
            const imagePart = {
                inlineData: {
                    data: imageBuffer.toString('base64'),
                    mimeType: mimeType || 'image/jpeg'
                }
            };
            content = [prompt, imagePart];
        } else {
            // For text
            const fullPrompt = `${prompt}\n\nDocument Text:\n${documentText}\n\nPlease extract the relevant information and structure it in the Ingredient Parsing format.`;
            content = fullPrompt;
        }
        const model = genAI.getGenerativeModel({ 
            model: geminiConfig.model, 
            generationConfig: { 
                temperature: geminiConfig.temperature, 
                maxOutputTokens: geminiConfig.maxOutputTokens,
                responseMimeType: "application/json"
            } 
        });
        const result = await model.generateContent(content);
        const response = await result.response;
        const text = response.text();
        return text.trim();
    } catch (error) {
        console.error("Error generating text:", error);
        throw error;
    }
};
app.post('/uploadPhoto', upload.single('myfile'), (req, res) => {
    console.log('File info:', req.file);
    res.send(`File uploaded successfully: ${req.file.originalname}`);
});
app.post('/parse-image', express.json({ limit: '10mb' }), async (req, res) => {
    try {
        const { image, mimeType } = req.body;
        if (!image || !mimeType) {
            return res.status(400).send("Image and mimeType required");
        }
        // Decode base64 to buffer
        const imageBuffer = Buffer.from(image, 'base64');
        const generatedText = await generate(null, imageBuffer, mimeType);
        console.log("Raw generated text:", generatedText);
        let reportData;
        try {
            reportData = json5.parse(generatedText);
        } catch (parseError) {
            console.error("Error parsing JSON:", parseError);
            return res.status(500).send(`Error parsing generated report data: ${parseError.message}`);
        }
        const IngredientList = new UniversalHealthReport(reportData);
        const reportFileName = `IngredienetList_${Date.now()}.json`;
        const reportJson = JSON.stringify(IngredientList, null, 2);
        fs.writeFileSync(reportFileName, reportJson);
        res.json({ message: "Report generated and saved", file: reportFileName, data: IngredientList });
    } catch (error) {
        console.error("Error processing image:", error);
        res.status(500).send("Error processing image");
    }
});
app.post('/parse-text', express.json(), async (req, res) => {
    try {
        const { ingredients } = req.body;
        if (!ingredients) {
            return res.status(400).send("Ingredients list required");
        }
        const documentText = Array.isArray(ingredients) ? ingredients.join(', ') : ingredients;
        const generatedText = await generate(documentText);
        console.log("Raw generated text:", generatedText);
        let reportData;
        try {
            reportData = json5.parse(generatedText);
        } catch (parseError) {
            console.error("Error parsing JSON:", parseError);
            return res.status(500).send(`Error parsing generated report data: ${parseError.message}`);
        }
        const IngredientList = new UniversalHealthReport(reportData);
        const reportFileName = `IngredienetList_${Date.now()}.json`;
        const reportJson = JSON.stringify(IngredientList, null, 2);
        fs.writeFileSync(reportFileName, reportJson);
        res.json({ message: "Report generated and saved", file: reportFileName, data: IngredientList });
    } catch (error) {
        console.error("Error processing text:", error);
        res.status(500).send("Error processing text");
    }
});
app.post('/parse-uploaded-image', upload.single('photo'), async (req, res) => {
    try {
        const filePath = req.file.path;
        const imageBuffer = fs.readFileSync(filePath);
        const generatedText = await generate(null, imageBuffer, req.file.mimetype);
        console.log("Raw generated text:", generatedText);
        let reportData;
        try {
            reportData = json5.parse(generatedText);
        } catch (parseError) {
            console.error("Error parsing JSON:", parseError);
            return res.status(500).send(`Error parsing generated report data: ${parseError.message}`);
        }
        const IngredientList = new UniversalIngredient(reportData);
        const reportFileName = `IngredienetList_${Date.now()}.json`;
        const reportJson = JSON.stringify(IngredientList, null, 2);
        fs.writeFileSync(reportFileName, reportJson);
        // Clean up uploaded file
        fs.unlinkSync(filePath);
        res.json({ message: "Report generated and saved", file: reportFileName, data: IngredientList });
    } catch (error) {
        console.error("Error processing uploaded image:", error);
        res.status(500).send("Error processing uploaded image");
    }
});

export { UniversalIngredient };
