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

  // Search for video when song changes
  useEffect(() => {
    if (song && !videoId) {
      searchForVideo(song);
    }
  }, [song]);

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
      const query = `${song.song} ${song.movie} ${song.singer}`;
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

  // YouTube player options for large display
  const opts = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 0,
      controls: 0,
      rel: 0,
      modestbranding: 1,
      fs: 0,
      iv_load_policy: 3,
      showinfo: 0,
      disablekb: 1,
    },
  };

  // Handle player events
  const onReady = (event) => {
    setPlayer(event.target);
  };

  const onStateChange = (event) => {
    if (event.data === 1) {
      onPlay && onPlay();
    } else if (event.data === 2) {
      onPause && onPause();
    } else if (event.data === 0) {
      onNext && onNext();
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p>🔍 Finding video...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !videoId) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <p className="font-medium mb-2">Video not found</p>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => searchForVideo(song)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-black">
      {videoId && (
        <div className="relative h-full w-full">
          {/* Note: You'll need to add react-youtube and implement the actual YouTube component */}
          <div className="h-full flex items-center justify-center text-white">
            <div className="text-center">
              <div className="text-2xl mb-2">📺 Video Ready</div>
              <div className="text-lg">{song.song}</div>
              <div className="text-sm text-gray-400">Video ID: {videoId}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CleanYouTubePlayer;
