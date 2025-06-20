import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Users, Music, Mic, PenTool, Play } from 'lucide-react';
import CleanYouTubePlayer from './CleanYouTubePlayer';

const UltimateMusicArchaeology = ({ 
  filteredSongs, 
  onYearClick,
  onSingerClick,
  onComposerClick,
  onLyricistClick,
  chartFilters,
  resetTrigger = 0,
  currentSong,
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onPrevious
}) => {
  const [activeTab, setActiveTab] = useState('singers'); // Start with singers as per new order
  const [selectedYearRange, setSelectedYearRange] = useState([1960, 2024]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [highlightedArtist, setHighlightedArtist] = useState(null);
  
  const svgRef = useRef();

  // Reset chart states when resetTrigger changes
  useEffect(() => {
    if (resetTrigger > 0) {
      setSelectedYearRange([1960, 2024]);
      setZoomLevel(1);
      setHighlightedArtist(null);
      setActiveTab('singers');
    }
  }, [resetTrigger]);

  // All artists with their collaboration networks
  const artistNetworks = useMemo(() => {
    const networks = {
      collaborations: new Map(),
      composers: new Map(),
      singers: new Map(),
      lyricists: new Map()
    };

    filteredSongs.forEach(song => {
      // Collaboration networks
      const collabKey = `${song.composer}|${song.singer}|${song.lyricist}`;
      if (!networks.collaborations.has(collabKey)) {
        networks.collaborations.set(collabKey, {
          id: collabKey,
          composer: song.composer,
          singer: song.singer,
          lyricist: song.lyricist,
          songs: [],
          years: new Set(),
          movies: new Set()
        });
      }
      const collab = networks.collaborations.get(collabKey);
      collab.songs.push(song);
      collab.years.add(song.year);
      collab.movies.add(song.movie);

      // Individual artist tracking
      [
        { type: 'composers', name: song.composer },
        { type: 'singers', name: song.singer },
        { type: 'lyricists', name: song.lyricist }
      ].forEach(({ type, name }) => {
        if (!networks[type].has(name)) {
          networks[type].set(name, {
            name,
            songs: [],
            collaborators: { composers: new Set(), singers: new Set(), lyricists: new Set() },
            activeYears: new Set(),
            totalSongs: 0
          });
        }
        const artist = networks[type].get(name);
        artist.songs.push(song);
        artist.activeYears.add(song.year);
        artist.totalSongs += 1;
        artist.collaborators.composers.add(song.composer);
        artist.collaborators.singers.add(song.singer);
        artist.collaborators.lyricists.add(song.lyricist);
      });
    });

    return {
      collaborations: Array.from(networks.collaborations.values()),
      composers: Array.from(networks.composers.values()),
      singers: Array.from(networks.singers.values()),
      lyricists: Array.from(networks.lyricists.values())
    };
  }, [filteredSongs]);

  // Filter by year range
  const filteredArtists = useMemo(() => {
    const yearFilter = (artist) => {
      const activeYears = Array.from(artist.activeYears || []);
      return activeYears.some(year => year >= selectedYearRange[0] && year <= selectedYearRange[1]);
    };

    return {
      collaborations: artistNetworks.collaborations.filter(collab => {
        const years = Array.from(collab.years);
        return years.some(year => year >= selectedYearRange[0] && year <= selectedYearRange[1]);
      }),
      composers: artistNetworks.composers.filter(artist => yearFilter(artist)),
      singers: artistNetworks.singers.filter(artist => yearFilter(artist)),
      lyricists: artistNetworks.lyricists.filter(artist => yearFilter(artist))
    };
  }, [artistNetworks, selectedYearRange]);

  // Draw main visualization - ONLY when NOT on video tab
  useEffect(() => {
    if (activeTab === 'video' || !svgRef.current || !filteredArtists[activeTab]) return;
  
    const container = d3.select(svgRef.current);
    container.selectAll("*").remove();
  
    // Get actual container dimensions
    const containerRect = svgRef.current.getBoundingClientRect();
    const containerHeight = containerRect.height;
    const containerWidth = containerRect.width;
    
    // Responsive sizing based on screen size
    const isSmallScreen = window.innerWidth < 1024; // Laptop detection
    const isLargeScreen = window.innerWidth > 1920;  // Large monitor detection
    
    // Adaptive width
    const maxWidth = isSmallScreen ? 600 : (isLargeScreen ? 1200 : 800);
    const width = Math.min(containerWidth - 40, maxWidth);
    
    // Adaptive height - use percentage of container
    const heightRatio = isSmallScreen ? 0.85 : 0.9; // Use 85% on small screens, 90% on larger
    const minHeight = isSmallScreen ? 300 : 400;
    const maxHeight = isLargeScreen ? 800 : 600;
    
    const height = Math.min(
      Math.max(minHeight, containerHeight * heightRatio), 
      maxHeight
    );
  
    console.log(`Screen: ${window.innerWidth}x${window.innerHeight}, Container: ${containerWidth}x${containerHeight}, Chart: ${width}x${height}`);
  
    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("display", "block");
  
    if (activeTab === 'collaborations') {
      drawCollaborationNetwork(svg, filteredArtists.collaborations, width, height);
    } else {
      drawArtistVisualization(svg, filteredArtists[activeTab], activeTab, width, height);
    }
  }, [filteredArtists, activeTab, zoomLevel, highlightedArtist]);

  // D3 drawing functions (same as before)
  const drawCollaborationNetwork = (svg, collaborations, width, height) => {
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const radius = Math.min(width, height) / 2 - Math.max(...Object.values(margin));

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const hierarchyData = prepareHierarchicalData(collaborations);
    const root = d3.hierarchy(hierarchyData)
      .sum(d => d.value || 1)
      .sort((a, b) => b.value - a.value);

    const partition = d3.partition().size([2 * Math.PI, radius]);
    partition(root);

    const decadeColors = d3.scaleOrdinal()
      .domain(['1960', '1970', '1980', '1990', '2000', '2010', '2020'])
      .range(['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FFB74D']);

    const composerColors = d3.scaleOrdinal(d3.schemeCategory10);
    const singerColors = d3.scaleOrdinal(d3.schemePastel1);

    const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1);

    g.selectAll("path")
      .data(root.descendants().filter(d => d.depth > 0))
      .enter()
      .append("path")
      .attr("d", arc)
      .style("fill", d => {
        if (d.depth === 1) return decadeColors(d.data.name);
        if (d.depth === 2) return composerColors(d.data.name);
        if (d.depth === 3) return singerColors(d.data.name);
        return d3.interpolateViridis(Math.random());
      })
      .style("stroke", "#fff")
      .style("stroke-width", 1)
      .style("opacity", 0.8)
      .style("cursor", "pointer")
      .on("click", function(event, d) {
        if (d.depth === 1) {
          const decade = parseInt(d.data.name);
          setSelectedYearRange([decade, decade + 9]);
          onYearClick({ activePayload: [{ payload: { year: decade } }] });
        } else if (d.depth === 2) {
          onComposerClick({ name: d.data.name });
        } else if (d.depth === 3) {
          onSingerClick({ name: d.data.name });
        } else if (d.depth === 4) {
          onLyricistClick({ name: d.data.name });
        }
      });

    g.append("text")
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("fill", "#666")
      .text("Collaboration Network");
  };

  const prepareHierarchicalData = (collaborations) => {
    const hierarchy = { name: "root", children: [] };
    const decades = new Map();

    collaborations.forEach(collab => {
      collab.songs.forEach(song => {
        const decade = Math.floor(song.year / 10) * 10;
        const decadeKey = decade.toString();
        
        if (!decades.has(decadeKey)) {
          decades.set(decadeKey, { name: decadeKey, children: [], composers: new Map() });
        }
        
        const decadeData = decades.get(decadeKey);
        const composerKey = song.composer;
        
        if (!decadeData.composers.has(composerKey)) {
          decadeData.composers.set(composerKey, { name: composerKey, children: [], singers: new Map() });
        }
        
        const composerData = decadeData.composers.get(composerKey);
        const singerKey = song.singer;
        
        if (!composerData.singers.has(singerKey)) {
          composerData.singers.set(singerKey, { name: singerKey, children: [], lyricists: new Map() });
        }
        
        const singerData = composerData.singers.get(singerKey);
        const lyricistKey = song.lyricist;
        
        if (!singerData.lyricists.has(lyricistKey)) {
          singerData.lyricists.set(lyricistKey, { name: lyricistKey, value: 0, songs: [] });
        }
        
        const lyricistData = singerData.lyricists.get(lyricistKey);
        lyricistData.value += 1;
        lyricistData.songs.push(song);
      });
    });

    decades.forEach(decadeData => {
      decadeData.children = Array.from(decadeData.composers.values());
      decadeData.children.forEach(composerData => {
        composerData.children = Array.from(composerData.singers.values());
        composerData.children.forEach(singerData => {
          singerData.children = Array.from(singerData.lyricists.values());
        });
      });
    });

    hierarchy.children = Array.from(decades.values());
    return hierarchy;
  };

  const drawArtistVisualization = (svg, artists, type, width, height) => {
    const packLayout = d3.pack()
      .size([width, height])
      .padding(5);

    const root = d3.hierarchy({ children: artists })
      .sum(d => d.totalSongs || 1)
      .sort((a, b) => b.value - a.value);

    packLayout(root);

    const colorScale = d3.scaleSequential()
      .domain([0, d3.max(artists, d => d.totalSongs)])
      .interpolator(d3.interpolateViridis);

    svg.selectAll("circle")
      .data(root.children)
      .enter()
      .append("circle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => d.r * zoomLevel)
      .attr("fill", d => colorScale(d.data.totalSongs))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("click", function(event, d) {
        if (type === 'singers') onSingerClick({ name: d.data.name });
        if (type === 'composers') onComposerClick({ name: d.data.name });
        if (type === 'lyricists') onLyricistClick({ name: d.data.name });
      });

    svg.selectAll("text")
      .data(root.children.filter(d => d.r > 20))
      .enter()
      .append("text")
      .attr("x", d => d.x)
      .attr("y", d => d.y)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font-size", d => Math.min(d.r / 3, 14) + "px")
      .style("font-weight", "bold")
      .style("fill", "white")
      .style("pointer-events", "none")
      .text(d => d.data.name.length > 12 ? d.data.name.substring(0, 12) + "..." : d.data.name);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Navigation Buttons */}
      <div className="bg-white rounded-lg p-3 mb-3 shadow-sm border">        
        <div className="flex gap-2">
          {[
            { key: 'singers', label: 'Singers', icon: Mic, count: filteredArtists.singers.length },
            { key: 'composers', label: 'Composers', icon: Music, count: filteredArtists.composers.length },
            { key: 'lyricists', label: 'Lyricists', icon: PenTool, count: filteredArtists.lyricists.length },
            { key: 'collaborations', label: 'Collaborations', icon: Users, count: filteredArtists.collaborations.length },
            { key: 'video', label: 'Video', icon: Play, count: '' }
          ].map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === key
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{label}</span>
              {count !== '' && (
                <div className={`text-sm font-bold ${activeTab === key ? 'text-white' : 'text-blue-600'}`}>
                  {count}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* FIXED: Content Area - Option 1 Implementation */}

      <div className="flex-1 bg-white rounded-lg border border-gray-200 p-2 flex flex-col"> {/* Add flex flex-col */}
        <div className="flex-1 w-full rounded-lg border overflow-hidden"> {/* Remove overflow-y-auto, add overflow-hidden */}
          {activeTab === 'video' && (
            <div className="h-full w-full">
              {currentSong ? (
                <CleanYouTubePlayer
                  song={currentSong}
                  isPlaying={isPlaying}
                  onPlay={onPlay}
                  onPause={onPause}
                  onNext={onNext}
                  onPrevious={onPrevious}
                  className="h-full w-full"
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-100 text-gray-600">
                  <div className="text-center">
                    <div className="text-4xl mb-4">🎵</div>
                    <div className="text-lg font-medium">Select a song to watch video</div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab !== 'video' && (
            <div ref={svgRef} className="h-full w-full"></div>
          )}

        </div>
      </div>
    </div>
  );
};

export default UltimateMusicArchaeology;
