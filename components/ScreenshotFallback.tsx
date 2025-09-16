import React from 'react';

interface ScreenshotFallbackProps {
  onCapture: () => void;
}

const ScreenshotFallback: React.FC<ScreenshotFallbackProps> = ({ onCapture }) => {
  return (
    <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
      <p className="text-center sm:text-left">
        <strong className="font-semibold">Direct access failed.</strong>
        <span className="block sm:inline sm:ml-2">Try capturing the tab as an image instead.</span>
      </p>
      <button
        onClick={onCapture}
        className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 flex-shrink-0 w-full sm:w-auto"
      >
        Use Screenshot Method
      </button>
    </div>
  );
};

export default ScreenshotFallback;
