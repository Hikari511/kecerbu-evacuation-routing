/**
 * ============================================================
 * EvaTour — Modul Data Peta (mapData.js)
 * ============================================================
 * 
 * Modul ini menyimpan data peta kawasan wisata Pantai Pangandaran
 * dalam bentuk grid 2D untuk digunakan oleh algoritma A*.
 * 
 * REPRESENTASI GRID:
 *   Setiap sel grid merepresentasikan area ~40m x 40m di dunia nyata.
 *   Grid 40x50 ≈ area 1.6km x 2.0km — sesuai dengan kawasan wisata
 *   kompak Pangandaran (~2 km²) yang disebutkan dalam proposal.
 * 
 * TIPE SEL (Cell Types):
 *   0 = WALKABLE     — Jalan, trotoar, area terbuka (cost: 1)
 *   1 = OBSTACLE     — Bangunan, tembok, sungai — tidak bisa dilalui
 *   2 = FLOOD_LIGHT  — Genangan ringan, bisa dilalui (cost: 1.5×)
 *   3 = FLOOD_MED    — Genangan sedang, bisa dilalui (cost: 2×)
 *   4 = FLOOD_HEAVY  — Genangan berat, bisa dilalui (cost: 3×)
 *   5 = GOAL         — TES Pangandaran (Blok Pasar Wisata)
 * 
 * ALASAN PEMILIHAN REPRESENTASI:
 *   1. Array 2D integer — sederhana, cepat diakses O(1), mudah
 *      dipahami mahasiswa, dan langsung kompatibel dengan astar.js
 *   2. Tipe sel numerik — efisien memori, mudah di-render dengan
 *      warna berbeda, dan bisa ditambah tipe baru tanpa refactor
 *   3. Metadata terpisah — skala, koordinat, dan info shelter
 *      disimpan di objek terpisah agar grid tetap bersih
 *   4. Pemisahan data dari algoritma — mapData.js bisa diganti
 *      dengan peta lain tanpa mengubah astar.js sama sekali
 * 
 * REFERENSI GEOGRAFIS (approximate):
 *   - Baris 0 (atas)    = Utara (arah daratan/pegunungan)
 *   - Baris terakhir    = Selatan (arah pantai/laut)
 *   - Kolom 0 (kiri)    = Barat
 *   - Kolom terakhir    = Timur
 *   - TES Pangandaran   = area utara-tengah grid (elevasi tinggi)
 * ============================================================
 */

// ============================================================
// KONSTANTA TIPE SEL
// ============================================================

/** Jalan / area terbuka — bisa dilalui */
export const CELL_WALKABLE = 0;

/** Bangunan / tembok / sungai — TIDAK bisa dilalui */
export const CELL_OBSTACLE = 1;

/** Zona rawan genangan ringan — bisa dilalui, cost 1.5× */
export const CELL_FLOOD_LIGHT = 2;

/** Zona rawan genangan sedang — bisa dilalui, cost 2× */
export const CELL_FLOOD_MED = 3;

/** Zona rawan genangan berat — bisa dilalui, cost 3× */
export const CELL_FLOOD_HEAVY = 4;

/** TES Pangandaran (shelter tujuan evakuasi) */
export const CELL_GOAL = 5;

/**
 * Terrain cost per tipe sel.
 * Nilai ini digunakan A* sebagai pengali biaya langkah.
 * Obstacle ditandai Infinity agar tidak pernah dilalui.
 */
export const TERRAIN_COST = {
  [CELL_WALKABLE]:    1,        // Jalan normal
  [CELL_OBSTACLE]:    Infinity, // Tidak bisa dilalui
  [CELL_FLOOD_LIGHT]: 1.5,      // Genangan ringan — sedikit memperlambat
  [CELL_FLOOD_MED]:   2,        // Genangan sedang — cukup memperlambat
  [CELL_FLOOD_HEAVY]: 3,        // Genangan berat — sangat memperlambat
  [CELL_GOAL]:        1,        // Shelter — walkable normal
};

/**
 * Mapping tipe sel ke label (untuk UI/legenda)
 */
export const CELL_LABELS = {
  [CELL_WALKABLE]:    'Jalan / Area Terbuka (cost: 1)',
  [CELL_OBSTACLE]:    'Bangunan / Sungai (tidak bisa dilalui)',
  [CELL_FLOOD_LIGHT]: 'Genangan Ringan (cost: 1.5×)',
  [CELL_FLOOD_MED]:   'Genangan Sedang (cost: 2×)',
  [CELL_FLOOD_HEAVY]: 'Genangan Berat (cost: 3×)',
  [CELL_GOAL]:        'TES Pangandaran (Shelter)',
};

/**
 * Mapping tipe sel ke warna (untuk rendering grid)
 */
export const CELL_COLORS = {
  [CELL_WALKABLE]:    '#f5f5f5',  // Abu sangat terang (jalan)
  [CELL_OBSTACLE]:    '#37474f',  // Abu gelap (bangunan)
  [CELL_FLOOD_LIGHT]: '#bbdefb',  // Biru muda (genangan ringan)
  [CELL_FLOOD_MED]:   '#64b5f6',  // Biru sedang (genangan sedang)
  [CELL_FLOOD_HEAVY]: '#1565c0',  // Biru tua (genangan berat)
  [CELL_GOAL]:        '#4caf50',  // Hijau (shelter aman)
};


// ============================================================
// METADATA PETA
// ============================================================

/**
 * Informasi metadata tentang peta ini.
 * Terpisah dari grid agar mudah diubah tanpa menyentuh data sel.
 */
export const MAP_META = {
  /** Nama peta */
  name: 'Kawasan Wisata Pantai Pangandaran',

  /** Ukuran grid (rows x cols) */
  rows: 40,
  cols: 50,

  /** Skala: 1 sel = berapa meter di dunia nyata */
  cellSizeMeters: 40,

  /** Kecepatan jalan kaki evakuasi (meter/detik) — penelitian Wibowo dkk */
  walkSpeedMps: 1.39,  // ~5 km/jam (kecepatan jalan cepat)

  /** Posisi TES Pangandaran utama (goal state lama) — [row, col] */
  goalPosition: [5, 24],

  /** Deskripsi shelter utama, dipertahankan untuk kompatibilitas kode lama */
  shelter: {
    id: 'tsunami-shelter-bnpb',
    name: 'Tsunami Shelter BNPB / TES Pangandaran',
    position: [5, 24],
    capacity: 5100,
    elevation: 'Existing shelter',
    description: 'Existing shelter di Kecamatan Pangandaran menurut Husa & Damayanti (2019).',
  },

  /**
   * Kandidat shelter untuk Progress 2.
   * Nama, district, elevation, dan capacity mengacu pada Husa & Damayanti
   * (2019), Table 3 dan Table 4. Position masih approximate pada grid
   * simulasi untuk demo Progress 2, bukan koordinat GPS presisi.
   */
  shelters: [
    {
      id: 'tsunami-shelter-bnpb',
      name: 'Tsunami Shelter BNPB / TES Pangandaran',
      position: [5, 24],
      capacity: 5100,
      elevation: 'Existing shelter',
      district: 'Pangandaran',
      village: 'Pangandaran',
      sourceTable: 'Husa & Damayanti (2019), Table 3',
      description: 'Existing shelter utama pada grid simulasi.',
      type: 'primary',
    },
    {
      id: 'smpn-1-pangandaran',
      name: 'SMPN 1 Pangandaran',
      position: [5, 25],
      capacity: 3221,
      elevation: '11 m',
      district: 'Pangandaran',
      village: 'Pananjung',
      sourceTable: 'Husa & Damayanti (2019), Table 4',
      type: 'journal-potential',
    },
    {
      id: 'smkn-1-pangandaran',
      name: 'SMKN 1 Pangandaran',
      position: [6, 26],
      capacity: 2872,
      elevation: '11 m',
      district: 'Pangandaran',
      village: 'Pananjung',
      sourceTable: 'Husa & Damayanti (2019), Table 4',
      type: 'journal-potential',
    },
    {
      id: 'al-falah-mosque',
      name: 'Al Falah Mosque',
      position: [6, 3],
      capacity: 178,
      elevation: '11 m',
      district: 'Cijulang',
      village: 'Cijulang',
      sourceTable: 'Husa & Damayanti (2019), Table 4',
      type: 'journal-potential',
    },
    {
      id: 'al-islah-mosque',
      name: 'Al Islah Mosque',
      position: [7, 5],
      capacity: 440,
      elevation: '13 m',
      district: 'Cijulang',
      village: 'Cijulang',
      sourceTable: 'Husa & Damayanti (2019), Table 4',
      type: 'journal-potential',
    },
    {
      id: 'al-istikmal-mosque',
      name: 'Al Istikmal Mosque',
      position: [6, 13],
      capacity: 235,
      elevation: '11 m',
      district: 'Sidamulih',
      village: 'Cikembulan',
      sourceTable: 'Husa & Damayanti (2019), Table 4',
      type: 'journal-potential',
    },
    {
      id: 'ar-eiyadh-mosque',
      name: 'Ar Eiyadh Mosque',
      position: [4, 37],
      capacity: 523,
      elevation: '16 m',
      district: 'Parigi',
      village: 'Karangbenda',
      sourceTable: 'Husa & Damayanti (2019), Table 4',
      type: 'journal-potential',
    },
    {
      id: 'hidayatul-falah-mosque',
      name: 'Hidayatul Falah Mosque',
      position: [7, 42],
      capacity: 138,
      elevation: '17 m',
      district: 'Parigi',
      village: 'Cibenda',
      sourceTable: 'Husa & Damayanti (2019), Table 4',
      type: 'journal-potential',
    },
    {
      id: 'mts-bojong-cibenda',
      name: 'MTS Bojong Cibenda',
      position: [11, 42],
      capacity: 396,
      elevation: '16 m',
      district: 'Parigi',
      village: 'Cibenda',
      sourceTable: 'Husa & Damayanti (2019), Table 4',
      type: 'journal-potential',
    },
    {
      id: 'nuansa-bangunan',
      name: 'Nuansa Bangunan',
      position: [15, 42],
      capacity: 155,
      elevation: '16 m',
      district: 'Parigi',
      village: 'Cibenda',
      sourceTable: 'Husa & Damayanti (2019), Table 4',
      type: 'journal-potential',
    },
    {
      id: 'posyandu-dusun-patrol',
      name: 'Posyandu Dusun Patrol',
      position: [19, 42],
      capacity: 11,
      elevation: '15 m',
      district: 'Parigi',
      village: 'Cibenda',
      sourceTable: 'Husa & Damayanti (2019), Table 4',
      type: 'journal-potential',
    },
    {
      id: 'puskesmas-cikembulan',
      name: 'Puskesmas Cikembulan',
      position: [11, 18],
      capacity: 725,
      elevation: '12 m',
      district: 'Sidamulih',
      village: 'Cikembulan',
      sourceTable: 'Husa & Damayanti (2019), Table 4',
      type: 'journal-potential',
    },
    {
      id: 'sdn-3-cibenda',
      name: 'SDN 3 Cibenda',
      position: [7, 45],
      capacity: 183,
      elevation: '16 m',
      district: 'Parigi',
      village: 'Cibenda',
      sourceTable: 'Husa & Damayanti (2019), Table 4',
      type: 'journal-potential',
    },
    {
      id: 'sdn-1-karangbenda',
      name: 'SDN 1 Karangbenda',
      position: [3, 40],
      capacity: 263,
      elevation: '18 m',
      district: 'Parigi',
      village: 'Karangbenda',
      sourceTable: 'Husa & Damayanti (2019), Table 4',
      type: 'journal-potential',
    },
    {
      id: 'sdn-1-sukaresik',
      name: 'SDN 1 Sukaresik',
      position: [4, 18],
      capacity: 331,
      elevation: '9 m',
      district: 'Sidamulih',
      village: 'Sukaresik',
      sourceTable: 'Husa & Damayanti (2019), Table 4',
      type: 'journal-potential',
    },
    {
      id: 'sdn-2-cibenda',
      name: 'SDN 2 Cibenda',
      position: [11, 45],
      capacity: 241,
      elevation: '16 m',
      district: 'Parigi',
      village: 'Cibenda',
      sourceTable: 'Husa & Damayanti (2019), Table 4',
      type: 'journal-potential',
    },
    {
      id: 'parigi-market',
      name: 'Parigi Market',
      position: [7, 48],
      capacity: 1482,
      elevation: '15 m',
      district: 'Parigi',
      village: 'Parigi',
      sourceTable: 'Husa & Damayanti (2019), Table 4',
      type: 'journal-potential',
    },
  ],

  /** Referensi koordinat geografis (approximate center) */
  geoReference: {
    centerLat: -7.6913,
    centerLon: 108.6561,
    note: 'Koordinat approximate untuk referensi, bukan GPS presisi',
  },

  /**
   * Bounding box approximate untuk menempatkan grid 40x50 di atas OSM.
   * Progress 2 memakai OSM sebagai konteks visual; state space A* tetap grid.
   */
  mapBounds: {
    north: -7.6800,
    south: -7.7050,
    west: 108.6400,
    east: 108.6750,
    note: 'Batas simulasi approximate kawasan wisata Pangandaran.',
  },
};


// ============================================================
// DATA GRID PETA
// ============================================================

/**
 * Grid 40 baris × 50 kolom merepresentasikan kawasan wisata Pangandaran.
 * 
 * LAYOUT UMUM (dari atas ke bawah / utara ke selatan):
 *   Baris  0-7  : Area utara — TES, jalan utama, elevasi tinggi
 *   Baris  8-15 : Area tengah — permukiman, toko, penginapan
 *   Baris 16-25 : Area wisata — hotel, restoran, jalan ke pantai
 *   Baris 26-33 : Area pantai utara — warung, parkir
 *   Baris 34-39 : Bibir pantai — zona genangan tsunami
 * 
 * FITUR YANG DIMODELKAN:
 *   - Jalan utama utara-selatan (kolom 10, 25, 40)
 *   - Jalan utama timur-barat (baris 7, 15, 25)
 *   - Blok bangunan (cluster obstacle)
 *   - Sungai kecil (obstacle linear di kolom 35-36)
 *   - TES di baris 5, kolom 24-26
 *   - Zona rawan genangan di baris 34-39
 * 
 * Untuk mengubah peta: edit array di bawah ini.
 * Algoritma A* di astar.js tidak perlu diubah sama sekali.
 */

// Helper: alias singkat untuk tipe sel di dalam GRID_DATA
const W  = CELL_WALKABLE;     // 0 — Jalan
const O  = CELL_OBSTACLE;     // 1 — Obstacle
const FL = CELL_FLOOD_LIGHT;  // 2 — Genangan ringan
const FM = CELL_FLOOD_MED;    // 3 — Genangan sedang
const FH = CELL_FLOOD_HEAVY;  // 4 — Genangan berat
const G  = CELL_GOAL;         // 5 — TES


/**
 * Grid utama peta Pangandaran (40 rows × 50 cols)
 * 
 * Legenda singkat:
 *   W  = Walkable (0)       |  O = Obstacle (1)
 *   FL = Flood Light (2)    |  FM = Flood Med (3)
 *   FH = Flood Heavy (4)    |  G  = Goal/TES (5)
 * 
 * Zona genangan (baris 34-39):
 *   Baris 39     = bibir pantai → genangan berat (FH, cost 3)
 *   Baris 37-38  = bibir pantai dalam → genangan sedang (FM, cost 2)
 *   Baris 34-36  = area transisi pantai → genangan ringan (FL, cost 1.5)
 */
export const GRID_DATA = [
  // === BARIS 0-4: Area utara — jalan utama, beberapa bangunan ===
  //0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, O, O, W, W, W, W, W, W, W, W, W, W, W, W, W], // 0
  [W, O, O, O, W, W, O, O, O, W, W, W, W, O, O, O, O, W, W, W, W, W, W, W, W, W, W, W, W, O, O, O, W, W, W, O, O, W, W, W, O, O, O, W, W, W, W, W, W, W], // 1
  [W, O, O, O, W, W, O, O, O, W, W, W, W, O, O, O, O, W, W, W, W, W, W, W, W, W, W, W, W, O, O, O, W, W, W, O, O, W, W, W, O, O, O, W, W, W, W, W, W, W], // 2
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, O, O, W, W, W, W, W, W, W, W, W, W, W, W, W], // 3
  [W, W, W, W, O, O, O, W, W, W, W, W, O, O, O, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, O, O, W, O, O, W, W, W, W, W, O, O, O, W, W, W, W, W], // 4

  // === BARIS 5-9: Area TES dan sekitarnya ===
  [W, W, W, W, O, O, O, W, W, W, W, W, O, O, O, W, W, W, W, W, W, W, W, W, G, G, G, W, W, W, W, W, O, O, W, O, O, W, W, W, W, W, O, O, O, W, W, W, W, W], // 5  ← TES di kolom 24-26
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, G, G, G, W, W, W, W, W, W, W, W, O, O, W, W, W, W, W, W, W, W, W, W, W, W, W], // 6  ← TES
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W], // 7  ← Jalan utama E-W
  [W, O, O, O, O, W, W, O, O, O, W, W, W, O, O, O, O, O, W, W, W, W, O, O, W, W, W, O, O, W, W, O, O, O, W, W, W, W, O, O, O, O, W, W, W, O, O, O, W, W], // 8
  [W, O, O, O, O, W, W, O, O, O, W, W, W, O, O, O, O, O, W, W, W, W, O, O, W, W, W, O, O, W, W, O, O, O, W, W, W, W, O, O, O, O, W, W, W, O, O, O, W, W], // 9

  // === BARIS 10-14: Area permukiman tengah ===
  [W, O, O, O, O, W, W, O, O, O, W, W, W, O, O, O, O, O, W, W, W, W, O, O, W, W, W, O, O, W, W, O, O, O, W, W, W, W, O, O, O, O, W, W, W, O, O, O, W, W], // 10
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W], // 11 ← Jalan E-W
  [W, W, O, O, O, O, W, W, O, O, O, O, W, W, W, O, O, O, O, W, W, O, O, O, W, W, W, O, O, O, W, W, O, O, O, O, W, W, O, O, O, W, W, O, O, O, O, W, W, W], // 12
  [W, W, O, O, O, O, W, W, O, O, O, O, W, W, W, O, O, O, O, W, W, O, O, O, W, W, W, O, O, O, W, W, O, O, O, O, W, W, O, O, O, W, W, O, O, O, O, W, W, W], // 13
  [W, W, O, O, O, O, W, W, O, O, O, O, W, W, W, O, O, O, O, W, W, O, O, O, W, W, W, O, O, O, W, W, O, O, O, O, W, W, O, O, O, W, W, O, O, O, O, W, W, W], // 14

  // === BARIS 15-19: Jalan utama dan area wisata ===
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W], // 15 ← Jalan utama E-W
  [W, W, O, O, O, W, W, W, O, O, O, W, W, O, O, O, W, W, W, O, O, O, W, W, W, W, W, W, O, O, O, W, W, O, O, O, W, W, W, O, O, O, W, W, O, O, O, W, W, W], // 16
  [W, W, O, O, O, W, W, W, O, O, O, W, W, O, O, O, W, W, W, O, O, O, W, W, W, W, W, W, O, O, O, W, W, O, O, O, W, W, W, O, O, O, W, W, O, O, O, W, W, W], // 17
  [W, W, O, O, O, W, W, W, O, O, O, W, W, O, O, O, W, W, W, O, O, O, W, W, W, W, W, W, O, O, O, W, W, O, O, O, W, W, W, O, O, O, W, W, O, O, O, W, W, W], // 18
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W], // 19 ← Jalan E-W

  // === BARIS 20-24: Area hotel dan restoran wisata ===
  [W, W, O, O, W, W, W, O, O, O, W, W, W, O, O, W, W, W, O, O, O, W, W, W, W, W, W, O, O, W, W, W, O, O, O, W, W, O, O, W, W, W, O, O, O, W, W, W, W, W], // 20
  [W, W, O, O, W, W, W, O, O, O, W, W, W, O, O, W, W, W, O, O, O, W, W, W, W, W, W, O, O, W, W, W, O, O, O, W, W, O, O, W, W, W, O, O, O, W, W, W, W, W], // 21
  [W, W, O, O, W, W, W, O, O, O, W, W, W, O, O, W, W, W, O, O, O, W, W, W, W, W, W, O, O, W, W, W, O, O, O, W, W, O, O, W, W, W, O, O, O, W, W, W, W, W], // 22
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W], // 23 ← Jalan E-W
  [W, W, W, O, O, O, W, W, W, O, O, O, W, W, W, W, O, O, O, W, W, W, W, W, W, W, W, W, O, O, O, W, W, W, O, O, O, W, W, W, O, O, O, W, W, W, W, W, W, W], // 24

  // === BARIS 25-29: Area warung pantai dan parkir ===
  [W, W, W, O, O, O, W, W, W, O, O, O, W, W, W, W, O, O, O, W, W, W, W, W, W, W, W, W, O, O, O, W, W, W, O, O, O, W, W, W, O, O, O, W, W, W, W, W, W, W], // 25
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W], // 26 ← Jalan E-W (jalan pantai)
  [W, W, O, O, W, W, W, O, O, W, W, W, O, O, W, W, W, O, O, W, W, W, O, O, W, W, W, O, O, W, W, W, O, O, W, W, W, O, O, W, W, W, O, O, W, W, W, W, W, W], // 27
  [W, W, O, O, W, W, W, O, O, W, W, W, O, O, W, W, W, O, O, W, W, W, O, O, W, W, W, O, O, W, W, W, O, O, W, W, W, O, O, W, W, W, O, O, W, W, W, W, W, W], // 28
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W], // 29 ← Jalan E-W

  // === BARIS 30-33: Transisi ke pantai — warung kecil ===
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W], // 30
  [W, W, O, W, W, W, O, W, W, W, O, W, W, W, O, W, W, W, O, W, W, W, O, W, W, W, O, W, W, W, O, W, W, W, O, W, W, W, O, W, W, W, O, W, W, W, O, W, W, W], // 31 warung kecil
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W], // 32
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W], // 33

  // === BARIS 34-39: ZONA RAWAN GENANGAN TSUNAMI ===
  [FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL], // 34 genangan ringan
  [FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL], // 35 genangan ringan
  [FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL,FL], // 36 genangan ringan
  [FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM], // 37 genangan sedang
  [FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM,FM], // 38 genangan sedang
  [FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH,FH], // 39 genangan berat (bibir pantai)
];


// ============================================================
// FUNGSI UTILITAS
// ============================================================

/**
 * Mengkonversi GRID_DATA menjadi weighted grid untuk algoritma A*.
 * 
 * Setiap sel berisi terrain cost-nya:
 *   - WALKABLE (0)     → 1       (jalan normal)
 *   - OBSTACLE (1)     → Infinity (tidak bisa dilalui)
 *   - FLOOD_LIGHT (2)  → 1.5     (genangan ringan)
 *   - FLOOD_MED (3)    → 2       (genangan sedang)
 *   - FLOOD_HEAVY (4)  → 3       (genangan berat)
 *   - GOAL (5)         → 1       (shelter, walkable normal)
 * 
 * A* menggunakan nilai ini sebagai pengali biaya langkah:
 *   biaya_aktual = base_cost × terrain_cost_tujuan
 * 
 * @returns {number[][]} Weighted grid (float/Infinity) untuk astar()
 */
export function getWeightGrid() {
  return GRID_DATA.map(row =>
    row.map(cell => TERRAIN_COST[cell] ?? 1)
  );
}

/**
 * @deprecated Gunakan getWeightGrid() — fungsi ini dipertahankan
 * untuk kompatibilitas mundur tes lama.
 * Mengembalikan grid biner 0/1 (Infinity dianggap 1 = obstacle).
 */
export function getAstarGrid() {
  return GRID_DATA.map(row =>
    row.map(cell => (TERRAIN_COST[cell] === Infinity) ? 1 : 0)
  );
}

/**
 * Mendapatkan posisi goal (TES) dari grid.
 * Mencari sel pertama bertipe GOAL di GRID_DATA.
 * Fallback ke MAP_META.goalPosition jika tidak ditemukan.
 * 
 * @returns {number[]} Koordinat [row, col] dari TES
 */
export function getGoalPosition() {
  for (let r = 0; r < GRID_DATA.length; r++) {
    for (let c = 0; c < GRID_DATA[r].length; c++) {
      if (GRID_DATA[r][c] === CELL_GOAL) {
        return [r, c];
      }
    }
  }
  // Fallback
  return MAP_META.goalPosition;
}

/**
 * Mengembalikan daftar shelter kandidat untuk skenario multi-shelter.
 *
 * @returns {object[]} Array shelter dengan { id, name, position, capacity, ... }
 */
export function getShelters() {
  return MAP_META.shelters;
}

/**
 * Mengecek apakah sebuah koordinat grid merupakan salah satu shelter.
 *
 * @param {number} row
 * @param {number} col
 * @returns {boolean}
 */
export function isShelterCell(row, col) {
  return getShelters().some(({ position }) =>
    position[0] === row && position[1] === col
  );
}

/**
 * Konversi koordinat grid [row, col] ke koordinat geografis approximate.
 * Dipakai untuk overlay OSM Progress 2.
 *
 * @param {number} row
 * @param {number} col
 * @returns {{ lat: number, lon: number }}
 */
export function gridToLatLon(row, col) {
  const { north, south, west, east } = MAP_META.mapBounds;
  const rowRatio = row / (MAP_META.rows - 1);
  const colRatio = col / (MAP_META.cols - 1);

  return {
    lat: north + (south - north) * rowRatio,
    lon: west + (east - west) * colRatio,
  };
}

/**
 * Konversi koordinat geografis approximate ke koordinat grid terdekat.
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {number[]} Koordinat [row, col]
 */
export function latLonToGrid(lat, lon) {
  const { north, south, west, east } = MAP_META.mapBounds;
  const rowRatio = (lat - north) / (south - north);
  const colRatio = (lon - west) / (east - west);

  const row = Math.round(rowRatio * (MAP_META.rows - 1));
  const col = Math.round(colRatio * (MAP_META.cols - 1));

  return [
    Math.max(0, Math.min(MAP_META.rows - 1, row)),
    Math.max(0, Math.min(MAP_META.cols - 1, col)),
  ];
}

/**
 * Menghitung jarak fisik sebenarnya dari sebuah path (array koordinat).
 * 
 * Ini berbeda dari totalCost A* — jarak fisik tidak mempedulikan
 * terrain cost, hanya menghitung panjang geometri jalur di grid.
 * 
 * Formula per langkah:
 *   - Kardinal (horizontal/vertikal): 1 sel × cellSizeMeters
 *   - Diagonal:                       √2 sel × cellSizeMeters
 * 
 * @param {number[][]} path - Array koordinat [[row,col], ...]
 * @returns {number} Jarak fisik dalam meter
 */
export function calcPhysicalDistance(path) {
  if (!path || path.length < 2) return 0;
  let dist = 0;
  for (let i = 1; i < path.length; i++) {
    const dr = Math.abs(path[i][0] - path[i-1][0]);
    const dc = Math.abs(path[i][1] - path[i-1][1]);
    // Diagonal jika dr dan dc keduanya 1, kardinal jika salah satu 0
    dist += (dr === 1 && dc === 1) ? Math.SQRT2 : 1;
  }
  return dist * MAP_META.cellSizeMeters;
}

/**
 * Menghitung estimasi waktu evakuasi berdasarkan JARAK FISIK.
 * 
 * Menggunakan jarak fisik (bukan totalCost A*) agar angka meter
 * dan menit yang ditampilkan mencerminkan jarak sesungguhnya di peta.
 * 
 * Formula:
 *   waktu_detik = jarak_fisik_meter / walkSpeedMps
 * 
 * @param {number} physicalMeters - Jarak fisik dalam meter (dari calcPhysicalDistance)
 * @returns {object} { seconds, minutes, formatted }
 */
export function estimateTimeFromDistance(physicalMeters) {
  const seconds = physicalMeters / MAP_META.walkSpeedMps;
  const minutes = seconds / 60;
  return {
    seconds: Math.round(seconds),
    minutes: parseFloat(minutes.toFixed(1)),
    formatted: minutes < 1
      ? `${Math.round(seconds)} detik`
      : `${minutes.toFixed(1)} menit`,
  };
}

/**
 * @deprecated — Fungsi ini menghitung waktu dari totalCost A* (weighted),
 * bukan dari jarak fisik. Ini menghasilkan angka "meter" yang bukan
 * jarak sesungguhnya. Gunakan calcPhysicalDistance() + estimateTimeFromDistance().
 * Dipertahankan untuk kompatibilitas tes lama.
 * 
 * @param {number} totalCost - Total cost dari hasil A* (dalam unit sel × terrain)
 * @returns {object} { meters, seconds, minutes, formatted }
 */
export function estimateEvacuationTime(totalCost) {
  const meters = totalCost * MAP_META.cellSizeMeters;
  const seconds = meters / MAP_META.walkSpeedMps;
  const minutes = seconds / 60;
  return {
    meters: Math.round(meters),
    seconds: Math.round(seconds),
    minutes: parseFloat(minutes.toFixed(1)),
    formatted: minutes < 1
      ? `${Math.round(seconds)} detik`
      : `${minutes.toFixed(1)} menit`,
  };
}

/**
 * Memeriksa apakah posisi [row, col] valid sebagai titik awal.
 * Titik awal harus walkable atau flood zone (bukan obstacle/goal).
 * 
 * @param {number} row 
 * @param {number} col 
 * @returns {boolean}
 */
export function isValidStart(row, col) {
  if (row < 0 || row >= MAP_META.rows || col < 0 || col >= MAP_META.cols) {
    return false;
  }
  const cost = TERRAIN_COST[GRID_DATA[row][col]];
  // Valid jika bisa dilalui (cost bukan Infinity) dan bukan sel goal/shelter
  return cost !== Infinity && GRID_DATA[row][col] !== CELL_GOAL && !isShelterCell(row, col);
}
