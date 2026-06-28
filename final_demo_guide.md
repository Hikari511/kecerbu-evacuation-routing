# Panduan Demo Akhir EvaTour

## Tujuan Demo

Tunjukkan bahwa proyek ini sudah memenuhi fokus mata kuliah Kecerdasan Buatan:
implementasi A* sebagai informed search untuk rute evakuasi tsunami.

Yang perlu ditekankan:

- State space berubah dari grid simulasi menjadi graph jalan.
- Edge memiliki bobot jarak.
- Heuristik menggunakan Haversine karena node OSM memakai latitude-longitude.
- A* memilih rute dengan `f(n) = g(n) + h(n)`.
- Sistem mendukung multi-shelter dan re-routing saat ada hambatan.

## Status Rencana Progress 3

| Rencana | Status Demo Akhir |
|---|---|
| Beralih dari node snapping ke edge snapping untuk shelter | Selesai |
| Verifikasi ulang 16 shelter yang belum lolos audit | Selesai, hasil akhir 15 lolos dan 9 belum digunakan sebagai goal |
| Pengujian skenario start berbeda | Selesai, V1 dan V25 diuji |
| Pengujian hambatan jalan | Selesai, edge dapat diblokir dan A* menghitung ulang rute |
| Penyempurnaan UI untuk demo akhir | Selesai, mode map, node, shelter, ranking, dan fullscreen tersedia |
| Future work: cost risiko, elevasi, kapasitas | Dicatat sebagai pengembangan lanjutan, tidak dipaksakan ke demo |

Catatan penting: setelah edge snapping, masih ada 9 kandidat shelter yang
belum digunakan sebagai goal. Ini bukan bug dan bukan node yang gagal, melainkan
hasil audit metodologis agar A* tidak memaksa rute ke kandidat yang belum cukup
terhubung ke jaringan pedestrian OSM.

## Alur Demo yang Disarankan

1. Buka `index.html` dengan Live Server.
2. Mulai dari mode grid untuk menjelaskan Progress 1-2 secara singkat.
3. Pindah ke graph Wijayanto untuk validasi terhadap paper.
4. Tunjukkan bahwa path A* sama dengan hasil Dijkstra paper.
5. Pindah ke mode OSM pedestrian.
6. Klik titik awal di sekitar Pangandaran.
7. Tunjukkan ranking shelter dan estimasi jarak/waktu.
8. Aktifkan tampilan node hanya saat menjelaskan state space.
9. Gunakan fitur laporan hambatan pada salah satu ruas rute.
10. Tunjukkan bahwa A* menghitung ulang rute alternatif.

## Angka yang Dipakai Saat Presentasi

```text
Graph OSM: 2.420 node, 6.296 directed edge
Connected components: 8
Komponen terbesar: 2.393 node
Kandidat shelter: 24
Shelter lolos audit: 15
Shelter gagal / belum terverifikasi: 9
Pengujian otomatis: 259 pass, 0 fail
```

## Penjelasan Singkat Jika Ditanya Dosen

**Node itu apa?**

Pada graph OSM, node adalah titik konektivitas jalan seperti persimpangan,
ujung jalan, dead-end, atau titik penting hasil simplification. Node inilah
yang menjadi state dalam A*.

**Kenapa node tidak selalu mengikuti setiap belokan?**

Karena bentuk belokan disimpan pada geometry edge. A* tidak perlu menjadikan
setiap titik geometri sebagai state keputusan. Yang penting untuk search adalah
konektivitas dan bobot edge.

**Kenapa shelter memakai edge snapping?**

Karena koordinat shelter biasanya berada pada bangunan atau area sekitar jalan,
bukan tepat pada node OSM. Edge snapping memetakan shelter ke ruas jalan
terdekat lalu membuat node virtual sebagai goal A*.

**Apakah ranking pertama berarti shelter paling aman?**

Belum. Ranking saat ini berdasarkan rute pedestrian terpendek. Kapasitas,
elevasi, risiko genangan, dan kondisi bangunan belum menjadi fungsi objektif.

**Apa kontribusi AI-nya?**

Kontribusinya adalah formulasi evakuasi sebagai masalah informed search:
state, successor, path cost, heuristic, multi-goal search, dan re-planning
ketika graph berubah.

## Yang Tidak Perlu Ditambah Sebelum Demo

- Login pengguna
- Dashboard admin
- Database server
- Verifikasi laporan hambatan multi-user
- Optimasi multi-kriteria yang terlalu besar
- Graph tanpa simplification hanya demi memperbanyak node visual

Fokus akhir sebaiknya pada stabilitas demo, dokumentasi metodologi, PPT, dan
latihan menjawab pertanyaan teknis.

## Rekomendasi untuk Laporan Format Jurnal

Struktur paling aman:

1. Pendahuluan: masalah evakuasi tsunami dan kebutuhan pencarian rute.
2. Metode: A*, graph OSM, Haversine heuristic, snapping, multi-shelter.
3. Data: Wijayanto untuk validasi graph kecil, Husa-Damayanti untuk shelter,
   OSM untuk jaringan pedestrian.
4. Implementasi: state, successor, path cost, heuristic, obstacle/re-routing.
5. Hasil: validasi Wijayanto, ranking shelter, edge snapping audit, test pass.
6. Batasan: ranking belum mempertimbangkan risiko, elevasi, kapasitas, dan
   verifikasi lapangan.
7. Kesimpulan: prototype akademik A* sudah berjalan dan tervalidasi.

## Checklist Sebelum Presentasi

- Jalankan Live Server dari `index.html`.
- Pastikan koneksi internet aktif untuk tile OpenStreetMap.
- Jalankan `powershell -ExecutionPolicy Bypass -File scripts\run_all_tests.ps1`.
- Foto hasil terminal `259 pass, 0 fail`.
- Siapkan screenshot tiga mode: grid, Wijayanto, dan OSM pedestrian.
- Latih narasi 5-7 menit.
