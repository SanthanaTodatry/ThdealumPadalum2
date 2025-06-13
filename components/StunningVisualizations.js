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

  // Prepare radar chart data (Artist activity across years) - iOS optimized
  const radarData = useMemo(() => {
    const years = [...new Set(processedData.map(s => s.year))].sort().slice(-10); // Last 10 years only on mobile
    const topSingers = Object.entries(
      processedData.reduce((acc, song) => {
        acc[song.singer] = (acc[song.singer] || 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, isMobileDevice ? 4 : 6); // Fewer singers on mobile

    return years.map(year => {
      const yearData = { year };
      topSingers.forEach(([singer]) => {
        yearData[singer] = processedData.filter(s => s.year === year && s.singer === singer).length;
      });
      return yearData;
    });
  }, [processedData, isMobileDevice]);

  const radarKeys = useMemo(() => {
    return Object.entries(
      processedData.reduce((acc, song) => {
        acc[song.singer] = (acc[song.singer] || 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, isMobileDevice ? 4 : 6).map(([singer]) => singer);
  }, [processedData, isMobileDevice]);

  // Prepare treemap data (Hierarchical view) - iOS optimized
  const treemapData = useMemo(() => {
    const composers = processedData.reduce((acc, song) => {
      if (!acc[song.composer]) {
        acc[song.composer] = {
          name: song.composer,
          children: {}
        };
      }
      if (!acc[song.composer].children[song.singer]) {
        acc[song.composer].children[song.singer] = {
          name: song.singer,
          size: 0,
          composer: song.composer
        };
      }
      acc[song.composer].children[song.singer].size += 1;
      return acc;
    }, {});

    return Object.values(composers).map(composer => ({
      ...composer,
      children: Object.values(composer.children)
    })).slice(0, isMobileDevice ? 6 : 8);
  }, [processedData, isMobileDevice]);

  // Prepare bubble chart data (Songs as bubbles) - iOS optimized
  const bubbleData = useMemo(() => {
    const dataToUse = isMobileDevice ? processedData.slice(0, 30) : processedData; // Limit bubbles on mobile
    return dataToUse.map((song, index) => ({
      x: song.year,
      y: song.singer.length,
      z: isMobileDevice ? 30 : 50 + (index % 3) * 25, // Smaller bubbles on mobile
      song: song.song,
      movie: song.movie,
      singer: song.singer,
      composer: song.composer,
      decade: getDecade(song.year)
    }));
  }, [processedData, isMobileDevice]);

  // Prepare area chart data (Songs over time by decade) - iOS optimized
  const areaData = useMemo(() => {
    const yearCounts = processedData.reduce((acc, song) => {
      const decade = getDecade(song.year);
      if (!acc[song.year]) {
        acc[song.year] = { year: song.year };
      }
      const decadeKey = `decade_${decade}`;
      acc[song.year][decadeKey] = (acc[song.year][decadeKey] || 0) + 1;
      return acc;
    }, {});

    return Object.values(yearCounts).sort((a, b) => a.year - b.year);
  }, [processedData]);

  const getDecadeColor = (decade) => DECADE_COLORS[decade]?.[0] || '#96CEB4';

  // iOS-safe tooltip components
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg max-w-xs">
          <p className="font-semibold text-sm">{`${label}`}</p>
          {payload.slice(0, 3).map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-xs">
              {`${entry.dataKey}: ${entry.value}`}
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
      <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4">
        {/* Radar Chart - Artist Activity */}
        {activeView === 'radar' && (
          <div className="h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">🎯 Artist Activity Radar</h3>
              <div className="text-xs text-gray-500">Top {isMobileDevice ? 4 : 6} singers</div>
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
                {radarKeys.map((singer, index) => (
                  <Radar
                    key={singer}
                    name={singer}
                    dataKey={singer}
                    stroke={RADAR_COLORS[index % RADAR_COLORS.length]}
                    fill={RADAR_COLORS[index % RADAR_COLORS.length]}
                    fillOpacity={0.2}
                    strokeWidth={2}
                    dot={{ r: isMobileDevice ? 2 : 4, strokeWidth: 2 }}
                    animationDuration={animationDuration}
                  />
                ))}
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: isMobileDevice ? '10px' : '12px' }}
                  onClick={(e) => onSingerClick({ name: e.value })}
                  iconType="circle"
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Bubble Chart - Songs Universe */}
        {activeView === 'bubble' && (
          <div className="h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">🫧 Song Universe</h3>
              <div className="text-xs text-gray-500">
                {isMobileDevice ? 'Tap bubbles' : 'Hover bubbles • X: Year • Y: Singer name length'}
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
                {Object.keys(DECADE_COLORS).map(decade => (
                  <Scatter
                    key={decade}
                    name={`${decade}s`}
                    data={bubbleData.filter(d => d.decade === parseInt(decade))}
                    fill={getDecadeColor(parseInt(decade))}
                    fillOpacity={0.7}
                    onClick={(data) => onYearClick({ activePayload: [{ payload: { year: data.x } }] })}
                    style={{ cursor: 'pointer' }}
                    animationDuration={animationDuration}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: isMobileDevice ? '10px' : '12px' }} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Treemap - Music Hierarchy */}
        {activeView === 'treemap' && (
          <div className="h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">🗂️ Music Hierarchy</h3>
              <div className="text-xs text-gray-500">
                {isMobileDevice ? 'Tap to filter' : 'Composers → Singers • Click to filter'}
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
                  const color = colors[index % colors.length];
                  const fontSize = Math.min(width / (isMobileDevice ? 12 : 8), height / (isMobileDevice ? 6 : 4), isMobileDevice ? 10 : 14);
                  
                  return (
                    <g>
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={color}
                        fillOpacity={0.8}
                        stroke="#fff"
                        strokeWidth={1}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          if (payload.composer) {
                            onComposerClick({ name: payload.composer });
                          } else {
                            onSingerClick({ name: payload.name });
                          }
                        }}
                      />
                      {width > (isMobileDevice ? 30 : 50) && height > (isMobileDevice ? 20 : 30) && (
                        <text
                          x={x + width / 2}
                          y={y + height / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={fontSize}
                          fill="#fff"
                          fontWeight="bold"
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
                          fill="#fff"
                        >
                          {payload.size} songs
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

        {/* Area Chart - Time Waves */}
        {activeView === 'area' && (
          <div className="h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">🌊 Music Time Waves</h3>
              <div className="text-xs text-gray-500">Song releases through decades</div>
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
                <Legend wrapperStyle={{ fontSize: isMobileDevice ? '10px' : '12px' }} />
              </AreaChart>
            </ResponsiveContainer>
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
