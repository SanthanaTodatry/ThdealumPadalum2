import { useState, useMemo, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';
import { Search, RotateCcw, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat } from 'lucide-react';
import YouTube from 'react-youtube';
import { tamilSongsData } from './tamilSongsData';
import UltimateMusicArchaeology from './UltimateMusicArchaeology';

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

  // YouTube player options - REMOVED controls and info to clean it up
  const opts = {
    width: '100%',
    height: '240',
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
      <div className={`bg-white rounded-lg border ${className}`}>  
        <div className="h-60 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">🔍 Finding video...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !videoId) {
    return (
      <div className={`bg-white rounded-lg border ${className}`}>  
        <div className="h-60 flex items-center justify-center">
          <div className="text-center text-red-500">
            <p className="font-medium">Video not found</p>
            <p className="text-sm text-gray-600 mt-1">{error}</p>
            <button
              onClick={() => searchForVideo(song)}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              🔄 Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border ${className}`}>      
      {videoId && (
        <div className="relative">
          <YouTube
            videoId={videoId}
            opts={opts}
            onReady={onReady}
            onStateChange={onStateChange}
            className="youtube-player"
          />
        </div>
      )}
    </div>
  );
};

const TamilSongsVisualization = () => {
  const songsData = tamilSongsData;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedComposers, setSelectedComposers] = useState([]);
  const [selectedSingers, setSelectedSingers] = useState([]);
  const [selectedLyricists, setSelectedLyricists] = useState([]);
  const [activeFilterTab, setActiveFilterTab] = useState('years');
  const [chartFilters, setChartFilters] = useState({ year: null, singer: null, composer: null, lyricist: null });
  const [chartResetTrigger, setChartResetTrigger] = useState(0);

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);

  // Reset trigger for charts
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedYears([]);
    setSelectedComposers([]);
    setSelectedSingers([]);
    setSelectedLyricists([]);
    setActiveFilterTab('years');
    setChartFilters({ year: null, singer: null, composer: null, lyricist: null });
    setChartResetTrigger(prev => prev + 1);
  };

  // Unique values
  const uniqueYears = [...new Set(songsData.map(song => song.year))].sort();
  const uniqueComposers = [...new Set(songsData.map(song => song.composer))].sort();
  const uniqueSingers = [...new Set(songsData.map(song => song.singer))].sort();
  const uniqueLyricists = [...new Set(songsData.map(song => song.lyricist))].sort();

  // Filtered songs
  const filteredSongs = useMemo(() => {
    return songsData.filter(song => {
      const matchesSearch = searchTerm.trim() ? searchTerm.split(/[,\s]+/).every(term =>
        [song.movie, song.song, song.composer, song.singer, song.lyricist]
          .some(field => field.toLowerCase().includes(term.toLowerCase()))
      ) : true;
      const matchesYear = !selectedYears.length || selectedYears.includes(song.year);
      const matchesComposer = !selectedComposers.length || selectedComposers.includes(song.composer);
      const matchesSinger = !selectedSingers.length || selectedSingers.includes(song.singer);
      const matchesLyricist = !selectedLyricists.length || selectedLyricists.includes(song.lyricist);
      const matchesChartYear = !chartFilters.year || song.year === chartFilters.year;
      const matchesChartSinger = !chartFilters.singer || song.singer === chartFilters.singer;
      const matchesChartComposer = !chartFilters.composer || song.composer === chartFilters.composer;
      const matchesChartLyricist = !chartFilters.lyricist || song.lyricist === chartFilters.lyricist;

      return matchesSearch && matchesYear && matchesComposer && matchesSinger && matchesLyricist &&
             matchesChartYear && matchesChartSinger && matchesChartComposer && matchesChartLyricist;
    });
  }, [searchTerm, selectedYears, selectedComposers, selectedSingers, selectedLyricists, chartFilters]);

  // Chart data
  const yearData = useMemo(() => {
    const counts = {};
    filteredSongs.forEach(song => { counts[song.year] = (counts[song.year] || 0) + 1; });
    return Object.entries(counts)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => a.year - b.year);
  }, [filteredSongs]);

  const singerData = useMemo(() => {
    const counts = {};
    filteredSongs.forEach(song => { counts[song.singer] = (counts[song.singer] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).
             sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filteredSongs]);

  const composerData = useMemo(() => {
    const counts = {};
    filteredSongs.forEach(song => { counts[song.composer] = (counts[song.composer] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).
             sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filteredSongs]);

  const lyricistData = useMemo(() => {
    const counts = {};
    filteredSongs.forEach(song => { counts[song.lyricist] = (counts[song.lyricist] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).
             sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filteredSongs]);

  // Handlers
  const handleYearClick = data => data?.activePayload && setChartFilters(prev => ({
    ...prev,
    year: prev.year === data.activePayload[0].payload.year ? null : data.activePayload[0].payload.year
  }));
  const handleSingerClick = data => setChartFilters(prev => ({ ...prev, singer: prev.singer === data?.name ? null : data?.name }));
  const handleComposerClick = data => setChartFilters(prev => ({ ...prev, composer: prev.composer === data?.name ? null : data?.name }));
  const handleLyricistClick = data => setChartFilters(prev => ({ ...prev, lyricist: prev.lyricist === data?.name ? null : data?.name }));

  const ToggleFilterButton = ({ active, onClick, children }) => (
    <button onClick={onClick} className={`px-3 py-1.5 text-xs rounded border transition-all w-full text-left ${
      active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-300 hover:border-blue-500'
    }`}>{children}</button>
  );

  const sortedFilteredSongs = useMemo(() => [...filteredSongs].sort((a, b) => a.song.localeCompare(b.song)), [filteredSongs]);
  const currentPlaylist = useMemo(() => isShuffled ? [...sortedFilteredSongs].sort(() => Math.random() - 0.5) : sortedFilteredSongs, [sortedFilteredSongs, isShuffled]);
  const currentSong = currentPlaylist[currentSongIndex] || null;

  const togglePlay = () => setIsPlaying(!isPlaying);
  const playNext = () => setCurrentSongIndex(idx => (idx + 1) % currentPlaylist.length);
  const playPrevious = () => setCurrentSongIndex(idx => (idx -  in currentPlaylist.length + currentPlaylist.length) % currentPlaylist.length);

  useEffect(() => { if (currentSongIndex >= currentPlaylist.length) setCurrentSongIndex(0); }, [currentPlaylist.length]);

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-light text-slate-700">
      {/* Title Header with Search */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-500 to-indigo-600 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-300 via-pink-300 to-white bg-clip-text text-transparent drop-shadow-lg animate-pulse">
          தேடலும் பாடலும்
        </h1>
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/70 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white/50 focus:border-white/50 focus:bg-white/30 transition-all"
              placeholder="Search songs, movies, artists... (comma/space separated)"
            />
          </div>
        </div>
        <div className="w-48"></div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {/* Panel 1: Filters */}
        <div className="bg-white border-r border-blue-200 flex flex-col" style={{ width: '300px', minWidth: '300px' }}>
          <div className="p-4 border-b border-blue-200">
            <button onClick={resetFilters} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm mb-4">
              <RotateCcw className="w-4 h-4" /> Reset All
            </button>
            <div className="grid grid-cols-2 gap-1">
              <button onClick={() => setActiveFilterTab('years')} className={`px-2 py-1.5 text-xs rounded transition-colors ${activeFilterTab === 'years' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>Years {selectedYears.length > 0 && `(${selectedYears.length})`}</button>
              <button onClick={() => setActiveFilterTab('singers')} className={`px-2 py-1.5 text-xs rounded transition-colors ${activeFilterTab === 'singers' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>Singer {selectedSingers.length > 0 && `(${selectedSingers.length})`}</button>
              {/* Add Composer and Lyricist tabs similarly */}
            </div>
          </div>
        </div>
        {/* Panel 2: Stunning Visualizations */}
        <div className="flex-1 p-4 overflow-y-auto min-w-0">
          <UltimateMusicArchaeology
            filteredSongs={filteredSongs}
            onYearClick={handleYearClick}
            onSingerClick={handleSingerClick}
            onComposerClick={handleComposerClick}
            onLyricistClick={handleLyricistClick}
            chartFilters={chartFilters}
            resetTrigger={chartResetTrigger}
          />
        </div>
        {/* Panel 3: Clean Player + Playlist Layout */}
        <div className="bg-white border-l border-blue-200 flex flex-col" style={{ width: '300px', minWidth: '300px' }}>
          {currentSong && (
            <div className="border-b border-blue-200">
              <CleanYouTubePlayer song={currentSong} isPlaying={isPlaying} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onNext={playNext} onPrevious={playPrevious} className="rounded-none border-0" />
            </div>
          )}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
            {currentSong && (
              <div className="mb-3">
                <div className="text-xs text-blue-600 font-medium">NOW PLAYING</div>
                <div className="text-sm font-medium text-blue-800 truncate">{currentSong.song}</div>
                <div className="text-xs text-slate-600 truncate">{currentSong.movie} • {currentSong.singer}</div>
              </div>
            )}
            <div className="flex items-center justify-center gap-3 mb-3">
              {/* Shuffle, Prev, Play/Pause, Next buttons */}
            </div>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-lg font-medium text-blue-800 mb-4">Playlist ({currentPlaylist.length})</h3>
            <div className="space-y-2">
              {currentPlaylist.map((song, index) => (
                <div key={song.id} className={`p-3 border rounded cursor-pointer transition-all ${currentSong?.id === song.id ? 'border-blue-500 bg-blue-50' : 'border-blue-100 bg-blue-50/30 hover:bg-blue-50/50'}`} onClick={() => setCurrentSongIndex(index)}>
                  {/* Song item details */}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TamilSongsVisualization;
