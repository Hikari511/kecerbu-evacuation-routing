# Weighted Pedestrian Graph untuk A* — Shelter Evakuasi Pangandaran

## ⚠️ Catatan jujur soal eksekusi

Saya **tidak bisa menjalankan langkah pengambilan data OSM secara live** dari sandbox ini:
- Sandbox bash saya dibatasi ke whitelist domain (pypi/npm/github/dll) — `overpass-api.de` dan `*.openstreetmap.org` tidak termasuk.
- Tool `web_fetch` saya ditolak oleh `overpass-api.de` dengan `ROBOTS_DISALLOWED`.

Jadi yang saya berikan adalah: **(a)** data shelter yang sudah dibersihkan & divalidasi sepenuhnya, **(b)** bounding box yang sudah dihitung, **(c)** skrip Python lengkap dan reproducible (`build_pedestrian_graph.py`) yang tinggal Anda jalankan di komputer/Colab yang punya akses internet bebas, **(d)** semua logika snapping, skema JSON, dan uji konektivitas — sudah ditulis dan siap pakai, hanya belum dieksekusi dengan data jalan asli.

---

## 1. Bounding box

Dihitung dari 22 shelter dengan koordinat valid (dari 24 total), + padding 0.01° (~1.1 km):

| | Latitude | Longitude |
|---|---|---|
| Min (south/west) | -7.74351 | 108.44521 |
| Max (north/east) | -7.66051 | 108.66842 |

**Catatan penting:** bbox ini hanya mencakup shelter. Anda belum menyertakan dataset "titik awal" (starting points) terpisah — jika ada, tambahkan koordinatnya dan jalankan ulang `compute_bbox()` di skrip agar bbox menyesuaikan.

## 2. Sumber & query OSM

- **Sumber:** OpenStreetMap contributors, diakses via Overpass API (`overpass-api.de`) menggunakan library **OSMnx**.
- **Query (dieksekusi OSMnx di balik layar):**
  ```python
  ox.graph_from_bbox(bbox=(north, south, east, west),
                      network_type="walk", simplify=True, retain_all=False)
  ```
- `network_type="walk"` otomatis menyaring jalan yang **bisa** dilalui pejalan kaki (footway, path, pedestrian, living_street, residential, service, steps, track, dan jalan umum dengan `foot=yes/permissive`) dan **membuang** yang `access=private`, `foot=no`, atau motorway/trunk-only. Ini menjawab syarat #7.
- **Tanggal pengambilan data:** belum dieksekusi — isi field `tanggalPengambilanData` di output JSON akan otomatis terisi timestamp UTC saat Anda menjalankan skrip.

## 3. Struktur JSON

```json
{
  "metadata": { "sumberData": "...", "boundingBox": {...}, "tanggalPengambilanData": "...", "disclaimer": "..." },
  "nodes": [ { "id": "123456", "latitude": -7.6917, "longitude": 108.6538 } ],
  "edges": [ { "from": "123456", "to": "123457", "distanceMeters": 42.3 } ],
  "shelterSnapping": [
    { "shelterId": "S1_01", "shelterLat": -7.691769, "shelterLon": 108.653847,
      "nearestNodeId": "123456", "snapDistanceMeters": 12.4 }
  ],
  "shelterSnapFailed": [ { "shelterId": "S1_03", "name": "Soccer Field", "reason": "..." } ],
  "connectivityTest": { "totalNodes": 0, "totalEdges": 0, "numConnectedComponents": 0,
                         "largestComponentSize": 0, "sheltersInMainComponent": [],
                         "sheltersInIsolatedComponent": [] }
}
```

## 4. Nearest-node snapping (#4–6)

Menggunakan `ox.distance.nearest_nodes` (k-d tree pada koordinat geografis sebenarnya) lalu divalidasi ulang dengan **haversine formula** untuk `snapDistanceMeters` yang presisi — **bukan perkiraan visual**. Ambang batas default 300 m: jika node terdekat lebih jauh dari itu, shelter ditandai gagal terhubung (lihat `shelterSnapFailed`), bukan dipaksa nyambung.

## 5. Shelter yang sudah pasti gagal terhubung (sebelum graph dibangun)

Dua shelter **tidak punya koordinat valid** di data sumber Anda, jadi otomatis gagal terhubung tanpa perlu graph:

| shelterId | Nama | Alasan |
|---|---|---|
| S1_03 | Soccer Field | Nama lokasi terlalu generik, tidak ada koordinat di paper |
| S2_10 | Posyandu Dusun Patrol | Data mikro dusun tidak tersedia di OSM publik |

22 shelter lainnya punya koordinat dan akan diuji nearest-snap begitu graph jalan diambil. Beberapa catatan di data Anda menyebut shelter "di luar graph Wijayanto V1–V31" (mis. Parigi Mosque, Conservation Area, Tanjakan Haras) — itu merujuk ke graph kecil di paper akademik tertentu, **bukan** ke jaringan OSM penuh yang dibangun skrip ini. Jangan diasumsikan otomatis gagal; biarkan hasil snapping & ambang jarak yang menentukan.

## 6. Uji konektivitas graph (#8)

`connectivity_report()` di skrip menghitung connected components (`networkx.connected_components` pada versi tak berarah graph), melaporkan ukuran komponen terbesar, dan mengecek apakah node hasil snapping setiap shelter berada di komponen utama atau terisolasi.

## 7. Disclaimer (#9)

Field `metadata.disclaimer` di output JSON secara eksplisit menyatakan: graph ini adalah **jaringan jalan OSM untuk prototipe akademik**, bukan data resmi jalur evakuasi tsunami, dan perlu verifikasi lapangan oleh BPBD/instansi terkait untuk penggunaan operasional.

---

## Cara menjalankan

```bash
pip install osmnx networkx pandas numpy
python build_pedestrian_graph.py shelters_clean.csv pedestrian_graph_pangandaran.json
```

File `shelters_clean.csv` sudah saya siapkan (22 baris valid + 2 baris invalid yang ditandai `validCoordinate=FALSE`).
