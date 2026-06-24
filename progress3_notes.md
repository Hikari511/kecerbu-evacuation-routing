# Progress 3 - A* pada Graph Jalan Wijayanto et al. (2025)

## Perubahan Utama

Progress 3 memindahkan routing utama dari grid simulasi ke weighted graph jalan:

```text
Progress 1-2:
state = sel grid [row, col]
tetangga = 8 arah
heuristik = Euclidean Distance

Progress 3:
state = vertex jalan V1-V31
tetangga = vertex yang terhubung edge
heuristik = Haversine Distance
```

Grid lama tetap dipertahankan sebagai mode pembanding.

## Dataset Jurnal

Sumber:

Wijayanto et al. (2025), *Tsunami Evacuation Route Optimization Based on
Megathrust Scenario Modeling in Pangandaran, West Java, Indonesia*.

Data yang digunakan:

- 31 vertex dari Table 3
- Koordinat latitude dan longitude setiap vertex
- Deskripsi persimpangan/titik jalan
- 47 baris edge dari Table 4
- 46 edge unik karena pasangan V28-V31 dicantumkan dua kali dengan arah terbalik
- V1 sebagai titik awal sektor timur
- V25 sebagai titik awal sektor barat
- V31 sebagai TES Pangandaran

## Cara Kerja A* Graph

```text
f(n) = g(n) + h(n)
```

- `g(n)`: total jarak edge dari titik awal ke vertex saat ini
- `h(n)`: Haversine Distance dari vertex saat ini ke TES V31
- `f(n)`: estimasi total jarak melalui vertex tersebut

Saat peta diklik, sistem mencari vertex terdekat dari titik klik. Proses ini
disebut nearest-node snapping.

## Hasil Validasi

### Sektor Timur

```text
V1 -> V2 -> V6 -> V11 -> V17 -> V22 -> V24 -> V30 -> V31
```

- Hasil A*: 1.093,94 meter
- Paper: sekitar 1.093 meter
- Estimasi waktu aplikasi: 26,25 menit
- Paper: 26,23 menit

### Sektor Barat

```text
V25 -> V26 -> V27 -> V28 -> V31
```

- Hasil A*: 532,68 meter
- Paper: sekitar 533 meter
- Estimasi waktu aplikasi: 12,78 menit
- Paper: 12,79 menit

Path A* sama dengan path Dijkstra pada paper untuk kedua skenario.

## Batasan

- Graph hanya mencakup 31 titik jalan terpilih dari paper.
- Graph belum mencakup seluruh jaringan OpenStreetMap Pangandaran.
- Goal graph saat ini hanya TES V31.
- Bobot edge masih berupa jarak jalan.
- Lebar jalan, kondisi permukaan, kepadatan, dan risiko genangan belum masuk
  ke bobot graph.

## Eksperimen Graph Pedestrian OSM

Pipeline OSMnx juga telah dijalankan pada jaringan jalan pejalan kaki yang
mencakup kandidat shelter Husa & Damayanti (2019).

Hasil pengambilan pada 21 Juni 2026:

```text
Node OSM: 2.405
Edge OSM: 6.236
Connected components: 8
Komponen terbesar: 2.378 node
Shelter lolos snapping <= 100 m: 8
Shelter gagal / belum terverifikasi: 16
```

Titik awal jurnal berhasil dihubungkan:

```text
V1  -> node OSM terdekat: 6,0 meter
V25 -> node OSM terdekat: 2,9 meter
```

Delapan shelter yang lolos audit dapat dicapai dari V1 maupun V25. Dalam
pengujian awal, A* memilih Pangandaran Mosque karena memiliki total jarak
pedestrian terendah:

```text
V1  -> Pangandaran Mosque: sekitar 572,5 meter
V25 -> Pangandaran Mosque: sekitar 226,6 meter
```

Top 3 hasil perhitungan:

```text
V1:
1. Pangandaran Mosque  - 572,5 m  - 13,74 menit
2. Tsunami Shelter BNPB - 1.152,0 m - 27,65 menit
3. SMKN 1 Pangandaran  - 2.186,0 m - 52,46 menit

V25:
1. Pangandaran Mosque  - 226,6 m  - 5,44 menit
2. Tsunami Shelter BNPB - 588,2 m - 14,12 menit
3. SMKN 1 Pangandaran  - 2.275,4 m - 54,61 menit
```

Kandidat ketiga pada kedua skenario melewati batas konservatif 40 menit.
Status ini ditampilkan pada kartu ranking di aplikasi.

Pemilihan tersebut baru berdasarkan jarak graph + jarak snapping. Hasil ini
belum menyatakan shelter tersebut paling aman karena kapasitas, elevasi,
status kelayakan, dan risiko ruas belum menjadi kriteria optimasi.

Koordinat yang belum memiliki URL bukti tetap harus disebut sebagai kandidat
geocoding, bukan koordinat resmi yang sudah tervalidasi.

## Laporan Hambatan dan Rute Alternatif

Mode OSM menyediakan fitur laporan hambatan tanpa dashboard admin. Laporan
berlaku sementara pada sesi browser:

```text
Pengguna menekan "Laporkan Hambatan"
-> pengguna mengklik ruas pada rute aktif
-> edge ruas tersebut dinonaktifkan dua arah
-> A* menghitung ulang semua kandidat shelter
-> rute dan ranking baru ditampilkan
```

Fitur ini dimaksudkan sebagai simulasi respons cepat terhadap pohon tumbang,
jalan tertutup, atau hambatan sementara. Laporan belum disimpan ke server dan
belum berlaku untuk pengguna lain.

Dalam pengujian V1, pemblokiran edge pertama rute mengubah hasil dari sekitar
572,5 meter menjadi 690,6 meter dan menghasilkan path alternatif.

## Kalimat Presentasi

> Pada Progress 3, routing utama mulai dipindahkan dari grid simulasi ke graph
> jalan berdasarkan data Wijayanto et al. 2025. Graph terdiri dari 31 vertex
> dan 46 edge unik berbobot jarak. Kami mengimplementasikan A* dengan
> heuristik Haversine, kemudian memvalidasinya terhadap hasil Dijkstra pada
> paper. Untuk sektor timur dan barat, A* menghasilkan urutan vertex yang sama
> dengan paper, dengan selisih jarak dan waktu yang sangat kecil akibat
> pembulatan.
