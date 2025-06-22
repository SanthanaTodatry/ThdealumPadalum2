import { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';
import { Search, RotateCcw, Play, Pause, SkipForward, SkipBack, Shuffle, Menu, X, BarChart3, Music, Home } from 'lucide-react';
import YouTube from 'react-youtube';
import StunningVisualizations from './StunningVisualizations';
import { tamilSongsData } from './tamilSongsData';

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

  // YouTube player options - Clean mobile version
  const opts = {
    width: '100%',
    height: '200',
    playerVars: {
      autoplay: 0,
      controls: 0, // Hide YouTube controls
      rel: 0,
      modestbranding: 1,
      fs: 0, // Disable fullscreen
      iv_load_policy: 3, // Hide annotations
      showinfo: 0, // Hide video info
      disablekb: 1, // Disable keyboard controls
    },
  };

  // Handle player events
  const onReady = (event) => {
    setPlayer(event.target);
  };

  const onStateChange = (event) => {
    // YouTube player states: 0 (ended), 1 (playing), 2 (paused)
    if (event.data === 1) {
      onPlay && onPlay();
    } else if (event.data === 2) {
      onPause && onPause();
    } else if (event.data === 0) {
      // Video ended, auto-advance to next
      onNext && onNext();
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg ${className}`}>
        <div className="h-48 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto mb-3"></div>
            <p className="text-gray-600 text-sm">🔍 Finding video...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !videoId) {
    return (
      <div className={`bg-white rounded-lg ${className}`}>
        <div className="h-48 flex items-center justify-center">
          <div className="text-center text-red-500">
            <p className="font-medium text-sm">Video not found</p>
            <p className="text-xs text-gray-600 mt-1">{error}</p>
            <button
              onClick={() => searchForVideo(song)}
              className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              🔄 Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg ${className}`}>
      {/* Clean YouTube Player */}
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

const TamilSongsMobile = () => {

  // Mock data
  const songsData = tamilSongsData;

  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedComposers, setSelectedComposers] = useState([]);
  const [selectedSingers, setSelectedSingers] = useState([]);
  const [selectedLyricists, setSelectedLyricists] = useState([]);
  const [activeFilterTab, setActiveFilterTab] = useState('years');
  const [currentView, setCurrentView] = useState('home');
  const [showFilters, setShowFilters] = useState(false);
  const [chartFilters, setChartFilters] = useState({
    year: null,
    singer: null,
    composer: null,
    lyricist: null
  });

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);

  // Filter functions
  const toggleFilter = (item, selectedItems, setSelectedItems) => {
    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter(i => i !== item));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedYears([]);
    setSelectedComposers([]);
    setSelectedSingers([]);
    setSelectedLyricists([]);
    setActiveFilterTab('years');
    setChartFilters({
      year: null,
      singer: null,
      composer: null,
      lyricist: null
    });
  };

  // Get unique values
  const uniqueYears = [...new Set(songsData.map(song => song.year))].sort();
  const uniqueComposers = [...new Set(songsData.map(song => song.composer))].sort();
  const uniqueSingers = [...new Set(songsData.map(song => song.singer))].sort();
  const uniqueLyricists = [...new Set(songsData.map(song => song.lyricist))].sort();

  // Filtered data
  const filteredSongs = useMemo(() => {
    return songsData.filter(song => {
      let matchesSearch = true;
      if (searchTerm.trim()) {
        const searchTerms = searchTerm.split(/[,\s]+/).filter(term => term.length > 0);
        matchesSearch = searchTerms.every(term => 
          song.movie.toLowerCase().includes(term.toLowerCase()) ||
          song.song.toLowerCase().includes(term.toLowerCase()) ||
          song.composer.toLowerCase().includes(term.toLowerCase()) ||
          song.singer.toLowerCase().includes(term.toLowerCase()) ||
          song.lyricist.toLowerCase().includes(term.toLowerCase())
        );
      }
      
      const matchesYear = selectedYears.length === 0 || selectedYears.includes(song.year);
      const matchesComposer = selectedComposers.length === 0 || selectedComposers.includes(song.composer);
      const matchesSinger = selectedSingers.length === 0 || selectedSingers.includes(song.singer);
      const matchesLyricist = selectedLyricists.length === 0 || selectedLyricists.includes(song.lyricist);

      const matchesChartYear = !chartFilters.year || song.year === chartFilters.year;
      const matchesChartSinger = !chartFilters.singer || song.singer === chartFilters.singer;
      const matchesChartComposer = !chartFilters.composer || song.composer === chartFilters.composer;
      const matchesChartLyricist = !chartFilters.lyricist || song.lyricist === chartFilters.lyricist;

      return matchesSearch && matchesYear && matchesComposer && matchesSinger && matchesLyricist &&
             matchesChartYear && matchesChartSinger && matchesChartComposer && matchesChartLyricist;
    });
  }, [searchTerm, selectedYears, selectedComposers, selectedSingers, selectedLyricists, chartFilters]);

  // Chart data preparation
  const yearData = useMemo(() => {
    const yearCounts = {};
    filteredSongs.forEach(song => {
      yearCounts[song.year] = (yearCounts[song.year] || 0) + 1;
    });
    return Object.entries(yearCounts)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => a.year - b.year);
  }, [filteredSongs]);

  const singerData = useMemo(() => {
    const singerCounts = {};
    filteredSongs.forEach(song => {
      singerCounts[song.singer] = (singerCounts[song.singer] || 0) + 1;
    });
    return Object.entries(singerCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredSongs]);

  const composerData = useMemo(() => {
    const composerCounts = {};
    filteredSongs.forEach(song => {
      composerCounts[song.composer] = (composerCounts[song.composer] || 0) + 1;
    });
    return Object.entries(composerCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredSongs]);

  const lyricistData = useMemo(() => {
    const lyricistCounts = {};
    filteredSongs.forEach(song => {
      lyricistCounts[song.lyricist] = (lyricistCounts[song.lyricist] || 0) + 1;
    });
    return Object.entries(lyricistCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredSongs]);

  // Current playlist
  const currentPlaylist = useMemo(() => {
    return isShuffled 
      ? [...filteredSongs].sort(() => Math.random() - 0.5)
      : filteredSongs;
  }, [filteredSongs, isShuffled]);

  const currentSong = currentPlaylist[currentSongIndex] || null;

  // Audio control functions
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    if (currentPlaylist.length === 0) return;
    const nextIndex = (currentSongIndex + 1) % currentPlaylist.length;
    setCurrentSongIndex(nextIndex);
  };

  const playPrevious = () => {
    if (currentPlaylist.length === 0) return;
    const prevIndex = currentSongIndex === 0 ? currentPlaylist.length - 1 : currentSongIndex - 1;
    setCurrentSongIndex(prevIndex);
  };

  // Chart click handlers
  const handleYearClick = (data) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const year = data.activePayload[0].payload.year;
      setChartFilters(prev => ({ 
        ...prev, 
        year: prev.year === year ? null : year 
      }));
    }
  };

  const handleSingerClick = (data) => {
    const singer = data?.name;
    setChartFilters(prev => ({ 
      ...prev, 
      singer: prev.singer === singer ? null : singer 
    }));
  };

  const handleComposerClick = (data) => {
    const composer = data?.name;
    setChartFilters(prev => ({ 
      ...prev, 
      composer: prev.composer === composer ? null : composer 
    }));
  };

  const handleLyricistClick = (data) => {
    const lyricist = data?.name;
    setChartFilters(prev => ({ 
      ...prev, 
      lyricist: prev.lyricist === lyricist ? null : lyricist 
    }));
  };
  
  // Colors - matching desktop version
  const SINGER_COLORS = ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];
  const COMPOSER_COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];
  const LYRICIST_COLORS = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2'];

  const FilterButton = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
        active 
          ? 'bg-blue-600 text-white border-blue-600' 
          : 'bg-white text-blue-600 border-blue-300 hover:border-blue-500'
      }`}
    >
      {children}
    </button>
  );

  // Mobile Views
  const HomeView = () => (
    <div className="space-y-4">
      {/* Current Playing - Clean Layout */}
      {currentSong && (
        <div className="bg-gradient-to-r from-sky-400 to-sky-500 text-white rounded-xl overflow-hidden">
          {/* Song Info */}
          <div className="p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Music className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-lg">{currentSong.song}</div>
                <div className="text-sky-100 text-sm">{currentSong.movie}</div>
                <div className="text-sky-200 text-xs">{currentSong.singer}</div>
              </div>
            </div>
          </div>

          {/* 1. PLAYER ON TOP */}
          <div className="bg-white">
            <CleanYouTubePlayer
              song={currentSong}
              isPlaying={isPlaying}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onNext={playNext}
              onPrevious={playPrevious}
              className="rounded-none border-0"
            />
          </div>

          {/* 2. CONTROLS BELOW */}
          <div className="p-4">
            <div className="flex items-center justify-center gap-4">
              <button 
                onClick={() => setIsShuffled(!isShuffled)}
                className={`p-2 rounded-full transition-all ${
                  isShuffled ? 'bg-blue-600 text-white' : 'bg-white/90 text-sky-600 hover:bg-white'
                }`}
              >
                <Shuffle className="w-4 h-4" />
              </button>
              
              <button 
                onClick={playPrevious}
                className="p-2 bg-white/90 text-sky-600 rounded-full hover:bg-white transition-all"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              
              <button 
                onClick={togglePlay}
                className="p-3 bg-white text-sky-600 rounded-full hover:scale-105 transition-all shadow-lg"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              
              <button 
                onClick={playNext}
                className="p-2 bg-white/90 text-sky-600 rounded-full hover:bg-white transition-all"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Status */}
            <div className="text-center mt-3">
              <div className="text-xs text-sky-100">
                📺 Auto-advancing playlist
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const FilterView = () => {
  return (
    <div className="h-full">
      {/* Sticky Filter Tabs */}
      <div className="bg-white border-b border-gray-200 py-2 sticky top-0 z-10">
        <div className="text-center mb-2">
          <span className="text-xs text-gray-600 font-medium">Filter By</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setActiveFilterTab('years')}
            className={`py-2 text-center transition-all ${
              activeFilterTab === 'years' 
                ? 'text-yellow-300 bg-purple-600' 
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            } rounded-lg`}
          >
            <div className="text-xs">Years</div>
          </button>
          <button
            onClick={() => setActiveFilterTab('singers')}
            className={`py-2 text-center transition-all ${
              activeFilterTab === 'singers' 
                ? 'text-yellow-300 bg-blue-600' 
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            } rounded-lg`}
          >
            <div className="text-xs">Singers</div>
          </button>
          <button
            onClick={() => setActiveFilterTab('composers')}
            className={`py-2 text-center transition-all ${
              activeFilterTab === 'composers' 
                ? 'text-yellow-300 bg-blue-600' 
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            } rounded-lg`}
          >
            <div className="text-xs">Composers</div>
          </button>
          <button
            onClick={() => setActiveFilterTab('lyricists')}
            className={`py-2 text-center transition-all ${
              activeFilterTab === 'lyricists' 
                ? 'text-yellow-300 bg-teal-600' 
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            } rounded-lg`}
          >
            <div className="text-xs">Lyricists</div>
          </button>
        </div>
      </div>

      {/* Scrollable Filter Content */}
      <div className="p-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
  
        {/* Years Tab */}
        {activeFilterTab === 'years' && (
          <div>
            <div className="space-y-3">
              {(() => {
                const decades = {};
                uniqueYears.forEach(year => {
                  const decade = Math.floor(year / 10) * 10;
                  if (!decades[decade]) decades[decade] = [];
                  decades[decade].push(year);
                });
                
                return Object.entries(decades)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([decade, years]) => {
                    const decadeInt = parseInt(decade);
                    const decadeYears = years.sort((a, b) => a - b);
                    const selectedInDecade = decadeYears.filter(year => selectedYears.includes(year));
                    const allDecadeSelected = selectedInDecade.length === decadeYears.length;
                    
                    return (
                      <div key={decade} className="border border-gray-200 rounded-lg p-3">
                        <button
                          onClick={() => {
                            if (allDecadeSelected) {
                              setSelectedYears(prev => prev.filter(year => !decadeYears.includes(year)));
                            } else {
                              setSelectedYears(prev => [...new Set([...prev, ...decadeYears])]);
                            }
                          }}
                          className={`w-full p-2 rounded-md text-sm font-semibold transition-all ${
                            selectedInDecade.length > 0
                              ? allDecadeSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {decadeInt}s
                        </button>
                        
                        <div className="mt-2 grid grid-cols-4 gap-1">
                          {decadeYears.map(year => (
                            <button
                              key={year}
                              onClick={() => toggleFilter(year, selectedYears, setSelectedYears)}
                              className={`px-2 py-1 text-xs rounded border transition-all ${
                                selectedYears.includes(year)
                                  ? 'bg-blue-500 text-white border-blue-500'
                                  : 'bg-white text-blue-600 border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                              }`}
                            >
                              {year.toString().slice(-2)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  });
              })()}
            </div>
          </div>
        )}

        {/* Singers Tab */}
        {activeFilterTab === 'singers' && (
          <div>
            <div className="grid grid-cols-1 gap-2">
              {uniqueSingers.map(singer => (
                <FilterButton
                  key={singer}
                  active={selectedSingers.includes(singer)}
                  onClick={() => toggleFilter(singer, selectedSingers, setSelectedSingers)}
                >
                  {singer}
                </FilterButton>
              ))}
            </div>
          </div>
        )}

        {/* Composers Tab */}
        {activeFilterTab === 'composers' && (
          <div>
            <div className="grid grid-cols-1 gap-2">
              {uniqueComposers.map(composer => (
                <FilterButton
                  key={composer}
                  active={selectedComposers.includes(composer)}
                  onClick={() => toggleFilter(composer, selectedComposers, setSelectedComposers)}
                >
                  {composer}
                </FilterButton>
              ))}
            </div>
          </div>
        )}

        {/* Lyricists Tab */}
        {activeFilterTab === 'lyricists' && (
          <div>
            <div className="grid grid-cols-1 gap-2">
              {uniqueLyricists.map(lyricist => (
                <FilterButton
                  key={lyricist}
                  active={selectedLyricists.includes(lyricist)}
                  onClick={() => toggleFilter(lyricist, selectedLyricists, setSelectedLyricists)}
                >
                  {lyricist}
                </FilterButton>
              ))}
            </div>
          </div>
        )}

        {/* Active Chart Filters Display */}
        {(chartFilters.year || chartFilters.singer || chartFilters.composer || chartFilters.lyricist) && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-800 mb-2">Chart Filters</h4>
            <div className="space-y-2">
              {chartFilters.year && (
                <div className="flex items-center justify-between bg-blue-100 px-3 py-2 rounded-lg">
                  <span className="text-sm">Year: {chartFilters.year}</span>
                  <button 
                    onClick={() => setChartFilters(prev => ({ ...prev, year: null }))} 
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    ×
                  </button>
                </div>
              )}
              {chartFilters.singer && (
                <div className="flex items-center justify-between bg-blue-100 px-3 py-2 rounded-lg">
                  <span className="text-sm">Singer: {chartFilters.singer}</span>
                  <button 
                    onClick={() => setChartFilters(prev => ({ ...prev, singer: null }))} 
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    ×
                  </button>
                </div>
              )}
              {chartFilters.composer && (
                <div className="flex items-center justify-between bg-blue-100 px-3 py-2 rounded-lg">
                  <span className="text-sm">Composer: {chartFilters.composer}</span>
                  <button 
                    onClick={() => setChartFilters(prev => ({ ...prev, composer: null }))} 
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    ×
                  </button>
                </div>
              )}
              {chartFilters.lyricist && (
                <div className="flex items-center justify-between bg-blue-100 px-3 py-2 rounded-lg">
                  <span className="text-sm">Lyricist: {chartFilters.lyricist}</span>
                  <button 
                    onClick={() => setChartFilters(prev => ({ ...prev, lyricist: null }))} 
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

const ChartsView = () => (
  <div className="space-y-6">
    <StunningVisualizations 
      filteredSongs={filteredSongs}
      onYearClick={handleYearClick}
      onSingerClick={handleSingerClick}
      onComposerClick={handleComposerClick}
      onLyricistClick={handleLyricistClick}
      chartFilters={chartFilters}
    />
  </div>
);

  const PlaylistView = () => {
    // Sort playlist by song name
    const sortedPlaylist = useMemo(() => {
      return [...currentPlaylist].sort((a, b) => a.song.localeCompare(b.song));
    }, [currentPlaylist]);

    return (
      <div className="space-y-4">
        <div className="space-y-3">
          {sortedPlaylist.map((song, index) => (
            <div 
              key={song.id}
              className={`p-4 rounded-lg border transition-all ${
                currentSong?.id === song.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 bg-white'
              }`}
              onClick={() => {
                const originalIndex = currentPlaylist.findIndex(s => s.id === song.id);
                setCurrentSongIndex(originalIndex);
              }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentSong?.id === song.id && isPlaying 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {currentSong?.id === song.id && isPlaying ? (
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  ) : (
                    <Music className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{song.song}</div>
                  <div className="text-sm text-gray-600">{song.movie} ({song.year})</div>
                  <div className="text-xs text-gray-500">
                    {song.composer} • {song.singer} • {song.lyricist}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 text-white px-4 py-4">
        {/* Centered Tamil Title */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-300 via-pink-300 to-white bg-clip-text text-transparent animate-pulse">
            தேடலும் பாடலும்
          </h1>
        </div>
        
        {/* Stats Row - Always visible across all pages */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-white">{filteredSongs.length}</div>
            <div className="text-xs text-white/80">Songs</div>
          </div>
          <div>
            <div className="text-lg font-bold text-white">{[...new Set(filteredSongs.map(s => s.singer))].length}</div>
            <div className="text-xs text-white/80">Singers</div>
          </div>
          <div>
            <div className="text-lg font-bold text-white">{[...new Set(filteredSongs.map(s => s.composer))].length}</div>
            <div className="text-xs text-white/80">Composers</div>
          </div>
          <div>
            <div className="text-lg font-bold text-white">{[...new Set(filteredSongs.map(s => s.lyricist))].length}</div>
            <div className="text-xs text-white/80">Lyricists</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="p-4">
            {currentView === 'home' && <HomeView />}
            {currentView === 'filter' && <FilterView />}
            {currentView === 'charts' && <ChartsView />}
            {currentView === 'playlist' && <PlaylistView />}
          </div>
        </div>
      </div>

      {/* Bottom Navigation with Search */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 border-t border-white/20 px-4 py-2">
        {/* Search - Available on all pages */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/70 focus:ring-2 focus:ring-white/50 focus:border-white/50"
            placeholder="Search songs, artists..."
          />
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex justify-around">
          <button
            onClick={() => setCurrentView('home')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
              currentView === 'home' 
                ? 'text-yellow-300 bg-white/20' 
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Home className="w-5 h-5 mb-1" />
            <span className="text-xs">Home</span>
          </button>
          
          <button
            onClick={() => setCurrentView('filter')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
              currentView === 'filter' 
                ? 'text-yellow-300 bg-white/20' 
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
            <span className="text-xs">Filter</span>
          </button>
          
          <button
            onClick={() => setCurrentView('charts')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
              currentView === 'charts' 
                ? 'text-yellow-300 bg-white/20' 
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <BarChart3 className="w-5 h-5 mb-1" />
            <span className="text-xs">Charts</span>
          </button>
          
          <button
            onClick={() => setCurrentView('playlist')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
              currentView === 'playlist' 
                ? 'text-yellow-300 bg-white/20' 
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Music className="w-5 h-5 mb-1" />
            <span className="text-xs">Playlist</span>
          </button>
          
          <button
            onClick={resetFilters}
            className="flex flex-col items-center py-2 px-3 rounded-lg transition-all text-white/80 hover:text-white hover:bg-white/10"
          >
            <RotateCcw className="w-5 h-5 mb-1" />
            <span className="text-xs">Reset</span>
          </button>
        </div>
      </div>
   </div>
 );
};

export default TamilSongsMobile;
