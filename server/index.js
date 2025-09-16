require('dotenv').config();
const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function parseGeminiResponse(responseText) {
  let jsonString = responseText.trim();
  const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = jsonString.match(jsonRegex);
  if (match && match[1]) {
    jsonString = match[1];
  }

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Failed to parse JSON from Gemini response:", jsonString);
    throw new Error("The AI returned a response that was not valid JSON.");
  }
}

async function grabArticleContentFromImage(imageData) {
  const imageParts = imageData.map(data => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data,
    },
  }));

  const textPart = {
    text: `You are an expert Optical Character Recognition (OCR) and content extraction agent. Your goal is to analyze the provided screenshots of a news article and extract its core content. The screenshots may be sequential, representing a scrolling page.

**Instructions:**

1.  **Synthesize Content**: Treat the series of images as a single, continuous document.
2.  **Identify the Title**: Find the largest, most prominent text at the top of the article from the first screenshot.
3.  **Extract Body Text**: Read all the paragraphs that form the main body of the article across all screenshots.
4.  **Clean the Content**:
    *   Be meticulous. Exclude any text from advertisements, navigation menus, "related articles" sections, cookie banners, or headers/footers.
    *   Combine the extracted paragraphs into a single, coherent string.
    *   Deduplicate any overlapping text between screenshots.
    *   Normalize whitespace: replace multiple spaces or newlines with a single space.
5.  **Output Format**: Return **ONLY** a raw JSON object with the specified structure. Do not include any explanatory text or markdown formatting. The imageUrl should be set to null.

**JSON Structure:**
{
  "title": "string",
  "textContent": "string",
  "imageUrl": null
}`,
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [textPart, ...imageParts] },
    });

    return parseGeminiResponse(response.text);

  } catch (error) {
    console.error("Error processing image content:", error);
    throw new Error("Failed to communicate with the AI service for image analysis.");
  }
}

app.post('/grab', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        const screenshots = [];
        const pageHeight = await page.evaluate(() => document.body.scrollHeight);
        const viewportHeight = page.viewport().height;

        for (let i = 0; i < pageHeight; i += viewportHeight) {
            await page.evaluate(i => window.scrollTo(0, i), i);
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait for scroll and render
            const screenshot = await page.screenshot({ encoding: 'base64', type: 'jpeg' });
            screenshots.push(screenshot);
        }

        await browser.close();

        const article = await grabArticleContentFromImage(screenshots);
        res.json(article);

    } catch (error) {
        console.error('Error during scraping or AI processing:', error);
        res.status(500).json({ error: 'Failed to grab article content.' });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
