/**
 * Tes Progress 3: A* pada graph Wijayanto et al. (2025).
 * Jalankan: node tests/progress3.test.js
 */
import {
  GRAPH_META,
  GRAPH_NODES,
  GRAPH_EDGES,
  buildAdjacencyList,
  calculatePathDistance,
  estimateGraphTravelTime,
} from '../js/graphData.js';
import {
  astarGraph,
  haversineDistance,
  findNearestGraphNode,
} from '../js/astarGraph.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS — ${message}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL — ${message}`);
    failed++;
  }
}

function section(title) {
  console.log(`\n[${title}]`);
}

function samePath(actual, expected) {
  return actual.join(',') === expected.join(',');
}

const graph = buildAdjacencyList();

section('Tes 1: Struktur graph jurnal');
assert(Object.keys(GRAPH_NODES).length === 31, 'Graph memiliki 31 vertex');
assert(GRAPH_EDGES.length === 46, 'Graph memiliki 46 edge unik');
assert(GRAPH_META.goalId === 'V31', 'TES tujuan adalah V31');
assert(GRAPH_NODES.V31.type === 'goal', 'V31 ditandai sebagai goal');
assert(GRAPH_NODES.V31.lat < 0, 'Latitude Pangandaran bernilai negatif');
assert(GRAPH_NODES.V31.lon > 0, 'Longitude Pangandaran bernilai positif');

section('Tes 2: Adjacency list undirected');
assert(graph.V1.some(edge => edge.to === 'V2'), 'V1 terhubung ke V2');
assert(graph.V2.some(edge => edge.to === 'V1'), 'V2 terhubung kembali ke V1');
assert(graph.V30.some(edge => edge.to === 'V31'), 'V30 terhubung ke TES V31');

section('Tes 3: Rute referensi jurnal konsisten dengan edge');
const eastReference = GRAPH_META.journalRoutes.east;
const westReference = GRAPH_META.journalRoutes.west;
const eastReferenceDistance = calculatePathDistance(eastReference.path);
const westReferenceDistance = calculatePathDistance(westReference.path);
assert(Math.abs(eastReferenceDistance - 1093.94) < 0.001,
  `Rute timur dari edge = ${eastReferenceDistance.toFixed(2)} m`);
assert(Math.abs(westReferenceDistance - 532.68) < 0.001,
  `Rute barat dari edge = ${westReferenceDistance.toFixed(2)} m`);

section('Tes 4: A* sektor timur');
const eastResult = astarGraph(
  graph,
  GRAPH_NODES,
  GRAPH_META.eastStartId,
  GRAPH_META.goalId
);
assert(eastResult.found, 'Rute timur ditemukan');
assert(samePath(eastResult.path, eastReference.path),
  `Path sama dengan jurnal: ${eastResult.path.join(' -> ')}`);
assert(Math.abs(eastResult.totalCost - 1093.94) < 0.001,
  `Jarak A* timur = ${eastResult.totalCost.toFixed(2)} m`);

section('Tes 5: A* sektor barat');
const westResult = astarGraph(
  graph,
  GRAPH_NODES,
  GRAPH_META.westStartId,
  GRAPH_META.goalId
);
assert(westResult.found, 'Rute barat ditemukan');
assert(samePath(westResult.path, westReference.path),
  `Path sama dengan jurnal: ${westResult.path.join(' -> ')}`);
assert(Math.abs(westResult.totalCost - 532.68) < 0.001,
  `Jarak A* barat = ${westResult.totalCost.toFixed(2)} m`);

section('Tes 6: Estimasi waktu mengikuti kecepatan jurnal');
const eastTime = estimateGraphTravelTime(eastResult.totalCost);
const westTime = estimateGraphTravelTime(westResult.totalCost);
assert(Math.abs(eastTime.minutes - 26.25) < 0.05,
  `Waktu timur ≈ ${eastTime.minutes.toFixed(2)} menit`);
assert(Math.abs(westTime.minutes - 12.78) < 0.05,
  `Waktu barat ≈ ${westTime.minutes.toFixed(2)} menit`);

section('Tes 7: Heuristik dan snapping');
const directDistance = haversineDistance(GRAPH_NODES.V1, GRAPH_NODES.V31);
assert(directDistance > 0 && directDistance < eastResult.totalCost,
  'Haversine goal positif dan tidak melebihi panjang rute timur');

const nearest = findNearestGraphNode(
  GRAPH_NODES,
  GRAPH_NODES.V25.lat,
  GRAPH_NODES.V25.lon
);
assert(nearest.node.id === 'V25', 'Koordinat V25 snap kembali ke V25');
assert(nearest.distance < 0.001, 'Jarak snapping koordinat identik ≈ 0');

console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${passed + failed} | ✅ ${passed} pass | ❌ ${failed} fail`);
console.log('='.repeat(50));
process.exit(failed > 0 ? 1 : 0);
