/**
 * EvaTour Progress 3 - Graph jalan Wijayanto et al. (2025).
 *
 * Dataset terdiri dari 31 vertex dan edge berbobot jarak dari Table 3
 * dan Table 4. Latitude selatan dikonversi menjadi nilai desimal negatif.
 */

function dmsToDecimal(degrees, minutes, seconds, hemisphere) {
  const decimal = degrees + minutes / 60 + seconds / 3600;
  return hemisphere === 'S' || hemisphere === 'W' ? -decimal : decimal;
}

function vertex(id, latDms, lonDms, name, type = 'intersection') {
  return {
    id,
    lat: dmsToDecimal(...latDms, 'S'),
    lon: dmsToDecimal(...lonDms, 'E'),
    name,
    type,
  };
}

export const GRAPH_META = {
  name: 'Graph Evakuasi Pangandaran - Wijayanto et al. (2025)',
  source: 'Wijayanto et al. (2025), Table 3 dan Table 4',
  goalId: 'V31',
  eastStartId: 'V1',
  westStartId: 'V25',
  walkSpeedKmh: 2.5,
  walkSpeedMps: 2.5 / 3.6,
  journalRoutes: {
    east: {
      path: ['V1', 'V2', 'V6', 'V11', 'V17', 'V22', 'V24', 'V30', 'V31'],
      distanceMeters: 1093,
      timeMinutes: 26.23,
    },
    west: {
      path: ['V25', 'V26', 'V27', 'V28', 'V31'],
      distanceMeters: 533,
      timeMinutes: 12.79,
    },
  },
};

export const GRAPH_NODES = {
  V1: vertex('V1', [7, 41, 46.44], [108, 39, 37.30], 'Titik awal Pantai Timur', 'start-east'),
  V2: vertex('V2', [7, 41, 45.73], [108, 39, 37.75], 'Pertigaan Jl. Pantai Timur - RM Risma Seafood'),
  V3: vertex('V3', [7, 41, 34.79], [108, 39, 45.84], 'Pertigaan Jl. Pantai Timur - Pengadilan Lama'),
  V4: vertex('V4', [7, 41, 46.94], [108, 39, 33.22], 'Sudut Pondok Zio'),
  V5: vertex('V5', [7, 41, 45.85], [108, 39, 33.66], 'Pertigaan Pondok Abah Sudir'),
  V6: vertex('V6', [7, 41, 44.43], [108, 39, 34.19], 'Persimpangan Gg. Tongkol - Becak Pasar Ikan'),
  V7: vertex('V7', [7, 41, 38.71], [108, 39, 34.96], 'Pertigaan Jl. Pasar Ikan - Pondok Cepot New'),
  V8: vertex('V8', [7, 41, 36.53], [108, 39, 34.62], 'Pertigaan Jl. Pasar Ikan - Jl. Tembusan'),
  V9: vertex('V9', [7, 41, 32.60], [108, 39, 33.75], 'Persimpangan Jl. Pasar Ikan - Pengadilan Lama'),
  V10: vertex('V10', [7, 41, 46.81], [108, 39, 28.16], 'Pertigaan Kidang Pananjung - Jl. Pramuka'),
  V11: vertex('V11', [7, 41, 43.93], [108, 39, 28.32], 'Pertigaan Jl. Kidang Pananjung - Gg. Tongkol'),
  V12: vertex('V12', [7, 41, 41.00], [108, 39, 28.36], 'Pertigaan Jl. Kidang Pananjung - Gg. Kakap'),
  V13: vertex('V13', [7, 41, 38.01], [108, 39, 28.54], 'Pertigaan Kidang Pananjung - Jl. Tembusan'),
  V14: vertex('V14', [7, 41, 36.76], [108, 39, 28.48], 'Persimpangan Kidang Pananjung - Pondok SBC'),
  V15: vertex('V15', [7, 41, 33.20], [108, 39, 28.66], 'Persimpangan Kidang Pananjung - Bulak Laut'),
  V16: vertex('V16', [7, 41, 45.63], [108, 39, 22.17], 'Persimpangan Jl. Pramuka - Kalen Buaya'),
  V17: vertex('V17', [7, 41, 41.68], [108, 39, 22.27], 'Pertigaan Jl. Jangilus - CV Dua Putra Jaya Sejahtera'),
  V18: vertex('V18', [7, 41, 39.56], [108, 39, 22.24], 'Pertigaan Jl. Jangilus - Gg. Kakap'),
  V19: vertex('V19', [7, 41, 35.04], [108, 39, 22.59], 'Pertigaan Jl. Jangilus - Althatrans Travel'),
  V20: vertex('V20', [7, 41, 33.61], [108, 39, 22.79], 'Pertigaan Jl. Jangilus - Jl. Bulak Laut'),
  V21: vertex('V21', [7, 41, 44.73], [108, 39, 17.67], 'Pertigaan Jl. Sumardi - Jl. Pramuka'),
  V22: vertex('V22', [7, 41, 41.41], [108, 39, 17.99], 'Pertigaan Jl. Sumardi - Sinar Rahayu 4'),
  V23: vertex('V23', [7, 41, 33.79], [108, 39, 21.25], 'Pertigaan Jl. Bulak Laut - Pasar Wisata'),
  V24: vertex('V24', [7, 41, 34.15], [108, 39, 17.75], 'Pertigaan Jl. Bulak Laut - Jl. Sumardi'),
  V25: vertex('V25', [7, 41, 46.06], [108, 39, 14.74], 'Titik awal Pantai Barat', 'start-west'),
  V26: vertex('V26', [7, 41, 44.29], [108, 39, 13.10], 'Pertigaan Pamugaran Bulak Laut - Susi Travel'),
  V27: vertex('V27', [7, 41, 42.31], [108, 39, 14.97], 'Pertigaan Pondok Penginapan Moruya'),
  V28: vertex('V28', [7, 41, 34.53], [108, 39, 14.98], 'Pertigaan Pangandaran Beach Information Center'),
  V29: vertex('V29', [7, 41, 29.71], [108, 39, 20.70], 'Sudut timur laut Pasar Wisata'),
  V30: vertex('V30', [7, 41, 29.93], [108, 39, 16.14], 'Tikungan Pasar Wisata menuju TES'),
  V31: vertex('V31', [7, 41, 30.37], [108, 39, 13.85], 'TES Pangandaran - Blok Pasar Wisata', 'goal'),
};

// Table 4 memuat V28-V31 dua kali dengan arah terbalik. Graph aplikasi
// bersifat undirected, sehingga pasangan tersebut cukup disimpan sekali.
export const GRAPH_EDGES = [
  ['V1', 'V2', 25.99],
  ['V1', 'V5', 114.02],
  ['V2', 'V3', 420.74],
  ['V2', 'V6', 117.19],
  ['V3', 'V9', 1612.18],
  ['V4', 'V5', 36.34],
  ['V4', 'V10', 156.52],
  ['V5', 'V6', 36.37],
  ['V6', 'V7', 178.47],
  ['V6', 'V11', 182.17],
  ['V7', 'V8', 68.22],
  ['V7', 'V13', 199.70],
  ['V8', 'V9', 124.46],
  ['V8', 'V14', 198.99],
  ['V9', 'V15', 158.48],
  ['V10', 'V11', 89.19],
  ['V10', 'V16', 188.70],
  ['V11', 'V12', 90.62],
  ['V11', 'V17', 199.60],
  ['V12', 'V13', 92.62],
  ['V12', 'V18', 194.41],
  ['V13', 'V14', 38.69],
  ['V14', 'V15', 110.22],
  ['V14', 'V19', 189.74],
  ['V15', 'V20', 181.95],
  ['V16', 'V17', 122.18],
  ['V16', 'V21', 141.90],
  ['V17', 'V18', 65.56],
  ['V17', 'V22', 132.61],
  ['V18', 'V19', 140.18],
  ['V19', 'V20', 44.64],
  ['V20', 'V23', 47.94],
  ['V21', 'V22', 103.13],
  ['V21', 'V25', 99.50],
  ['V22', 'V24', 224.62],
  ['V22', 'V27', 97.44],
  ['V23', 'V24', 108.80],
  ['V23', 'V29', 231.32],
  ['V24', 'V28', 86.45],
  ['V24', 'V30', 139.66],
  ['V25', 'V26', 74.61],
  ['V26', 'V27', 84.21],
  ['V27', 'V28', 240.57],
  ['V28', 'V31', 133.29],
  ['V29', 'V30', 141.17],
  ['V30', 'V31', 72.10],
];

export function buildAdjacencyList() {
  const graph = Object.fromEntries(
    Object.keys(GRAPH_NODES).map(id => [id, []])
  );

  for (const [from, to, distance] of GRAPH_EDGES) {
    graph[from].push({ to, distance });
    graph[to].push({ to: from, distance });
  }

  return graph;
}

export function calculatePathDistance(path) {
  const edgeLookup = new Map();
  for (const [from, to, distance] of GRAPH_EDGES) {
    edgeLookup.set(`${from}-${to}`, distance);
    edgeLookup.set(`${to}-${from}`, distance);
  }

  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const distance = edgeLookup.get(`${path[i - 1]}-${path[i]}`);
    if (distance === undefined) return Infinity;
    total += distance;
  }
  return total;
}

export function estimateGraphTravelTime(distanceMeters) {
  const seconds = distanceMeters / GRAPH_META.walkSpeedMps;
  return {
    seconds,
    minutes: seconds / 60,
    formatted: `${(seconds / 60).toFixed(2)} menit`,
  };
}
