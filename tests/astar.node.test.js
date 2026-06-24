/**
 * Tes A* menggunakan Node.js (tanpa browser)
 * Jalankan: node tests/astar.node.test.js
 */
import { astar, heuristic } from '../js/astar.js';

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

// Tes 1: Jalur diagonal tanpa obstacle — grid pakai terrain cost 1 (jalan normal)
console.log('\n[Tes 1] Jalur diagonal tanpa obstacle (5x5)');
const grid1 = Array.from({ length: 5 }, () => new Array(5).fill(1));
const r1 = astar(grid1, [0, 0], [4, 4]);
assert(r1.found === true, 'Jalur ditemukan');
assert(r1.path.length === 5, `Path length = ${r1.path.length} (expected 5)`);
// cost diagonal = √2 × terrain 1 = √2, total 4 langkah = 4√2
assert(Math.abs(r1.totalCost - 4 * Math.SQRT2) < 0.001, `Cost = ${r1.totalCost.toFixed(3)} (~5.657)`);

// Tes 2: Obstacle (Infinity) menghalangi
console.log('\n[Tes 2] Obstacle menghalangi diagonal');
const INF = Infinity;
const grid2 = [
  [1,   1,   1,   1,   1  ],
  [1,   INF, INF, 1,   1  ],
  [1,   INF, 1,   1,   1  ],
  [1,   1,   1,   1,   1  ],
  [1,   1,   1,   1,   1  ],
];
const r2 = astar(grid2, [0, 0], [4, 4]);
assert(r2.found === true, 'Jalur ditemukan');
assert(r2.path.every(([r, c]) => grid2[r][c] !== Infinity), 'Path tidak melewati obstacle');

// Tes 3: Tidak ada jalur
console.log('\n[Tes 3] Goal terisolasi — tidak ada jalur');
const grid3 = [
  [1,   1,   INF, 1,   1  ],
  [1,   1,   INF, 1,   1  ],
  [INF, INF, INF, INF, INF],
  [1,   1,   INF, 1,   1  ],
  [1,   1,   INF, 1,   1  ],
];
const r3 = astar(grid3, [0, 0], [4, 4]);
assert(r3.found === false, 'Jalur TIDAK ditemukan');
assert(r3.path.length === 0, 'Path kosong');

// Tes 4: Start = Goal
console.log('\n[Tes 4] Start sama dengan Goal');
const r4 = astar(grid1, [2, 2], [2, 2]);
assert(r4.found === true, 'Ditemukan');
assert(r4.path.length === 1, `Path length = ${r4.path.length} (expected 1)`);
assert(r4.totalCost === 0, `Cost = ${r4.totalCost} (expected 0)`);

// Tes 5: Corner-cutting dicegah
console.log('\n[Tes 5] Corner-cutting dicegah');
const grid5 = [
  [1,   INF, 1  ],
  [INF, 1,   1  ],
  [1,   1,   1  ],
];
const r5 = astar(grid5, [0, 0], [1, 1]);
assert(r5.found === false, 'Tidak bisa diagonal melewati corner obstacle');

// Tes 6: Start di obstacle
console.log('\n[Tes 6] Start di obstacle');
const grid6 = [[INF, 1], [1, 1]];
const r6 = astar(grid6, [0, 0], [1, 1]);
assert(r6.found === false, 'Start obstacle → not found');

// Tes 7: Heuristik
console.log('\n[Tes 7] Heuristik Euclidean');
assert(Math.abs(heuristic(0, 0, 3, 4) - 5) < 0.001, 'h(0,0→3,4) = 5');
assert(heuristic(2, 3, 2, 3) === 0, 'h(same) = 0');

// Tes 8: Grid besar — performa
console.log('\n[Tes 8] Grid 100x100 tanpa obstacle');
const bigGrid = Array.from({ length: 100 }, () => new Array(100).fill(1));
const t0 = performance.now();
const r8 = astar(bigGrid, [0, 0], [99, 99]);
const elapsed = performance.now() - t0;
assert(r8.found === true, 'Jalur ditemukan di grid 100x100');
assert(r8.path.length === 100, `Path length = ${r8.path.length} (expected 100 diagonal)`);
assert(elapsed < 100, `Waktu: ${elapsed.toFixed(1)}ms (< 100ms)`);

// Tes 9: Weighted terrain — A* lebih memilih jalan vs genangan
console.log('\n[Tes 9] Weighted terrain: jalan (1) vs genangan (3)');
// Layout: start [0,0], goal [0,4]
// Jalur atas (baris 0): semua cost 1 → total 4
// Jalur bawah (baris 1): genangan cost 3 → total lebih mahal
const gridW = [
  [1, 1,   1,   1,   1  ],  // jalan
  [1, 3,   3,   3,   1  ],  // genangan berat
];
const rW = astar(gridW, [0, 0], [0, 4]);
assert(rW.found === true, 'Jalur ditemukan');
// Path harus melewati baris 0 (jalan), bukan baris 1 (genangan)
const allOnRow0 = rW.path.every(([r]) => r === 0);
assert(allOnRow0, 'A* memilih jalan (cost 1) daripada genangan (cost 3)');
assert(Math.abs(rW.totalCost - 4) < 0.001, `Total cost = ${rW.totalCost} (expected 4)`);

// Tes 10: Weighted terrain — paksa lewat genangan karena tidak ada jalan lain
console.log('\n[Tes 10] Weighted terrain: terpaksa lewat genangan');
const gridF = [
  [1,   INF, 1  ],
  [1.5, 1.5, 1.5],
  [1,   INF, 1  ],
];
const rF = astar(gridF, [0, 0], [0, 2]);
assert(rF.found === true, 'Jalur ditemukan melewati genangan');
// Cost jalur: turun (1.5) + kanan (1.5) + naik (1.5) = 4.5
// (atau diagonal jika tidak ada corner cut)
assert(rF.totalCost > 1, `Cost (${rF.totalCost.toFixed(2)}) > 1 karena melewati terrain mahal`);

// Ringkasan
console.log(`\n${'='.repeat(40)}`);
console.log(`Total: ${passed + failed} | ✅ ${passed} pass | ❌ ${failed} fail`);
console.log('='.repeat(40));
process.exit(failed > 0 ? 1 : 0);
