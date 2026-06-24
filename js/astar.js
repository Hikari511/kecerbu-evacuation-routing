/**
 * ============================================================
 * EvaTour — Modul Algoritma A* (A-Star)
 * ============================================================
 * 
 * Implementasi A* untuk pencarian rute evakuasi tsunami
 * pada grid 2D dengan 8-connectivity.
 * 
 * Fungsi evaluasi:
 *   f(n) = g(n) + h(n)
 *   - g(n) = biaya aktual dari start ke node n
 *   - h(n) = heuristik Euclidean Distance ke goal
 * 
 * Properti algoritma:
 *   - Complete: selalu menemukan solusi jika ada
 *   - Optimal: menjamin jalur terpendek (karena heuristik admissible)
 *   - Efisien: tidak mengeksplorasi seluruh grid seperti Dijkstra
 * 
 * Referensi:
 *   Hart, Nilsson, & Raphael (1968). A Formal Basis for the
 *   Heuristic Determination of Minimum Cost Paths.
 * ============================================================
 */

// ============================================================
// KONSTANTA
// ============================================================

/** Biaya perpindahan horizontal atau vertikal (1 sel) */
const COST_STRAIGHT = 1;

/** Biaya perpindahan diagonal = √2 ≈ 1.414 */
const COST_DIAGONAL = Math.SQRT2;

/**
 * 8 arah perpindahan (8-connectivity):
 * Setiap elemen berisi [deltaRow, deltaCol, biaya]
 * 
 *   NW  N  NE
 *    \  |  /
 *  W — [n] — E
 *    /  |  \
 *   SW  S  SE
 */
const DIRECTIONS = [
  // Arah kardinal (horizontal/vertikal) — biaya 1
  [-1,  0, COST_STRAIGHT],  // Utara (N)
  [ 1,  0, COST_STRAIGHT],  // Selatan (S)
  [ 0, -1, COST_STRAIGHT],  // Barat (W)
  [ 0,  1, COST_STRAIGHT],  // Timur (E)
  // Arah diagonal — biaya √2
  [-1, -1, COST_DIAGONAL],  // Barat Laut (NW)
  [-1,  1, COST_DIAGONAL],  // Timur Laut (NE)
  [ 1, -1, COST_DIAGONAL],  // Barat Daya (SW)
  [ 1,  1, COST_DIAGONAL],  // Tenggara (SE)
];


// ============================================================
// PRIORITY QUEUE (MIN-HEAP)
// ============================================================

/**
 * Implementasi Priority Queue menggunakan Binary Min-Heap.
 * 
 * Mengapa perlu ini?
 * A* selalu memproses node dengan f(n) terkecil terlebih dahulu.
 * Min-Heap memungkinkan pengambilan elemen minimum dalam O(log n),
 * jauh lebih efisien daripada mencari minimum di array biasa O(n).
 * 
 * Struktur heap disimpan dalam array datar:
 *   - Parent dari index i  → Math.floor((i - 1) / 2)
 *   - Left child dari i   → 2 * i + 1
 *   - Right child dari i  → 2 * i + 2
 */
class MinHeap {
  constructor() {
    this.data = [];
  }

  /** Jumlah elemen dalam heap */
  get size() {
    return this.data.length;
  }

  /** Apakah heap kosong? */
  isEmpty() {
    return this.data.length === 0;
  }

  /**
   * Masukkan node baru ke heap.
   * Node akan "naik" (bubble up) sampai posisi yang benar.
   * @param {object} node - Objek dengan properti .f sebagai prioritas
   */
  push(node) {
    this.data.push(node);
    this._bubbleUp(this.data.length - 1);
  }

  /**
   * Ambil dan hapus node dengan f(n) terkecil.
   * Node terakhir dipindah ke root, lalu "turun" (sink down).
   * @returns {object} Node dengan f terkecil
   */
  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  /** Bubble up: naikkan elemen ke posisi yang benar */
  _bubbleUp(index) {
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      // Jika f anak lebih kecil dari f parent, tukar
      if (this.data[index].f < this.data[parentIdx].f) {
        [this.data[index], this.data[parentIdx]] = 
          [this.data[parentIdx], this.data[index]];
        index = parentIdx;
      } else {
        break;
      }
    }
  }

  /** Sink down: turunkan elemen ke posisi yang benar */
  _sinkDown(index) {
    const length = this.data.length;
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (left < length && this.data[left].f < this.data[smallest].f) {
        smallest = left;
      }
      if (right < length && this.data[right].f < this.data[smallest].f) {
        smallest = right;
      }
      if (smallest !== index) {
        [this.data[index], this.data[smallest]] = 
          [this.data[smallest], this.data[index]];
        index = smallest;
      } else {
        break;
      }
    }
  }
}


// ============================================================
// FUNGSI HEURISTIK
// ============================================================

/**
 * Heuristik Euclidean Distance.
 * 
 * Menghitung jarak garis lurus dari sel (row, col) ke goal.
 * 
 * Mengapa Euclidean?
 * Pada grid 8-connectivity dengan biaya diagonal √2,
 * Euclidean Distance SELALU ≤ jarak sebenarnya (admissible).
 * Ini menjamin A* menemukan jalur optimal.
 * 
 * @param {number} row - Baris sel saat ini
 * @param {number} col - Kolom sel saat ini
 * @param {number} goalRow - Baris sel tujuan (TES)
 * @param {number} goalCol - Kolom sel tujuan (TES)
 * @returns {number} Estimasi jarak ke tujuan
 */
function heuristic(row, col, goalRow, goalCol) {
  const dx = Math.abs(col - goalCol);
  const dy = Math.abs(row - goalRow);
  return Math.sqrt(dx * dx + dy * dy);
}


// ============================================================
// FUNGSI UTAMA: A* SEARCH
// ============================================================

/**
 * Menjalankan algoritma A* pada grid 2D.
 * 
 * @param {number[][]} grid - Array 2D terrain cost:
 *   - 1         = walkable normal (jalan)
 *   - 1.5 / 2 / 3 = terrain berbiaya (genangan ringan/sedang/berat)
 *   - Infinity  = obstacle (tidak bisa dilalui)
 *
 * Biaya gerak ke sel tetangga dihitung sebagai:
 *   tentativeG = g(current) + base_move_cost × terrain_cost(tetangga)
 * di mana base_move_cost = 1 (kardinal) atau √2 (diagonal).
 * 
 * @param {number[]} start - Posisi awal [row, col] (lokasi wisatawan)
 * @param {number[]} goal  - Posisi tujuan [row, col] (lokasi TES)
 * 
 * @returns {object} Hasil pencarian:
 *   - path: Array koordinat [[row,col], ...] dari start ke goal
 *           (kosong jika tidak ditemukan)
 *   - totalCost: Total biaya jalur (g(n) dari goal)
 *   - nodesExplored: Jumlah node yang dieksplorasi (masuk closed list)
 *   - exploredNodes: Array koordinat [[row,col], ...] semua node yang dieksplorasi
 *   - found: Boolean apakah jalur ditemukan
 */
export function astar(grid, start, goal) {
  // --- Validasi input ---
  const rows = grid.length;
  const cols = grid[0].length;
  const [startRow, startCol] = start;
  const [goalRow, goalCol] = goal;

  // Cek apakah start atau goal berada di luar grid
  if (startRow < 0 || startRow >= rows || startCol < 0 || startCol >= cols) {
    return { path: [], totalCost: 0, nodesExplored: 0, exploredNodes: [], found: false };
  }
  if (goalRow < 0 || goalRow >= rows || goalCol < 0 || goalCol >= cols) {
    return { path: [], totalCost: 0, nodesExplored: 0, exploredNodes: [], found: false };
  }

  // Cek apakah start atau goal adalah obstacle
  if (grid[startRow][startCol] === Infinity || grid[goalRow][goalCol] === Infinity) {
    return { path: [], totalCost: 0, nodesExplored: 0, exploredNodes: [], found: false };
  }

  // --- Inisialisasi struktur data ---

  /**
   * gScore[row][col] = biaya aktual terkecil dari start ke sel (row, col).
   * Diinisialisasi Infinity karena belum ada jalur yang ditemukan.
   */
  const gScore = Array.from({ length: rows }, () => 
    new Array(cols).fill(Infinity)
  );

  /**
   * cameFrom[row][col] = koordinat parent [parentRow, parentCol].
   * Digunakan untuk merekonstruksi jalur setelah goal ditemukan.
   * null berarti belum punya parent.
   */
  const cameFrom = Array.from({ length: rows }, () => 
    new Array(cols).fill(null)
  );

  /**
   * closed[row][col] = true jika sel sudah dieksplorasi (masuk closed list).
   * Sel yang sudah di-closed tidak perlu diproses ulang.
   */
  const closed = Array.from({ length: rows }, () => 
    new Array(cols).fill(false)
  );

  // Inisialisasi node awal
  gScore[startRow][startCol] = 0;
  const startH = heuristic(startRow, startCol, goalRow, goalCol);

  /**
   * Open List: Priority Queue berisi node yang sudah ditemukan
   * tapi belum dieksplorasi. Selalu ambil node dengan f terkecil.
   * 
   * Setiap node dalam open list menyimpan:
   *   - row, col: posisi di grid
   *   - f: total estimasi biaya (g + h)
   *   - g: biaya aktual dari start
   */
  const openList = new MinHeap();
  openList.push({ row: startRow, col: startCol, f: startH, g: 0 });

  // Counter untuk menghitung jumlah node yang dieksplorasi
  let nodesExplored = 0;

  // Array untuk menyimpan koordinat semua node yang dieksplorasi
  const exploredNodes = [];

  // --- Loop utama A* ---
  while (!openList.isEmpty()) {
    // 1. Ambil node dengan f(n) terkecil dari open list
    const current = openList.pop();
    const { row, col, g } = current;

    // Skip jika node ini sudah pernah dieksplorasi (closed)
    // Ini bisa terjadi karena satu sel bisa masuk open list >1 kali
    if (closed[row][col]) {
      continue;
    }

    // 2. Tandai node sebagai explored (masuk closed list)
    closed[row][col] = true;
    nodesExplored++;
    exploredNodes.push([row, col]);

    // 3. Cek apakah sudah sampai di goal (TES Pangandaran!)
    if (row === goalRow && col === goalCol) {
      // Rekonstruksi jalur dari goal ke start menggunakan cameFrom
      const path = reconstructPath(cameFrom, start, goal);
      return {
        path,
        totalCost: g,
        nodesExplored,
        exploredNodes,
        found: true,
      };
    }

    // 4. Ekspansi: periksa semua tetangga (8 arah)
    for (const [dRow, dCol, moveCost] of DIRECTIONS) {
      const newRow = row + dRow;
      const newCol = col + dCol;

      // --- Cek batas grid ---
      if (newRow < 0 || newRow >= rows || newCol < 0 || newCol >= cols) {
        continue;
      }

      // --- Cek obstacle (terrain cost = Infinity) ---
      if (grid[newRow][newCol] === Infinity) {
        continue;
      }

      // --- Cek sudah di-closed ---
      if (closed[newRow][newCol]) {
        continue;
      }

      // --- Cek corner-cutting (khusus gerakan diagonal) ---
      // Diagonal tidak boleh "memotong sudut" obstacle.
      // Contoh: bergerak ke NE (row-1, col+1) hanya boleh jika
      //         sel N (row-1, col) DAN sel E (row, col+1) bukan obstacle.
      if (dRow !== 0 && dCol !== 0) {
        const adjacentRow = grid[row + dRow][col]; // sel di arah vertikal
        const adjacentCol = grid[row][col + dCol]; // sel di arah horizontal
        if (adjacentRow === Infinity || adjacentCol === Infinity) {
          // Salah satu sel yang diapit adalah obstacle → tidak boleh diagonal
          continue;
        }
      }

      // --- Hitung g baru untuk tetangga menggunakan terrain cost ---
      // Biaya gerak = base_cost (1 atau √2) × terrain_cost sel tujuan
      // Ini membuat A* lebih memilih jalan normal daripada genangan.
      const terrainCost = grid[newRow][newCol];
      const tentativeG = g + moveCost * terrainCost;

      // Jika jalur baru lebih baik dari yang sudah tercatat
      if (tentativeG < gScore[newRow][newCol]) {
        // Update biaya dan parent
        gScore[newRow][newCol] = tentativeG;
        cameFrom[newRow][newCol] = [row, col];

        // Hitung f(n) = g(n) + h(n)
        const h = heuristic(newRow, newCol, goalRow, goalCol);
        const f = tentativeG + h;

        // Masukkan ke open list
        openList.push({ row: newRow, col: newCol, f, g: tentativeG });
      }
    }
  }

  // Open list habis tanpa menemukan goal → tidak ada jalur
  return { path: [], totalCost: 0, nodesExplored, exploredNodes, found: false };
}


// ============================================================
// REKONSTRUKSI JALUR
// ============================================================

/**
 * Merekonstruksi jalur dari goal ke start menggunakan parent pointer.
 * 
 * Cara kerja:
 * Mulai dari goal, ikuti cameFrom[row][col] mundur ke parent,
 * terus sampai kembali ke start. Lalu balik urutannya.
 * 
 * @param {Array[][]} cameFrom - Array 2D berisi parent pointer
 * @param {number[]} start - Koordinat start [row, col]
 * @param {number[]} goal - Koordinat goal [row, col]
 * @returns {number[][]} Array koordinat jalur dari start ke goal
 */
function reconstructPath(cameFrom, start, goal) {
  const path = [];
  let current = goal;

  // Telusuri mundur dari goal ke start
  while (current !== null) {
    path.push(current);
    const [row, col] = current;

    // Jika sudah sampai di start, berhenti
    if (row === start[0] && col === start[1]) {
      break;
    }

    // Mundur ke parent
    current = cameFrom[row][col];
  }

  // Balik urutan: dari [goal → start] menjadi [start → goal]
  path.reverse();
  return path;
}


// ============================================================
// EXPORT TAMBAHAN (untuk testing/debugging)
// ============================================================

export { heuristic, MinHeap };
