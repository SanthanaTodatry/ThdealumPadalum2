import { useState, useMemo, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';
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
      {/* Clean YouTube Player - No extra controls */}
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

  // Mock data
  const songsData = tamilSongsData;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedComposers, setSelectedComposers] = useState([]);
  const [selectedSingers, setSelectedSingers] = useState([]);
  const [selectedLyricists, setSelectedLyricists] = useState([]);
  const [activeFilterTab, setActiveFilterTab] = useState('years');
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
  
  // Reset trigger for charts
  const [chartResetTrigger, setChartResetTrigger] = useState(0);

  // Filter functions
  const toggleFilter = (item, selectedItems, setSelectedItems) => {
    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter(i => i !== item));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  // Updated resetFilters function - now resets EVERYTHING including chart states
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
    // Trigger chart reset
    setChartResetTrigger(prev => prev + 1);
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
      .slice(0, 8);
  }, [filteredSongs]);

  const composerData = useMemo(() => {
    const composerCounts = {};
    filteredSongs.forEach(song => {
      composerCounts[song.composer] = (composerCounts[song.composer] || 0) + 1;
    });
    return Object.entries(composerCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredSongs]);

  const lyricistData = useMemo(() => {
    const lyricistCounts = {};
    filteredSongs.forEach(song => {
      lyricistCounts[song.lyricist] = (lyricistCounts[song.lyricist] || 0) + 1;
    });
    return Object.entries(lyricistCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredSongs]);

  // Chart click handlers - now they refresh the playlist
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

  const handleSingerLegendClick = (data) => {
    const singer = data?.value;
    setChartFilters(prev => ({ 
      ...prev, 
      singer: prev.singer === singer ? null : singer 
    }));
  };

  const handleComposerLegendClick = (data) => {
    const composer = data?.value;
    setChartFilters(prev => ({ 
      ...prev, 
      composer: prev.composer === composer ? null : composer 
    }));
  };

  const handleLyricistLegendClick = (data) => {
    const lyricist = data?.value;
    setChartFilters(prev => ({ 
      ...prev, 
      lyricist: prev.lyricist === lyricist ? null : lyricist 
    }));
  };

  // Sorted songs for display
  const sortedFilteredSongs = useMemo(() => {
    return [...filteredSongs].sort((a, b) => a.song.localeCompare(b.song));
  }, [filteredSongs]);

  // Current playlist based on filters
  const currentPlaylist = useMemo(() => {
    return isShuffled 
      ? [...sortedFilteredSongs].sort(() => Math.random() - 0.5)
      : sortedFilteredSongs;
  }, [sortedFilteredSongs, isShuffled]);

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

  // Reset current song index when playlist changes
  useEffect(() => {
    if (currentSongIndex >= currentPlaylist.length && currentPlaylist.length > 0) {
      setCurrentSongIndex(0);
    }
  }, [currentPlaylist.length, currentSongIndex]);

  const SINGER_COLORS = ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#6d28d9', '#7c2d12'];
  const COMPOSER_COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#047857', '#065f46'];
  const LYRICIST_COLORS = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2', '#b91c1c', '#991b1b'];

  const FilterButton = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs rounded border transition-all ${
        active 
          ? 'bg-blue-600 text-white border-blue-600' 
          : 'bg-white text-blue-600 border-blue-300 hover:border-blue-500'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-light text-slate-700">
      {/* Title Header with Search */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-300 via-pink-300 to-white bg-clip-text text-transparent drop-shadow-lg animate-pulse">
          தேடலும் பாடலும்
        </h1>
        
        {/* Search in the middle */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/70 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/70 focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/30 transition-all"
              placeholder="Search songs, movies, artists... (comma/space separated)"
            />
          </div>
        </div>
        
        <div className="w-48"></div> {/* Spacer for balance */}
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Panel 1: Filters */}
        <div className="w-64 bg-white border-r border-blue-200 flex flex-col">
          <div className="p-4 border-b border-blue-200">
            {/* Reset Button - RENAMED */}
            <button
              onClick={resetFilters}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm mb-4"
            >
              <RotateCcw className="w-4 h-4" />
              Reset All
            </button>

            {/* Filter Tabs - Match Graph Layout */}
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setActiveFilterTab('years')}
                className={`px-2 py-1.5 text-xs rounded transition-colors ${
                  activeFilterTab === 'years' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                Years {selectedYears.length > 0 && `(${selectedYears.length})`}
              </button>
              <button
                onClick={() => setActiveFilterTab('singers')}
                className={`px-2 py-1.5 text-xs rounded transition-colors ${
                  activeFilterTab === 'singers' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                Singers {selectedSingers.length > 0 && `(${selectedSingers.length})`}
              </button>
              <button
                onClick={() => setActiveFilterTab('composers')}
                className={`px-2 py-1.5 text-xs rounded transition-colors ${
                  activeFilterTab === 'composers' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                Composers {selectedComposers.length > 0 && `(${selectedComposers.length})`}
              </button>
              <button
                onClick={() => setActiveFilterTab('lyricists')}
                className={`px-2 py-1.5 text-xs rounded transition-colors ${
                  activeFilterTab === 'lyricists' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                Lyricists {selectedLyricists.length > 0 && `(${selectedLyricists.length})`}
              </button>
            </div>
          </div>

          {/* Filter Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {/* Years Tab */}
          	{activeFilterTab === 'years' && (
          	  <div>
          		<h3 className="text-sm font-medium text-blue-800 mb-3">Select Years by Decade</h3>
          		<div className="space-y-3">
          		  {/* Group years by decade */}
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
          				  <div key={decade} className="border border-blue-200 rounded-lg p-3">
          					{/* Decade Header Button */}
          					<button
          					  onClick={() => {
          						if (allDecadeSelected) {
          						  // Remove all years in this decade
          						  setSelectedYears(prev => prev.filter(year => !decadeYears.includes(year)));
          						} else {
          						  // Add all years in this decade
          						  setSelectedYears(prev => [...new Set([...prev, ...decadeYears])]);
          						}
          					  }}
          					  className={`w-full flex items-center justify-between p-2 rounded-md text-sm font-medium transition-all ${
          						selectedInDecade.length > 0
          						  ? allDecadeSelected
          							? 'bg-blue-600 text-white'
          							: 'bg-blue-100 text-blue-800 border border-blue-300'
          						  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
          					  }`}
          					>
          					  <span className="font-semibold">
          						{decadeInt}s
          					  </span>
          					</button>
          					
          					{/* Individual Year Buttons */}
          					<div className="mt-2 grid grid-cols-5 gap-1">
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
        						  const shortYear = year.slice(-2);
        						  {shortYear}
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
                <h3 className="text-sm font-medium text-blue-800 mb-3">Select Singers</h3>
                <div className="flex flex-wrap gap-1">
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
                <h3 className="text-sm font-medium text-blue-800 mb-3">Select Composers</h3>
                <div className="flex flex-wrap gap-1">
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
                <h3 className="text-sm font-medium text-blue-800 mb-3">Select Lyricists</h3>
                <div className="flex flex-wrap gap-1">
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
              <div className="mt-6 pt-4 border-t border-blue-200">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Chart Filters</h3>
                <div className="space-y-1 text-xs">
                  {chartFilters.year && (
                    <div className="flex items-center justify-between bg-blue-100 px-2 py-1 rounded">
                      <span>Year: {chartFilters.year}</span>
                      <button onClick={() => setChartFilters(prev => ({ ...prev, year: null }))} className="text-blue-600 hover:text-blue-800">×</button>
                    </div>
                  )}
                  {chartFilters.singer && (
                    <div className="flex items-center justify-between bg-blue-100 px-2 py-1 rounded">
                      <span>Singer: {chartFilters.singer}</span>
                      <button onClick={() => setChartFilters(prev => ({ ...prev, singer: null }))} className="text-blue-600 hover:text-blue-800">×</button>
                    </div>
                  )}
                  {chartFilters.composer && (
                    <div className="flex items-center justify-between bg-blue-100 px-2 py-1 rounded">
                      <span>Composer: {chartFilters.composer}</span>
                      <button onClick={() => setChartFilters(prev => ({ ...prev, composer: null }))} className="text-blue-600 hover:text-blue-800">×</button>
                    </div>
                  )}
                  {chartFilters.lyricist && (
                    <div className="flex items-center justify-between bg-blue-100 px-2 py-1 rounded">
                      <span>Lyricist: {chartFilters.lyricist}</span>
                      <button onClick={() => setChartFilters(prev => ({ ...prev, lyricist: null }))} className="text-blue-600 hover:text-blue-800">×</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel 2: Stunning Visualizations */}
        <div className="flex-1 p-4 overflow-y-auto" style={{ height: '720px', overflow: 'visible' }}>
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
       <div className="w-80 bg-white border-l border-blue-200 flex flex-col">
         {/* 1. PLAYER ON TOP */}
         {currentSong && (
           <div className="border-b border-blue-200">
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
         )}

         {/* 2. LIGHT BLUE CONTROLS IN MIDDLE */}
         <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
           {/* Now Playing Info */}
           {currentSong && (
             <div className="mb-3">
               <div className="text-xs text-blue-600 font-medium">NOW PLAYING</div>
               <div className="text-sm font-medium text-blue-800 truncate">{currentSong.song}</div>
               <div className="text-xs text-slate-600 truncate">{currentSong.movie} • {currentSong.singer}</div>
             </div>
           )}

           {/* Audio Controls */}
           <div className="flex items-center justify-center gap-3 mb-3">
             <button 
               onClick={() => setIsShuffled(!isShuffled)}
               className={`p-2 rounded transition-colors ${isShuffled ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50'}`}
               title="Shuffle"
             >
               <Shuffle className="w-4 h-4" />
             </button>
             
             <button 
               onClick={playPrevious}
               className="p-2 bg-white text-blue-600 rounded hover:bg-blue-50 transition-colors"
               disabled={currentPlaylist.length === 0}
             >
               <SkipBack className="w-4 h-4" />
             </button>
             
             <button 
               onClick={togglePlay}
               className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg"
               disabled={currentPlaylist.length === 0}
             >
               {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
             </button>
             
             <button 
               onClick={playNext}
               className="p-2 bg-white text-blue-600 rounded hover:bg-blue-50 transition-colors"
               disabled={currentPlaylist.length === 0}
             >
               <SkipForward className="w-4 h-4" />
             </button>
           </div>

           {/* Status */}
           <div className="text-center">
             <div className="text-xs text-slate-500">
               📺 Auto-advancing playlist
             </div>
           </div>
         </div>

         {/* 3. PLAYLIST AT BOTTOM */}
         <div className="flex-1 p-4 overflow-y-auto">
           <h3 className="text-lg font-medium text-blue-800 mb-4">
             Playlist ({currentPlaylist.length})
           </h3>
           <div className="space-y-2">
             {currentPlaylist.map((song, index) => (
               <div 
                 key={song.id} 
                 className={`p-3 border rounded cursor-pointer transition-all ${
                   currentSong?.id === song.id 
                     ? 'border-blue-500 bg-blue-50' 
                     : 'border-blue-100 bg-blue-50/30 hover:bg-blue-50/50'
                 }`}
                 onClick={() => setCurrentSongIndex(index)}
               >
                 <div className="flex items-center gap-2">
                   {currentSong?.id === song.id && isPlaying ? (
                     <div className="w-3 h-3 bg-blue-600 rounded animate-pulse" />
                   ) : (
                     <div className="w-3 h-3 bg-slate-300 rounded" />
                   )}
                   <div className="flex-1 min-w-0">
                     <h4 className="font-medium text-blue-800 text-sm truncate">{song.song}</h4>
                     <p className="text-xs text-slate-600 truncate">{song.movie} ({song.year})</p>
                     <div className="text-xs text-slate-500 space-y-0.5">
                       <p><span className="font-medium">Composer:</span> {song.composer}</p>
                       <p><span className="font-medium">Singer:</span> {song.singer}</p>
                       <p><span className="font-medium">Lyricist:</span> {song.lyricist}</p>
                     </div>
                   </div>
                 </div>
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
