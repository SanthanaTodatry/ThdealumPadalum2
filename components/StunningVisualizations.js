import React, { useState, useMemo, useEffect } from 'react';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer,
  Treemap,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  AreaChart,
  Area
} from 'recharts';

const StunningVisualizations = ({ 
  filteredSongs, 
  onYearClick,
  onSingerClick,
  onComposerClick,
  onLyricistClick,
  chartFilters
}) => {
  const [activeView, setActiveView] = useState('radar');
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [expandedOthers, setExpandedOthers] = useState(null);

  useEffect(() => {
    setIsMobileDevice(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  // iOS-safe defaults
  const chartHeight = isMobileDevice ? 200 : 250;
  const animationDuration = isMobileDevice ? 0 : 300;

  // Limit data on mobile to prevent crashes
  const processedData = useMemo(() => {
    if (isMobileDevice && filteredSongs.length > 50) {
      return filteredSongs.slice(0, 50);
    }
    return filteredSongs;
  }, [filteredSongs, isMobileDevice]);

  // Helper function to create "Others" buckets
  const createOthersBucket = (items, maxItems, label) => {
    if (items.length <= maxItems) return items;
    
    const topItems = items.slice(0, maxItems - 1);
    const otherItems = items.slice(maxItems - 1);
    const othersTotal = otherItems.reduce((sum, item) => sum + (item.value || item.size || item.totalSongs || 1), 0);
    
    return [
      ...topItems,
      {
        name: `Others (${otherItems.length} ${label})`,
        value: othersTotal,
        size: othersTotal,
        totalSongs: othersTotal,
        isOthers: true,
        otherItems: otherItems,
        type: label
      }
    ];
  };

  // Beautiful color palettes
  const DECADE_COLORS = {
    1960: ['#FF6B6B', '#FF8E8E', '#FFB1B1'],
    1970: ['#4ECDC4', '#7ED3D1', '#A8DEDA'],
    1980: ['#45B7D1', '#6AC4DD', '#8FD1E9'],
    1990: ['#96CEB4', '#B8DCC6', '#DAEBD7'],
    2000: ['#FFEAA7', '#FFE58A', '#FFF2CC'],
    2010: ['#DDA0DD', '#E6B3E6', '#F0C6F0'],
    2020: ['#FFB74D', '#FFCC80', '#FFE0B2']
  };

  const RADAR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

  const getDecade = (year) => Math.floor(year / 10) * 10;
  const getColorForYear = (year) => {
    const decade = getDecade(year);
    return DECADE_COLORS[decade] ? DECADE_COLORS[decade][0] : '#96CEB4';
  };

  // Prepare radar chart data with "Others" bucket
  const radarData = useMemo(() => {
    const years = [...new Set(processedData.map(s => s.year))].sort().slice(-10);
    const maxSingers = isMobileDevice ? 4 : 6;
    
    const allSingers = Object.entries(
      processedData.reduce((acc, song) => {
        acc[song.singer] = (acc[song.singer] || 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]);

    const topSingers = allSingers.slice(0, maxSingers - 1);
    const otherSingers = allSingers.slice(maxSingers - 1);

    return years.map(year => {
      const yearData = { year };
      
      // Add top singers
      topSingers.forEach(([singer]) => {
        yearData[singer] = processedData.filter(s => s.year === year && s.singer === singer).length;
      });
      
      // Add "Others" bucket if there are other singers
      if (otherSingers.length > 0) {
        yearData[`Others (${otherSingers.length})`] = otherSingers.reduce((sum, [singer]) => {
          return sum + processedData.filter(s => s.year === year && s.singer === singer).length;
        }, 0);
      }
      
      return yearData;
    });
  }, [processedData, isMobileDevice]);

  const radarKeys = useMemo(() => {
    const maxSingers = isMobileDevice ? 4 : 6;
    const allSingers = Object.entries(
      processedData.reduce((acc, song) => {
        acc[song.singer] = (acc[song.singer] || 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]);

    const keys = allSingers.slice(0, maxSingers - 1).map(([singer]) => singer);
    if (allSingers.length >= maxSingers) {
      keys.push(`Others (${allSingers.length - (maxSingers - 1)})`);
    }
    return keys;
  }, [processedData, isMobileDevice]);

  // Prepare treemap data with "Others" bucket
  const treemapData = useMemo(() => {
    const maxComposers = isMobileDevice ? 6 : 8;
    const maxSingersPerComposer = isMobileDevice ? 4 : 6;
    
    const composers = processedData.reduce((acc, song) => {
      if (!acc[song.composer]) {
        acc[song.composer] = {
          name: song.composer,
          totalSongs: 0,
          singers: {}
        };
      }
      if (!acc[song.composer].singers[song.singer]) {
        acc[song.composer].singers[song.singer] = {
          name: song.singer,
          size: 0,
          composer: song.composer
        };
      }
      acc[song.composer].singers[song.singer].size += 1;
      acc[song.composer].totalSongs += 1;
      return acc;
    }, {});

    const sortedComposers = Object.values(composers).sort((a, b) => b.totalSongs - a.totalSongs);
    const topComposers = sortedComposers.slice(0, maxComposers - 1);
    const otherComposers = sortedComposers.slice(maxComposers - 1);

    const result = topComposers.map(composer => {
      const sortedSingers = Object.values(composer.singers).sort((a, b) => b.size - a.size);
      const children = createOthersBucket(sortedSingers, maxSingersPerComposer, 'singers');
      
      return {
        ...composer,
        children: children
      };
    });

    // Add "Other Composers" if needed
    if (otherComposers.length > 0) {
      const allOtherSingers = {};
      otherComposers.forEach(composer => {
        Object.values(composer.singers).forEach(singer => {
          if (!allOtherSingers[singer.name]) {
            allOtherSingers[singer.name] = { name: singer.name, size: 0, isOthers: true };
          }
          allOtherSingers[singer.name].size += singer.size;
        });
      });

      const otherSingersArray = Object.values(allOtherSingers)
        .sort((a, b) => b.size - a.size)
        .slice(0, 8);

      result.push({
        name: `Other Composers (${otherComposers.length})`,
        children: otherSingersArray,
        isOthers: true,
        otherItems: otherComposers
      });
    }

    return result;
  }, [processedData, isMobileDevice]);

  // Prepare bubble chart data with "Others" grouping by decade
  const bubbleData = useMemo(() => {
    const maxBubbles = isMobileDevice ? 20 : 40;
    const dataToUse = isMobileDevice ? processedData.slice(0, 30) : processedData;
    
    if (dataToUse.length <= maxBubbles) {
      return dataToUse.map((song, index) => ({
        x: song.year,
        y: song.singer.length,
        z: isMobileDevice ? 30 : 50 + (index % 3) * 25,
        song: song.song,
        movie: song.movie,
        singer: song.singer,
        composer: song.composer,
        decade: getDecade(song.year),
        isOthers: false
      }));
    }

    // Group by decade and create "Others" bubbles for less important songs
    const decades = {};
    dataToUse.forEach(song => {
      const decade = getDecade(song.year);
      if (!decades[decade]) decades[decade] = [];
      decades[decade].push(song);
    });

    const result = [];
    Object.entries(decades).forEach(([decade, songs]) => {
      const decadeInt = parseInt(decade);
      const maxPerDecade = Math.floor(maxBubbles / Object.keys(decades).length);
      
      if (songs.length <= maxPerDecade) {
        // Add all songs from this decade
        songs.forEach((song, index) => {
          result.push({
            x: song.year,
            y: song.singer.length,
            z: isMobileDevice ? 30 : 50 + (index % 3) * 25,
            song: song.song,
            movie: song.movie,
            singer: song.singer,
            composer: song.composer,
            decade: decadeInt,
            isOthers: false
          });
        });
      } else {
        // Add top songs + "Others" bubble
        const topSongs = songs.slice(0, maxPerDecade - 1);
        const otherSongs = songs.slice(maxPerDecade - 1);
        
        topSongs.forEach((song, index) => {
          result.push({
            x: song.year,
            y: song.singer.length,
            z: isMobileDevice ? 30 : 50 + (index % 3) * 25,
            song: song.song,
            movie: song.movie,
            singer: song.singer,
            composer: song.composer,
            decade: decadeInt,
            isOthers: false
          });
        });
        
        // Add "Others" bubble for this decade
        result.push({
          x: decadeInt + 5, // Middle of decade
          y: 12, // Average singer name length
          z: isMobileDevice ? 40 : 60,
          song: `Others (${otherSongs.length} songs)`,
          movie: `${decadeInt}s`,
          singer: 'Various Artists',
          composer: 'Various Composers',
          decade: decadeInt,
          isOthers: true,
          otherItems: otherSongs
        });
      }
    });

    return result;
  }, [processedData, isMobileDevice]);

  // Prepare area chart data with "Others" grouping for less active decades
  const areaData = useMemo(() => {
    const maxDecades = 5; // Limit to 5 most active decades + Others
    
    const yearCounts = processedData.reduce((acc, song) => {
      const decade = getDecade(song.year);
      if (!acc[song.year]) {
        acc[song.year] = { year: song.year };
      }
      const decadeKey = `decade_${decade}`;
      acc[song.year][decadeKey] = (acc[song.year][decadeKey] || 0) + 1;
      return acc;
    }, {});

    // Find most active decades
    const decadeTotals = {};
    Object.values(yearCounts).forEach(yearData => {
      Object.keys(yearData).forEach(key => {
        if (key.startsWith('decade_')) {
          const decade = key.replace('decade_', '');
          decadeTotals[decade] = (decadeTotals[decade] || 0) + yearData[key];
        }
      });
    });

    const sortedDecades = Object.entries(decadeTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([decade]) => decade);

    const topDecades = sortedDecades.slice(0, maxDecades - 1);
    const otherDecades = sortedDecades.slice(maxDecades - 1);

    // Rebuild data with "Others" bucket
    const finalData = Object.values(yearCounts).map(yearData => {
      const newYearData = { year: yearData.year };
      
      // Add top decades
      topDecades.forEach(decade => {
        newYearData[`decade_${decade}`] = yearData[`decade_${decade}`] || 0;
      });
      
      // Add "Others" bucket
      if (otherDecades.length > 0) {
        newYearData['decade_others'] = otherDecades.reduce((sum, decade) => {
          return sum + (yearData[`decade_${decade}`] || 0);
        }, 0);
      }
      
      return newYearData;
    }).sort((a, b) => a.year - b.year);

    return finalData;
  }, [processedData]);

  const getDecadeColor = (decade) => DECADE_COLORS[decade]?.[0] || '#96CEB4';

  // Handle "Others" interactions
  const handleOthersClick = (othersData) => {
    setExpandedOthers(othersData);
  };

  const handleRadarClick = (data) => {
    if (data && data.name && data.name.includes('Others')) {
      // Could show modal with other singers
      return;
    }
    onSingerClick({ name: data.name });
  };

  // Enhanced click handlers that handle "Others"
  const handleBubbleClick = (data) => {
    if (data.isOthers && data.otherItems) {
      handleOthersClick({
        type: 'songs',
        items: data.otherItems,
        title: `Other songs from ${data.movie}`,
        decade: data.decade
      });
    } else {
      onYearClick({ activePayload: [{ payload: { year: data.x } }] });
    }
  };

  const handleTreemapClick = (payload) => {
    if (payload.isOthers && payload.otherItems) {
      handleOthersClick({
        type: payload.type || (payload.composer ? 'singers' : 'composers'),
        items: payload.otherItems,
        title: payload.composer ? 
          `Other singers for ${payload.composer}` : 
          'Other composers'
      });
    } else if (payload.composer && !payload.isOthers) {
      onSingerClick({ name: payload.name });
    } else {
      onComposerClick({ name: payload.name });
    }
  };

  // Enhanced tooltip components that handle "Others"
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const hasOthers = payload.some(p => p.dataKey && p.dataKey.includes('Others'));
      
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg max-w-xs">
          <p className="font-semibold text-sm">{`${label}`}</p>
          {payload.slice(0, 3).map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-xs">
              {`${entry.dataKey}: ${entry.value}`}
              {entry.dataKey && entry.dataKey.includes('Others') && ' (aggregated)'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const BubbleTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black bg-opacity-80 text-white p-3 rounded-lg text-sm max-w-xs">
          <p className="font-bold">{data.song}</p>
          <p>{data.movie} ({data.x})</p>
          <p>Singer: {data.singer}</p>
          <p>Composer: {data.composer}</p>
          {data.isOthers && <p className="text-yellow-300">📊 Click to see details</p>}
        </div>
      );
    }
    return null;
  };

  const TreemapTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-purple-900 text-white p-3 rounded-lg text-sm max-w-xs">
          <p className="font-bold">{data.name}</p>
          <p>Songs: {data.size}</p>
          {data.composer && <p>Composer: {data.composer}</p>}
          {data.isOthers && <p className="text-yellow-300">📊 Aggregated data - click to expand</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col">
      {/* iOS Performance Warning */}
      {isMobileDevice && filteredSongs.length > 50 && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded-lg">
          <div className="text-sm text-yellow-800">
            📱 Showing {processedData.length} of {filteredSongs.length} songs for better mobile performance
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex bg-white rounded-lg p-1 mb-4 shadow-sm border">
        {[
          { key: 'radar', label: '🎯 Artist Radar', color: 'blue' },
          { key: 'bubble', label: '🫧 Song Universe', color: 'purple' },
          { key: 'treemap', label: '🗂️ Music Hierarchy', color: 'green' },
          { key: 'area', label: '🌊 Time Waves', color: 'orange' }
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setActiveView(key)}
            className={`flex-1 py-2 px-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
              activeView === key
                ? `bg-${color}-600 text-white shadow-md`
                : `text-${color}-600 hover:bg-${color}-50`
            }`}
          >
            {isMobileDevice ? label.split(' ')[0] : label}
          </button>
        ))}
      </div>

      {/* Visualization Container */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4 relative">
        {/* Radar Chart - Artist Activity with Others */}
        {activeView === 'radar' && (
          <div className="h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">🎯 Artist Activity Radar</h3>
              <div className="text-xs text-gray-500">
                Top {isMobileDevice ? 3 : 5} singers + Others
              </div>
            </div>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis 
                  dataKey="year" 
                  tick={{ fontSize: isMobileDevice ? 10 : 12, fill: '#6b7280' }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 'dataMax']}
                  tick={{ fontSize: isMobileDevice ? 8 : 10, fill: '#9ca3af' }}
                />
                {radarKeys.map((singer, index) => {
                  const isOthers = singer.includes('Others');
                  return (
                    <Radar
                      key={singer}
                      name={singer}
                      dataKey={singer}
                      stroke={isOthers ? '#9CA3AF' : RADAR_COLORS[index % RADAR_COLORS.length]}
                      fill={isOthers ? '#9CA3AF' : RADAR_COLORS[index % RADAR_COLORS.length]}
                      fillOpacity={isOthers ? 0.1 : 0.2}
                      strokeWidth={isOthers ? 1 : 2}
                      strokeDasharray={isOthers ? "5,5" : "0"}
                      dot={{ r: isMobileDevice ? 2 : 4, strokeWidth: 2 }}
                      animationDuration={animationDuration}
                    />
                  );
                })}
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: isMobileDevice ? '10px' : '12px' }}
                  onClick={(e) => !e.value.includes('Others') && handleRadarClick({ name: e.value })}
                  iconType="circle"
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Bubble Chart - Songs Universe with Others */}
        {activeView === 'bubble' && (
          <div className="h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">🫧 Song Universe</h3>
              <div className="text-xs text-gray-500">
                {isMobileDevice ? 'Tap bubbles' : 'Hover bubbles • Gray = Others (click to expand)'}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ScatterChart data={bubbleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Year"
                  domain={['dataMin', 'dataMax']}
                  tick={{ fontSize: isMobileDevice ? 10 : 12 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="Singer"
                  tick={{ fontSize: isMobileDevice ? 10 : 12 }}
                />
                <ZAxis type="number" dataKey="z" range={isMobileDevice ? [15, 50] : [20, 100]} />
                <Tooltip content={<BubbleTooltip />} />
                {Object.keys(DECADE_COLORS).map(decade => {
                  const decadeData = bubbleData.filter(d => d.decade === parseInt(decade));
                  const regularData = decadeData.filter(d => !d.isOthers);
                  const othersData = decadeData.filter(d => d.isOthers);
                  
                  return (
                    <React.Fragment key={decade}>
                      <Scatter
                        name={`${decade}s`}
                        data={regularData}
                        fill={getDecadeColor(parseInt(decade))}
                        fillOpacity={0.7}
                        onClick={(data) => handleBubbleClick(data)}
                        style={{ cursor: 'pointer' }}
                        animationDuration={animationDuration}
                      />
                      {othersData.length > 0 && (
                        <Scatter
                          name={`${decade}s Others`}
                          data={othersData}
                          fill="#9CA3AF"
                          fillOpacity={0.5}
                          onClick={(data) => handleBubbleClick(data)}
                          style={{ cursor: 'pointer' }}
                          animationDuration={animationDuration}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
                <Legend wrapperStyle={{ fontSize: isMobileDevice ? '10px' : '12px' }} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Treemap - Music Hierarchy with Others */}
        {activeView === 'treemap' && (
          <div className="h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">🗂️ Music Hierarchy</h3>
              <div className="text-xs text-gray-500">
                {isMobileDevice ? 'Tap to filter' : 'Composers → Singers • Gray = Others • Click to filter'}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <Treemap
                data={treemapData}
                dataKey="size"
                stroke="#fff"
                strokeWidth={1}
                animationDuration={animationDuration}
                content={({ x, y, width, height, payload, index }) => {
                  if (!payload) return null;
                  
                  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF8E8E', '#7ED3D1'];
                  const color = payload.isOthers ? '#9CA3AF' : colors[index % colors.length];
                  const fontSize = Math.min(width / (isMobileDevice ? 12 : 8), height / (isMobileDevice ? 6 : 4), isMobileDevice ? 10 : 14);
                  
                  return (
                    <g>
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={color}
                        fillOpacity={payload.isOthers ? 0.6 : 0.8}
                        stroke="#fff"
                        strokeWidth={1}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleTreemapClick(payload)}
                      />
                      {width > (isMobileDevice ? 30 : 50) && height > (isMobileDevice ? 20 : 30) && (
                        <text
                          x={x + width / 2}
                          y={y + height / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={fontSize}
                          fill={payload.isOthers ? "#374151" : "#fff"}
                          fontWeight={payload.isOthers ? "normal" : "bold"}
                        >
                          {payload.name.length > (isMobileDevice ? 8 : 12) 
                            ? payload.name.substring(0, isMobileDevice ? 8 : 12) + "..." 
                            : payload.name}
                        </text>
                      )}
                      {width > (isMobileDevice ? 50 : 80) && height > (isMobileDevice ? 35 : 50) && (
                        <text
                          x={x + width / 2}
                          y={y + height / 2 + (isMobileDevice ? 10 : 15)}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={Math.min(fontSize - 2, isMobileDevice ? 8 : 10)}
                          fill={payload.isOthers ? "#6B7280" : "#fff"}
                        >
                          {payload.size} songs
                        </text>
                      )}
                      {payload.isOthers && width > 30 && height > 30 && (
                        <text
                          x={x + width - 5}
                          y={y + 12}
                          textAnchor="end"
                          fontSize="10"
                          fill="#6B7280"
                        >
                          📊
                        </text>
                      )}
                    </g>
                  );
                }}
              >
                <Tooltip content={<TreemapTooltip />} />
              </Treemap>
            </ResponsiveContainer>
          </div>
        )}

        {/* Area Chart - Time Waves with Others */}
        {activeView === 'area' && (
          <div className="h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">🌊 Music Time Waves</h3>
              <div className="text-xs text-gray-500">Song releases through decades + Others</div>
            </div>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <AreaChart data={areaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="year" 
                  tick={{ fontSize: isMobileDevice ? 10 : 12 }}
                  onClick={(data) => onYearClick({ activePayload: [{ payload: { year: data.value } }] })}
                  style={{ cursor: 'pointer' }}
                />
                <YAxis tick={{ fontSize: isMobileDevice ? 10 : 12 }} />
                <Tooltip content={<CustomTooltip />} />
                {Object.keys(DECADE_COLORS).map((decade, index) => (
                  <Area
                    key={decade}
                    type="monotone"
                    dataKey={`decade_${decade}`}
                    stackId="1"
                    stroke={getDecadeColor(parseInt(decade))}
                    fill={getDecadeColor(parseInt(decade))}
                    fillOpacity={0.7}
                    name={`${decade}s`}
                    animationDuration={animationDuration}
                  />
                ))}
                {/* Others area with different styling */}
                <Area
                  type="monotone"
                  dataKey="decade_others"
                  stackId="1"
                  stroke="#9CA3AF"
                  fill="#9CA3AF"
                  fillOpacity={0.4}
                  strokeDasharray="5,5"
                  name="Other Decades"
                  animationDuration={animationDuration}
                />
                <Legend wrapperStyle={{ fontSize: isMobileDevice ? '10px' : '12px' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* "Others" Expansion Modal */}
        {expandedOthers && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <div className="bg-white rounded-lg p-6 max-w-md max-h-96 overflow-y-auto m-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{expandedOthers.title}</h3>
                <button 
                  onClick={() => setExpandedOthers(null)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-2">
                {expandedOthers.items.slice(0, 20).map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (expandedOthers.type === 'singers') {
                        onSingerClick({ name: item.name });
                      } else if (expandedOthers.type === 'composers') {
                        onComposerClick({ name: item.name });
                      } else if (expandedOthers.type === 'songs') {
                        // For songs, you might want to navigate to that specific song
                        console.log('Selected song:', item.song);
                      }
                      setExpandedOthers(null);
                    }}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded border transition-colors"
                  >
                    <div className="font-medium">
                      {item.name || item.song || item.composer}
                    </div>
                    <div className="text-sm text-gray-600">
                      {expandedOthers.type === 'songs' ? 
                        `${item.movie} (${item.year}) • ${item.singer}` :
                        `${item.size || item.totalSongs || 1} songs`
                      }
                    </div>
                  </button>
                ))}
                {expandedOthers.items.length > 20 && (
                  <div className="text-center text-gray-500 text-sm">
                    ... and {expandedOthers.items.length - 20} more
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Filter Display */}
      {(chartFilters?.year || chartFilters?.singer || chartFilters?.composer) && (
        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
          <div className="text-sm font-medium text-gray-800 mb-2">🎯 Active Filters:</div>
          <div className="flex gap-2 flex-wrap">
            {chartFilters.year && (
              <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs">
                Year: {chartFilters.year}
              </span>
            )}
            {chartFilters.singer && (
              <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-xs">
                Singer: {chartFilters.singer}
              </span>
            )}
            {chartFilters.composer && (
              <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs">
                Composer: {chartFilters.composer}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StunningVisualizations;
