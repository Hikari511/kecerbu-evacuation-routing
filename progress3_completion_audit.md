# Audit Penyelesaian Progress 3 EvaTour

Dokumen ini merangkum status akhir proyek sebelum demo dan laporan akhir.

## Kesimpulan Singkat

Secara akademik, proyek sudah aman untuk demo akhir sebagai prototype AI
Searching/A*. Implementasi utama sudah mencakup:

- A* pada grid simulasi.
- A* pada graph Wijayanto untuk validasi terhadap paper.
- A* pada graph pedestrian OpenStreetMap.
- Heuristik Haversine untuk koordinat latitude-longitude.
- Multi-shelter routing dan ranking.
- Edge snapping untuk shelter.
- Nearest-node snapping untuk titik awal pengguna.
- Dynamic obstacle dan re-routing.
- Pengujian otomatis.

## Status Rencana Progress 3

| Rencana | Status | Bukti |
|---|---|---|
| Beralih dari node snapping ke edge snapping | Selesai | Shelter memakai `snapMethod: "edge"` dan node virtual `shelter:<id>` |
| Verifikasi ulang 16 shelter yang belum lolos audit | Selesai | Dari 24 kandidat, 15 lolos dan 9 masih belum digunakan sebagai goal |
| Pengujian start berbeda | Selesai | Skenario V1 dan V25 diuji |
| Pengujian hambatan jalan | Selesai | Edge dapat diblokir dan A* menghitung ulang rute |
| Penyempurnaan UI demo | Selesai | Peta OSM, ranking, shelter, failed shelter, node/debug, dan fullscreen tersedia |
| Future work cost risiko, elevasi, kapasitas | Dicatat sebagai future work | Tidak dipaksakan karena fokus mata kuliah adalah searching |

## Kenapa Masih Ada 9 Shelter Tidak Lolos?

Ini bukan bug. Setelah edge snapping, shelter yang sebelumnya gagal karena jauh
dari node persimpangan sudah diverifikasi ulang terhadap ruas jalan. Hasilnya:

```text
Total kandidat shelter: 24
Lolos audit edge snapping: 15
Tidak lolos / belum terverifikasi: 9
```

Sembilan kandidat yang tidak lolos tidak dijadikan goal karena:

- Ada yang belum memiliki koordinat valid.
- Ada yang masih berjarak lebih dari 100 m dari ruas pedestrian OSM terdekat.

Keputusan ini justru menjaga validitas metodologi. A* tidak dipaksa mencari
rute ke titik yang belum dapat dipetakan secara wajar ke jaringan jalan.

## Angka Final Demo

```text
Graph OSM: 2.420 node
Directed edge: 6.296
Connected components: 8
Komponen terbesar: 2.393 node
Kandidat shelter: 24
Shelter lolos audit: 15
Shelter gagal / belum terverifikasi: 9
Pengujian otomatis: 259 pass, 0 fail
```

## Batasan yang Harus Disampaikan

- Ranking shelter masih berdasarkan jarak pedestrian terpendek.
- Kapasitas, elevasi, risiko genangan, dan kondisi bangunan belum masuk fungsi
  biaya A*.
- Edge snapping menunjukkan kedekatan ke ruas jalan, bukan verifikasi fisik
  bahwa akses pendek ke bangunan pasti bisa dilalui.
- Data OSM dan koordinat shelter tetap perlu validasi lapangan untuk penggunaan
  operasional.

## Future Work

Future work yang paling relevan untuk laporan:

- Cost berbasis risiko ruas jalan.
- Cost berbasis elevasi dan zona genangan.
- Penalti kepadatan atau hambatan jalan.
- Pertimbangan kapasitas shelter.
- Verifikasi koordinat shelter dengan sumber resmi atau survey lapangan.

Future work ini tidak perlu diimplementasikan sebelum demo karena akan mengubah
scope dari prototype searching menjadi sistem pendukung keputusan multi-kriteria.

## Kalimat Penutup untuk Demo

> Pada Progress 3, sistem sudah berpindah dari simulasi grid ke graph jalan OSM
> dan menjalankan A* pada state space yang lebih realistis. Shelter diverifikasi
> ulang menggunakan edge snapping, sehingga kandidat yang dekat dengan ruas
> jalan dapat digunakan sebagai goal. Hasil akhir menunjukkan 15 shelter lolos
> audit, dynamic obstacle dapat memicu re-routing, dan seluruh pengujian
> otomatis lulus. Batasan seperti risiko, elevasi, dan kapasitas disampaikan
> sebagai future work.
