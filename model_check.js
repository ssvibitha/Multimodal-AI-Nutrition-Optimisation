import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Error: API_KEY is not set in the environment variables.");
  process.exit(1);
}

// const genAI = new GoogleGenerativeAI(API_KEY);

// Direct fetch because SDK might not support listModels directly or requires different setup
async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("Available Gemini models:");
    if (data.models) {
      for (const model of data.models) {
        console.log(`- Name: ${model.name}`);
        console.log(`  DisplayName: ${model.displayName}`);
        console.log(`  Version: ${model.version}`);
        console.log(`  Description: ${model.description}`);
        console.log('---');
      }
    } else {
      console.log("No models found or unexpected format:", data);
    }
  } catch (error) {
    console.error("Error fetching models:", error);
  }
}

listModels();
