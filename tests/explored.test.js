/**
 * Tes fitur exploredNodes pada A*
 * Memastikan A* mengembalikan daftar node yang dieksplorasi
 * untuk digunakan oleh Toggle Explored overlay.
 * 
 * Jalankan: node tests/explored.test.js
 */
import { astar } from '../js/astar.js';
import { getWeightGrid, getGoalPosition } from '../js/mapData.js';

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
// Tes 1: exploredNodes dikembalikan sebagai array
// ========================================
section('Tes 1: exploredNodes ada dan berupa array');
const grid = Array.from({ length: 5 }, () => new Array(5).fill(1));
const r1 = astar(grid, [0, 0], [4, 4]);

assert(Array.isArray(r1.exploredNodes), 'exploredNodes adalah array');
assert(r1.exploredNodes.length > 0, `exploredNodes tidak kosong (${r1.exploredNodes.length} nodes)`);
assert(r1.exploredNodes.length === r1.nodesExplored,
  `exploredNodes.length (${r1.exploredNodes.length}) === nodesExplored (${r1.nodesExplored})`);

// ========================================
// Tes 2: exploredNodes berisi koordinat [row, col]
// ========================================
section('Tes 2: Format koordinat exploredNodes');
const allCoords = r1.exploredNodes.every(
  node => Array.isArray(node) && node.length === 2 &&
          typeof node[0] === 'number' && typeof node[1] === 'number'
);
assert(allCoords, 'Semua elemen berformat [row, col]');

// Start harus ada di explored (node pertama yang diproses)
const startInExplored = r1.exploredNodes.some(([r, c]) => r === 0 && c === 0);
assert(startInExplored, 'Start [0,0] ada di exploredNodes');

// Goal harus ada di explored (node terakhir yang diproses sebelum return)
const goalInExplored = r1.exploredNodes.some(([r, c]) => r === 4 && c === 4);
assert(goalInExplored, 'Goal [4,4] ada di exploredNodes');

// ========================================
// Tes 3: exploredNodes tidak berisi duplikat
// ========================================
section('Tes 3: Tidak ada duplikat di exploredNodes');
const seen = new Set();
let hasDuplicate = false;
for (const [r, c] of r1.exploredNodes) {
  const key = `${r},${c}`;
  if (seen.has(key)) {
    hasDuplicate = true;
    break;
  }
  seen.add(key);
}
assert(!hasDuplicate, 'Tidak ada koordinat duplikat');

// ========================================
// Tes 4: exploredNodes kosong saat tidak ada jalur
// ========================================
section('Tes 4: exploredNodes saat validasi gagal');
const gridObstacle = [[Infinity, 1], [1, 1]];
const r4 = astar(gridObstacle, [0, 0], [1, 1]);
assert(Array.isArray(r4.exploredNodes), 'exploredNodes tetap array meski gagal validasi');
assert(r4.exploredNodes.length === 0, 'exploredNodes kosong saat start = obstacle');

// ========================================
// Tes 5: exploredNodes ada tapi path kosong (goal terisolasi)
// ========================================
section('Tes 5: exploredNodes saat goal terisolasi');
const gridIsolated = [
  [1,   1,   Infinity, 1,   1  ],
  [1,   1,   Infinity, 1,   1  ],
  [Infinity, Infinity, Infinity, Infinity, Infinity],
  [1,   1,   Infinity, 1,   1  ],
  [1,   1,   Infinity, 1,   1  ],
];
const r5 = astar(gridIsolated, [0, 0], [4, 4]);
assert(r5.found === false, 'Jalur tidak ditemukan');
assert(r5.exploredNodes.length > 0, `Explored nodes tetap tercatat (${r5.exploredNodes.length} nodes)`);
assert(r5.exploredNodes.length === r5.nodesExplored,
  'exploredNodes.length === nodesExplored meski path tidak ditemukan');

// ========================================
// Tes 6: exploredNodes pada peta Pangandaran
// ========================================
section('Tes 6: exploredNodes pada peta Pangandaran');
const astarGrid = getWeightGrid();
const goalPos = getGoalPosition();
const r6 = astar(astarGrid, [38, 10], goalPos);

assert(r6.found === true, 'Jalur ditemukan');
assert(r6.exploredNodes.length === r6.nodesExplored,
  `Konsisten: array length (${r6.exploredNodes.length}) === counter (${r6.nodesExplored})`);
assert(r6.exploredNodes.length >= r6.path.length,
  `Explored (${r6.exploredNodes.length}) >= path (${r6.path.length})`);

// Semua explored nodes harus dalam batas grid
const allInBounds = r6.exploredNodes.every(
  ([r, c]) => r >= 0 && r < 40 && c >= 0 && c < 50
);
assert(allInBounds, 'Semua explored nodes dalam batas grid 40x50');

// Semua explored nodes harus bukan obstacle (bukan Infinity)
const noneObstacle = r6.exploredNodes.every(
  ([r, c]) => astarGrid[r][c] !== Infinity
);
assert(noneObstacle, 'Tidak ada explored node yang merupakan obstacle');

// ========================================
// Tes 7: Path nodes adalah subset dari explored nodes
// ========================================
section('Tes 7: Path ⊆ exploredNodes');
const exploredSet = new Set(r6.exploredNodes.map(([r, c]) => `${r},${c}`));
const pathInExplored = r6.path.every(([r, c]) => exploredSet.has(`${r},${c}`));
assert(pathInExplored, 'Semua node di path juga ada di exploredNodes');

// ========================================
// Ringkasan
// ========================================
console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${passed + failed} | ✅ ${passed} pass | ❌ ${failed} fail`);
console.log('='.repeat(50));
process.exit(failed > 0 ? 1 : 0);
