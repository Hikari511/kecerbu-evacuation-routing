# Pipeline OSM Saat Ini - Demo Akhir EvaTour

Dokumen ini adalah ringkasan terbaru untuk demo akhir. File
`README_pipeline.md` lama masih berisi catatan awal sebelum graph OSM berhasil
dijalankan dan sebelum shelter memakai edge snapping.

## Output Demo

```text
data/pedestrian_graph_pangandaran.json
```

## Ringkasan Graph

```text
Node OSM: 2.420
Directed edge: 6.296
Connected components: 8
Komponen terbesar: 2.393 node
Kandidat shelter: 24
Shelter lolos audit: 15
Shelter gagal / belum terverifikasi: 9
```

## Metode Snapping

- Start/user point: nearest-node snapping.
- Shelter: edge snapping.
- Ambang audit shelter: 100 m dari ruas pedestrian OSM.

Start memakai nearest-node snapping karena titik awal bisa dipilih bebas oleh
pengguna. Shelter memakai edge snapping karena koordinat shelter biasanya
berada pada bangunan atau halaman, bukan tepat pada node persimpangan OSM.

Jika shelter lolos audit, sistem membuat node virtual `shelter:<id>` pada edge
terdekat sebagai goal A*. Jika koordinat tidak valid atau jarak ke edge
terdekat lebih dari 100 m, shelter tidak dijadikan goal routing.

## Cara Menjalankan Ulang Pipeline

```powershell
$env:PYTHONPATH=(Resolve-Path '.python_packages').Path
python scripts\build_osm_graph.py data\shelters_verified.csv data\pedestrian_graph_pangandaran.json
```

## Cara Menjalankan Semua Test

```powershell
powershell -ExecutionPolicy Bypass -File scripts\run_all_tests.ps1
```

Hasil terakhir:

```text
TOTAL PASSED : 259
TOTAL FAILED : 0
RESULT: ALL TESTS PASSED
```

## Kalimat Presentasi

Pada Progress 3, koordinat awal pengguna dipetakan ke node OSM terdekat,
sedangkan koordinat shelter dipetakan ke ruas jalan terdekat menggunakan edge
snapping. Shelter yang lolos audit dibuatkan node virtual sebagai goal A*.
Dengan cara ini, A* tetap berjalan pada graph jalan yang valid dan tidak
memaksa goal ke titik yang tidak terhubung secara metodologis.
