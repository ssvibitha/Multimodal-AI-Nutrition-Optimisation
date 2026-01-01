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
    model: "gemini-3-flash-preview",  
    temperature: 0.2,
    maxOutputTokens: 4096,  // Increased to handle longer JSON responses
};
// Set up Express app
const app = express();
const port = 3000;
app.use(express.urlencoded({ extended: true }));
app.use(express.static('DocParser'));
app.listen(port, () => {
    console.log(`Doc Parser app listening at http://localhost:${port}`);
});
// Initialize multer for file uploads
const upload = multer({ dest: 'uploads/' });
const prompt = fs.readFileSync('docParserPrompt.txt', 'utf8');

// Define Universal Health Report structure
class UniversalHealthReport {
    constructor(data = {}) {
        this.source_metadata = data.source_metadata ?? {};
        this.patient_profile = data.patient_profile ?? {};
        this.encounter_info = data.encounter_info ?? {};
        this.symptoms = data.symptoms ?? [];
        this.diagnoses = data.diagnoses ?? {};
        this.allergies = data.allergies ?? {};
        this.medications_current = data.medications_current ?? [];
        this.lab_results = data.lab_results ?? [];
        this.findings = data.findings ?? {};
        this.lifestyle_and_risk = data.lifestyle_and_risk ?? {};
        this.recommendations = data.recommendations ?? {};
        this.system_generated = data.system_generated ?? {};
        this.last_updated = data.last_updated ?? new Date().toISOString();
    }
}

const generate = async (documentText) => {
    try {
        const fullPrompt = `${prompt}\n\nDocument Text:\n${documentText}\n\nPlease extract the relevant information and structure it in the Universal Health Report format.`;
        const model = genAI.getGenerativeModel({ 
            model: geminiConfig.model, 
            generationConfig: { 
                temperature: geminiConfig.temperature, 
                maxOutputTokens: geminiConfig.maxOutputTokens,
                responseMimeType: "application/json"
            } 
        });
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();
        return text.trim();
    } catch (error) {
        console.error("Error generating text:", error);
        throw error;
    }
};
app.post('/upload', upload.single('myfile'), (req, res) => {
    console.log('File info:', req.file);
    res.send(`File uploaded successfully: ${req.file.originalname}`);
});
app.post('/parse-document', upload.single('document'), async (req, res) => {
    try {
        const filePath = req.file.path;
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const documentText = fileContent;
        const generatedText = await generate(documentText);
        console.log("Raw generated text:", generatedText);
        let reportData;
        try {
            // Use json5 for lenient parsing
            reportData = json5.parse(generatedText);
        } catch (parseError) {
            console.error("Error parsing JSON:", parseError);
            return res.status(500).send(`Error parsing generated report data: ${parseError.message}`);
        }
        const healthReport = new UniversalHealthReport(reportData);
        const reportFileName = `health_report_${Date.now()}.json`;
        const reportJson = JSON.stringify(healthReport, null, 2);
        fs.writeFileSync(reportFileName, reportJson);
        // Clean up uploaded file
        fs.unlinkSync(filePath);
        res.json({ message: "Report generated and saved", file: reportFileName, data: healthReport });
    } catch (error) {
        console.error("Error processing document:", error);
        res.status(500).send("Error processing document");
    }
});

export { UniversalHealthReport };
