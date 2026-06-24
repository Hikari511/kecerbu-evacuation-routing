/**
 * Tes Progress 2: OSM metadata + multi-shelter.
 * Jalankan: node tests/progress2.test.js
 */
import { astar } from '../js/astar.js';
import {
  MAP_META,
  getWeightGrid,
  getShelters,
  gridToLatLon,
  latLonToGrid,
  isShelterCell,
  isValidStart,
} from '../js/mapData.js';

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

section('Tes 1: Metadata OSM bounds tersedia');
assert(typeof MAP_META.mapBounds.north === 'number', 'north berupa number');
assert(typeof MAP_META.mapBounds.south === 'number', 'south berupa number');
assert(typeof MAP_META.mapBounds.west === 'number', 'west berupa number');
assert(typeof MAP_META.mapBounds.east === 'number', 'east berupa number');
assert(MAP_META.mapBounds.north > MAP_META.mapBounds.south, 'north lebih besar dari south');
assert(MAP_META.mapBounds.east > MAP_META.mapBounds.west, 'east lebih besar dari west');

section('Tes 2: Multi-shelter tersedia');
const shelters = getShelters();
assert(Array.isArray(shelters), 'getShelters() mengembalikan array');
assert(shelters.length >= 2, `Jumlah shelter >= 2 (${shelters.length})`);
assert(shelters.some(s => s.type === 'primary'), 'Ada shelter utama');

const weightGrid = getWeightGrid();
for (const shelter of shelters) {
  const [row, col] = shelter.position;
  assert(row >= 0 && row < MAP_META.rows && col >= 0 && col < MAP_META.cols,
    `${shelter.name} berada dalam grid`);
  assert(weightGrid[row][col] !== Infinity, `${shelter.name} bisa dicapai A*`);
  assert(isShelterCell(row, col), `${shelter.name} dikenali sebagai shelter cell`);
  assert(!isValidStart(row, col), `${shelter.name} tidak boleh dipilih sebagai start`);
}

section('Tes 3: Konversi grid <-> koordinat approximate');
const sampleGrid = [20, 25];
const sampleGeo = gridToLatLon(sampleGrid[0], sampleGrid[1]);
const roundTrip = latLonToGrid(sampleGeo.lat, sampleGeo.lon);
assert(roundTrip[0] === sampleGrid[0] && roundTrip[1] === sampleGrid[1],
  `[${sampleGrid}] -> lat/lon -> [${roundTrip}]`);

const northWest = gridToLatLon(0, 0);
assert(Math.abs(northWest.lat - MAP_META.mapBounds.north) < 0.000001,
  'Grid [0,0] memakai batas north');
assert(Math.abs(northWest.lon - MAP_META.mapBounds.west) < 0.000001,
  'Grid [0,0] memakai batas west');

section('Tes 4: A* dapat mencari rute ke semua shelter kandidat');
const start = [38, 8];
let foundCount = 0;
let best = null;
for (const shelter of shelters) {
  const result = astar(weightGrid, start, shelter.position);
  if (result.found) {
    foundCount++;
    if (!best || result.totalCost < best.result.totalCost) {
      best = { shelter, result };
    }
  }
}

assert(foundCount > 0, `Minimal satu shelter dapat dicapai (${foundCount})`);
assert(best !== null, 'Shelter terbaik dapat dipilih');
assert(best.result.path[0][0] === start[0] && best.result.path[0][1] === start[1],
  'Path terbaik dimulai dari start');
assert(best.result.path.at(-1)[0] === best.shelter.position[0] &&
       best.result.path.at(-1)[1] === best.shelter.position[1],
  `Path terbaik berakhir di ${best.shelter.name}`);

console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${passed + failed} | ✅ ${passed} pass | ❌ ${failed} fail`);
console.log('='.repeat(50));
process.exit(failed > 0 ? 1 : 0);
