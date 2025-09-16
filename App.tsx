import React, { useState } from "react";
import type { ArticleData } from "./types";
import UrlInputForm from "./components/UrlInputForm";
import Loader from "./components/Loader";
import ErrorDisplay from "./components/ErrorDisplay";
import ArticleDisplay from "./components/ArticleDisplay";

const App: React.FC = () => {
  const [url, setUrl] = useState<string>(
    "https://www.theverge.com/2024/7/22/24202888/apple-intelligence-ios-18-macos-sequoia-beta",
  );
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGrabArticle = async () => {
    if (!url.trim()) {
      setError("Please enter a valid URL.");
      return;
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      setError("Please enter a full URL starting with http:// or https://");
      return;
    }

    setIsLoading(true);
    setError(null);
    setArticle(null);

    try {
      const response = await fetch("http://localhost:3001/grab", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to grab article");
      }

      const data = await response.json();
      setArticle(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred.",
      );
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
            {article && !isLoading && <ArticleDisplay article={article} />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
