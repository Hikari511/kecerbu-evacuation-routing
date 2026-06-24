/**
 * ============================================================
 * EvaTour — Modul Rendering Grid (grid.js)
 * ============================================================
 * 
 * Modul ini bertanggung jawab untuk:
 *   1. Menggambar grid peta pada HTML5 Canvas
 *   2. Menangani interaksi pengguna (klik untuk set start)
 *   3. Menampilkan hasil pencarian A* (path, explored nodes)
 *   4. Menampilkan informasi evakuasi (jarak, waktu)
 * 
 * Menggunakan Canvas API karena:
 *   - Performa tinggi untuk rendering grid besar (2000 sel)
 *   - Tidak perlu library eksternal
 *   - Kontrol penuh atas pixel dan warna
 *   - Ringan di browser mobile (wisatawan pakai HP)
 * ============================================================
 */

import {
  GRID_DATA, MAP_META,
  CELL_WALKABLE, CELL_OBSTACLE, CELL_FLOOD_LIGHT, CELL_FLOOD_MED, CELL_FLOOD_HEAVY, CELL_GOAL,
  CELL_COLORS, CELL_LABELS,
  getWeightGrid, getGoalPosition, getShelters, isShelterCell,
  gridToLatLon,
  calcPhysicalDistance, estimateTimeFromDistance,
  isValidStart
} from './mapData.js';

import { astar } from './astar.js';

// ============================================================
// KONSTANTA RENDERING
// ============================================================

/** Ukuran sel dalam pixel (akan dihitung ulang saat resize) */
let cellSize = 14;

/** Warna tambahan untuk elemen dinamis */
const COLORS = {
  start:       '#e91e63',  // Pink — posisi wisatawan
  path:        '#ff9800',  // Oranye — jalur evakuasi
  explored:    '#ce93d8',  // Ungu muda — node yang dieksplorasi A*
  gridLine:    '#e0e0e0',  // Garis grid
  startBorder: '#880e4f',  // Border titik start
  goalBorder:  '#1b5e20',  // Border TES
};

// ============================================================
// STATE APLIKASI
// ============================================================

/** State internal grid renderer */
const state = {
  /** Posisi start yang dipilih wisatawan [row, col] atau null */
  startPos: null,

  /** Hasil pencarian A* terakhir */
  result: null,

  /** Apakah sedang menampilkan animasi eksplorasi */
  showExplored: true,

  /** Canvas element reference */
  canvas: null,

  /** Canvas 2D context */
  ctx: null,

  /** Grid biner untuk A* (di-cache agar tidak dihitung ulang) */
  astarGrid: null,

  /** Posisi goal [row, col] */
  goalPos: null,

  /** Daftar shelter kandidat untuk multi-shelter */
  shelters: [],

  /** Shelter terbaik dari pencarian terakhir */
  selectedShelter: null,

  /** Label terrain saat ini untuk info panel */
  terrainLabel: null,

  /** Leaflet map untuk OSM background Progress 2 */
  osmMap: null,
};


// ============================================================
// INISIALISASI
// ============================================================

/**
 * Inisialisasi grid renderer.
 * Dipanggil sekali saat halaman dimuat.
 * 
 * @param {string} canvasId - ID elemen canvas di HTML
 * @param {string} infoId - ID elemen div untuk info hasil
 */
export function initGrid(canvasId = 'gridCanvas', infoId = 'infoPanel') {
  // Ambil referensi canvas
  state.canvas = document.getElementById(canvasId);
  if (!state.canvas) {
    console.error(`Canvas element #${canvasId} tidak ditemukan!`);
    return;
  }
  state.ctx = state.canvas.getContext('2d');

  // Cache data yang tidak berubah
  state.astarGrid = getWeightGrid();
  state.goalPos = getGoalPosition();
  state.shelters = getShelters();

  // Hitung ukuran sel berdasarkan lebar container
  calculateCellSize();

  // Set ukuran canvas
  state.canvas.width = MAP_META.cols * cellSize;
  state.canvas.height = MAP_META.rows * cellSize;
  syncMapShellSize();
  initOsmBackground();

  // Render awal
  render();

  // Event listener: klik untuk set titik awal
  state.canvas.addEventListener('click', handleCanvasClick);

  // Event listener: resize window
  window.addEventListener('resize', handleResize);

  console.log('EvaTour Grid initialized:', MAP_META.rows, '×', MAP_META.cols);
}

/**
 * Hitung ukuran sel optimal berdasarkan lebar layar.
 * Prioritas: grid harus muat di layar tanpa scroll horizontal.
 */
function calculateCellSize() {
  const container = state.canvas.closest('.grid-container') || state.canvas.parentElement;
  const maxWidth = container ? container.clientWidth - 20 : window.innerWidth - 40;
  const maxHeight = window.innerHeight * 0.7; // Maks 70% tinggi layar

  const sizeByWidth = Math.floor(maxWidth / MAP_META.cols);
  const sizeByHeight = Math.floor(maxHeight / MAP_META.rows);

  // Ambil yang lebih kecil, minimal 8px, maksimal 20px
  cellSize = Math.max(8, Math.min(20, sizeByWidth, sizeByHeight));
}

/**
 * Samakan ukuran wrapper OSM dengan canvas grid.
 * OSM hanya background visual; klik dan pathfinding tetap ditangani canvas.
 */
function syncMapShellSize() {
  const shell = state.canvas.parentElement;
  if (!shell) return;

  shell.style.width = `${state.canvas.width}px`;
  shell.style.height = `${state.canvas.height}px`;
}

/**
 * Inisialisasi OSM background memakai Leaflet jika library tersedia.
 * Jika CDN belum termuat atau offline, aplikasi tetap berjalan sebagai grid biasa.
 */
function initOsmBackground() {
  const mapEl = document.getElementById('osmMap');
  if (!mapEl || !window.L || state.osmMap) return;

  const bounds = [
    [MAP_META.mapBounds.south, MAP_META.mapBounds.west],
    [MAP_META.mapBounds.north, MAP_META.mapBounds.east],
  ];
  const center = [MAP_META.geoReference.centerLat, MAP_META.geoReference.centerLon];

  state.osmMap = window.L.map(mapEl, {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    tap: false,
  });

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(state.osmMap);

  state.osmMap.fitBounds(bounds, { animate: false });

  // Marker geografis approximate untuk menunjukkan kesiapan integrasi OSM.
  state.shelters.forEach((shelter, index) => {
    const { lat, lon } = gridToLatLon(shelter.position[0], shelter.position[1]);
    window.L.circleMarker([lat, lon], {
      radius: shelter.type === 'primary' ? 6 : 5,
      color: '#1b5e20',
      weight: 2,
      fillColor: '#4caf50',
      fillOpacity: 0.8,
    }).bindTooltip(`${index + 1}. ${shelter.name}`).addTo(state.osmMap);
  });

  window.L.circleMarker(center, {
    radius: 4,
    color: '#1976d2',
    weight: 2,
    fillColor: '#90caf9',
    fillOpacity: 0.8,
  }).bindTooltip('Approximate center Pangandaran').addTo(state.osmMap);
}


// ============================================================
// RENDERING
// ============================================================

/**
 * Render seluruh grid ke canvas.
 * Dipanggil setiap kali state berubah (klik, resize, dll).
 */
function render() {
  const { ctx, canvas } = state;
  const rows = MAP_META.rows;
  const cols = MAP_META.cols;

  // Bersihkan canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Gambar semua sel berdasarkan tipe
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellType = GRID_DATA[r][c];
      const x = c * cellSize;
      const y = r * cellSize;

      // Warna dasar sel dibuat semi-transparan agar OSM tetap terlihat.
      ctx.fillStyle = getCellFillStyle(cellType);
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }

  // 2. Gambar node yang dieksplorasi (jika ada hasil dan opsi aktif)
  if (state.result && state.result.found && state.showExplored) {
    drawExploredOverlay();
  }

  // 3. Gambar jalur evakuasi (path)
  if (state.result && state.result.found) {
    drawPath(state.result.path);
  }

  // 4. Gambar titik start (posisi wisatawan)
  if (state.startPos) {
    drawMarker(state.startPos[0], state.startPos[1], COLORS.start, COLORS.startBorder, '🧑');
  }

  // 5. Gambar semua shelter kandidat — selalu tampil
  drawShelters();

  // 6. Gambar garis grid (tipis)
  drawGridLines();
}

/**
 * Gambar garis grid untuk memisahkan sel.
 */
function drawGridLines() {
  const { ctx, canvas } = state;
  ctx.strokeStyle = COLORS.gridLine;
  ctx.lineWidth = 0.5;

  // Garis vertikal
  for (let c = 0; c <= MAP_META.cols; c++) {
    const x = c * cellSize;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // Garis horizontal
  for (let r = 0; r <= MAP_META.rows; r++) {
    const y = r * cellSize;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}


/**
 * Gambar jalur evakuasi pada grid.
 * @param {number[][]} path - Array koordinat [[row,col], ...]
 */
function drawPath(path) {
  const { ctx } = state;

  // Gambar sel-sel jalur
  for (const [r, c] of path) {
    const x = c * cellSize;
    const y = r * cellSize;
    ctx.fillStyle = COLORS.path;
    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
  }

  // Gambar garis penghubung jalur (agar lebih jelas arahnya)
  if (path.length > 1) {
    ctx.strokeStyle = '#e65100';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const [startR, startC] = path[0];
    ctx.moveTo(startC * cellSize + cellSize / 2, startR * cellSize + cellSize / 2);

    for (let i = 1; i < path.length; i++) {
      const [r, c] = path[i];
      ctx.lineTo(c * cellSize + cellSize / 2, r * cellSize + cellSize / 2);
    }
    ctx.stroke();
  }
}

/**
 * Gambar overlay untuk node yang dieksplorasi A*.
 * Menampilkan semua sel yang masuk closed list sebagai overlay semi-transparan.
 * Warna ungu muda agar berbeda dari obstacle (gelap), path (oranye), dan goal (hijau).
 * Digambar SEBELUM path agar path tetap terlihat di atasnya.
 */
function drawExploredOverlay() {
  if (!state.result || !state.result.exploredNodes) return;

  const { ctx } = state;

  // Set warna semi-transparan untuk explored nodes
  ctx.fillStyle = 'rgba(206, 147, 216, 0.45)'; // Ungu muda, 45% opacity

  for (const [r, c] of state.result.exploredNodes) {
    // Jangan gambar overlay di atas start, goal, atau path
    // (path akan digambar di atas overlay, tapi start/goal perlu dilindungi)
    if (state.startPos && r === state.startPos[0] && c === state.startPos[1]) continue;
    if (isShelterCell(r, c)) continue;

    const x = c * cellSize;
    const y = r * cellSize;
    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
  }
}

/**
 * Warna grid semi-transparan untuk Progress 2 OSM overlay.
 * Obstacle dan genangan tetap terbaca, tetapi peta OSM masih tampak.
 */
function getCellFillStyle(cellType) {
  const color = CELL_COLORS[cellType] || CELL_COLORS[CELL_WALKABLE];
  const alphaByCell = {
    [CELL_WALKABLE]: 0.55,
    [CELL_OBSTACLE]: 0.88,
    [CELL_FLOOD_LIGHT]: 0.72,
    [CELL_FLOOD_MED]: 0.76,
    [CELL_FLOOD_HEAVY]: 0.82,
    [CELL_GOAL]: 0.95,
  };

  return hexToRgba(color, alphaByCell[cellType] ?? 0.65);
}

/**
 * Konversi warna hex #rrggbb ke rgba().
 */
function hexToRgba(hex, alpha) {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Gambar semua shelter kandidat.
 * Shelter yang dipilih rute terbaik diberi border lebih tebal.
 */
function drawShelters() {
  state.shelters.forEach((shelter, index) => {
    const [row, col] = shelter.position;
    const isSelected = state.selectedShelter && state.selectedShelter.id === shelter.id;
    drawShelterMarker(row, col, index + 1, isSelected, shelter.type === 'primary');
  });
}

/**
 * Marker shelter bernomor agar daftar shelter jurnal mudah dibaca saat demo.
 */
function drawShelterMarker(row, col, number, isSelected, isPrimary) {
  const { ctx } = state;
  const x = col * cellSize;
  const y = row * cellSize;

  ctx.fillStyle = isPrimary ? '#2e7d32' : CELL_COLORS[CELL_GOAL];
  ctx.fillRect(x, y, cellSize, cellSize);

  ctx.strokeStyle = isSelected ? '#ff6f00' : COLORS.goalBorder;
  ctx.lineWidth = isSelected ? 3 : 2;
  ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

  if (cellSize >= 10) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(8, cellSize - 6)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(number), x + cellSize / 2, y + cellSize / 2);
  }
}

/**
 * Gambar marker (titik start atau goal) dengan emoji.
 * @param {number} row 
 * @param {number} col 
 * @param {string} fillColor 
 * @param {string} borderColor 
 * @param {string} emoji 
 */
function drawMarker(row, col, fillColor, borderColor, emoji, borderWidth = 2) {
  const { ctx } = state;
  const x = col * cellSize;
  const y = row * cellSize;

  // Background
  ctx.fillStyle = fillColor;
  ctx.fillRect(x, y, cellSize, cellSize);

  // Border tebal
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

  // Emoji (jika sel cukup besar)
  if (cellSize >= 14) {
    ctx.font = `${cellSize - 4}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x + cellSize / 2, y + cellSize / 2);
  }
}


// ============================================================
// EVENT HANDLERS
// ============================================================

/**
 * Handler klik pada canvas.
 * Mengkonversi posisi pixel ke koordinat grid,
 * lalu menjalankan A* jika posisi valid.
 */
function handleCanvasClick(event) {
  const rect = state.canvas.getBoundingClientRect();
  const pixelX = event.clientX - rect.left;
  const pixelY = event.clientY - rect.top;

  // Konversi pixel → koordinat grid
  const col = Math.floor(pixelX / cellSize);
  const row = Math.floor(pixelY / cellSize);

  // Validasi: apakah posisi ini bisa jadi titik awal?
  if (!isValidStart(row, col)) {
    updateInfo(`⚠️ Posisi [${row}, ${col}] tidak valid. Pilih jalan atau area terbuka.`);
    return;
  }

  // Set titik awal baru
  state.startPos = [row, col];

  // Jalankan A*
  runPathfinding();
}

/**
 * Handler resize window — hitung ulang ukuran sel dan render ulang.
 */
function handleResize() {
  calculateCellSize();
  state.canvas.width = MAP_META.cols * cellSize;
  state.canvas.height = MAP_META.rows * cellSize;
  syncMapShellSize();
  if (state.osmMap) {
    state.osmMap.invalidateSize();
    state.osmMap.fitBounds([
      [MAP_META.mapBounds.south, MAP_META.mapBounds.west],
      [MAP_META.mapBounds.north, MAP_META.mapBounds.east],
    ], { animate: false });
  }
  render();
}


// ============================================================
// LOGIKA PENCARIAN
// ============================================================

/**
 * Jalankan algoritma A* dari posisi start ke semua shelter.
 * Shelter terbaik dipilih berdasarkan totalCost terkecil.
 * Menyimpan hasil di state dan memperbarui tampilan.
 */
function runPathfinding() {
  if (!state.startPos) return;

  const t0 = performance.now();
  const bestRoute = findBestShelterRoute(state.startPos);
  const elapsed = performance.now() - t0;
  state.result = bestRoute ? bestRoute.result : null;
  state.selectedShelter = bestRoute ? bestRoute.shelter : null;

  // Render ulang grid dengan path baru
  render();

  // Update panel informasi
  if (state.result && state.result.found) {
    // Jarak fisik dihitung dari geometri path (tanpa terrain multiplier)
    const physicalMeters = calcPhysicalDistance(state.result.path);
    // Estimasi waktu dari jarak fisik / kecepatan jalan
    const timeEst = estimateTimeFromDistance(physicalMeters);
    const terrainLabel = CELL_LABELS[GRID_DATA[state.startPos[0]][state.startPos[1]]] || 'Jalan';
    const [shelterRow, shelterCol] = state.selectedShelter.position;
    const locationLabel = [
      state.selectedShelter.village,
      state.selectedShelter.district,
    ].filter(Boolean).join(', ');
    updateInfo(
      `✅ Rute ditemukan!\n` +
      `📍 Dari: [${state.startPos[0]}, ${state.startPos[1]}] — ${terrainLabel}\n` +
      `🏛️ Shelter terbaik: ${state.selectedShelter.name} [${shelterRow}, ${shelterCol}]\n` +
      (locationLabel ? `🗺️ Lokasi referensi: ${locationLabel}\n` : '') +
      `⛰️ Elevasi: ${state.selectedShelter.elevation}\n` +
      `👥 Kapasitas shelter: ±${state.selectedShelter.capacity.toLocaleString('id-ID')} jiwa\n` +
      `📚 Sumber: ${state.selectedShelter.sourceTable}\n` +
      `📏 Jarak fisik: ${Math.round(physicalMeters)} meter\n` +
      `⚖️ Total cost A*: ${state.result.totalCost.toFixed(2)} (jalan=1, genangan=1.5–3)\n` +
      `⏱️ Estimasi waktu: ${timeEst.formatted}\n` +
      `🔍 Node dieksplorasi: ${state.result.nodesExplored}\n` +
      `⚡ Waktu komputasi: ${elapsed.toFixed(1)} ms`
    );
  } else {
    updateInfo(
      `❌ Tidak ada jalur yang ditemukan!\n` +
      `Posisi Anda mungkin terisolasi oleh bangunan atau sungai.\n` +
      `Coba pilih posisi lain yang lebih dekat ke jalan.`
    );
  }
}

/**
 * Menjalankan A* ke semua shelter kandidat dan memilih totalCost terkecil.
 * astar.js tetap tidak diubah; multi-shelter diatur di level aplikasi.
 *
 * @param {number[]} start Koordinat start [row, col]
 * @returns {{ shelter: object, result: object } | null}
 */
function findBestShelterRoute(start) {
  let bestRoute = null;

  for (const shelter of state.shelters) {
    const result = astar(state.astarGrid, start, shelter.position);
    if (!result.found) continue;

    if (!bestRoute || result.totalCost < bestRoute.result.totalCost) {
      bestRoute = { shelter, result };
    }
  }

  return bestRoute;
}

/**
 * Update panel informasi di halaman.
 * @param {string} text - Teks informasi (bisa multi-line)
 */
function updateInfo(text) {
  const panel = document.getElementById('infoPanel');
  if (panel) {
    panel.textContent = text;
  }
}


// ============================================================
// API PUBLIK (untuk kontrol dari luar modul)
// ============================================================

/**
 * Set titik awal secara programatik (tanpa klik).
 * Berguna untuk testing atau preset skenario.
 * @param {number} row 
 * @param {number} col 
 */
export function setStart(row, col) {
  if (!isValidStart(row, col)) {
    console.warn(`setStart(${row}, ${col}): posisi tidak valid`);
    return false;
  }
  state.startPos = [row, col];
  runPathfinding();
  return true;
}

/**
 * Reset state — hapus titik awal dan hasil pencarian.
 */
export function reset() {
  state.startPos = null;
  state.result = null;
  state.selectedShelter = null;
  render();
  updateInfo('Klik pada peta untuk memilih posisi Anda, lalu rute evakuasi akan ditampilkan.');
}

/**
 * Toggle tampilan node yang dieksplorasi.
 */
export function toggleExplored() {
  state.showExplored = !state.showExplored;
  render();
}

/**
 * Mendapatkan state saat ini (untuk debugging).
 */
export function getState() {
  return { ...state, astarGrid: '[cached]' };
}

/**
 * Mendapatkan ukuran sel saat ini.
 */
export function getCellSize() {
  return cellSize;
}
