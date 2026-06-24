/**
 * Tes integrasi mapData.js + astar.js
 * Jalankan: node tests/mapData.test.js
 */
import { astar } from '../js/astar.js';
import {
  GRID_DATA, MAP_META, CELL_WALKABLE, CELL_OBSTACLE,
  CELL_FLOOD_LIGHT, CELL_FLOOD_MED, CELL_FLOOD_HEAVY, CELL_GOAL,
  getWeightGrid, getGoalPosition, estimateEvacuationTime, isValidStart
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

// ========================================
// Tes 1: Validasi dimensi grid
// ========================================
section('Tes 1: Dimensi grid');
assert(GRID_DATA.length === MAP_META.rows, 
  `Grid rows = ${GRID_DATA.length} (expected ${MAP_META.rows})`);
assert(GRID_DATA[0].length === MAP_META.cols, 
  `Grid cols = ${GRID_DATA[0].length} (expected ${MAP_META.cols})`);

// Cek semua baris punya panjang yang sama
const allSameWidth = GRID_DATA.every(row => row.length === MAP_META.cols);
assert(allSameWidth, 'Semua baris memiliki panjang yang sama');

// ========================================
// Tes 2: Validasi tipe sel
// ========================================
section('Tes 2: Tipe sel valid');
const validTypes = new Set([CELL_WALKABLE, CELL_OBSTACLE, CELL_FLOOD_LIGHT, CELL_FLOOD_MED, CELL_FLOOD_HEAVY, CELL_GOAL]);
let allValid = true;
for (let r = 0; r < GRID_DATA.length; r++) {
  for (let c = 0; c < GRID_DATA[r].length; c++) {
    if (!validTypes.has(GRID_DATA[r][c])) {
      allValid = false;
      console.log(`    Invalid cell at [${r}][${c}] = ${GRID_DATA[r][c]}`);
    }
  }
}
assert(allValid, 'Semua sel memiliki tipe yang valid (0-5)');

// ========================================
// Tes 3: Goal position
// ========================================
section('Tes 3: Goal position (TES)');
const goalPos = getGoalPosition();
assert(goalPos[0] >= 0 && goalPos[0] < MAP_META.rows, 
  `Goal row ${goalPos[0]} dalam batas grid`);
assert(goalPos[1] >= 0 && goalPos[1] < MAP_META.cols, 
  `Goal col ${goalPos[1]} dalam batas grid`);
assert(GRID_DATA[goalPos[0]][goalPos[1]] === CELL_GOAL, 
  `Sel goal berisi CELL_GOAL (5)`);

// ========================================
// Tes 4: getAstarGrid konversi
// ========================================
section('Tes 4: getWeightGrid()');
const astarGrid = getWeightGrid();
assert(astarGrid.length === MAP_META.rows, 'astarGrid rows benar');
assert(astarGrid[0].length === MAP_META.cols, 'astarGrid cols benar');

// Goal harus walkable (cost 1) di weight grid
assert(astarGrid[goalPos[0]][goalPos[1]] === 1,
  'Goal cell = 1 di weightGrid (walkable)');

// Flood light harus cost 1.5
assert(astarGrid[34][0] === 1.5, `Flood light [34,0] = ${astarGrid[34][0]} (expected 1.5)`);

// Flood med harus cost 2
assert(astarGrid[37][0] === 2, `Flood med [37,0] = ${astarGrid[37][0]} (expected 2)`);

// Flood heavy harus cost 3
assert(astarGrid[39][0] === 3, `Flood heavy [39,0] = ${astarGrid[39][0]} (expected 3)`);

// Obstacle harus Infinity
const obstacleFound = GRID_DATA.some((row, r) =>
  row.some((cell, c) => cell === CELL_OBSTACLE && astarGrid[r][c] === Infinity)
);
assert(obstacleFound, 'Obstacle = Infinity di weightGrid');

// ========================================
// Tes 5: isValidStart
// ========================================
section('Tes 5: isValidStart()');
assert(isValidStart(0, 0) === true, 'Sel walkable = valid start');
assert(isValidStart(34, 0) === true, 'Sel flood light = valid start');
assert(isValidStart(37, 0) === true, 'Sel flood med = valid start');
assert(isValidStart(39, 0) === true, 'Sel flood heavy = valid start');
assert(isValidStart(1, 1) === false, 'Sel obstacle = invalid start');
assert(isValidStart(5, 24) === false, 'Sel goal = invalid start');
assert(isValidStart(-1, 0) === false, 'Di luar grid = invalid');
assert(isValidStart(0, 99) === false, 'Di luar grid = invalid');

// ========================================
// Tes 6: A* pada peta Pangandaran — dari pantai ke TES
// ========================================
section('Tes 6: A* dari pantai selatan ke TES');
const startPantai = [33, 25]; // Baris 33, dekat pantai, tengah
const result1 = astar(astarGrid, startPantai, goalPos);
assert(result1.found === true, 'Jalur dari pantai ke TES ditemukan');
assert(result1.path.length > 0, `Path length = ${result1.path.length}`);
assert(result1.path[0][0] === startPantai[0] && result1.path[0][1] === startPantai[1],
  'Path dimulai dari start');
const lastNode = result1.path[result1.path.length - 1];
assert(lastNode[0] === goalPos[0] && lastNode[1] === goalPos[1],
  'Path berakhir di goal (TES)');

// Estimasi waktu
const evac1 = estimateEvacuationTime(result1.totalCost);
console.log(`    Info: Jarak = ${evac1.meters}m, Waktu = ${evac1.formatted}`);
assert(evac1.meters > 0, `Jarak > 0 meter (${evac1.meters}m)`);
assert(evac1.minutes < 45, `Waktu < 45 menit (${evac1.minutes} menit) — dalam jendela evakuasi`);

// ========================================
// Tes 7: A* dari berbagai titik wisatawan
// ========================================
section('Tes 7: A* dari berbagai posisi wisatawan');

const testStarts = [
  { pos: [38, 10], label: 'Bibir pantai barat (flood zone)' },
  { pos: [20, 5],  label: 'Area hotel barat' },
  { pos: [26, 40], label: 'Jalan pantai timur' },
  { pos: [15, 0],  label: 'Ujung barat jalan utama' },
  { pos: [7, 49],  label: 'Ujung timur jalan utama' },
];

for (const { pos, label } of testStarts) {
  const r = astar(astarGrid, pos, goalPos);
  const evac = estimateEvacuationTime(r.totalCost);
  assert(r.found === true, `${label} [${pos}] → TES: ditemukan (${evac.formatted}, ${r.nodesExplored} nodes)`);
}

// ========================================
// Tes 8: estimateEvacuationTime
// ========================================
section('Tes 8: estimateEvacuationTime()');
const evac = estimateEvacuationTime(10); // 10 unit cost
assert(evac.meters === 400, `10 sel × 40m = ${evac.meters}m (expected 400)`);
assert(evac.seconds === Math.round(400 / 1.39), 
  `400m / 1.39 m/s = ${evac.seconds}s (expected ${Math.round(400/1.39)})`);

// ========================================
// Tes 9: Statistik peta
// ========================================
section('Tes 9: Statistik peta');
let counts = { walkable: 0, obstacle: 0, floodLight: 0, floodMed: 0, floodHeavy: 0, goal: 0 };
for (const row of GRID_DATA) {
  for (const cell of row) {
    if (cell === CELL_WALKABLE)    counts.walkable++;
    else if (cell === CELL_OBSTACLE)    counts.obstacle++;
    else if (cell === CELL_FLOOD_LIGHT) counts.floodLight++;
    else if (cell === CELL_FLOOD_MED)   counts.floodMed++;
    else if (cell === CELL_FLOOD_HEAVY) counts.floodHeavy++;
    else if (cell === CELL_GOAL)        counts.goal++;
  }
}
const total = MAP_META.rows * MAP_META.cols;
console.log(`    Walkable:      ${counts.walkable} (${(counts.walkable/total*100).toFixed(1)}%)`);
console.log(`    Obstacle:      ${counts.obstacle} (${(counts.obstacle/total*100).toFixed(1)}%)`);
console.log(`    Flood Ringan:  ${counts.floodLight} (${(counts.floodLight/total*100).toFixed(1)}%)`);
console.log(`    Flood Sedang:  ${counts.floodMed} (${(counts.floodMed/total*100).toFixed(1)}%)`);
console.log(`    Flood Berat:   ${counts.floodHeavy} (${(counts.floodHeavy/total*100).toFixed(1)}%)`);
console.log(`    Goal (TES):    ${counts.goal} (${(counts.goal/total*100).toFixed(1)}%)`);
assert(counts.goal >= 1, 'Minimal 1 sel goal (TES) ada');
assert(counts.obstacle > 0, 'Ada obstacle di peta');
assert(counts.floodLight > 0, 'Ada zona genangan ringan');
assert(counts.floodMed > 0, 'Ada zona genangan sedang');
assert(counts.floodHeavy > 0, 'Ada zona genangan berat');

// ========================================
// Ringkasan
// ========================================
console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${passed + failed} | ✅ ${passed} pass | ❌ ${failed} fail`);
console.log('='.repeat(50));
process.exit(failed > 0 ? 1 : 0);
