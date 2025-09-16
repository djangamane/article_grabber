import { GoogleGenAI } from "@google/genai";
import type { ArticleData } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function buildPrompt(articleUrl: string): string {
  return `You are an expert web content extraction agent. Your goal is to visit a URL, analyze its content, and extract the core article information, returning it as a clean JSON object.

URL to analyze: ${articleUrl}

**Primary Goal:** Extract the main article's title, text content, and primary image.

**Instructions:**

1.  **Analyze the Page**: Access the content at the provided URL. Be aware that some pages use client-side rendering; your analysis should account for the fully rendered content.

2.  **Extract Title**: Find the most appropriate title for the article.
    *   **Priority 1**: The text inside the first \`<h1>\` tag.
    *   **Priority 2**: If no \`<h1>\` exists, use the content of the document's \`<title>\` tag.

3.  **Extract Main Image URL**: Find the most representative image for the article.
    *   **Priority 1**: The URL from the \`content\` attribute of \`<meta property="og:image">\`.
    *   **Priority 2**: The URL from the \`content\` attribute of \`<meta name="twitter:image">\`.
    *   **Priority 3**: The URL from the \`src\` attribute of the largest, most prominent \`<img>\` tag that appears to be the main article image.
    *   Ensure the final URL is absolute. If no suitable image is found, return \`null\`.

4.  **Extract and Clean Text Content**: This is the most critical step.
    *   Intelligently identify the main block of text that constitutes the article body. Use semantic tags like \`<article>\`, \`<main>\`, and header tags (\`<h2>\`, \`<h3>\`) as clues, but your primary focus should be on identifying the largest contiguous block of paragraph text.
    *   **Aggressively clean the text**:
        *   Remove all content from navigational elements (\`<nav>\`), headers (\`<header>\`), footers (\`<footer>\`), sidebars (\`<aside>\`), and pop-ups.
        *   Strip out all scripts, styles, and iframes.
        *   Remove common non-content sections like "Related Articles", "Comments", or social sharing buttons.
        *   Normalize whitespace: replace multiple spaces, newlines, or tabs with a single space.
        *   Trim leading/trailing whitespace from the final result.

5.  **Output Format**: Return **ONLY** a raw JSON object with the specified structure. Do not include any explanatory text or markdown formatting (like \`\`\`json\`).

    **JSON Structure:**
    {
      "title": "string",
      "textContent": "string",
      "imageUrl": "string | null"
    }

6.  **Error Handling & Troubleshooting**:
    *   If you are blocked from accessing the page (e.g., by a paywall, CAPTCHA, or login screen), or if the page appears to have no meaningful article content, **do not return nulls**. Instead, return a JSON object where the \`title\` is "Extraction Failed" and the \`textContent\` is a brief explanation of the problem (e.g., "Page requires a login to view content.", "Content is behind a paywall.", "I am unable to directly access and parse the full content of the provided URL...").
`;
}

async function parseGeminiResponse(responseText: string): Promise<ArticleData> {
  let jsonString = responseText.trim();

  // Clean up potential markdown formatting
  const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = jsonString.match(jsonRegex);
  if (match && match[1]) {
    jsonString = match[1];
  }

  try {
    const parsedData: ArticleData = JSON.parse(jsonString);
    return parsedData;
  } catch (e) {
    console.error("Failed to parse JSON from Gemini response:", jsonString);
    throw new Error("The AI returned a response that was not valid JSON.");
  }
}

export async function grabArticleContent(articleUrl: string): Promise<ArticleData> {
  try {
    const prompt = buildPrompt(articleUrl);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
      },
    });

    return parseGeminiResponse(response.text);

  } catch (error) {
    console.error("Error fetching or processing article content:", error);
    throw new Error("Failed to communicate with the AI service. Please check your connection and API key.");
  }
}

export async function grabArticleContentFromImage(imageData: string): Promise<ArticleData> {
  const base64Data = imageData.split(',')[1];

  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Data,
    },
  };

  const textPart = {
    text: `You are an expert Optical Character Recognition (OCR) and content extraction agent. Your goal is to analyze the provided screenshot of a news article and extract its core content.

**Instructions:**

1.  **Identify the Title**: Find the largest, most prominent text at the top of the article. This is the title.
2.  **Extract Body Text**: Read all the paragraphs that form the main body of the article.
3.  **Clean the Content**:
    *   Be meticulous. Exclude any text from advertisements, navigation menus, "related articles" sections, cookie banners, or headers/footers.
    *   Combine the extracted paragraphs into a single string.
    *   Normalize whitespace: replace multiple spaces or newlines with a single space.
4.  **Output Format**: Return **ONLY** a raw JSON object with the specified structure. Do not include any explanatory text or markdown formatting. The \`imageUrl\` should be set to \`null\`.

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
      contents: { parts: [imagePart, textPart] },
    });

    return parseGeminiResponse(response.text);

  } catch (error) {
    console.error("Error processing image content:", error);
    throw new Error("Failed to communicate with the AI service for image analysis.");
  }
}
