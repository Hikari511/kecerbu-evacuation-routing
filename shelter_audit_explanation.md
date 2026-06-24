# Penjelasan Shelter yang Tidak Lolos Audit

## Versi Terbaru - Edge Snapping

Dokumen ini telah diperbarui setelah audit shelter diubah dari **node
snapping** menjadi **edge snapping**.

Pada versi sebelumnya, shelter harus dekat dengan node OSM terdekat. Cara itu
bisa menolak shelter yang sebenarnya dekat dengan ruas jalan, tetapi jauh dari
persimpangan. Pada versi terbaru, shelter dihubungkan ke **ruas jalan OSM
terdekat**, lalu sistem membuat **node virtual** pada ruas tersebut sebagai
goal A\*.

```text
Koordinat shelter
      |
      v
Cari edge/ruas jalan OSM terdekat
      |
      v
Jika jarak <= 100 m, buat node virtual shelter pada edge tersebut
      |
      v
A* mencari rute menuju node virtual shelter
```

### Aturan Audit Terbaru

Sebuah kandidat dapat digunakan sebagai goal A\* apabila:

1. Memiliki koordinat latitude-longitude yang cukup dapat digunakan.
2. Koordinat tersebut berjarak maksimal 100 meter dari ruas pedestrian OSM
   terdekat.
3. Node virtual shelter berada pada graph yang dapat dicapai dari start.

```text
Jarak shelter ke edge <= 100 meter -> lolos audit routing
Jarak shelter ke edge > 100 meter  -> tidak digunakan sebagai goal
Koordinat tidak tersedia           -> tidak dapat diuji
```

### Ringkasan Hasil Terbaru

| Status | Jumlah |
|---|---:|
| Total kandidat Husa & Damayanti | 24 |
| Lolos audit edge snapping | 15 |
| Tidak lolos audit | 9 |

Perubahan ini membuat beberapa kandidat yang sebelumnya gagal menjadi lolos,
misalnya:

| Shelter | Snap ke edge |
|---|---:|
| SDN 3 Cibenda | 28,3 m |
| SDN 2 Cibenda | 17,9 m |
| SDN 1 Karangbenda | 25,8 m |
| Al Istikmal Mosque | 82,5 m |
| Parigi Mosque | 39,0 m |

Ini lebih sesuai dengan kondisi routing jalan karena shelter tidak harus dekat
dengan persimpangan. Shelter cukup dekat dengan ruas jalan yang dapat dilalui.

### Kandidat yang Masih Tidak Lolos

| ID | Shelter | Snap ke edge | Penyebab |
|---|---|---:|---|
| S1_03 | Soccer Field | - | Koordinat belum terverifikasi |
| S1_04 | Ciliang Village Meeting Hall | 299,8 m | Melebihi 100 m |
| S1_07 | Conservation Area | 162,8 m | Melebihi 100 m |
| S2_03 | Al Falah Mosque | 122,8 m | Melebihi 100 m |
| S2_04 | Al Islah Mosque | 305,8 m | Melebihi 100 m |
| S2_07 | Hidayatul Falah Mosque | 215,9 m | Melebihi 100 m |
| S2_08 | MTS Bojong Cibenda | 285,2 m | Melebihi 100 m |
| S2_10 | Posyandu Dusun Patrol | - | Koordinat belum terverifikasi |
| S2_16 | Parigi Market | 113,5 m | Melebihi 100 m |

### Kalimat untuk Presentasi

> Pada versi terbaru, audit shelter menggunakan edge snapping. Artinya,
> koordinat shelter tidak harus dekat dengan node persimpangan, tetapi cukup
> dekat dengan ruas jalan pedestrian OSM. Jika jaraknya maksimal 100 meter,
> sistem membuat node virtual pada ruas tersebut sebagai goal A\*. Dengan
> metode ini, jumlah shelter yang lolos audit meningkat dari 8 menjadi 15,
> karena beberapa shelter seperti SDN 3 Cibenda sebenarnya dekat dengan ruas
> jalan meskipun jauh dari node persimpangan.

### Catatan Penting

Edge snapping lebih realistis daripada node snapping, tetapi tetap belum
membuktikan bahwa konektor pendek dari jalan ke bangunan dapat dilalui secara
fisik. Karena itu, sistem tetap disebut prototype akademik dan bukan panduan
evakuasi resmi.

---

## Arsip Penjelasan Lama - Node Snapping

Bagian di bawah ini adalah dokumentasi lama sebelum edge snapping diterapkan.
Angka dan status shelter pada bagian arsip tidak lagi menjadi hasil utama.

Dokumen ini menjelaskan 16 dari 24 kandidat shelter Husa & Damayanti (2019)
yang tidak digunakan sebagai goal pada routing pedestrian EvaTour Progress 3.

## Aturan Audit

Sebuah kandidat dapat digunakan sebagai goal A* apabila:

1. Memiliki koordinat latitude-longitude yang cukup dapat dipercaya.
2. Koordinat tersebut dapat dihubungkan ke node pedestrian OSM.
3. Jarak shelter ke node pedestrian terdekat maksimal 100 meter.
4. Node hasil snapping berada pada graph yang dapat dicapai dari start.

```text
Jarak snap <= 100 meter  -> lolos audit routing
Jarak snap > 100 meter   -> tidak digunakan sebagai goal
Koordinat tidak tersedia -> tidak dapat diuji
```

Ambang 100 meter digunakan agar sistem tidak menggambar konektor lurus yang
terlalu panjang antara lokasi shelter dan jalan. Konektor lurus tersebut belum
tentu benar-benar dapat dilalui karena bisa melewati bangunan, pagar, sungai,
atau lahan tanpa akses pedestrian.

## Ringkasan Hasil

| Penyebab | Jumlah |
|---|---:|
| Koordinat hilang atau belum dapat diverifikasi | 2 |
| Koordinat ada, tetapi jarak snapping lebih dari 100 m | 14 |
| Berada pada connected component yang berbeda | 0 |
| Total tidak lolos | 16 |

Seluruh 14 kandidat yang mempunyai koordinat berada pada komponen utama
graph (`componentId = 0`). Artinya, jaringan jalannya terhubung. Masalahnya
adalah titik koordinat shelter belum cukup dekat dengan node pedestrian.

## Tabel Seluruh Kandidat yang Tidak Lolos

| ID | Shelter | Status | Snap | Penyebab |
|---|---|---|---:|---|
| S1_03 | Soccer Field | Existing | - | Koordinat belum terverifikasi |
| S1_04 | Ciliang Village Meeting Hall | Existing | 371,7 m | Melebihi 100 m |
| S1_05 | Parigi Mosque | Existing | 128,2 m | Melebihi 100 m |
| S1_07 | Conservation Area | Existing | 530,3 m | Melebihi 100 m |
| S1_08 | Tanjakan Haras | Existing | 198,7 m | Melebihi 100 m |
| S2_03 | Al Falah Mosque | Potential | 634,2 m | Melebihi 100 m |
| S2_04 | Al Islah Mosque | Potential | 565,7 m | Melebihi 100 m |
| S2_05 | Al Istikmal Mosque | Potential | 189,3 m | Melebihi 100 m |
| S2_06 | Ar Eiyadh Mosque | Potential | 452,3 m | Melebihi 100 m |
| S2_07 | Hidayatul Falah Mosque | Potential | 216,0 m | Melebihi 100 m |
| S2_08 | MTS Bojong Cibenda | Potential | 357,4 m | Melebihi 100 m |
| S2_10 | Posyandu Dusun Patrol | Potential | - | Koordinat belum terverifikasi |
| S2_12 | SDN 3 Cibenda | Potential | 205,2 m | Melebihi 100 m |
| S2_13 | SDN 1 Karangbenda | Potential | 134,8 m | Melebihi 100 m |
| S2_15 | SDN 2 Cibenda | Potential | 111,4 m | Melebihi 100 m |
| S2_16 | Parigi Market | Potential | 229,8 m | Melebihi 100 m |

---

## Penjelasan Per Shelter

### 1. S1_03 - Soccer Field

**Nama modern:** Lapangan Sepakbola Pangandaran  
**Status:** Existing shelter  
**Tingkat keyakinan:** Rendah  
**Koordinat:** Tidak tersedia  
**Sumber:** Husa 2019 Table 3

Nama `Soccer Field` terlalu umum dan tidak cukup untuk menentukan lapangan
mana yang dimaksud oleh paper. Karena koordinatnya belum dapat dipastikan,
lokasi ini tidak dapat di-snap ke graph OSM.

**Keputusan:** tidak dijadikan goal karena identitas dan koordinat lokasi
belum terverifikasi.

**Yang dibutuhkan:** nama fasilitas yang lebih spesifik, alamat, pin lokasi,
atau koordinat dari sumber resmi.

---

### 2. S1_04 - Ciliang Village Meeting Hall

**Nama modern:** Aula Desa Ciliang  
**Status:** Existing shelter  
**Kapasitas:** 126 orang  
**Tingkat keyakinan:** Sedang  
**Koordinat:** `-7.684120, 108.521340`  
**Node terdekat:** `6442226762`  
**Jarak snapping:** 371,7 meter

Koordinat hasil geocoding tersedia dan berada pada kawasan graph utama.
Namun, node pedestrian terdekat berjarak 371,7 meter. Jarak ini terlalu jauh
untuk diasumsikan sebagai akses langsung menuju aula.

**Keputusan:** tidak dijadikan goal karena melebihi ambang sebesar 271,7 m.

**Kemungkinan penyebab:** titik geocoding belum tepat pada pintu masuk
fasilitas atau jalan akses lokal belum dipetakan dalam OSM.

---

### 3. S1_05 - Parigi Mosque

**Nama modern:** Masjid Besar Parigi / Masjid Jami Parigi  
**Status:** Existing shelter  
**Kapasitas:** 292 orang  
**Tingkat keyakinan:** Tinggi  
**Koordinat:** `-7.692250, 108.491640`  
**Node terdekat:** `5957363354`  
**Jarak snapping:** 128,2 meter

Lokasi ini hanya 28,2 meter melewati batas. Koordinatnya cukup meyakinkan,
tetapi berdasarkan graph saat ini hubungan ke jalan pedestrian masih lebih
jauh dari ambang yang ditentukan.

**Keputusan:** tidak dijadikan goal karena aturan 100 meter diterapkan secara
konsisten.

**Catatan:** kandidat ini layak menjadi prioritas verifikasi manual. Koreksi
posisi menuju pintu masuk atau penambahan akses pedestrian OSM mungkin dapat
membuatnya lolos tanpa mengubah ambang.

---

### 4. S1_07 - Conservation Area

**Nama modern:** Cagar Alam / Area Konservasi  
**Status:** Existing shelter  
**Tingkat keyakinan:** Sedang  
**Koordinat:** `-7.712540, 108.658420`  
**Node terdekat:** `12449723770`  
**Jarak snapping:** 530,3 meter

`Conservation Area` merepresentasikan kawasan yang luas, bukan satu bangunan
atau pintu masuk yang jelas. Satu titik koordinat di dalam kawasan belum tentu
merepresentasikan lokasi evakuasi atau akses pedestrian.

**Keputusan:** tidak dijadikan goal karena snap sangat jauh, yaitu 530,3 m.

**Yang dibutuhkan:** titik tujuan yang lebih spesifik, misalnya pintu masuk,
area tinggi tertentu, atau titik kumpul resmi dalam kawasan konservasi.

---

### 5. S1_08 - Tanjakan Haras

**Status:** Existing shelter  
**Tingkat keyakinan:** Sedang  
**Koordinat:** `-7.733510, 108.455210`  
**Node terdekat:** `7462177269`  
**Jarak snapping:** 198,7 meter

Tanjakan Haras kemungkinan merupakan nama area atau ruas tanjakan, bukan
fasilitas dengan satu pintu masuk yang pasti. Koordinat tersedia, tetapi masih
berjarak hampir 200 meter dari node pedestrian terdekat.

**Keputusan:** tidak dijadikan goal karena melebihi ambang sebesar 98,7 m.

**Yang dibutuhkan:** koordinat titik akses atau titik aman yang lebih tepat.

---

### 6. S2_03 - Al Falah Mosque

**Nama modern:** Masjid Al-Falah Cijulang  
**Status:** Potential shelter  
**Kapasitas:** 178 orang  
**Elevasi:** 11 meter  
**Tingkat keyakinan:** Sedang  
**Koordinat:** `-7.728940, 108.456120`  
**Node terdekat:** `7461950883`  
**Jarak snapping:** 634,2 meter

Ini merupakan jarak snapping terjauh dalam daftar gagal audit. Walaupun nama
masjid berasal dari paper, titik koordinat yang digunakan sangat jauh dari
jaringan pedestrian terdekat.

**Keputusan:** tidak dijadikan goal karena koneksi 634,2 m tidak dapat
dianggap sebagai akses langsung yang valid.

**Kemungkinan penyebab:** masjid yang tergeocoding bukan fasilitas yang
dimaksud paper, koordinatnya tidak tepat, atau jalan lokal belum tersedia
dalam OSM.

---

### 7. S2_04 - Al Islah Mosque

**Nama modern:** Masjid Al-Ishlah Cijulang  
**Status:** Potential shelter  
**Kapasitas:** 440 orang  
**Elevasi:** 13 meter  
**Tingkat keyakinan:** Sedang  
**Koordinat:** `-7.724110, 108.459340`  
**Node terdekat:** `7462036432`  
**Jarak snapping:** 565,7 meter

Koordinat masjid berada pada komponen graph utama, tetapi titik tersebut
masih 565,7 meter dari node pedestrian terdekat.

**Keputusan:** tidak dijadikan goal karena hubungan shelter-jalan terlalu
jauh dan belum dapat dipercaya.

**Kemungkinan penyebab:** kesalahan identifikasi masjid dengan nama serupa
atau data jalan lokal OSM belum lengkap.

---

### 8. S2_05 - Al Istikmal Mosque

**Nama modern:** Masjid Al-Istikmal  
**Status:** Potential shelter  
**Kapasitas:** 235 orang  
**Elevasi:** 11 meter  
**Tingkat keyakinan:** Sedang  
**Koordinat:** `-7.681120, 108.618930`  
**Node terdekat:** `11903983871`  
**Jarak snapping:** 189,3 meter

Koordinat tersedia dan graph-nya terhubung. Masalahnya hanya pada jarak
antara lokasi masjid dan node pedestrian, yaitu 189,3 meter.

**Keputusan:** tidak dijadikan goal karena melebihi batas sebesar 89,3 m.

Jika dipaksakan, A* akan berhenti di node jalan yang masih cukup jauh dari
masjid dan menyisakan konektor lurus yang belum tervalidasi.

---

### 9. S2_06 - Ar Eiyadh Mosque

**Nama modern:** Masjid Ar-Riyadh  
**Status:** Potential shelter  
**Kapasitas:** 523 orang  
**Elevasi:** 16 meter  
**Tingkat keyakinan:** Sedang  
**Koordinat:** `-7.674150, 108.514210`  
**Node terdekat:** `6103629335`  
**Jarak snapping:** 452,3 meter

Selain terdapat perbedaan ejaan nama `Ar Eiyadh` dan `Ar-Riyadh`, koordinat
yang dipakai berjarak 452,3 meter dari node pedestrian.

**Keputusan:** tidak dijadikan goal karena snap terlalu jauh.

**Yang dibutuhkan:** konfirmasi bahwa nama modern dan fasilitas dalam paper
merujuk ke masjid yang sama, kemudian verifikasi koordinat pintu masuknya.

---

### 10. S2_07 - Hidayatul Falah Mosque

**Nama modern:** Masjid Hidayatul Falah  
**Status:** Potential shelter  
**Kapasitas:** 138 orang  
**Elevasi:** 17 meter  
**Tingkat keyakinan:** Sedang  
**Koordinat:** `-7.678420, 108.498110`  
**Node terdekat:** `5965686940`  
**Jarak snapping:** 216,0 meter

Kandidat berada di graph utama, tetapi akses dari titik shelter ke node OSM
terdekat masih lebih dari dua kali ambang.

**Keputusan:** tidak dijadikan goal karena jarak snapping 216,0 meter.

**Kemungkinan penyebab:** titik fasilitas tidak berada di akses masuk atau
jalan lingkungan sekitar belum dipetakan.

---

### 11. S2_08 - MTS Bojong Cibenda

**Nama modern:** MTsS Bojong Cibenda  
**Status:** Potential shelter  
**Kapasitas:** 396 orang  
**Elevasi:** 16 meter  
**Tingkat keyakinan:** Tinggi  
**Koordinat:** `-7.671140, 108.495230`  
**Node terdekat:** `5965726689`  
**Jarak snapping:** 357,4 meter

Identitas sekolah memiliki tingkat keyakinan tinggi, tetapi identitas yang
meyakinkan tidak otomatis berarti titiknya dekat dengan graph pedestrian.
Jarak ke node terdekat masih 357,4 meter.

**Keputusan:** tidak dijadikan goal karena gagal kriteria koneksi routing.

**Kemungkinan penyebab:** pin sekolah berada di tengah area sekolah atau
jalan masuk sekolah belum terpetakan di OSM.

---

### 12. S2_10 - Posyandu Dusun Patrol

**Nama modern:** Posyandu Patrol Cibenda  
**Status:** Potential shelter  
**Kapasitas:** 11 orang  
**Elevasi:** 15 meter  
**Tingkat keyakinan:** Rendah  
**Koordinat:** Tidak tersedia  
**Sumber:** Husa 2019 Table 4

Fasilitas posyandu tingkat dusun sulit ditemukan pada sumber peta publik.
Tidak ada koordinat yang cukup dapat dipercaya untuk diuji.

**Keputusan:** tidak dijadikan goal karena snapping tidak dapat dilakukan.

**Yang dibutuhkan:** alamat lokal, data pemerintah desa, survei lapangan,
atau pin lokasi dari pihak yang mengetahui fasilitas tersebut.

---

### 13. S2_12 - SDN 3 Cibenda

**Nama modern:** SD Negeri 3 Cibenda  
**Status:** Potential shelter  
**Kapasitas:** 183 orang  
**Elevasi:** 16 meter  
**Tingkat keyakinan:** Tinggi  
**Koordinat:** `-7.673840, 108.494120`  
**Node terdekat:** `6103616544`  
**Jarak snapping:** 205,2 meter

Sekolah berhasil diidentifikasi, tetapi koordinatnya berjarak 205,2 meter dari
node pedestrian terdekat.

**Keputusan:** tidak dijadikan goal karena melebihi ambang sebesar 105,2 m.

**Kemungkinan penyebab:** koordinat menunjuk pusat kompleks sekolah, bukan
gerbang, atau akses jalan sekolah belum tersedia dalam data OSM.

---

### 14. S2_13 - SDN 1 Karangbenda

**Nama modern:** SD Negeri 1 Karangbenda  
**Status:** Potential shelter  
**Kapasitas:** 263 orang  
**Elevasi:** 18 meter  
**Tingkat keyakinan:** Tinggi  
**Koordinat:** `-7.670510, 108.512140`  
**Node terdekat:** `6103628856`  
**Jarak snapping:** 134,8 meter

Lokasi ini relatif dekat dengan ambang, tetapi masih 34,8 meter di atas batas.
Aturan audit tidak dilonggarkan hanya untuk shelter tertentu.

**Keputusan:** tidak dijadikan goal pada dataset saat ini.

**Catatan:** layak diprioritaskan untuk pemeriksaan koordinat gerbang atau
kelengkapan jalan OSM.

---

### 15. S2_15 - SDN 2 Cibenda

**Nama modern:** SD Negeri 2 Cibenda  
**Status:** Potential shelter  
**Kapasitas:** 241 orang  
**Elevasi:** 16 meter  
**Tingkat keyakinan:** Tinggi  
**Koordinat:** `-7.675120, 108.496110`  
**Node terdekat:** `5965726689`  
**Jarak snapping:** 111,4 meter

Ini merupakan kandidat gagal yang paling dekat dengan batas. Selisihnya hanya
11,4 meter, tetapi pipeline menggunakan aturan maksimal 100 meter secara
konsisten.

**Keputusan:** tidak dijadikan goal pada hasil audit saat ini.

**Catatan:** kandidat ini merupakan prioritas tertinggi untuk verifikasi
manual. Koreksi kecil menuju gerbang sekolah atau penambahan akses OSM dapat
membuatnya lolos tanpa mengubah metodologi.

---

### 16. S2_16 - Parigi Market

**Nama modern:** Pasar Baru Parigi  
**Status:** Potential shelter  
**Kapasitas:** 1.482 orang  
**Elevasi:** 15 meter  
**Tingkat keyakinan:** Tinggi  
**Koordinat:** `-7.691430, 108.492150`  
**Node terdekat:** `5957363354`  
**Jarak snapping:** 229,8 meter

Walaupun metode pencarian koordinat menggunakan OpenStreetMap, titik pasar
masih berjarak 229,8 meter dari node pedestrian yang tersedia pada graph.

**Keputusan:** tidak dijadikan goal karena koneksi terakhir menuju pasar
belum cukup dekat.

**Kemungkinan penyebab:** titik OSM merepresentasikan pusat area pasar,
sedangkan akses pedestrian berada di gerbang lain atau belum dipetakan.

---

## Kandidat Prioritas untuk Verifikasi Ulang

Jika penelitian dilanjutkan, kandidat yang paling masuk akal diperiksa lebih
dahulu adalah kandidat yang hanya sedikit melewati ambang:

| Prioritas | Shelter | Snap | Kelebihan dari batas |
|---:|---|---:|---:|
| 1 | SDN 2 Cibenda | 111,4 m | 11,4 m |
| 2 | Parigi Mosque | 128,2 m | 28,2 m |
| 3 | SDN 1 Karangbenda | 134,8 m | 34,8 m |
| 4 | Al Istikmal Mosque | 189,3 m | 89,3 m |
| 5 | Tanjakan Haras | 198,7 m | 98,7 m |

Verifikasi sebaiknya dilakukan dengan mencari koordinat pintu masuk,
memeriksa citra/peta secara manual, memperbarui jalan akses OSM jika memang
ada, atau melakukan survei lapangan.

## Hal yang Tidak Boleh Disimpulkan

Kegagalan audit routing tidak berarti:

- Fasilitas tersebut tidak ada.
- Fasilitas tersebut tidak layak menjadi shelter.
- Fasilitas tersebut tidak aman.
- Fasilitas tersebut tidak terhubung ke jalan di dunia nyata.

Kegagalan hanya berarti:

> Berdasarkan koordinat dan snapshot graph OSM yang digunakan, sistem belum
> dapat menghubungkan lokasi tersebut ke node pedestrian dalam ambang 100
> meter secara cukup dapat dipercaya.

## Kalimat untuk Presentasi

> Dari 24 kandidat Husa dan Damayanti, 16 tidak digunakan sebagai goal. Dua
> kandidat belum mempunyai koordinat yang dapat diverifikasi, sedangkan 14
> kandidat lainnya memiliki jarak lebih dari 100 meter ke node pedestrian OSM
> terdekat. Semua kandidat yang mempunyai koordinat sebenarnya berada pada
> komponen graph utama, sehingga penolakannya bukan karena graph terputus,
> melainkan karena koneksi terakhir dari jalan menuju shelter belum cukup
> dekat dan belum tervalidasi. Kandidat gagal tetap ditampilkan pada peta untuk
> menjaga transparansi proses audit data.
