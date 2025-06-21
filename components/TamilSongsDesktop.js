import { useState, useMemo, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';
import { Search, RotateCcw, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat } from 'lucide-react';
import * as d3 from 'd3';
import { tamilSongsData } from './tamilSongsData';
import UltimateMusicArchaeology from './UltimateMusicArchaeology';

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
    lyricist: null,
    yearRange: null
  });

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);
  
  // Reset trigger for charts
  const [chartResetTrigger, setChartResetTrigger] = useState(0);
  
  // Timeline ref for header
  const timelineRef = useRef();
    
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
      lyricist: null,
      yearRange: null
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
      
      // NEW: Handle year range from brush selection
      const matchesYearRange = !chartFilters.yearRange || 
        (song.year >= chartFilters.yearRange[0] && song.year <= chartFilters.yearRange[1]);
  
      return matchesSearch && matchesYear && matchesComposer && matchesSinger && matchesLyricist &&
             matchesChartYear && matchesChartSinger && matchesChartComposer && matchesChartLyricist && matchesYearRange;
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

  // Reset to song 1 when filters change
  useEffect(() => {
    if (currentPlaylist.length > 0) {
      setCurrentSongIndex(0); // Always start at song 1 when playlist changes
    }
  }, [
    // These are the filter dependencies that change the playlist
    searchTerm,
    selectedYears.length,
    selectedComposers.length, 
    selectedSingers.length,
    selectedLyricists.length,
    chartFilters.year,
    chartFilters.singer,
    chartFilters.composer,
    chartFilters.lyricist,
    chartFilters.yearRange
  ]);
  
  // Draw compact timeline in header
  useEffect(() => {
    if (!timelineRef.current || !yearData.length) return;
  
    const container = d3.select(timelineRef.current);
    container.selectAll("*").remove();
  
    const margin = { top: 5, right: 10, bottom: 15, left: 10 };
    const containerWidth = timelineRef.current.clientWidth;
    const width = containerWidth - margin.left - margin.right;
    const height = 40; // Compact height for header
  
    const svg = container
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
  
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    // Scales
    const xScale = d3.scaleLinear()
      .domain(d3.extent(yearData, d => d.year))
      .range([0, width]);
  
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(yearData, d => d.count)])
      .range([height, 0]);
  
    // Area generator
    const area = d3.area()
      .x(d => xScale(d.year))
      .y0(height)
      .y1(d => yScale(d.count))
      .curve(d3.curveCardinal);
  
    // Add area with white fill for header
    g.append("path")
      .datum(yearData)
      .attr("fill", "rgba(255,255,255,0.3)")
      .attr("d", area);
  
    // Add line
    const line = d3.line()
      .x(d => xScale(d.year))
      .y(d => yScale(d.count))
      .curve(d3.curveCardinal);
  
    g.append("path")
      .datum(yearData)
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .attr("d", line);
  
    // Add interactive dots
    g.selectAll(".header-dot")
      .data(yearData)
      .enter()
      .append("circle")
      .attr("class", "header-dot")
      .attr("cx", d => xScale(d.year))
      .attr("cy", d => yScale(d.count))
      .attr("r", 2)
      .attr("fill", "white")
      .attr("stroke", "rgba(255,255,255,0.5)")
      .style("cursor", "pointer")
      .on("click", function(event, d) {
        handleYearClick({ activePayload: [{ payload: { year: d.year } }] });
      });

      // Add brush for year range selection
      const brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on("start brush", function(event) {
          // Show selection rectangle during brushing
          if (event.selection) {
            const [x0, x1] = event.selection;
            const year0 = Math.round(xScale.invert(x0));
            const year1 = Math.round(xScale.invert(x1));
            
            // Optional: Show years in selection during brush
            // console.log(`Selecting: ${year0} - ${year1}`);
          }
        })
        .on("end", function(event) {
          if (event.selection) {
            const [x0, x1] = event.selection;
            const year0 = Math.round(xScale.invert(x0));
            const year1 = Math.round(xScale.invert(x1));
            
            // Update chart filters for year range
            if (year0 === year1) {
              // Single year selected
              handleYearClick({ activePayload: [{ payload: { year: year0 } }] });
            } else {
              // Year range selected - create custom filter
              setChartFilters(prev => ({ 
                ...prev, 
                year: null, // Clear single year
                yearRange: [year0, year1] // Add year range
              }));
            }
            
            // Keep the selection visible for a moment, then clear
            setTimeout(() => {
              g.select(".brush").call(brush.move, null);
            }, 500);
          } else {
            // Clear selection
            setChartFilters(prev => ({ 
              ...prev, 
              year: null,
              yearRange: null
            }));
          }
        });
      
      // Add brush to timeline
      const brushGroup = g.append("g")
        .attr("class", "brush")
        .call(brush);
      
      // Style brush selection rectangle (NOT zoom effect)
      brushGroup.selectAll(".overlay")
        .style("fill", "rgba(255,255,255,0.1)")
        .style("cursor", "crosshair");
        
      brushGroup.selectAll(".selection")
        .style("fill", "rgba(255,255,255,0.2)")
        .style("stroke", "white")
        .style("stroke-width", 2)
        .style("stroke-dasharray", "3,3");
      
      brushGroup.selectAll(".handle")
        .style("fill", "white")
        .style("stroke", "rgba(255,255,255,0.8)")
        .style("stroke-width", 1);
  
    // Add simple x-axis with fewer ticks
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.format("d"))
      .ticks(5);
  
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .selectAll("text")
      .style("fill", "white")
      .style("font-size", "10px");
  
    g.selectAll(".domain, .tick line")
      .style("stroke", "rgba(255,255,255,0.5)");
  
  }, [yearData]);

  const FilterButton = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs rounded border transition-all w-full text-left ${
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
      {/* Header with Timeline and Search - ALIGNED VERSION */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 text-white px-6 py-4 shadow-lg">
        <div className="flex items-center">
          {/* Title with fixed width - UNCHANGED */}
          <div style={{ width: '300px' }}>
            <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-yellow-200 via-white to-yellow-200 bg-clip-text text-transparent drop-shadow-2xl animate-pulse whitespace-nowrap">
              தேடலும் பாடலும்
            </h1>
          </div>
            
          {/* Timeline - EXTENDED to match Panel 2 width */}
          <div className="flex-1">
            <div ref={timelineRef} className="timeline-header"></div>
          </div>
          
          {/* Search - ALIGNED with Panel 3's CONTENT area */}
          <div style={{ width: '320px' }} className="pl-8">  {/* CHANGED: pl-4 to pl-8 */}
            <div className="relative flex items-center">
              <Search className="absolute left-5 text-white w-5 h-5 z-10" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/70 focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/30 transition-all"
                placeholder="Search songs, movies, artists..."
              />
            </div>
          </div>
        </div>
      </div>
              
      <div className="flex flex-1 overflow-hidden">
                    
        {/* Panel 1: Filters */}
        <div className="bg-white border-r border-blue-200 flex flex-col" style={{ width: '300px', minWidth: '300px' }}>                
          <div className="p-4 border-b border-blue-200">
            {/* Reset Button */}
            <button
              onClick={resetFilters}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm mb-4"
            >
              <RotateCcw className="w-4 h-4" />
              Reset All
            </button>

            {/* Filter Tabs */}
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
                            
                            <div className="mt-2 grid grid-cols-5 gap-1">
                              {decadeYears.map(year => (
                                <button
                                  key={year}
                                  onClick={() => toggleFilter(year, selectedYears, setSelectedYears)}
                                  className={`px-3 py-2 text-xs font-medium rounded border transition-all min-w-0 ${
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
                <h3 className="text-sm font-medium text-blue-800 mb-3">Select Singers</h3>
                <div className="space-y-2">
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
                <div className="space-y-2">
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
                <div className="space-y-2">
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
        <div className="flex-1 p-4 min-h-0">
          <UltimateMusicArchaeology
            filteredSongs={filteredSongs}
            onYearClick={handleYearClick}
            onSingerClick={handleSingerClick}
            onComposerClick={handleComposerClick}
            onLyricistClick={handleLyricistClick}
            chartFilters={chartFilters}
            resetTrigger={chartResetTrigger}
            currentSong={currentSong}
            isPlaying={isPlaying}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onNext={playNext}
            onPrevious={playPrevious}
          />
        </div>

        {/* Panel 3: Player Controls at Top + Playlist Below */}
        <div className="w-80 bg-white border-l border-blue-200 flex flex-col">
          {/* 1. ENHANCED PLAYER CONTROLS WITH PLAYLIST COUNTER */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
            {/* Now Playing Info with Playlist Counter */}
            {currentSong && (
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-blue-600 font-medium">NOW PLAYING</div>
                  <div className="text-xs text-blue-600 font-medium">
                    {currentSongIndex + 1} of {currentPlaylist.length}
                  </div>
                </div>
                <div className="text-sm font-medium text-blue-800 truncate">{currentSong.song}</div>
                <div className="text-xs text-slate-600 truncate">{currentSong.movie} • {currentSong.singer}</div>
              </div>
            )}

            {/* Audio Controls */}
            <div className="flex items-center justify-center gap-3">
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
          </div>

          {/* 2. PLAYLIST WITHOUT HEADING - TAKES REMAINING SPACE */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-2">
              {currentPlaylist.map((song, index) => (
                <div 
                  key={song.id} 
                  data-song-id={song.id} 
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
