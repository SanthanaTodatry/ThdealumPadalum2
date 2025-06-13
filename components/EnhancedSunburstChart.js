import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const EnhancedSunburstChart = ({ 
  filteredSongs, 
  onYearClick,
  onSingerClick,
  onComposerClick,
  onLyricistClick,
  resetTrigger
}) => {
  const svgRef = useRef();
  const [currentRoot, setCurrentRoot] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Build hierarchical data structure from filtered songs
  const sunburstData = useMemo(() => {
    if (!filteredSongs || filteredSongs.length === 0) return null;

    const hierarchy = {
      name: "All Songs",
      children: new Map()
    };

    // Group by decade → lyricist → composer → singer
    filteredSongs.forEach(song => {
      const decade = Math.floor(song.year / 10) * 10;
      const decadeKey = `${decade}s`;
      
      if (!hierarchy.children.has(decadeKey)) {
        hierarchy.children.set(decadeKey, {
          name: decadeKey,
          decade: decade,
          children: new Map(),
          value: 0,
          songs: []
        });
      }
      
      const decadeNode = hierarchy.children.get(decadeKey);
      decadeNode.value++;
      decadeNode.songs.push(song);
      
      if (!decadeNode.children.has(song.lyricist)) {
        decadeNode.children.set(song.lyricist, {
          name: song.lyricist,
          lyricist: song.lyricist,
          decade: decade,
          children: new Map(),
          value: 0,
          songs: []
        });
      }
      
      const lyricistNode = decadeNode.children.get(song.lyricist);
      lyricistNode.value++;
      lyricistNode.songs.push(song);
      
      if (!lyricistNode.children.has(song.composer)) {
        lyricistNode.children.set(song.composer, {
          name: song.composer,
          composer: song.composer,
          lyricist: song.lyricist,
          decade: decade,
          children: new Map(),
          value: 0,
          songs: []
        });
      }
      
      const composerNode = lyricistNode.children.get(song.composer);
      composerNode.value++;
      composerNode.songs.push(song);
      
      if (!composerNode.children.has(song.singer)) {
        composerNode.children.set(song.singer, {
          name: song.singer,
          singer: song.singer,
          composer: song.composer,
          lyricist: song.lyricist,
          decade: decade,
          value: 0,
          songs: []
        });
      }
      
      const singerNode = composerNode.children.get(song.singer);
      singerNode.value++;
      singerNode.songs.push(song);
    });

    // Convert Maps to arrays
    const convertToArray = (node) => {
      if (node.children && node.children.size > 0) {
        node.children = Array.from(node.children.values()).map(convertToArray);
      } else {
        delete node.children;
      }
      return node;
    };

    hierarchy.children = Array.from(hierarchy.children.values()).map(convertToArray);
    return hierarchy;
  }, [filteredSongs]);

  // Reset when resetTrigger changes
  useEffect(() => {
    setCurrentRoot(null);
    setZoomLevel(1);
  }, [resetTrigger]);

  // Color schemes for different levels
  const colorSchemes = {
    decade: d3.scaleOrdinal()
      .domain(['1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'])
      .range(['#FF6B9D', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FFB74D']),
    lyricist: d3.scaleOrdinal(d3.schemeSet3),
    composer: d3.scaleOrdinal(d3.schemePastel1),
    singer: d3.scaleOrdinal(d3.schemePastel2)
  };

  const getColor = (d) => {
    if (d.depth === 0) return '#f8f9fa';
    if (d.depth === 1) return colorSchemes.decade(d.data.name);
    if (d.depth === 2) return colorSchemes.lyricist(d.data.name);
    if (d.depth === 3) return colorSchemes.composer(d.data.name);
    if (d.depth === 4) return colorSchemes.singer(d.data.name);
    return '#e9ecef';
  };

  useEffect(() => {
    if (!svgRef.current || !sunburstData) return;

    const container = d3.select(svgRef.current);
    container.selectAll("*").remove();

    const width = 600;
    const height = 600;
    const radius = Math.min(width, height) / 2;

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("font-family", "Inter, system-ui, sans-serif");

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Create partition layout - ALWAYS MAINTAINS FULL CIRCLE
    const partition = d3.partition()
      .size([2 * Math.PI, radius]);

    // Create hierarchy
    const root = d3.hierarchy(sunburstData)
      .sum(d => d.value || 1)
      .sort((a, b) => b.value - a.value);

    partition(root);

    // Determine which node to show based on currentRoot
    const displayRoot = currentRoot || root;
    
    // Get all visible descendants
    const visibleNodes = displayRoot.descendants().filter(d => {
      if (currentRoot) {
        // When zoomed in, adjust the angles to maintain full circle
        const relativeDepth = d.depth - currentRoot.depth;
        return relativeDepth >= 0 && relativeDepth <= 3;
      }
      return d.depth > 0; // Don't show root circle when not zoomed
    });

    // FEATURE 1: ALWAYS MAINTAIN FULL CIRCLE
    // Recalculate angles to fill full circle when zoomed in
    if (currentRoot && visibleNodes.length > 0) {
      const angleScale = 2 * Math.PI / (currentRoot.x1 - currentRoot.x0);
      visibleNodes.forEach(d => {
        d.adjustedX0 = (d.x0 - currentRoot.x0) * angleScale;
        d.adjustedX1 = (d.x1 - currentRoot.x0) * angleScale;
        d.adjustedY0 = Math.max(0, d.y0 - currentRoot.y0);
        d.adjustedY1 = d.y1 - currentRoot.y0;
      });
    } else {
      visibleNodes.forEach(d => {
        d.adjustedX0 = d.x0;
        d.adjustedX1 = d.x1;
        d.adjustedY0 = d.y0;
        d.adjustedY1 = d.y1;
      });
    }

    // Arc generator with smooth curves
    const arc = d3.arc()
      .startAngle(d => d.adjustedX0)
      .endAngle(d => d.adjustedX1)
      .innerRadius(d => d.adjustedY0)
      .outerRadius(d => d.adjustedY1)
      .cornerRadius(3); // Rounded corners for elegance

    // FEATURE 2: BEAUTIFUL GLIDING TRANSITIONS
    const arcTween = (d) => {
      const interpolateStart = d3.interpolate(d.adjustedX0, d.adjustedX0);
      const interpolateEnd = d3.interpolate(d.adjustedX1, d.adjustedX1);
      const interpolateInner = d3.interpolate(d.adjustedY0, d.adjustedY0);
      const interpolateOuter = d3.interpolate(d.adjustedY1, d.adjustedY1);
      
      return function(t) {
        d.adjustedX0 = interpolateStart(t);
        d.adjustedX1 = interpolateEnd(t);
        d.adjustedY0 = interpolateInner(t);
        d.adjustedY1 = interpolateOuter(t);
        return arc(d);
      };
    };

    // Create paths with beautiful transitions
    const paths = g.selectAll("path")
      .data(visibleNodes, d => d.data.name + d.depth)
      .join(
        enter => enter.append("path")
          .attr("d", arc)
          .style("fill", getColor)
          .style("stroke", "#fff")
          .style("stroke-width", 2)
          .style("opacity", 0)
          .style("cursor", "pointer")
          .call(enter => enter.transition()
            .duration(800)
            .ease(d3.easeCubicInOut)
            .style("opacity", 0.85)
            .attrTween("d", arcTween)
          ),
        update => update
          .call(update => update.transition()
            .duration(600)
            .ease(d3.easeCubicInOut)
            .attrTween("d", arcTween)
            .style("fill", getColor)
          ),
        exit => exit
          .call(exit => exit.transition()
            .duration(400)
            .ease(d3.easeCubicInOut)
            .style("opacity", 0)
            .remove()
          )
      );

    // Enhanced hover effects
    paths
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .style("opacity", 1)
          .style("stroke-width", 3)
          .style("stroke", "#2563eb");

        // Show elegant tooltip
        const tooltip = d3.select("body").append("div")
          .attr("class", "sunburst-tooltip")
          .style("position", "absolute")
          .style("background", "rgba(15, 23, 42, 0.95)")
          .style("color", "white")
          .style("padding", "16px 20px")
          .style("border-radius", "12px")
          .style("font-size", "14px")
          .style("line-height", "1.5")
          .style("pointer-events", "none")
          .style("z-index", 2000)
          .style("backdrop-filter", "blur(8px)")
          .style("border", "1px solid rgba(255, 255, 255, 0.1)")
          .style("box-shadow", "0 20px 25px -5px rgba(0, 0, 0, 0.3)")
          .style("max-width", "300px");

        let content = `<div style="font-weight: 600; margin-bottom: 8px; color: #60a5fa;">${d.data.name}</div>`;
        content += `<div style="margin-bottom: 4px;">📊 Songs: <strong>${d.value}</strong></div>`;
        
        if (d.depth === 1) content += `<div>🗓️ Decade: ${d.data.name}</div>`;
        if (d.depth === 2) content += `<div>✍️ Lyricist in ${d.parent.data.name}</div>`;
        if (d.depth === 3) content += `<div>🎼 Composer with ${d.parent.data.name}</div>`;
        if (d.depth === 4) content += `<div>🎤 Singer for ${d.parent.data.name}</div>`;

        tooltip.html(content)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 10) + "px")
          .style("opacity", 0)
          .transition()
          .duration(200)
          .style("opacity", 1);
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition()
          .duration(150)
          .style("opacity", 0.85)
          .style("stroke-width", 2)
          .style("stroke", "#fff");

        d3.selectAll(".sunburst-tooltip")
          .transition()
          .duration(200)
          .style("opacity", 0)
          .remove();
      })
      .on("click", function(event, d) {
        event.stopPropagation();

        // BEAUTIFUL ZOOM WITH MAINTAINED FULL CIRCLE
        if (d.children || (d.data.children && d.data.children.length > 0)) {
          // Zoom in with gliding transition
          setCurrentRoot(d);
          
          // Call appropriate filter function
          if (d.depth === 1 && onYearClick) {
            onYearClick({ activePayload: [{ payload: { year: d.data.decade } }] });
          } else if (d.depth === 4 && onSingerClick) {
            onSingerClick({ name: d.data.singer });
          } else if (d.depth === 3 && onComposerClick) {
            onComposerClick({ name: d.data.composer });
          } else if (d.depth === 2 && onLyricistClick) {
            onLyricistClick({ name: d.data.lyricist });
          }
        }
      });

    // Add center circle for zoom out
    if (currentRoot) {
      g.append("circle")
        .attr("r", 25)
        .style("fill", "#2563eb")
        .style("stroke", "#fff")
        .style("stroke-width", 3)
        .style("cursor", "pointer")
        .style("opacity", 0.9)
        .on("mouseover", function() {
          d3.select(this).style("opacity", 1);
        })
        .on("mouseout", function() {
          d3.select(this).style("opacity", 0.9);
        })
        .on("click", function() {
          setCurrentRoot(null);
        });

      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .style("fill", "white")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .style("pointer-events", "none")
        .text("↺");
    }

    // Add elegant text labels for larger segments
    const textPaths = g.selectAll("text")
      .data(visibleNodes.filter(d => (d.adjustedX1 - d.adjustedX0) > 0.1 && d.adjustedY1 - d.adjustedY0 > 20))
      .join("text")
      .attr("text-anchor", "middle")
      .style("font-size", d => `${Math.max(10, Math.min(14, (d.adjustedY1 - d.adjustedY0) / 6))}px`)
      .style("font-weight", "500")
      .style("fill", d => d.depth <= 2 ? "#fff" : "#1e293b")
      .style("pointer-events", "none")
      .style("text-shadow", d => d.depth <= 2 ? "0 1px 2px rgba(0,0,0,0.3)" : "none")
      .attr("transform", d => {
        const angle = (d.adjustedX0 + d.adjustedX1) / 2;
        const radius = (d.adjustedY0 + d.adjustedY1) / 2;
        const x = Math.sin(angle) * radius;
        const y = -Math.cos(angle) * radius;
        const rotation = angle > Math.PI ? (angle * 180 / Math.PI) - 90 : (angle * 180 / Math.PI) + 90;
        return `translate(${x},${y}) rotate(${rotation})`;
      })
      .text(d => {
        const maxLength = Math.max(5, Math.floor((d.adjustedX1 - d.adjustedX0) * 20));
        return d.data.name.length > maxLength ? 
          d.data.name.substring(0, maxLength) + "..." : 
          d.data.name;
      });

  }, [sunburstData, currentRoot]);

  const resetZoom = () => {
    setCurrentRoot(null);
    setZoomLevel(1);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">
            🌞 Interactive Sunburst Explorer
          </h3>
          <p className="text-slate-600 text-sm">
            Decade → Lyricist → Composer → Singer • Click to zoom • Always maintains full circle
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {currentRoot && (
            <div className="text-sm text-slate-600 bg-white px-3 py-1 rounded-full border">
              Zoomed into: <span className="font-semibold">{currentRoot.data.name}</span>
            </div>
          )}
          <button
            onClick={resetZoom}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            <RotateCcw className="w-4 h-4" />
            Reset View
          </button>
        </div>
      </div>

      {/* Sunburst Visualization */}
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <div ref={svgRef} className="overflow-visible" />
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 grid grid-cols-4 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-r from-pink-400 to-orange-400"></div>
          <span className="text-slate-700">Decades</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-r from-green-300 to-blue-300"></div>
          <span className="text-slate-700">Lyricists</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-r from-purple-300 to-pink-300"></div>
          <span className="text-slate-700">Composers</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-r from-yellow-300 to-red-300"></div>
          <span className="text-slate-700">Singers</span>
        </div>
      </div>
    </div>
  );
};

export default EnhancedSunburstChart;
