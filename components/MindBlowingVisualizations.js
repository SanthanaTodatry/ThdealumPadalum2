import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';

const MindBlowingVisualizations = ({ 
  filteredSongs, 
  onSongFilter, 
  currentFilters,
  onYearClick,
  onSingerClick,
  onComposerClick,
  onLyricistClick 
}) => {
  const sunburstRef = useRef();
  const networkRef = useRef();
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [hoveredSong, setHoveredSong] = useState(null);

  // Color schemes for different decades
  const colorSchemes = {
    2000: d3.scaleOrdinal(d3.schemeSet3),
    2010: d3.scaleOrdinal(d3.schemeCategory10),
    2020: d3.scaleOrdinal(d3.schemePaired)
  };

  const getDecade = (year) => Math.floor(year / 10) * 10;
  const getColorForYear = (year) => {
    const decade = getDecade(year);
    return colorSchemes[decade] ? colorSchemes[decade](year) : d3.schemeCategory10[year % 10];
  };

  // Prepare hierarchical data for sunburst
  const sunburstData = useMemo(() => {
    const root = { name: "Songs", children: [] };
    
    // Group by decade first
    const decades = d3.group(filteredSongs, d => getDecade(d.year));
    
    decades.forEach((decadeSongs, decade) => {
      const decadeNode = { 
        name: `${decade}s`, 
        children: [],
        type: 'decade',
        value: decade
      };
      
      // Group by year within decade
      const years = d3.group(decadeSongs, d => d.year);
      
      years.forEach((yearSongs, year) => {
        const yearNode = { 
          name: year.toString(), 
          children: [],
          type: 'year',
          value: year,
          decade: decade
        };
        
        // Group by singer within year
        const singers = d3.group(yearSongs, d => d.singer);
        
        singers.forEach((singerSongs, singer) => {
          const singerNode = { 
            name: singer, 
            children: [],
            type: 'singer',
            value: singer,
            year: year,
            decade: decade
          };
          
          // Group by composer within singer
          const composers = d3.group(singerSongs, d => d.composer);
          
          composers.forEach((composerSongs, composer) => {
            const composerNode = { 
              name: composer, 
              size: composerSongs.length,
              type: 'composer',
              value: composer,
              singer: singer,
              year: year,
              decade: decade,
              songs: composerSongs
            };
            
            singerNode.children.push(composerNode);
          });
          
          yearNode.children.push(singerNode);
        });
        
        decadeNode.children.push(yearNode);
      });
      
      root.children.push(decadeNode);
    });
    
    return root;
  }, [filteredSongs]);

  // Prepare network data
  const networkData = useMemo(() => {
    const nodes = filteredSongs.map(song => ({
      id: song.id,
      song: song.song,
      movie: song.movie,
      year: song.year,
      singer: song.singer,
      composer: song.composer,
      lyricist: song.lyricist,
      decade: getDecade(song.year),
      x: Math.random() * 400,
      y: Math.random() * 300,
      vx: 0,
      vy: 0
    }));

    const links = [];
    // Create links between songs with same singer or composer
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].singer === nodes[j].singer || 
            nodes[i].composer === nodes[j].composer) {
          links.push({
            source: nodes[i],
            target: nodes[j],
            type: nodes[i].singer === nodes[j].singer ? 'singer' : 'composer'
          });
        }
      }
    }

    return { nodes, links };
  }, [filteredSongs]);

  // Draw Sunburst Chart
  useEffect(() => {
    if (!sunburstRef.current || !sunburstData) return;

    const container = d3.select(sunburstRef.current);
    container.selectAll("*").remove();

    const width = 400;
    const height = 400;
    const radius = Math.min(width, height) / 2;

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Create partition layout
    const partition = d3.partition()
      .size([2 * Math.PI, radius]);

    // Create hierarchy
    const hierarchy = d3.hierarchy(sunburstData)
      .sum(d => d.size || 1)
      .sort((a, b) => b.value - a.value);

    const root = partition(hierarchy);

    // Create arc generator
    const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1);

    // Add arcs
    const arcs = g.selectAll("path")
      .data(root.descendants().filter(d => d.depth > 0))
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", d => {
        if (d.data.type === 'decade') return d3.schemeCategory10[0];
        if (d.data.type === 'year') return getColorForYear(d.data.value);
        if (d.data.type === 'singer') return d3.schemeSet3[d.data.singer.length % 12];
        if (d.data.type === 'composer') return d3.schemePaired[d.data.composer.length % 12];
        return "#69b3a2";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .style("opacity", 0.8)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .style("opacity", 1)
          .style("stroke-width", 2);
        
        // Show tooltip
        const tooltip = d3.select("body").append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0,0,0,0.8)")
          .style("color", "white")
          .style("padding", "8px")
          .style("border-radius", "4px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("z-index", 1000);

        tooltip.html(`
          <strong>${d.data.name}</strong><br/>
          Type: ${d.data.type}<br/>
          ${d.data.songs ? `Songs: ${d.data.songs.length}` : ''}
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .style("opacity", 0.8)
          .style("stroke-width", 1);
        
        d3.selectAll(".tooltip").remove();
      })
      .on("click", function(event, d) {
        // Handle filtering based on clicked segment
        setSelectedSegment(d.data);
        
        if (d.data.type === 'year') {
          onYearClick({ activePayload: [{ payload: { year: d.data.value } }] });
        } else if (d.data.type === 'singer') {
          onSingerClick({ name: d.data.value });
        } else if (d.data.type === 'composer') {
          onComposerClick({ name: d.data.value });
        }
      });

    // Add labels for visible segments
    g.selectAll("text")
      .data(root.descendants().filter(d => d.depth > 0 && d.y1 - d.y0 > 20))
      .enter()
      .append("text")
      .attr("transform", d => {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        const y = (d.y0 + d.y1) / 2;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
      })
      .attr("dy", "0.35em")
      .style("text-anchor", "middle")
      .style("font-size", "10px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .style("pointer-events", "none")
      .text(d => d.data.name.length > 8 ? d.data.name.substring(0, 8) + "..." : d.data.name);

    // Add center label
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text(`${filteredSongs.length} Songs`);

  }, [sunburstData, filteredSongs]);

  // Draw Force Network
  useEffect(() => {
    if (!networkRef.current || !networkData) return;

    const container = d3.select(networkRef.current);
    container.selectAll("*").remove();

    const width = 400;
    const height = 400;

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    // Create force simulation
    const simulation = d3.forceSimulation(networkData.nodes)
      .force("link", d3.forceLink(networkData.links).id(d => d.id).distance(50))
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(15));

    // Add links
    const links = svg.append("g")
      .selectAll("line")
      .data(networkData.links)
      .enter()
      .append("line")
      .attr("stroke", d => d.type === 'singer' ? "#ff6b6b" : "#4ecdc4")
      .attr("stroke-opacity", 0.3)
      .attr("stroke-width", 1);

    // Add nodes
    const nodes = svg.append("g")
      .selectAll("circle")
      .data(networkData.nodes)
      .enter()
      .append("circle")
      .attr("r", 8)
      .attr("fill", d => getColorForYear(d.year))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))
      .on("mouseover", function(event, d) {
        setHoveredSong(d);
        
        d3.select(this)
          .attr("r", 12)
          .attr("stroke-width", 3);

        // Highlight connected links
        links
          .style("stroke-opacity", l => 
            l.source.id === d.id || l.target.id === d.id ? 0.8 : 0.1)
          .style("stroke-width", l => 
            l.source.id === d.id || l.target.id === d.id ? 3 : 1);

        // Show tooltip
        const tooltip = d3.select("body").append("div")
          .attr("class", "network-tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0,0,0,0.9)")
          .style("color", "white")
          .style("padding", "10px")
          .style("border-radius", "8px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("z-index", 1000);

        tooltip.html(`
          <strong>${d.song}</strong><br/>
          <em>${d.movie} (${d.year})</em><br/>
          Singer: ${d.singer}<br/>
          Composer: ${d.composer}
        `)
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function(event, d) {
        setHoveredSong(null);
        
        d3.select(this)
          .attr("r", 8)
          .attr("stroke-width", 2);

        // Reset link highlighting
        links
          .style("stroke-opacity", 0.3)
          .style("stroke-width", 1);

        d3.selectAll(".network-tooltip").remove();
      })
      .on("click", function(event, d) {
        // Could trigger song selection here
        console.log("Clicked song:", d.song);
      });

    // Update positions on simulation tick
    simulation.on("tick", () => {
      links
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      nodes
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
    });

    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Add legend
    const legend = svg.append("g")
      .attr("transform", "translate(10, 10)");

    legend.append("circle")
      .attr("r", 4)
      .attr("fill", "#ff6b6b")
      .attr("cx", 0)
      .attr("cy", 0);

    legend.append("text")
      .attr("x", 10)
      .attr("y", 0)
      .attr("dy", "0.35em")
      .style("font-size", "10px")
      .style("fill", "#666")
      .text("Singer Connection");

    legend.append("circle")
      .attr("r", 4)
      .attr("fill", "#4ecdc4")
      .attr("cx", 0)
      .attr("cy", 15);

    legend.append("text")
      .attr("x", 10)
      .attr("y", 15)
      .attr("dy", "0.35em")
      .style("font-size", "10px")
      .style("fill", "#666")
      .text("Composer Connection");

  }, [networkData]);

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      {/* Interactive Sunburst */}
      <div className="bg-white p-4 rounded-lg border border-blue-200 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-blue-800">Interactive Hierarchy</h3>
          <div className="text-xs text-gray-500">
            Click segments to filter
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div ref={sunburstRef}></div>
        </div>
        {selectedSegment && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-800">
              Selected: {selectedSegment.name}
            </div>
            <div className="text-xs text-blue-600">
              Type: {selectedSegment.type}
            </div>
          </div>
        )}
      </div>

      {/* Force Network */}
      <div className="bg-white p-4 rounded-lg border border-blue-200 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-blue-800">Song Connections</h3>
          <div className="text-xs text-gray-500">
            Hover & drag bubbles
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div ref={networkRef}></div>
        </div>
        {hoveredSong && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <div className="text-sm font-medium text-green-800">
              {hoveredSong.song}
            </div>
            <div className="text-xs text-green-600">
              {hoveredSong.movie} ({hoveredSong.year})
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MindBlowingVisualizations;
