import React, { useState, useEffect } from 'react';
import YouTube from 'react-youtube';

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
  const [isPlayerReady, setIsPlayerReady] = useState(false); // ADD THIS STATE

  const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

  // Reset video when song changes
  useEffect(() => {
    if (song) {
      // IMPORTANT: Reset player state when song changes
      setIsPlayerReady(false);
      setPlayer(null);
      setVideoId(null);
      setError(null);
      searchForVideo(song);
    }
  }, [song?.id]);

  // Auto-advance when playing state changes - ADD SAFETY CHECKS
  useEffect(() => {
    if (player && videoId && isPlayerReady) { // Check isPlayerReady
      try {
        if (isPlaying) {
          player.playVideo();
        } else {
          player.pauseVideo();
        }
      } catch (error) {
        console.warn('YouTube player action failed:', error);
        // Don't crash, just log the error
      }
    }
  }, [isPlaying, player, videoId, isPlayerReady]);

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

  // Get current environment details
  const getCurrentOrigin = () => {
    if (typeof window === 'undefined') {
      return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    }
    return window.location.origin;
  };

  // YouTube player options for large display
  const opts = {
    width: '100%',
    height: '100%',
    host: 'https://www.youtube-nocookie.com',
    playerVars: {
      autoplay: 0,
      controls: 1,
      rel: 0,
      modestbranding: 1,
      fs: 1,
      iv_load_policy: 3,
      showinfo: 0,
      origin: getCurrentOrigin(),
      enablejsapi: 1,
    },
  };

  // Handle player events - ADD SAFETY CHECKS
  const onReady = (event) => {
    console.log('YouTube player ready');
    setPlayer(event.target);
    setIsPlayerReady(true); // Mark player as ready
  };

  const onStateChange = (event) => {
    try {
      if (event.data === 1) {
        onPlay && onPlay();
      } else if (event.data === 2) {
        onPause && onPause();
      } else if (event.data === 0) {
        onNext && onNext();
      }
    } catch (error) {
      console.warn('YouTube state change error:', error);
    }
  };

  const onError = (event) => {
    console.error('YouTube player error:', event);
    setError('Video playback error');
    setIsPlayerReady(false);
  };

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (player && isPlayerReady) {
        try {
          player.destroy();
        } catch (error) {
          console.warn('Error destroying player:', error);
        }
      }
    };
  }, [player, isPlayerReady]);

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
    <div className="h-full w-full bg-black overflow-hidden" style={{ position: 'relative', zIndex: 1 }}>
      {videoId ? (
        <div className="relative h-full w-full overflow-hidden">
          <div className="absolute inset-0 p-2">
            <YouTube
              key={`${videoId}-${song?.id}`} // Force re-render on song change
              videoId={videoId}
              opts={opts}
              onReady={onReady}
              onStateChange={onStateChange}
              onError={onError} // ADD ERROR HANDLER
              className="w-full h-full"
              style={{ 
                width: '100%', 
                height: '100%',
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            />
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
