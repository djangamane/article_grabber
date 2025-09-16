
import React from 'react';
import type { ArticleData } from '../types';

interface ArticleDisplayProps {
  article: ArticleData;
}

const ArticleDisplay: React.FC<ArticleDisplayProps> = ({ article }) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 sm:p-8 animate-fade-in">
      {article.imageUrl && (
        <img
          src={article.imageUrl}
          alt={article.title}
          className="w-full h-64 object-cover rounded-lg mb-6 shadow-lg"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      )}
      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-400 mb-4">
        {article.title}
      </h2>
      <p className="text-gray-300 leading-relaxed whitespace-pre-wrap font-serif text-lg">
        {article.textContent}
      </p>
    </div>
  );
};

export default ArticleDisplay;
