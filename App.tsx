import React, { useState } from 'react';
import type { ArticleData } from './types';
import { grabArticleContent, grabArticleContentFromImage } from './services/geminiService';
import { captureTab } from './utils/screenshot';
import UrlInputForm from './components/UrlInputForm';
import Loader from './components/Loader';
import ErrorDisplay from './components/ErrorDisplay';
import ArticleDisplay from './components/ArticleDisplay';
import ScreenshotFallback from './components/ScreenshotFallback';

const App: React.FC = () => {
  const [url, setUrl] = useState<string>('https://www.theverge.com/2024/7/22/24202888/apple-intelligence-ios-18-macos-sequoia-beta');
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showScreenshotFallback, setShowScreenshotFallback] = useState<boolean>(false);

  const resetState = () => {
    setIsLoading(true);
    setError(null);
    setArticle(null);
    setShowScreenshotFallback(false);
  };

  const handleGrabArticle = async () => {
    if (!url.trim()) {
      setError('Please enter a valid URL.');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        setError('Please enter a full URL starting with http:// or https://');
        return;
    }

    resetState();

    try {
      const data = await grabArticleContent(url);
      if (data && data.title && data.textContent) {
        if (data.title === "Extraction Failed") {
            const errorMessage = `AI Error: ${data.textContent}`;
            setError(errorMessage);
            if (data.textContent?.includes('unable to directly access')) {
                setShowScreenshotFallback(true);
            }
            setArticle(null);
        } else {
            setArticle(data);
        }
      } else {
        setError('Failed to extract meaningful content from the URL. The page might be protected, or the structure is not recognized.');
        setArticle(null);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleScreenshotMethod = async () => {
      resetState();
      
      try {
          const imageData = await captureTab();
          const data = await grabArticleContentFromImage(imageData);
           if (data && data.title && data.textContent) {
              setArticle(data);
          } else {
              setError('AI failed to extract content from the screenshot. Please ensure the article text is clearly visible.');
          }
      } catch (err) {
          console.error(err);
           const message = err instanceof Error ? err.message.toLowerCase() : '';
           // Don't show an error if the user simply cancelled the screen share prompt
          if (!message.includes('permission denied') && !message.includes('not found')) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred during screen capture.');
          }
      } finally {
          setIsLoading(false);
      }
  };


  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Article Grabber
          </h1>
          <p className="text-gray-400 mt-2 text-lg">
            Paste a news article URL and let AI extract the core content.
          </p>
        </header>

        <main className="w-full">
          <UrlInputForm
            url={url}
            setUrl={setUrl}
            onSubmit={handleGrabArticle}
            isLoading={isLoading}
          />

          <div className="mt-8 space-y-4">
            {isLoading && <Loader />}
            {error && <ErrorDisplay message={error} />}
            {showScreenshotFallback && !isLoading && (
              <ScreenshotFallback onCapture={handleScreenshotMethod} />
            )}
            {article && !isLoading && <ArticleDisplay article={article} />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;