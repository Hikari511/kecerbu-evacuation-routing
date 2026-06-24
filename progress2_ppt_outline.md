# PPT Progress 2 - EvaTour

## Slide 1 - Judul

**EvaTour: Aplikasi Pencarian Rute Evakuasi Tsunami Berbasis A\***

Progress 2: OSM Background, Grid Overlay, dan Multi-Shelter Berbasis Jurnal

Nama Kelompok:

Mata Kuliah: Kecerdasan Buatan

Bidang: Searching

**Narasi:**

Pada progress kedua ini, kami mengembangkan EvaTour dari prototipe grid simulasi menjadi sistem yang mulai dikaitkan dengan konteks geografis nyata menggunakan OpenStreetMap. Selain itu, kami menambahkan multi-shelter berdasarkan referensi jurnal.

---

## Slide 2 - Recap Progress 1

**Progress 1 yang sudah selesai:**

- Grid simulasi 40 x 50
- Algoritma A\* pathfinding
- Heuristik Euclidean Distance
- Obstacle detection
- Weighted terrain
- Visualisasi jalur evakuasi
- Estimasi jarak dan waktu
- Visualisasi explored nodes

**Narasi:**

Pada Progress 1, fokus kami adalah membuktikan bahwa algoritma A\* dapat berjalan dengan benar pada representasi grid. Setiap sel grid menjadi state, posisi user menjadi initial state, dan TES menjadi goal state.

---

## Slide 3 - Keterbatasan Progress 1

**Keterbatasan sebelumnya:**

- Peta masih berupa grid abstrak.
- Belum ada konteks geografis Pangandaran.
- Goal hanya satu shelter.
- Shelter belum mengacu langsung ke data jurnal.
- Jalur belum divisualisasikan bersama peta nyata.

**Narasi:**

Walaupun algoritma sudah berjalan, tampilan pada Progress 1 masih terlihat seperti simulasi murni. Karena itu pada Progress 2 kami mulai menambahkan konteks OpenStreetMap dan data shelter dari jurnal.

---

## Slide 4 - Tujuan Progress 2

**Tujuan Progress 2:**

- Menambahkan OpenStreetMap sebagai background geografis.
- Menampilkan grid 40 x 50 sebagai overlay di atas OSM.
- Menambahkan multi-shelter.
- Menggunakan data shelter dari Husa & Damayanti (2019).
- Menjaga algoritma A\* tetap stabil.

**Narasi:**

Progress 2 bukan langsung mengubah sistem menjadi routing jalan OSM asli. Progress 2 adalah tahap transisi: grid tetap menjadi state space A\*, tetapi mulai dikaitkan dengan peta nyata dan referensi shelter dari jurnal.

---

## Slide 5 - Arsitektur Progress 2

```text
OpenStreetMap Pangandaran
        +
Grid Overlay 40 x 50
        |
        v
User memilih posisi awal
        |
        v
A* dijalankan ke semua shelter
        |
        v
Sistem memilih shelter dengan total cost terendah
        |
        v
Rute divisualisasikan pada grid
```

**Narasi:**

Pada arsitektur ini, OSM berfungsi sebagai konteks visual. Grid tetap menjadi dasar komputasi A\*. Ketika user memilih posisi awal, sistem menjalankan A\* ke semua shelter kandidat, lalu memilih hasil terbaik.

---

## Slide 6 - OSM Background + Grid Overlay

**Konsep:**

- OSM digunakan sebagai background peta Pangandaran.
- Grid 40 x 50 diletakkan di atas peta sebagai overlay.
- Setiap sel grid tetap menjadi state untuk A\*.
- Bounding box digunakan untuk menghubungkan grid dengan koordinat geografis.

**Bounding box:**

```js
mapBounds: {
  north: -7.6800,
  south: -7.7050,
  west: 108.6400,
  east: 108.6750
}
```

**Narasi:**

Agar grid bisa ditempelkan ke OSM, kami menentukan bounding box, yaitu batas utara, selatan, barat, dan timur wilayah simulasi. Dengan ini, koordinat grid dapat dikonversi menjadi latitude dan longitude secara approximate.

---

## Slide 7 - Multi-Shelter Berbasis Jurnal

**Sumber data shelter:**

Husa & Damayanti (2019), *Evacuation route and evacuation shelter planning for tsunami hazard in Pangandaran District*

**Data yang digunakan:**

- 1 existing shelter: Tsunami Shelter BNPB / TES Pangandaran
- 16 potential shelters dari Table 4
- Informasi: nama shelter, desa, distrik, elevasi, dan kapasitas

**Contoh shelter:**

- SMPN 1 Pangandaran, kapasitas 3.221 jiwa
- SMKN 1 Pangandaran, kapasitas 2.872 jiwa
- Puskesmas Cikembulan, kapasitas 725 jiwa
- Parigi Market, kapasitas 1.482 jiwa

**Narasi:**

Pada Progress 2, shelter tidak lagi berupa dummy. Kami memasukkan 17 shelter kandidat yang mengacu pada data jurnal Husa & Damayanti. Posisi pada grid masih approximate karena tabel jurnal tidak menyediakan koordinat GPS detail.

---

## Slide 8 - Cara A* Memilih Shelter Terbaik

**Langkah pemilihan:**

1. User memilih posisi awal.
2. Sistem menjalankan A\* ke shelter 1.
3. Sistem menjalankan A\* ke shelter 2.
4. Proses diulang sampai semua shelter diuji.
5. Shelter dengan `totalCost` terkecil dipilih.

**Pseudo-code:**

```js
for each shelter:
  result = astar(grid, start, shelter.position)
  pilih result dengan totalCost terkecil
```

**Narasi:**

Algoritma A\* tidak kami ubah. Yang berubah adalah cara pemanggilannya. Sebelumnya A\* hanya dijalankan ke satu TES, sekarang A\* dijalankan ke semua shelter kandidat.

---

## Slide 9 - Weighted Terrain Tetap Digunakan

**Terrain cost:**

| Terrain | Cost |
|---|---:|
| Jalan / area terbuka | 1 |
| Genangan ringan | 1.5 |
| Genangan sedang | 2 |
| Genangan berat | 3 |
| Obstacle | Infinity |

**Rumus biaya gerak:**

```text
biaya = base movement cost x terrain cost tujuan
```

**Narasi:**

Weighted terrain tetap digunakan agar A\* tidak hanya mencari rute terpendek secara jarak, tetapi juga mempertimbangkan tingkat kesulitan medan seperti genangan.

---

## Slide 10 - Perbandingan Progress 1 dan Progress 2

| Aspek | Progress 1 | Progress 2 |
|---|---|---|
| Visual peta | Grid saja | OSM + grid overlay |
| Shelter | 1 TES | 17 shelter kandidat |
| Sumber shelter | Simulasi | Husa & Damayanti (2019) |
| Goal state | Tunggal | Multi-shelter |
| Pemilihan rute | A\* ke satu tujuan | A\* ke semua shelter, pilih cost terendah |
| Akurasi geografis | Abstrak | Mulai dikaitkan dengan OSM |

**Narasi:**

Perubahan terbesar pada Progress 2 adalah penambahan konteks geografis dan multi-shelter. Sistem belum sepenuhnya routing jalan OSM, tetapi sudah menjadi fondasi menuju graph-based routing pada tahap berikutnya.

---

## Slide 11 - Demo Aplikasi

**Langkah demo:**

1. Tampilkan OSM background + grid overlay.
2. Tunjukkan shelter bernomor.
3. Klik salah satu titik awal di zona pantai.
4. Tunjukkan rute oranye.
5. Tunjukkan shelter terbaik di panel informasi.
6. Jelaskan total cost, jarak, waktu, dan node dieksplorasi.

**Narasi:**

Pada demo, marker hijau bernomor menunjukkan shelter kandidat dari jurnal. Ketika posisi user dipilih, sistem mencari rute ke semua shelter dan memilih shelter terbaik berdasarkan total cost A\*.

---

## Slide 12 - Hasil Pengujian

**Pengujian yang dilakukan:**

- A\* dasar
- Weighted terrain
- Validasi grid
- Explored nodes
- Preset skenario
- Progress 2: OSM metadata dan multi-shelter

**Hasil:**

```text
207 test pass
0 fail
```

**Narasi:**

Setelah penambahan OSM overlay dan multi-shelter, seluruh pengujian tetap lulus. Ini menunjukkan perubahan Progress 2 tidak merusak algoritma A\* yang sudah stabil pada Progress 1.

---

## Slide 13 - Batasan Progress 2

**Batasan saat ini:**

- OSM masih digunakan sebagai background, bukan graph routing.
- Jalur masih mengikuti grid, belum mengikuti jalan OSM asli.
- Posisi shelter pada grid masih approximate.
- Belum ada GPS real-time.
- Belum memperhitungkan kepadatan manusia.

**Narasi:**

Kami tetap membedakan antara OSM sebagai background dan OSM sebagai graph routing. Pada Progress 2, OSM baru digunakan sebagai konteks geografis. Untuk routing jalan asli, representasi harus diubah menjadi graph jalan.

---

## Slide 14 - Rencana Progress 3

**Rencana selanjutnya:**

- Mulai membuat graph jalan berbasis OSM atau graph manual.
- Node merepresentasikan persimpangan/titik jalan.
- Edge merepresentasikan ruas jalan.
- Shelter dari jurnal dicocokkan ke node jalan terdekat.
- Rute digambar sebagai polyline di atas OSM.

**Narasi:**

Progress 3 akan diarahkan ke routing yang lebih realistis. Konsep A\* tetap sama, tetapi state space akan mulai dipindahkan dari grid ke graph jalan.

---

## Slide 15 - Kesimpulan

**Kesimpulan Progress 2:**

- EvaTour berkembang dari grid simulasi menjadi sistem dengan konteks OSM.
- Sistem mendukung multi-shelter.
- Shelter mengacu pada jurnal Husa & Damayanti (2019).
- A\* tetap stabil dan seluruh test lulus.
- Progress 2 menjadi fondasi menuju routing graph OSM.

**Narasi penutup:**

Progress 2 memperluas EvaTour dari sisi data dan visualisasi. Sistem belum sepenuhnya routing jalan OSM, tetapi sudah memiliki pondasi untuk migrasi ke graph jalan pada tahap berikutnya.

---

# Q&A yang Mungkin Ditanyakan Dosen

## Q1. Apakah rute sudah mengikuti jalan OSM?

Belum. Pada Progress 2, OSM digunakan sebagai background geografis. Rute masih dihitung pada grid 40 x 50. Routing jalan OSM asli akan membutuhkan representasi graph dan direncanakan untuk tahap berikutnya.

## Q2. Kenapa tidak langsung memakai graph OSM?

Karena perubahan dari grid ke graph cukup besar. Kami memilih pengembangan bertahap agar algoritma A\* yang sudah stabil tetap dapat dipertahankan sambil menambahkan konteks geografis dan multi-shelter.

## Q3. Apakah posisi shelter sudah presisi?

Belum sepenuhnya. Nama, elevasi, distrik, dan kapasitas shelter mengacu pada jurnal Husa & Damayanti (2019), tetapi posisi pada grid masih approximate karena tabel jurnal tidak menyediakan koordinat GPS detail.

## Q4. Bagaimana A* memilih shelter terbaik?

A\* dijalankan ke semua shelter kandidat. Sistem memilih shelter dengan total cost terkecil, bukan sekadar jarak garis lurus terdekat.

## Q5. Apa kontribusi Progress 2?

Kontribusi Progress 2 adalah menambahkan konteks OpenStreetMap, menambahkan data multi-shelter dari jurnal, dan memperluas goal state dari satu TES menjadi banyak shelter kandidat.
