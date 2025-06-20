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

  // Window Resize Listener
  useEffect(() => {
    const handleResize = () => {
      // Force re-render of charts when window resizes
      if (activeTab !== 'video') {
        // Trigger the chart drawing useEffect
        setZoomLevel(prev => prev); // Dummy state change to trigger re-render
      }
    };
  
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);
    
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
  // Prepare treemap data for collaborations
  const treemapData = {
    name: "root",
    children: collaborations.slice(0, 20).map(collab => ({ // Limit to top 20 for clarity
      name: `${collab.composer} × ${collab.singer}`,
      value: collab.songs.length,
      data: collab
    }))
  };

  const treemapLayout = d3.treemap()
    .size([width, height])
    .padding(3)
    .tile(d3.treemapSquarify.ratio(2)); // Horizontal preference

  const root = d3.hierarchy(treemapData)
    .sum(d => d.value || 0)
    .sort((a, b) => b.value - a.value);

  treemapLayout(root);

  // Color scale for collaborations
  const colorScale = d3.scaleOrdinal()
    .domain(['1960', '1970', '1980', '1990', '2000', '2010', '2020'])
    .range(['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FFB74D']);

  // Create collaboration rectangles
  svg.selectAll("rect")
    .data(root.children)
    .enter()
    .append("rect")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("width", d => d.x1 - d.x0)
    .attr("height", d => d.y1 - d.y0)
    .attr("fill", d => {
      const avgYear = d.data.data ? 
        Math.floor(Array.from(d.data.data.years).reduce((a, b) => a + b, 0) / d.data.data.years.size / 10) * 10 :
        2000;
      return colorScale(avgYear.toString());
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 2)
    .attr("rx", 4)
    .style("cursor", "pointer")
    .style("opacity", 0.8)
    .on("click", function(event, d) {
      if (d.data.data) {
        onComposerClick({ name: d.data.data.composer });
      }
    });

  // Add collaboration labels
  svg.selectAll("text")
    .data(root.children)
    .enter()
    .append("text")
    .attr("x", d => d.x0 + 8)
    .attr("y", d => d.y0 + (d.y1 - d.y0) / 2)
    .attr("dy", "0.35em")
    .style("font-size", d => {
      const rectWidth = d.x1 - d.x0;
      const rectHeight = d.y1 - d.y0;
      return Math.min(rectWidth / 12, rectHeight / 3, 12) + "px";
    })
    .style("font-weight", "600")
    .style("fill", "white")
    .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.7)")
    .style("pointer-events", "none")
    .each(function(d) {
      const rectWidth = d.x1 - d.x0;
      const rectHeight = d.y1 - d.y0;
      
      if (rectWidth > 100 && rectHeight > 30) {
        const text = d3.select(this);
        const name = d.data.name;
        const maxLength = Math.floor(rectWidth / 7);
        
        if (name.length > maxLength) {
          text.text(name.substring(0, maxLength - 3) + "...");
        } else {
          text.text(name);
        }
      }
    });

  // Add title
  svg.append("text")
    .attr("x", 10)
    .attr("y", 15)
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .style("fill", "#333")
    .text("Top Collaborations");
};
  const drawArtistVisualization = (svg, artists, type, width, height) => {
    // Create horizontal treemap layout
    const treemapLayout = d3.treemap()
      .size([width, height])
      .padding(2)
      .paddingTop(20) // Space for category labels
      .tile(d3.treemapSquarify.ratio(2)); // Ratio 2 = prefer horizontal rectangles
  
    // Prepare hierarchical data
    const root = d3.hierarchy({ children: artists })
      .sum(d => d.totalSongs || 1)
      .sort((a, b) => b.value - a.value);
  
    treemapLayout(root);
  
    // Color scale
    const colorScale = d3.scaleSequential()
      .domain([0, d3.max(artists, d => d.totalSongs)])
      .interpolator(d3.interpolateViridis);
  
    // Create rectangles
    const rects = svg.selectAll("rect")
      .data(root.children)
      .enter()
      .append("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("fill", d => colorScale(d.data.totalSongs))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("rx", 4) // Rounded corners
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("stroke-width", 4)
          .attr("stroke", "#333");
        
        showTooltip(event, d.data, type);
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .attr("stroke-width", 2)
          .attr("stroke", "#fff");
        
        hideTooltip();
      })
      .on("click", function(event, d) {
        if (type === 'singers') onSingerClick({ name: d.data.name });
        if (type === 'composers') onComposerClick({ name: d.data.name });
        if (type === 'lyricists') onLyricistClick({ name: d.data.name });
      });
  
    // Add text labels - positioned for horizontal rectangles
    svg.selectAll("text")
      .data(root.children)
      .enter()
      .append("text")
      .attr("x", d => d.x0 + 8) // Left-aligned with padding
      .attr("y", d => d.y0 + (d.y1 - d.y0) / 2) // Vertically centered
      .attr("dy", "0.35em")
      .style("font-size", d => {
        const rectWidth = d.x1 - d.x0;
        const rectHeight = d.y1 - d.y0;
        return Math.min(rectWidth / 8, rectHeight / 3, 14) + "px"; // Responsive font size
      })
      .style("font-weight", "600")
      .style("fill", "white")
      .style("pointer-events", "none")
      .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.7)") // Better readability
      .each(function(d) {
        const rectWidth = d.x1 - d.x0;
        const rectHeight = d.y1 - d.y0;
        const text = d3.select(this);
        
        // Only show text if rectangle is large enough
        if (rectWidth > 80 && rectHeight > 25) {
          const name = d.data.name;
          const maxLength = Math.floor(rectWidth / 8); // Characters that fit
          
          if (name.length > maxLength) {
            text.text(name.substring(0, maxLength - 3) + "...");
          } else {
            text.text(name);
          }
          
          // Add song count on second line if rectangle is tall enough
          if (rectHeight > 45) {
            svg.append("text")
              .attr("x", d.x0 + 8)
              .attr("y", d.y0 + (d.y1 - d.y0) / 2 + 15)
              .attr("dy", "0.35em")
              .style("font-size", Math.min(rectWidth / 12, rectHeight / 4, 10) + "px")
              .style("font-weight", "400")
              .style("fill", "rgba(255,255,255,0.8)")
              .style("pointer-events", "none")
              .text(`${d.data.totalSongs} songs`);
          }
        }
      });
  
    // Add category title
    svg.append("text")
      .attr("x", 10)
      .attr("y", 15)
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text(`${type.charAt(0).toUpperCase() + type.slice(1)} by Song Count`);
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

      {/* Main Visualization */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 p-2 flex flex-col min-h-0"> {/* Add min-h-0 */}
        <div className="flex-1 w-full rounded-lg border overflow-hidden min-h-0"> {/* Add min-h-0 */}
          {activeTab === 'video' && (
            <div className="h-full w-full min-h-0"> {/* Add min-h-0 */}
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
