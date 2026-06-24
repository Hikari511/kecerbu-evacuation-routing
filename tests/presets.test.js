/**
 * Tes preset skenario demo
 * Memastikan semua titik awal preset valid dan menghasilkan rute ke TES.
 * 
 * Jalankan: node tests/presets.test.js
 */
import { astar } from '../js/astar.js';
import { getWeightGrid, getGoalPosition, estimateEvacuationTime, isValidStart } from '../js/mapData.js';

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

const astarGrid = getWeightGrid();
const goalPos = getGoalPosition();

/**
 * Preset skenario demo — harus sama dengan data-row/data-col di index.html
 */
const PRESETS = [
  { name: '🏖️ Pantai Barat',  row: 38, col: 8,  desc: 'Wisatawan di bibir pantai barat (flood zone)' },
  { name: '🏖️ Pantai Timur',  row: 37, col: 42, desc: 'Wisatawan di bibir pantai timur (flood zone)' },
  { name: '🏨 Area Hotel',    row: 20, col: 23, desc: 'Wisatawan di area hotel/restoran tengah' },
  { name: '🛒 Pasar Wisata',  row: 11, col: 25, desc: 'Wisatawan di jalan dekat pasar wisata' },
];

console.log('=== Tes Preset Skenario Demo ===\n');

for (const preset of PRESETS) {
  console.log(`[${preset.name}] — ${preset.desc}`);
  console.log(`  Posisi: [${preset.row}, ${preset.col}]`);

  // Tes 1: Posisi valid sebagai start
  assert(isValidStart(preset.row, preset.col),
    `isValidStart(${preset.row}, ${preset.col}) = true`);

  // Tes 2: A* menemukan jalur
  const result = astar(astarGrid, [preset.row, preset.col], goalPos);
  assert(result.found === true, 'Jalur ditemukan');

  // Tes 3: Path dimulai dari preset dan berakhir di goal
  if (result.found) {
    const first = result.path[0];
    const last = result.path[result.path.length - 1];
    assert(first[0] === preset.row && first[1] === preset.col,
      `Path dimulai dari [${preset.row}, ${preset.col}]`);
    assert(last[0] === goalPos[0] && last[1] === goalPos[1],
      `Path berakhir di TES [${goalPos[0]}, ${goalPos[1]}]`);

    // Tes 4: Waktu evakuasi dalam jendela 40-45 menit
    const evac = estimateEvacuationTime(result.totalCost);
    assert(evac.minutes < 45,
      `Waktu evakuasi: ${evac.formatted} (< 45 menit)`);

    console.log(`  📏 Jarak: ${evac.meters}m | ⏱️ Waktu: ${evac.formatted} | 🔍 Nodes: ${result.nodesExplored}`);
  }
  console.log('');
}

// Ringkasan
console.log('='.repeat(50));
console.log(`Total: ${passed + failed} | ✅ ${passed} pass | ❌ ${failed} fail`);
console.log('='.repeat(50));
process.exit(failed > 0 ? 1 : 0);
