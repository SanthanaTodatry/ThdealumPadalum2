import React, { useState, useEffect } from 'react';
import TamilSongsDesktop from './TamilSongsDesktop';
import TamilSongsMobile from './TamilSongsMobile';

const TamilSongsApp = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkDevice = () => {
      // Consider mobile if width is less than 768px (tablet breakpoint)
      setIsMobile(window.innerWidth < 768);
      setIsLoading(false);
    };

    // Check immediately
    checkDevice();

    // Listen for window resize
    window.addEventListener('resize', checkDevice);

    // Cleanup listener on unmount
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Show loading while determining device type
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-3xl font-bold mb-4 bg-gradient-to-r from-yellow-300 via-pink-300 to-white bg-clip-text text-transparent animate-pulse">
            தேடலும் பாடலும்
          </div>
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  // Render appropriate component based on device type
  return isMobile ? <TamilSongsMobile /> : <TamilSongsDesktop />;
};

export default TamilSongsApp;