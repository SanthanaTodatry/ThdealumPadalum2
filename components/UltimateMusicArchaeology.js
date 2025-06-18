import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, Users, Music, Mic, PenTool, Sun } from 'lucide-react';
import EnhancedSunburstChart from './EnhancedSunburstChart';

const UltimateMusicArchaeology = ({ 
  filteredSongs, 
  onYearClick,
  onSingerClick,
  onComposerClick,
  onLyricistClick,
  chartFilters,
  resetTrigger = 0
}) => {
  const [activeTab, setActiveTab] = useState('collaborations');
  const [selectedYearRange, setSelectedYearRange] = useState([1960, 2024]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [highlightedArtist, setHighlightedArtist] = useState(null);
  
  const svgRef = useRef();
  const timelineRef = useRef();

  // Reset chart states when resetTrigger changes
  useEffect(() => {
    if (resetTrigger > 0) {
      setSelectedYearRange([1960, 2024]);
      setZoomLevel(1);
      setHighlightedArtist(null);
      setActiveTab('collaborations');
    }
  }, [resetTrigger]);

  // Global timeline data
  const timelineData = useMemo(() => {
    const yearCounts = {};
    filteredSongs.forEach(song => {
      if (!yearCounts[song.year]) {
        yearCounts[song.year] = {
          year: song.year,
          total: 0,
          composers: new Set(),
          singers: new Set(),
          lyricists: new Set(),
          songs: []
        };
      }
      yearCounts[song.year].total += 1;
      yearCounts[song.year].composers.add(song.composer);
      yearCounts[song.year].singers.add(song.singer);
      yearCounts[song.year].lyricists.add(song.lyricist);
      yearCounts[song.year].songs.push(song);
    });

    return Object.values(yearCounts).map(data => ({
      ...data,
      composers: data.composers.size,
      singers: data.singers.size,
      lyricists: data.lyricists.size,
      composersList: Array.from(data.composers),
      singersList: Array.from(data.singers),
      lyricistsList: Array.from(data.lyricists)
    })).sort((a, b) => a.year - b.year);
  }, [filteredSongs]);

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

  // Draw timeline
  useEffect(() => {
    if (!timelineRef.current || !timelineData) return;
    
    const container = d3.select(timelineRef.current);
    container.selectAll("*").remove();
    
    const containerWidth = timelineRef.current.clientWidth;
    const width = containerWidth - margin.left - margin.right;
    const height = 80;
    const margin = { top: 10, right: 20, bottom: 30, left: 20 };
        
    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const xScale = d3.scaleLinear()
      .domain(d3.extent(timelineData, d => d.year))
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(timelineData, d => d.total)])
      .range([height - margin.bottom, margin.top]);

    // Draw line
    const line = d3.line()
      .x(d => xScale(d.year))
      .y(d => yScale(d.total))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(timelineData)
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 2);

    // Draw dots
    svg.selectAll(".dot")
      .data(timelineData)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("cx", d => xScale(d.year))
      .attr("cy", d => yScale(d.total))
      .attr("r", 3)
      .attr("fill", "#3b82f6")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        setSelectedYearRange([d.year, d.year]);
        onYearClick({ activePayload: [{ payload: { year: d.year } }] });
      });

    // Add brush for year range selection
    const brush = d3.brushX()
      .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
      .on("end", (event) => {
        if (!event.selection) return;
        const [x0, x1] = event.selection;
        const yearRange = [
          Math.round(xScale.invert(x0)),
          Math.round(xScale.invert(x1))
        ];
        setSelectedYearRange(yearRange);
      });

    svg.append("g")
      .attr("class", "brush")
      .call(brush);

    // Add axis
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

  }, [timelineData, onYearClick]);

  // Visualization functions for other tabs
  const drawCollaborationNetwork = (svg, collaborations, width, height) => {
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const radius = Math.min(width, height) / 2 - Math.max(...Object.values(margin));

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Prepare hierarchical data for sunburst
    const hierarchyData = prepareHierarchicalData(collaborations);

    // Create hierarchy
    const root = d3.hierarchy(hierarchyData)
      .sum(d => d.value || 1)
      .sort((a, b) => b.value - a.value);

    // Create partition layout
    const partition = d3.partition()
      .size([2 * Math.PI, radius]);

    partition(root);

    // Color scales for different levels
    const decadeColors = d3.scaleOrdinal()
      .domain(['1960', '1970', '1980', '1990', '2000', '2010', '2020'])
      .range(['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FFB74D']);

    const composerColors = d3.scaleOrdinal(d3.schemeCategory10);
    const singerColors = d3.scaleOrdinal(d3.schemePastel1);

    // Arc generator
    const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1);

    // Draw sunburst segments
    const segments = g.selectAll("path")
      .data(root.descendants().filter(d => d.depth > 0))
      .enter()
      .append("path")
      .attr("d", arc)
      .style("fill", d => {
        if (d.depth === 1) {
          // Decade level
          return decadeColors(d.data.name);
        } else if (d.depth === 2) {
          // Composer level
          return composerColors(d.data.name);
        } else if (d.depth === 3) {
          // Singer level
          return singerColors(d.data.name);
        } else {
          // Lyricist level
          return d3.interpolateViridis(Math.random());
        }
      })
      .style("stroke", "#fff")
      .style("stroke-width", 1)
      .style("opacity", 0.8)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .style("opacity", 1)
          .style("stroke-width", 2);
        
        showSunburstTooltip(event, d);
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .style("opacity", 0.8)
          .style("stroke-width", 1);
        
        hideSunburstTooltip();
      })
      .on("click", function(event, d) {
        if (d.depth === 1) {
          // Decade clicked
          const decade = parseInt(d.data.name);
          setSelectedYearRange([decade, decade + 9]);
          onYearClick({ activePayload: [{ payload: { year: decade } }] });
        } else if (d.depth === 2) {
          // Composer clicked
          onComposerClick({ name: d.data.name });
        } else if (d.depth === 3) {
          // Singer clicked
          onSingerClick({ name: d.data.name });
        } else if (d.depth === 4) {
          // Lyricist clicked
          onLyricistClick({ name: d.data.name });
        }
      });

    // Add labels for larger segments
    g.selectAll("text")
      .data(root.descendants().filter(d => d.depth > 0 && (d.x1 - d.x0) > 0.1))
      .enter()
      .append("text")
      .attr("transform", d => {
        const angle = (d.x0 + d.x1) / 2;
        const radius = (d.y0 + d.y1) / 2;
        return `translate(${Math.cos(angle - Math.PI / 2) * radius},${Math.sin(angle - Math.PI / 2) * radius}) rotate(${angle * 180 / Math.PI - 90})`;
      })
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .style("font-size", d => Math.min(12, (d.y1 - d.y0) * 0.5) + "px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .style("pointer-events", "none")
      .text(d => {
        const name = d.data.name;
        const maxLength = Math.floor((d.x1 - d.x0) * 10);
        return name.length > maxLength ? name.substring(0, maxLength) + "..." : name;
      });

    // Center title
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("fill", "#666")
      .text("Collaboration");
    
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("dy", "1.2em")
      .style("font-size", "14px")
      .style("fill", "#666")
      .text("Network");
  };

  const prepareHierarchicalData = (collaborations) => {
    // Group by decade -> composer -> singer -> lyricist
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

    // Convert maps to arrays
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

  const showSunburstTooltip = (event, d) => {
    const tooltip = d3.select("body").append("div")
      .attr("class", "sunburst-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0,0,0,0.9)")
      .style("color", "white")
      .style("padding", "12px")
      .style("border-radius", "8px")
      .style("font-size", "13px")
      .style("pointer-events", "none")
      .style("z-index", 1000)
      .style("max-width", "300px");

    let content = "";
    if (d.depth === 1) {
      content = `<strong>${d.data.name}s Era</strong><br/>Songs: ${d.value}`;
    } else if (d.depth === 2) {
      content = `<strong>Composer: ${d.data.name}</strong><br/>Songs: ${d.value}<br/>Decade: ${d.parent.data.name}s`;
    } else if (d.depth === 3) {
      content = `<strong>Singer: ${d.data.name}</strong><br/>Songs: ${d.value}<br/>Composer: ${d.parent.data.name}<br/>Decade: ${d.parent.parent.data.name}s`;
    } else if (d.depth === 4) {
      content = `<strong>Lyricist: ${d.data.name}</strong><br/>Songs: ${d.value}<br/>Singer: ${d.parent.data.name}<br/>Composer: ${d.parent.parent.data.name}<br/>Decade: ${d.parent.parent.parent.data.name}s`;
    }

    tooltip.html(content)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 10) + "px");
  };

  const hideSunburstTooltip = () => {
    d3.selectAll(".sunburst-tooltip").remove();
  };

  const drawArtistVisualization = (svg, artists, type, width, height) => {
    // Create a force simulation for artist bubbles
    const simulation = d3.forceSimulation(artists.slice(0, 100))
      .force("charge", d3.forceManyBody().strength(-50))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => Math.sqrt(d.totalSongs) * 3 + 5));

    const circles = svg.selectAll("circle")
      .data(artists.slice(0, 100))
      .enter()
      .append("circle")
      .attr("r", d => Math.sqrt(d.totalSongs) * 3 + 5)
      .attr("fill", (d, i) => d3.schemeCategory10[i % 10])
      .attr("opacity", 0.7)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this).attr("opacity", 1);
        showTooltip(event, d, type);
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 0.7);
        hideTooltip();
      })
      .on("click", function(event, d) {
        if (type === 'singers') onSingerClick({ name: d.name });
        else if (type === 'composers') onComposerClick({ name: d.name });
        else if (type === 'lyricists') onLyricistClick({ name: d.name });
      });

    // Add labels for larger circles
    const labels = svg.selectAll("text")
      .data(artists.slice(0, 20))
      .enter()
      .append("text")
      .text(d => d.name.length > 12 ? d.name.substring(0, 12) + "..." : d.name)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font-size", "10px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      circles
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
      
      labels
        .attr("x", d => d.x)
        .attr("y", d => d.y);
    });
  };

  const showTooltip = (event, data, type) => {
    const tooltip = d3.select("body").append("div")
      .attr("class", "main-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0,0,0,0.9)")
      .style("color", "white")
      .style("padding", "12px")
      .style("border-radius", "8px")
      .style("font-size", "13px")
      .style("pointer-events", "none")
      .style("z-index", 1000)
      .style("max-width", "300px");

    let content = "";
    if (type === 'collaboration') {
      content = `
        <strong>Collaboration</strong><br/>
        Composer: ${data.composer}<br/>
        Singer: ${data.singer}<br/>
        Lyricist: ${data.lyricist}<br/>
        Songs: ${data.songs.length}<br/>
        Years: ${Math.min(...data.years)} - ${Math.max(...data.years)}<br/>
        Movies: ${data.movies.size}
      `;
    } else {
      const years = Array.from(data.activeYears);
      content = `
        <strong>${data.name}</strong><br/>
        Total Songs: ${data.totalSongs}<br/>
        Active: ${Math.min(...years)} - ${Math.max(...years)}<br/>
        Collaborators: ${data.collaborators.composers.size + data.collaborators.singers.size + data.collaborators.lyricists.size - 1}
      `;
    }

    tooltip.html(content)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 10) + "px");
  };

  const hideTooltip = () => {
    d3.selectAll(".main-tooltip").remove();
  };

  // Draw main visualization based on active tab
  useEffect(() => {
    if (!svgRef.current || !filteredArtists[activeTab] || activeTab === 'sunburst') return;

    const container = d3.select(svgRef.current);
    container.selectAll("*").remove();

    const width = 800;
    const height = 500;

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    if (activeTab === 'collaborations') {
      drawCollaborationNetwork(svg, filteredArtists.collaborations, width, height);
    } else {
      drawArtistVisualization(svg, filteredArtists[activeTab], activeTab, width, height);
    }
  }, [filteredArtists, activeTab, zoomLevel, highlightedArtist]);

  return (
    <div className="h-full flex flex-col">
      {/* Full-width Timeline */}
      <div className="bg-white rounded-lg p-3 mb-3 shadow-sm border">
        <div className="text-sm text-gray-600 mb-2">
          🕒 <strong>{selectedYearRange[0]} - {selectedYearRange[1]}</strong>
          {selectedYearRange[0] !== 1960 || selectedYearRange[1] !== 2024 ? (
            <span className="ml-2 text-blue-600">
              ({selectedYearRange[1] - selectedYearRange[0] + 1} years)
            </span>
          ) : (
            <span className="ml-2 text-green-600">(All years)</span>
          )}
        </div>
        <div ref={timelineRef}></div>
        
        {/* Horizontal Tab Navigation */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
          {[
            { key: 'collaborations', label: '🤝 Collaborations', icon: Users, count: filteredArtists.collaborations.length },
            { key: 'singers', label: '🎤 Singers', icon: Mic, count: filteredArtists.singers.length },
            { key: 'composers', label: '🎼 Composers', icon: Music, count: filteredArtists.composers.length },
            { key: 'lyricists', label: '✍️ Lyricists', icon: PenTool, count: filteredArtists.lyricists.length }
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
              <div className={`text-sm font-bold ${activeTab === key ? 'text-white' : 'text-blue-600'}`}>
                {count}
              </div>
            </button>
          ))}
        </div>
      </div>
  
      {/* Main Visualization */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            {activeTab === 'collaborations' && `🤝 ${filteredArtists.collaborations.length} Collaboration Networks`}
            {activeTab === 'singers' && `🎤 ${filteredArtists.singers.length} Singers`}
            {activeTab === 'composers' && `🎼 ${filteredArtists.composers.length} Composers`}
            {activeTab === 'lyricists' && `✍️ ${filteredArtists.lyricists.length} Lyricists`}
          </h3>
          
          <div className="text-sm text-gray-500">
            {activeTab === 'collaborations' 
              ? 'Hover for details • Click to filter/unfilter'
              : 'Circle size = activity • Hover for details • Click to filter/unfilter'
            }
          </div>
        </div>
        
        <div className="h-96 w-full overflow-y-auto rounded-lg border">
          <div ref={svgRef}></div>
        </div>
      </div>
    </div>
  );
};

export default UltimateMusicArchaeology;
