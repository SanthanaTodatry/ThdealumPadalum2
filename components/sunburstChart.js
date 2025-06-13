// sunburstChart.js
import Plotly from 'plotly.js-dist-min';

// Helper function to build the sunburst data from the flat song dataset
function buildSunburstData(songsData) {
  const rootId = 'All Songs';

  const decades = {};
  const lyricists = {};
  const composers = {};
  const singers = {};

  songsData.forEach(song => {
    const decade = Math.floor(song.year / 10) * 10;
    const decadeId = `${decade}s`;
    const lyricistId = `${decadeId}/${song.lyricist}`;
    const composerId = `${lyricistId}/${song.composer}`;
    const singerId = `${composerId}/${song.singer}`;

    decades[decadeId] = (decades[decadeId] || 0) + 1;
    lyricists[lyricistId] = (lyricists[lyricistId] || 0) + 1;
    composers[composerId] = (composers[composerId] || 0) + 1;
    singers[singerId] = (singers[singerId] || 0) + 1;
  });

  const labels = [rootId];
  const parents = [''];
  const values = [songsData.length];

  Object.entries(decades).forEach(([id, count]) => {
    labels.push(id);
    parents.push(rootId);
    values.push(count);
  });

  Object.entries(lyricists).forEach(([id, count]) => {
    const [decade] = id.split('/');
    labels.push(id);
    parents.push(decade);
    values.push(count);
  });

  Object.entries(composers).forEach(([id, count]) => {
    const parent = id.split('/').slice(0, 2).join('/');
    labels.push(id);
    parents.push(parent);
    values.push(count);
  });

  Object.entries(singers).forEach(([id, count]) => {
    const parent = id.split('/').slice(0, 3).join('/');
    labels.push(id);
    parents.push(parent);
    values.push(count);
  });

  return { labels, parents, values };
}

export function renderSunburstChart(containerId, songsData) {
  const { labels, parents, values } = buildSunburstData(songsData);

  const trace = {
    type: 'sunburst',
    labels,
    parents,
    values,
    branchvalues: 'total',
    outsidetextfont: { size: 16, color: '#333' },
    insidetextorientation: 'radial',
    leaf: { opacity: 0.7 },
    marker: {
      line: { width: 1 },
      colors: labels.map(label => {
        if (label.includes('/')) return undefined;
        if (label.includes('s')) return '#facc15'; // Decade = yellow
        return '#a5b4fc'; // Default pastel
      })
    }
  };

  const layout = {
    margin: { l: 10, r: 10, b: 10, t: 60 },
    title: {
      text: '🎵 Tamil Songs Sunburst by Decade → Lyricist → Composer → Singer',
      font: { size: 20 },
      x: 0.5,
      xanchor: 'center'
    },
    sunburstcolorway: ['#facc15', '#fb923c', '#c084fc', '#38bdf8', '#a3e635', '#f472b6'],
    extendsunburstcolorway: true,
    uniformtext: {
      minsize: 12,
      mode: 'hide'
    }
  };

  Plotly.newPlot(containerId, [trace], layout, { responsive: true });
}
