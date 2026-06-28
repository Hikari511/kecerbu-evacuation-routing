# Outline PPT Demo Akhir EvaTour - 5 Menit

## Slide 1 - Judul

**EvaTour: A\* Routing untuk Evakuasi Tsunami Pangandaran**

Isi slide:

- Nama kelompok / anggota
- Mata kuliah Kecerdasan Buatan
- Fokus: Searching / A\*

Narasi:

> Project ini mengimplementasikan algoritma A\* untuk mencari rute evakuasi
> tsunami menuju shelter di kawasan Pangandaran.

Estimasi waktu: 20 detik

---

## Slide 2 - Masalah dan Tujuan

Isi slide:

- Wisatawan membutuhkan rute evakuasi menuju shelter saat kondisi darurat.
- Rute harus mengikuti jaringan jalan, bukan garis lurus.
- Tujuan project: menerapkan A\* untuk mencari rute terpendek menuju shelter.

Narasi:

> Masalah utama yang kami angkat adalah bagaimana menentukan rute evakuasi
> berdasarkan jaringan jalan yang dapat dilalui.

Estimasi waktu: 35 detik

---

## Slide 3 - Perkembangan Project

Isi slide:

| Progress | Representasi | Hasil |
|---|---|---|
| Progress 1 | Grid 40x50 | A\* dasar, obstacle, weighted terrain |
| Progress 2 | OSM background + grid | Visual lebih kontekstual dengan lokasi Pangandaran |
| Progress 3 | Graph pedestrian OSM | Routing jalan nyata, multi-shelter, obstacle dinamis |

Narasi:

> Progress 3 menjadi versi utama karena state space A\* sudah berupa graph
> jalan OpenStreetMap, bukan lagi hanya grid simulasi.

Estimasi waktu: 40 detik

---

## Slide 4 - Metode A\*

Isi slide:

```text
f(n) = g(n) + h(n)
```

Penjelasan:

- `g(n)`: jarak aktual dari start ke node saat ini.
- `h(n)`: estimasi jarak ke goal menggunakan Haversine.
- `f(n)`: nilai prioritas node yang dieksplorasi A\*.

Representasi graph:

- State: node jalan OSM.
- Edge: ruas jalan pedestrian.
- Cost: panjang ruas jalan dalam meter.
- Heuristic: Haversine karena node memakai latitude-longitude.

Narasi:

> Karena data OSM menggunakan koordinat latitude-longitude, heuristik yang
> digunakan adalah Haversine. Cost aktual tetap berasal dari panjang edge jalan.

Estimasi waktu: 55 detik

---

## Slide 5 - Data dan Audit Shelter

Isi slide:

```text
Graph OSM: 2.420 node, 6.296 directed edge
Kandidat shelter: 24
Shelter lolos audit: 15
Shelter belum digunakan sebagai goal: 9
```

Metode audit:

- Start/user point: nearest-node snapping.
- Shelter: edge snapping.
- Threshold shelter: maksimal 100 m dari ruas pedestrian OSM.

Narasi:

> Pada versi terbaru, shelter menggunakan edge snapping. Artinya, koordinat
> shelter tidak harus dekat dengan node persimpangan, tetapi cukup dekat dengan
> ruas jalan pedestrian. Setelah verifikasi ulang, 15 shelter dapat digunakan
> sebagai goal A\*.

Estimasi waktu: 55 detik

---

## Slide 6 - Fitur Demo

Isi slide:

- Pengguna dapat klik titik awal wisatawan pada peta.
- Sistem melakukan snapping start ke node OSM terdekat.
- A\* dijalankan ke semua shelter yang lolos audit.
- Sistem menampilkan rute dan ranking shelter.
- Dynamic obstacle: ruas jalan dapat diblokir.
- A\* menghitung ulang rute alternatif.

Narasi:

> Jika ada hambatan seperti jalan tertutup atau pohon tumbang, edge tersebut
> dikeluarkan dari graph. Setelah itu, A\* dijalankan ulang untuk mencari rute
> alternatif yang masih tersedia.

Estimasi waktu: 60 detik

---

## Slide 7 - Hasil dan Kesimpulan

Isi slide:

```text
Pengujian otomatis: 259 pass, 0 fail
```

Hasil utama:

- A\* berhasil berjalan pada graph pedestrian OSM.
- Multi-shelter ranking berhasil.
- Dynamic obstacle dan re-routing berhasil.
- Validasi terhadap graph Wijayanto berhasil.

Batasan:

- Ranking masih berdasarkan jarak pedestrian terpendek.
- Risiko, elevasi, dan kapasitas belum masuk fungsi cost.
- Sistem masih prototype akademik, bukan panduan evakuasi resmi.

Kesimpulan:

> Prototype ini sudah memenuhi fokus AI Searching karena menerapkan A\* pada
> graph jalan, menggunakan heuristic, mengevaluasi multi-goal, dan menghitung
> ulang rute ketika graph berubah.

Estimasi waktu: 35 detik

---

# Pembagian Waktu

```text
Slide 1: 20 detik
Slide 2: 35 detik
Slide 3: 40 detik
Slide 4: 55 detik
Slide 5: 55 detik
Slide 6: 60 detik
Slide 7: 35 detik
Total: 300 detik / 5 menit
```

Jika waktu presentasi benar-benar ketat, gabungkan Slide 2 dan Slide 3.

---

# Catatan Demo Singkat

Urutan demo yang paling aman:

1. Buka aplikasi dengan Live Server.
2. Tunjukkan mode OSM pedestrian.
3. Klik titik awal wisatawan di sekitar pantai.
4. Tunjukkan rute dan ranking shelter.
5. Aktifkan node/debug jika perlu menjelaskan state space.
6. Laporkan hambatan pada salah satu ruas rute.
7. Tunjukkan bahwa A\* menghitung ulang rute alternatif.

Kalimat penutup:

> Fokus utama project ini adalah implementasi dan validasi algoritma A\*
> sebagai metode searching untuk rute evakuasi. Pengembangan seperti cost
> berbasis risiko, elevasi, dan kapasitas menjadi future work.
