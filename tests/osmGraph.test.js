/**
 * Integration test for the generated OSM pedestrian graph.
 * Run: node tests/osmGraph.test.js
 */
import { readFile } from 'node:fs/promises';
import { astarGraph } from '../js/astarGraph.js';
import {
  filterBlockedEdges,
  graphEdgeKey,
  rankShelterRoutes,
} from '../js/osmRouting.js';

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

const raw = JSON.parse(
  await readFile(
    new URL('../data/pedestrian_graph_pangandaran.json', import.meta.url),
    'utf8'
  )
);

const nodes = Object.fromEntries(
  raw.nodes.map(node => [
    node.id,
    { id: node.id, lat: node.lat, lon: node.lon },
  ])
);
const graph = Object.fromEntries(raw.nodes.map(node => [node.id, []]));
const minimumEdges = new Map();

for (const edge of raw.edges) {
  const key = `${edge.from}-${edge.to}`;
  const existing = minimumEdges.get(key);
  if (!existing || edge.distanceMeters < existing.distanceMeters) {
    minimumEdges.set(key, edge);
  }
}
for (const edge of minimumEdges.values()) {
  graph[edge.from].push({ to: edge.to, distance: edge.distanceMeters });
}

section('Tes 1: Output graph OSM');
assert(raw.nodes.length === 2420, `Node count = ${raw.nodes.length}`);
assert(raw.edges.length === 6296, `Edge count = ${raw.edges.length}`);
assert(raw.metadata.shelterSnapMethod === 'edge',
  `Metode snap shelter = ${raw.metadata.shelterSnapMethod}`);
assert(raw.shelters.length === 15, `Shelter lolos audit = ${raw.shelters.length}`);
assert(raw.failedShelters.length === 9,
  `Shelter gagal audit = ${raw.failedShelters.length}`);
assert(raw.shelters.every(shelter => shelter.snapMethod === 'edge'),
  'Semua shelter lolos menggunakan edge snapping');

section('Tes 2: Titik awal');
assert(raw.startPoints.length === 2, 'V1 dan V25 tersedia');
assert(raw.startPoints.every(start => start.componentId === 0),
  'Kedua start berada di komponen utama');
assert(raw.startPoints.every(start => start.snapDistanceMeters < 10),
  'Kedua start memiliki snapping < 10 meter');

section('Tes 3: Semua shelter lolos dapat dicapai');
for (const start of raw.startPoints) {
  let reachable = 0;
  for (const shelter of raw.shelters) {
    const result = astarGraph(
      graph,
      nodes,
      start.nearestNodeId,
      shelter.nearestNodeId
    );
    if (result.found) reachable++;
  }
  assert(reachable === raw.shelters.length,
    `${start.startId} dapat mencapai ${reachable}/${raw.shelters.length} shelter`);
}

section('Tes 4: Pemilihan shelter terbaik');
for (const start of raw.startPoints) {
  const ranking = rankShelterRoutes(graph, nodes, start, raw.shelters);
  const best = ranking[0];
  assert(Boolean(best), `${start.startId} memiliki shelter terbaik`);
  assert(best.result.path[0] === start.nearestNodeId,
    `${start.startId} path dimulai dari node hasil snapping`);
  assert(best.result.path.at(-1) === best.shelter.nearestNodeId,
    `${start.startId} path berakhir di node shelter`);
  assert(ranking.length === raw.shelters.length,
    `${start.startId} menghasilkan ranking ${ranking.length} shelter`);
  assert(ranking.every((route, index) =>
    index === 0 || ranking[index - 1].totalDistance <= route.totalDistance
  ), `${start.startId} ranking terurut dari jarak terkecil`);
  assert(ranking.slice(0, 3).length === 3,
    `${start.startId} memiliki Top 3 kandidat`);
  console.log(
    `    ${start.startId}: ${best.shelter.name}, ${best.totalDistance.toFixed(1)} m`
  );
}

section('Tes 5: Laporan hambatan menghasilkan perhitungan ulang');
const eastStart = raw.startPoints.find(start => start.startId === 'V1');
const initialRanking = rankShelterRoutes(graph, nodes, eastStart, raw.shelters);
const initialBest = initialRanking[0];
const blockedFrom = initialBest.result.path[0];
const blockedTo = initialBest.result.path[1];
const blockedEdges = new Set([
  graphEdgeKey(blockedFrom, blockedTo),
  graphEdgeKey(blockedTo, blockedFrom),
]);
const filteredGraph = filterBlockedEdges(graph, blockedEdges);

assert(
  !filteredGraph[blockedFrom].some(edge => edge.to === blockedTo),
  'Edge hambatan dihapus dari arah maju'
);
assert(
  !filteredGraph[blockedTo].some(edge => edge.to === blockedFrom),
  'Edge hambatan dihapus dari arah balik'
);

const alternativeRanking = rankShelterRoutes(
  filteredGraph,
  nodes,
  eastStart,
  raw.shelters
);
assert(alternativeRanking.length > 0, 'A* masih menemukan kandidat setelah edge diblokir');
assert(
  alternativeRanking[0].result.path.join(',') !== initialBest.result.path.join(','),
  'Rute hasil perhitungan ulang berbeda dari rute awal'
);
console.log(
  `    Blokir ${blockedFrom}-${blockedTo}: ` +
  `${initialBest.totalDistance.toFixed(1)} m -> ` +
  `${alternativeRanking[0].totalDistance.toFixed(1)} m`
);

console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${passed + failed} | ✅ ${passed} pass | ❌ ${failed} fail`);
console.log('='.repeat(50));
process.exit(failed > 0 ? 1 : 0);
