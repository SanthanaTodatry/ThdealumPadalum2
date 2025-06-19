import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Users, Music, Mic, PenTool, Play } from 'lucide-react';

// CleanYouTubePlayer component for video rendering
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

  // Reset video when song changes
  useEffect(() => {
    if (song) {
      setVideoId(null);
      setError(null);
      searchForVideo(song);
    }
  }, [song?.id]); // Track by song ID

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

  // YouTube player options for large display
  const opts = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 0,
      controls: 1, // Enable controls for better UX
      rel: 0,
      modestbranding: 1,
      fs: 1, // Allow fullscreen
      iv_load_policy: 3,
      showinfo: 0,
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
    <div className="h-full w-full bg-black rounded-lg overflow-hidden">
      {videoId ? (
        <div className="relative h-full w-full">
          {/* For now, show video info - you'll need to add react-youtube */}
          <div className="h-full flex flex-col items-center justify-center text-white bg-gradient-to-br from-gray-900 to-black">
            <div className="text-center max-w-lg p-8">
              <div className="text-6xl mb-6">📺</div>
              <h2 className="text-2xl font-bold mb-2">{song.song}</h2>
              <p className="text-lg text-gray-300 mb-1">{song.movie} ({song.year})</p>
              <p className="text-md text-gray-400 mb-6">{song.singer}</p>
              
              <div className="bg-green-600 text-white px-4 py-2 rounded-lg mb-4">
                ✅ Video Found: {videoId}
              </div>
              
              <div className="text-sm text-gray-500 bg-gray-800 p-3 rounded">
                <p><strong>Next Step:</strong> Install react-youtube</p>
                <p><code>npm install react-youtube</code></p>
              </div>
            </div>
          </div>
          
          {/* TODO: Replace above with actual YouTube component */}
          {/* 
          <YouTube
            videoId={videoId}
            opts={opts}
            onReady={onReady}
            onStateChange={onStateChange}
            className="h-full w-full"
          />
          */}
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
      <div className="flex-1 bg-white rounded-lg border border-gray-200 p-2">
        <div className="h-96 w-full overflow-y-auto rounded-lg border">
          {activeTab === 'video' ? (
            // Video tab - ONLY video content
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
                    <div className="text-sm text-gray-500 mt-2">Use the playlist to choose a song</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Chart tabs - ONLY chart content
            <div ref={svgRef} className="h-full w-full"></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UltimateMusicArchaeology;
