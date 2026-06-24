# PPT Progress 3 - EvaTour

## Slide 1 - Judul

**EvaTour: Pencarian Rute Evakuasi Tsunami Menggunakan A\***

Progress 3: Routing Graph Pedestrian OpenStreetMap, Multi-Shelter, dan Dynamic Obstacle

Nama Kelompok:

Mata Kuliah: Kecerdasan Buatan

Bidang: Searching

**Narasi:**

Pada Progress 3, EvaTour dikembangkan dari simulasi grid menjadi pencarian
rute pada graph jalan pedestrian yang sebenarnya. Algoritma A\* sekarang
berjalan pada jaringan OpenStreetMap, memilih rute menuju beberapa kandidat
shelter, dan dapat menghitung ulang rute ketika terdapat hambatan.

---

## Slide 2 - Rekap Perkembangan Proyek

| Tahap | Representasi | Perkembangan |
|---|---|---|
| Progress 1 | Grid 40 x 50 | A\*, obstacle, weighted terrain |
| Progress 2 | Grid + OSM overlay | Multi-shelter dan data Husa |
| Progress 3 | Graph jalan OSM | Routing pedestrian, snapping, obstacle dinamis |

**Narasi:**

Pengembangan dilakukan secara bertahap. Progress 1 digunakan untuk memahami
mekanisme A\* pada grid. Progress 2 menambahkan konteks geografis dan
multi-shelter. Pada Progress 3, state space utama dipindahkan ke graph jalan
pedestrian OpenStreetMap.

---

## Slide 3 - Permasalahan Progress 2

**Keterbatasan sistem sebelumnya:**

- Rute masih mengikuti sel grid.
- OSM hanya menjadi background visual.
- Jalur dapat melewati area yang bukan jalan sebenarnya.
- Node grid belum merepresentasikan persimpangan jalan.
- Koordinat pengguna belum dihubungkan ke jaringan pedestrian.

**Tujuan Progress 3:**

> Menjalankan A\* pada graph jalan nyata agar hasil pencarian mengikuti
> konektivitas jaringan pedestrian Pangandaran.

**Narasi:**

Walaupun Progress 2 sudah menampilkan peta Pangandaran, proses pencarian masih
dilakukan pada grid buatan. Karena itu, perubahan utama Progress 3 adalah
mengganti representasi pencarian dari grid menjadi graph jalan.

---

## Slide 4 - Perubahan State Space

### Progress 1-2

```text
State       = sel grid [row, col]
Neighbor    = 8 sel di sekitarnya
Edge cost   = jarak gerak x terrain cost
Heuristic   = Euclidean Distance
```

### Progress 3

```text
State       = node jalan OSM
Neighbor    = node yang terhubung oleh edge
Edge cost   = panjang ruas jalan dalam meter
Heuristic   = Haversine Distance
```

**Narasi:**

Konsep A\* tidak berubah. Perubahannya berada pada representasi masalah.
Sekarang node merepresentasikan titik penting jaringan jalan dan edge
merepresentasikan ruas pedestrian yang menghubungkan node-node tersebut.

---

## Slide 5 - Arsitektur Progress 3

```text
Data kandidat shelter dari jurnal
                +
Graph pedestrian OpenStreetMap
                |
                v
User memilih koordinat awal
                |
                v
Nearest-node snapping untuk start
                +
Edge snapping untuk shelter
                |
                v
A* dijalankan ke setiap shelter valid
                |
                v
Ranking berdasarkan total jarak
                |
                v
Visualisasi rute dan estimasi waktu
```

**Narasi:**

Posisi pengguna dan shelter awalnya berbentuk koordinat latitude-longitude.
Start dihubungkan ke node jalan terdekat, sedangkan shelter dihubungkan ke
ruas jalan terdekat lalu dibuatkan node virtual sebagai goal A\*.
Koordinat tersebut harus dihubungkan ke node graph terdekat melalui snapping.
Setelah itu, A\* dijalankan menuju setiap shelter yang lolos audit.

---

## Slide 6 - Graph Pedestrian OpenStreetMap

**Pipeline pengambilan data:**

- Library: OSMnx 2.1.0
- Sumber: OpenStreetMap melalui Overpass
- Network type: `walk`
- Graph berarah atau directed graph
- Seluruh connected component disimpan
- Dataset dibekukan untuk menjaga reproduktibilitas

**Hasil graph:**

| Informasi | Jumlah |
|---|---:|
| Node | 2.420 |
| Directed edge | 6.296 |
| Connected component | 8 |
| Node pada komponen terbesar | 2.393 |

**Narasi:**

Graph menggunakan tipe jaringan berjalan kaki. Satu ruas dua arah dapat
direpresentasikan sebagai dua directed edge. Dataset hasil pengambilan
disimpan dalam JSON sehingga demo tidak bergantung pada koneksi Overpass.

---

## Slide 7 - Graph Simplification

**Konfigurasi:** `simplify=True`

Node yang dipertahankan:

- Persimpangan
- Percabangan
- Dead-end
- Titik perubahan konektivitas

Node geometri di tengah ruas dapat digabung menjadi satu edge.

**Mengapa tetap valid?**

- Topologi dan konektivitas jalan dipertahankan.
- Panjang ruas tetap tersimpan sebagai bobot edge.
- Bentuk belokan jalan tetap tersimpan pada `geometry`.
- A\* mencari decision state, bukan setiap titik gambar jalan.

**Narasi:**

Jalan yang berbelok tidak harus memiliki node A\* pada setiap belokan.
Belokan visual dapat disimpan sebagai geometry edge. Node digunakan ketika
terjadi perubahan pilihan atau konektivitas pada jaringan.

---

## Slide 8 - Cara Kerja A* pada Graph

**Fungsi evaluasi:**

```text
f(n) = g(n) + h(n)
```

- `g(n)`: total panjang edge dari start menuju node `n`
- `h(n)`: estimasi Haversine dari node `n` menuju goal
- `f(n)`: estimasi total biaya rute melalui node `n`

**Cost setiap edge:**

```text
c(u,v) = panjang ruas OSM, jika dapat dilalui
c(u,v) = infinity / edge dihapus, jika terhambat

g(n) = jumlah seluruh c(u,v) pada path
```

**Estimasi waktu Progress 3:**

```text
kecepatan = 2,5 km/jam = 0,694 m/s
waktu = total jarak / kecepatan
```

**Alur pencarian:**

1. Start node dimasukkan ke open set.
2. Node dengan nilai `f(n)` terkecil dipilih.
3. Tetangga node diperiksa.
4. Nilai cost dan parent diperbarui jika ditemukan rute lebih baik.
5. Proses berhenti ketika goal ditemukan.
6. Path dibentuk kembali dari goal menuju start.

**Narasi:**

Nilai biaya sebenarnya berasal dari panjang jalan OSM, bukan jarak garis
lurus. Haversine hanya menjadi estimasi yang mengarahkan pencarian menuju
goal agar A\* lebih efisien daripada pencarian tanpa informasi. Kondisi ruas
pada prototype dimodelkan secara biner: ruas dapat dilalui dengan cost panjang
jalan, atau tidak dapat dilalui sehingga edge dikeluarkan dari graph.

---

## Slide 9 - Validasi Menggunakan Graph Wijayanto

**Sumber:**

Wijayanto et al. (2025), *Tsunami Evacuation Route Optimization Based on
Megathrust Scenario Modeling in Pangandaran, West Java, Indonesia*.

**Data validasi:**

- 31 vertex jalan
- 46 edge unik berbobot jarak
- V1 sebagai start sektor timur
- V25 sebagai start sektor barat
- V31 sebagai TES tujuan
- Hasil A\* dibandingkan dengan rute Dijkstra pada paper

**Narasi:**

Sebelum menggunakan graph OSM yang lebih besar, implementasi A\* divalidasi
pada graph yang dapat direproduksi dari paper Wijayanto. Tujuannya untuk
memastikan algoritma menghasilkan jalur optimal pada data referensi.

---

## Slide 10 - Hasil Validasi Wijayanto

### Sektor Timur

```text
V1 -> V2 -> V6 -> V11 -> V17 -> V22 -> V24 -> V30 -> V31
```

- Jarak A\*: 1.093,94 meter
- Waktu: 26,25 menit
- Path sama dengan hasil paper

### Sektor Barat

```text
V25 -> V26 -> V27 -> V28 -> V31
```

- Jarak A\*: 532,68 meter
- Waktu: 12,78 menit
- Path sama dengan hasil paper

**Kesimpulan:**

> A\* menghasilkan path optimal yang sama dengan Dijkstra pada kedua skenario.

**Narasi:**

Perbedaan angka yang sangat kecil dengan paper berasal dari pembulatan. Hasil
ini menunjukkan implementasi A\* pada graph bekerja secara konsisten dengan
algoritma shortest path yang digunakan sebagai pembanding.

---

## Slide 11 - Snapping Start dan Shelter

**Masalah:**

Koordinat klik pengguna dan koordinat shelter belum tentu tepat berada pada
state graph.

**Solusi:**

```text
Koordinat user
      |
      v
Hitung jarak ke node-node OSM
      |
      v
Pilih node terdekat sebagai start A*
```

Untuk shelter digunakan edge snapping:

```text
Koordinat shelter
      |
      v
Cari ruas jalan OSM terdekat
      |
      v
Buat node virtual pada ruas tersebut sebagai goal A*
```

**Contoh hasil snapping titik jurnal:**

| Titik awal | Jarak ke node OSM |
|---|---:|
| V1, Pantai Timur | sekitar 6,0 m |
| V25, Pantai Barat | sekitar 2,9 m |

**Narasi:**

Snapping adalah proses memetakan koordinat geografis ke state yang tersedia
dalam graph. Start menggunakan nearest-node snapping karena titik awal bisa
dipilih bebas oleh pengguna. Shelter menggunakan edge snapping agar kandidat
yang berada di tengah ruas jalan tidak ditolak hanya karena jauh dari
persimpangan.

---

## Slide 12 - Audit Kandidat Shelter

**Sumber kandidat:**

Husa & Damayanti (2019), Table 3 dan Table 4.

**Komposisi data Husa & Damayanti:**

- 8 existing shelter dari Table 3
- 16 potential shelter dari Table 4
- Total 24 kandidat shelter

Pada Progress 2, simulasi grid hanya menggunakan 1 existing shelter utama
dan 16 potential shelter, sehingga jumlah yang ditampilkan saat itu adalah
17. Progress 3 mengaudit seluruh 24 kandidat dari kedua tabel.

Wijayanto et al. (2025) tidak menambahkan daftar shelter baru. Paper tersebut
digunakan untuk graph validasi V1-V31, titik awal V1 dan V25, serta koordinat
TES V31 yang identik dengan Tsunami Shelter BNPB pada data Husa.

**Kriteria penggunaan dalam routing:**

1. Memiliki koordinat yang dapat digunakan.
2. Jarak snapping ke ruas pedestrian maksimal 100 meter.
3. Berada pada graph yang dapat dicapai dari start.
4. Memiliki node tujuan yang valid.

**Hasil audit:**

| Status | Jumlah |
|---|---:|
| Existing shelter Husa, Table 3 | 8 |
| Potential shelter Husa, Table 4 | 16 |
| Total kandidat yang diaudit | 24 |
| Lolos audit | 15 |
| Ditolak atau belum terverifikasi | 9 |

**Narasi:**

Tidak semua kandidat langsung digunakan. Kandidat tanpa koordinat atau terlalu
jauh dari jaringan pedestrian ditolak agar goal A\* tidak dipaksakan ke ruas
jalan yang tidak merepresentasikan akses shelter secara wajar.

---

## Slide 13 - Multi-Shelter dan Ranking

**Proses pemilihan:**

```js
for each valid shelter:
  route = astar(graph, startNode, shelterNode)
  totalDistance =
    startSnapDistance +
    route.graphCost +
    shelterSnapDistance

urutkan route berdasarkan totalDistance
```

**Rumus total jarak:**

```text
Total = snap awal + jarak graph + snap shelter
```

**Catatan penting:**

- Shelter terbaik berarti rute pedestrian terpendek.
- Ranking belum mempertimbangkan kapasitas, elevasi, dan tingkat keamanan.
- Sistem tidak mengklaim shelter teratas sebagai shelter paling aman.

**Narasi:**

A\* dijalankan secara terpisah ke semua shelter yang valid. Hasil kemudian
diurutkan berdasarkan total jarak perjalanan, termasuk jarak snapping pada
posisi awal dan shelter.

---

## Slide 14 - Hasil Eksperimen Multi-Shelter

### Dari V1, Pantai Timur

| Ranking | Shelter | Jarak | Waktu |
|---:|---|---:|---:|
| 1 | Pangandaran Mosque | 559,6 m | 13,43 menit |
| 2 | Tsunami Shelter BNPB | 1.158,1 m | 27,79 menit |
| 3 | SMKN 1 Pangandaran | 2.157,1 m | 51,77 menit |

### Dari V25, Pantai Barat

| Ranking | Shelter | Jarak | Waktu |
|---:|---|---:|---:|
| 1 | Pangandaran Mosque | 234,2 m | 5,62 menit |
| 2 | Tsunami Shelter BNPB | 594,3 m | 14,26 menit |
| 3 | SMKN 1 Pangandaran | 2.246,5 m | 53,92 menit |

**Narasi:**

Pangandaran Mosque memperoleh total jarak terpendek pada kedua titik awal.
Hasil ini merupakan ranking jarak pada graph, bukan validasi bahwa lokasi
tersebut paling aman terhadap seluruh skenario tsunami.

---

## Slide 15 - Dynamic Obstacle dan Re-Routing

**Skenario:**

Terdapat pohon tumbang atau ruas jalan yang tidak dapat dilewati.

**Proses sistem:**

```text
User mengaktifkan mode laporan
          |
          v
User memilih edge pada rute
          |
          v
Edge dinonaktifkan dua arah
          |
          v
A* dijalankan ulang
          |
          v
Rute dan ranking diperbarui
```

**Hasil pengujian V1:**

```text
Sebelum hambatan: 559,6 meter
Setelah hambatan: 677,7 meter
```

Path setelah perhitungan ulang berbeda dari path awal.

**Narasi:**

Fitur hambatan menunjukkan bahwa A\* dapat bekerja pada graph yang berubah.
Ketika edge ditutup, edge tersebut dikeluarkan dari pilihan successor dan
A\* mencari jalur alternatif yang masih tersedia.

---

## Slide 16 - Pengujian Sistem

**Pengujian yang telah dilakukan:**

- A\* dasar dan corner cutting
- Weighted terrain
- Grid dan preset scenario
- Explored nodes
- Graph Wijayanto
- Path sektor timur dan barat
- Graph OSM dan jumlah data
- Reachability 15 shelter
- Urutan ranking multi-shelter
- Dynamic obstacle dan re-routing

**Hasil pengujian saat ini:**

```text
254 test pass
0 fail
```

**Validasi tambahan:**

- A\* dibandingkan dengan Dijkstra pada 66 pasangan node.
- Tidak ditemukan perbedaan biaya rute.
- Heuristik Haversine konsisten terhadap edge pada graph yang digunakan.

**Narasi:**

Pengujian tidak hanya memeriksa apakah rute tampil, tetapi juga memastikan
urutan path, total cost, konektivitas shelter, ranking, dan perubahan rute
setelah edge diblokir.

---

## Slide 17 - Perbandingan Progress 2 dan Progress 3

| Aspek | Progress 2 | Progress 3 |
|---|---|---|
| State | Sel grid | Node jalan OSM |
| Edge | Gerak 8 arah | Ruas pedestrian |
| Heuristik | Euclidean | Haversine |
| OSM | Background | Sumber graph routing |
| Posisi awal | Sel yang diklik | Koordinat yang di-snap |
| Goal | Shelter pada grid | Node shelter OSM |
| Hambatan | Obstacle statis | Edge dapat ditutup dinamis |
| Jalur | Mengikuti grid | Mengikuti geometry jalan |

**Narasi:**

Progress 3 bukan sekadar perubahan visual. State space, neighbor, cost, dan
cara menghubungkan posisi pengguna ke graph telah berubah menjadi
representasi jaringan jalan.

---

## Slide 18 - Batasan Penelitian

**Batasan saat ini:**

- Ranking hanya berdasarkan jarak pedestrian.
- Belum mengoptimalkan elevasi, kapasitas, kepadatan, atau risiko ruas.
- Beberapa koordinat shelter masih berupa hasil geocoding yang perlu sumber.
- Edge snapping tidak membuktikan konektor pendek ke shelter dapat dilewati
  secara fisik.
- Hambatan hanya berlaku pada sesi browser.
- Data OSM dapat memiliki kekurangan pemetaan.
- Sistem merupakan prototype akademik, bukan panduan keselamatan resmi.

**Pernyataan hasil yang aman:**

> Sistem mencari rute pedestrian terpendek menuju kandidat shelter yang lolos
> audit data, bukan menentukan shelter yang paling aman.

**Narasi:**

Batasan ini penting agar hasil tidak diklaim melebihi data yang digunakan.
Kontribusi utama proyek berada pada implementasi dan evaluasi A\* sebagai
algoritma pencarian rute.

---

## Slide 19 - Demo Aplikasi

**Urutan demo yang disarankan:**

1. Buka mode Routing OSM.
2. Jelaskan node dan edge secara singkat.
3. Klik posisi wisatawan di dekat pantai.
4. Tunjukkan snapping dari titik klik ke node jalan.
5. Tunjukkan rute A\* dan shelter terpilih.
6. Tunjukkan Top 3 ranking shelter.
7. Aktifkan tampilan node sebagai mode debugging.
8. Laporkan hambatan pada rute aktif.
9. Tunjukkan rute dan ranking yang dihitung ulang.
10. Buka mode Validasi Jurnal untuk menunjukkan bukti hasil.

**Tips demo:**

- Gunakan preset Pantai Timur jika klik manual berisiko.
- Node OSM disembunyikan secara default.
- Jangan terlalu lama berada pada log teknis.
- Tekankan perubahan rute setelah edge ditutup.

---

## Slide 20 - Kesimpulan Progress 3

**Hasil utama:**

- State space berhasil dimigrasikan dari grid ke graph jalan.
- Graph pedestrian OSM berisi 2.420 node dan 6.296 edge.
- A\* menggunakan bobot panjang jalan dan heuristik Haversine.
- Implementasi divalidasi menggunakan graph Wijayanto.
- Sistem mendukung nearest-node snapping untuk start dan edge snapping untuk shelter.
- Sistem mendukung multi-shelter dan ranking.
- Sistem dapat menghitung ulang rute setelah dynamic obstacle.
- Seluruh pengujian utama lulus.

**Narasi penutup:**

Progress 3 menyelesaikan tujuan utama proyek dari sudut pandang AI Searching.
A\* telah diterapkan pada graph jalan nyata, divalidasi dengan data paper,
dan diuji pada kondisi graph statis maupun graph yang berubah.

---

# Q&A yang Mungkin Ditanyakan Dosen

## Q1. Mengapa menggunakan A*, bukan Dijkstra?

Dijkstra menentukan shortest path hanya berdasarkan biaya yang sudah
ditempuh. A\* menambahkan heuristik menuju goal sehingga pencarian dapat lebih
terarah. Dengan heuristik yang admissible dan consistent, A\* tetap memberikan
solusi optimal.

## Q2. Apa yang menjadi node dan edge?

Node merepresentasikan titik penting pada topologi jalan, seperti persimpangan,
percabangan, dan dead-end. Edge merepresentasikan ruas pedestrian yang
menghubungkan dua node.

## Q3. Mengapa jumlah node pada rute terlihat sedikit?

Graph menggunakan topology simplification. Titik yang hanya membentuk geometri
belokan dan tidak mengubah konektivitas digabungkan menjadi geometry edge.
A\* memerlukan node keputusan, bukan node pada setiap titik gambar jalan.

## Q4. Apakah rute antara dua node menjadi garis lurus?

Tidak. Biaya `g(n)` menggunakan panjang ruas jalan OSM dan visualisasi
menggunakan geometry edge. Haversine hanya digunakan sebagai estimasi
heuristik menuju goal.

## Q5. Mengapa menggunakan Haversine?

Node OSM memiliki latitude dan longitude. Haversine mengestimasi jarak
permukaan bumi antara node saat ini dan goal. Nilainya tidak melebihi jarak
jalan sebenarnya sehingga sesuai sebagai heuristik A\* berbasis jarak.

## Q6. Apa itu snapping?

Snapping adalah proses memetakan koordinat geografis ke graph. Start memakai
nearest-node snapping, sedangkan shelter memakai edge snapping dengan node
virtual pada ruas jalan terdekat. A\* hanya dapat dimulai dan diakhiri pada
state yang tersedia dalam graph.

## Q7. Apakah shelter terdekat secara koordinat pasti dipilih?

Tidak. Sistem membandingkan total jarak yang mengikuti graph jalan. Shelter
yang dekat secara garis lurus dapat memiliki rute lebih jauh karena
konektivitas jalan.

## Q8. Bagaimana A* memilih dari beberapa shelter?

A\* dijalankan ke setiap shelter yang valid. Hasilnya diurutkan berdasarkan
jarak snapping awal, biaya graph, dan jarak snapping shelter.

## Q9. Apakah shelter ranking pertama merupakan shelter paling aman?

Belum tentu. Ranking saat ini hanya menunjukkan rute pedestrian terpendek.
Kapasitas, elevasi, risiko tsunami, dan kondisi bangunan belum menjadi fungsi
objektif.

## Q10. Apa yang terjadi jika shelter tidak terhubung?

Jika goal berada pada connected component yang berbeda, A\* tidak dapat
menemukan path. Kandidat tersebut tidak dimasukkan sebagai hasil yang dapat
dicapai.

## Q11. Bagaimana dynamic obstacle bekerja?

Edge yang dilaporkan terhambat dimasukkan ke daftar blocked edge. Saat A\*
dijalankan ulang, edge tersebut tidak diberikan sebagai successor sehingga
algoritma mencari jalur lain.

## Q12. Apakah hambatan mengubah heuristik?

Tidak. Hambatan mengubah edge yang dapat digunakan dan nilai rute aktual.
Heuristik Haversine tetap menjadi estimasi jarak langsung menuju goal.

## Q13. Bagaimana membuktikan hasil A* optimal?

Path pada graph Wijayanto sama dengan hasil Dijkstra paper. A\* juga
dibandingkan dengan Dijkstra pada sejumlah pasangan node OSM dan menghasilkan
biaya yang sama.

## Q14. Mengapa menggunakan `simplify=True`?

Karena node geometri yang tidak menambah keputusan pencarian hanya memperbesar
state space. Simplification mempertahankan topologi, panjang, atribut, dan
geometry jalan sehingga valid untuk shortest-path routing.

## Q15. Mengapa node OSM disembunyikan secara default?

Node tetap digunakan oleh A\*, tetapi disembunyikan agar jalur mudah dibaca.
Node dapat ditampilkan dalam mode debugging ketika menjelaskan state space.

## Q16. Apa kontribusi AI dari proyek ini?

Kontribusi utamanya adalah formulasi masalah evakuasi sebagai informed search:
representasi state dalam graph, successor dari konektivitas jalan, path cost
dari panjang edge, heuristic Haversine, multi-goal evaluation, dan re-planning
ketika graph berubah.

---

# Kalimat Inti yang Perlu Diingat

> Pada Progress 3, kami memindahkan state space A\* dari grid simulasi ke graph
> pedestrian OpenStreetMap. Node merepresentasikan titik penting konektivitas
> jalan, edge merepresentasikan ruas berbobot jarak, dan Haversine digunakan
> sebagai heuristik. Implementasi divalidasi menggunakan graph Wijayanto,
> kemudian diperluas dengan snapping koordinat ke graph, multi-shelter ranking,
> dan perhitungan ulang rute saat edge terhambat.

> Hasil sistem adalah rute pedestrian terpendek menuju kandidat shelter yang
> lolos audit, bukan klaim mengenai shelter yang paling aman.
