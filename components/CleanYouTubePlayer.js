import React, { useState, useEffect } from 'react';

const CleanYouTubePlayer = ({ 
  song, 
  isPlaying, 
  onPlay, 
  onPause, 
  onNext, 
  onPrevious,
  className = ""
}) => {
  const [videoId, setVideoId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [player, setPlayer] = useState(null);

  const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

  // Reset video when song changes
  useEffect(() => {
    if (song) {
      setVideoId(null);
      setError(null);
      searchForVideo(song);
    }
  }, [song?.id]);

  // Auto-advance when playing state changes
  useEffect(() => {
    if (player && videoId) {
      if (isPlaying) {
        player.playVideo();
      } else {
        player.pauseVideo();
      }
    }
  }, [isPlaying, player, videoId]);

  const searchForVideo = async (song) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!YOUTUBE_API_KEY) {
        throw new Error('YouTube API key not configured');
      }

      const query = `${song.song} ${song.movie} ${song.singer} tamil song`;
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to search YouTube');
      }
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        setVideoId(data.items[0].id.videoId);
      } else {
        throw new Error('No videos found');
      }
    } catch (error) {
      console.error('YouTube search error:', error);
      setError(error.message);
    }
    
    setIsLoading(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-lg">🔍 Finding video...</p>
          <p className="text-sm text-gray-400 mt-2">{song.song}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !videoId) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <p className="font-medium mb-2 text-lg">Video not found</p>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          <div className="mb-4 p-3 bg-gray-800 rounded">
            <p className="text-sm"><strong>Song:</strong> {song.song}</p>
            <p className="text-sm"><strong>Movie:</strong> {song.movie}</p>
            <p className="text-sm"><strong>Singer:</strong> {song.singer}</p>
          </div>
          <button
            onClick={() => searchForVideo(song)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-black rounded-lg overflow-hidden">
      {videoId ? (
        <div className="relative h-full w-full">
          <div className="h-full flex flex-col items-center justify-center text-white bg-gradient-to-br from-gray-900 to-black">
            <div className="text-center max-w-lg p-8">
              <div className="text-6xl mb-6">📺</div>
              <h2 className="text-2xl font-bold mb-2">{song.song}</h2>
              <p className="text-lg text-gray-300 mb-1">{song.movie} ({song.year})</p>
              <p className="text-md text-gray-400 mb-6">{song.singer}</p>
              
              <div className="bg-green-600 text-white px-4 py-2 rounded-lg mb-4">
                ✅ Video Found: {videoId}
              </div>
              
              <div className="text-sm text-gray-500 bg-gray-800 p-3 rounded">
                <p><strong>Next Step:</strong> Install react-youtube</p>
                <p><code>npm install react-youtube</code></p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-white">
          <div className="text-center">
            <div className="text-4xl mb-4">🎵</div>
            <div>Preparing video...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CleanYouTubePlayer;
