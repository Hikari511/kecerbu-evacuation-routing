/**
 * Tes Weighted Terrain A*
 * Memverifikasi bahwa A* memperhitungkan terrain cost dalam pencarian jalur.
 *
 * Jalankan: node tests/weighted.test.js
 */
import { astar } from '../js/astar.js';
import {
  getWeightGrid, getGoalPosition, TERRAIN_COST,
  CELL_WALKABLE, CELL_FLOOD_LIGHT, CELL_FLOOD_MED, CELL_FLOOD_HEAVY, CELL_OBSTACLE, CELL_GOAL
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
function section(t) { console.log(`\n[${t}]`); }
const approx = (a, b, eps = 0.001) => Math.abs(a - b) < eps;

// =====================================================
// Tes 1: TERRAIN_COST memiliki nilai yang benar
// =====================================================
section('Tes 1: Nilai TERRAIN_COST');
assert(TERRAIN_COST[CELL_WALKABLE]    === 1,        'Jalan = 1');
assert(TERRAIN_COST[CELL_FLOOD_LIGHT] === 1.5,      'Genangan ringan = 1.5');
assert(TERRAIN_COST[CELL_FLOOD_MED]   === 2,        'Genangan sedang = 2');
assert(TERRAIN_COST[CELL_FLOOD_HEAVY] === 3,        'Genangan berat = 3');
assert(TERRAIN_COST[CELL_OBSTACLE]    === Infinity, 'Obstacle = Infinity');
assert(TERRAIN_COST[CELL_GOAL]        === 1,        'Goal = 1');

// =====================================================
// Tes 2: A* memilih jalan (cost 1) vs genangan (cost 3)
// =====================================================
section('Tes 2: A* pilih jalan daripada genangan');
//
// Layout 2 baris, 5 kolom:
//   Baris 0: semua jalan (cost 1)  → jalur ini lebih murah
//   Baris 1: semua genangan berat  → jalur ini lebih mahal
//
//   [1, 1, 1, 1, 1]   ← jalan
//   [3, 3, 3, 3, 3]   ← genangan berat
//
// Start: [0,0], Goal: [0,4]
// Jalur terpendek harus lurus di baris 0: cost = 4 × (1 × 1) = 4
//
const gridJalan = [
  [1, 1, 1, 1, 1],
  [3, 3, 3, 3, 3],
];
const rJalan = astar(gridJalan, [0, 0], [0, 4]);
assert(rJalan.found === true, 'Jalur ditemukan');
assert(rJalan.path.every(([r]) => r === 0), 'Path hanya melewati baris jalan (row 0)');
assert(approx(rJalan.totalCost, 4), `Cost = ${rJalan.totalCost} (expected 4)`);

// =====================================================
// Tes 3: Cost diagonal × terrain cost
// =====================================================
section('Tes 3: Cost diagonal = √2 × terrain cost tujuan');
//
// Grid 3×3 semua jalan (cost 1), diagonal [0,0] → [2,2]
// Expected cost: 2 langkah diagonal = 2 × (√2 × 1) = 2√2 ≈ 2.828
//
const gridDiag = Array.from({ length: 3 }, () => new Array(3).fill(1));
const rDiag = astar(gridDiag, [0, 0], [2, 2]);
assert(rDiag.found === true, 'Jalur ditemukan');
assert(approx(rDiag.totalCost, 2 * Math.SQRT2),
  `Cost = ${rDiag.totalCost.toFixed(3)} (expected ${(2 * Math.SQRT2).toFixed(3)})`);

// =====================================================
// Tes 4: Genangan sedang membuat cost lebih tinggi
// =====================================================
section('Tes 4: Satu langkah ke genangan sedang = 1 × 2 = 2');
//
// Grid 1×2: [jalan][genangan sedang]
// Start [0,0], Goal [0,1]
// Cost = 1 (base kardinal) × 2 (terrain genangan sedang) = 2
//
const gridMed = [[1, 2]];
const rMed = astar(gridMed, [0, 0], [0, 1]);
assert(rMed.found === true, 'Jalur ditemukan');
assert(approx(rMed.totalCost, 2), `Cost = ${rMed.totalCost} (expected 2)`);

// =====================================================
// Tes 5: A* terpaksa lewat genangan karena jalan diblokir
// =====================================================
section('Tes 5: Terpaksa lewat genangan ringan (tidak ada jalan lain)');
//
// Layout:
//   [1,   Inf, 1  ]
//   [1.5, 1.5, 1.5]
//   [1,   Inf, 1  ]
//
// Start [0,0] → Goal [0,2], harus turun ke baris 1 (genangan ringan)
// Biaya: turun (1.5) + kanan (1.5) + naik (1.5) = 4.5
//
const INF = Infinity;
const gridForce = [
  [1,   INF, 1  ],
  [1.5, 1.5, 1.5],
  [1,   INF, 1  ],
];
const rForce = astar(gridForce, [0, 0], [0, 2]);
assert(rForce.found === true, 'Jalur ditemukan melewati genangan');
assert(rForce.totalCost > 1, `Cost (${rForce.totalCost.toFixed(2)}) lebih mahal dari jalan`);
assert(rForce.path.some(([r]) => r === 1), 'Path melewati baris genangan (row 1)');

// =====================================================
// Tes 6: Weighted terrain pada peta Pangandaran nyata
// =====================================================
section('Tes 6: Weighted terrain — peta Pangandaran');
const wGrid = getWeightGrid();
const goal  = getGoalPosition();

// Start dari bibir pantai (baris 39, genangan berat)
const rHeavy = astar(wGrid, [39, 25], goal);
assert(rHeavy.found === true, 'Dari genangan berat ke TES: jalur ditemukan');

// Start dari genangan ringan (baris 34)
const rLight = astar(wGrid, [34, 25], goal);
assert(rLight.found === true, 'Dari genangan ringan ke TES: jalur ditemukan');

// Dari bibir pantai (genangan berat) harus lebih mahal dari genangan ringan
assert(rHeavy.totalCost > rLight.totalCost,
  `Cost bibir pantai (${rHeavy.totalCost.toFixed(2)}) > genangan ringan (${rLight.totalCost.toFixed(2)})`);

// Start dari jalan normal (baris 33, walkable) harus lebih murah dari genangan
const rWalk = astar(wGrid, [33, 25], goal);
assert(rWalk.found === true, 'Dari jalan normal ke TES: jalur ditemukan');
assert(rWalk.totalCost < rLight.totalCost,
  `Cost jalan (${rWalk.totalCost.toFixed(2)}) < genangan ringan (${rLight.totalCost.toFixed(2)})`);

console.log(`  Info: bibir pantai→TES cost=${rHeavy.totalCost.toFixed(2)}, ` +
            `flood ringan→TES cost=${rLight.totalCost.toFixed(2)}, ` +
            `jalan→TES cost=${rWalk.totalCost.toFixed(2)}`);

// =====================================================
// Tes 7: Path tidak melewati obstacle di weighted grid
// =====================================================
section('Tes 7: Path tidak melewati obstacle (Infinity)');
const rPath = astar(wGrid, [38, 8], goal);
assert(rPath.found === true, 'Jalur ditemukan');
assert(rPath.path.every(([r, c]) => wGrid[r][c] !== Infinity),
  'Semua sel di path bukan obstacle');

// =====================================================
// Ringkasan
// =====================================================
console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${passed + failed} | ✅ ${passed} pass | ❌ ${failed} fail`);
console.log('='.repeat(50));
process.exit(failed > 0 ? 1 : 0);
