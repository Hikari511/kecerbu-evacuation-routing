"""
Pipeline: OSM Pedestrian Graph + Shelter Snapping untuk A* (Pangandaran)
=========================================================================
JALANKAN DI MESIN/LINGKUNGAN ANDA SENDIRI (perlu akses internet ke
overpass-api.de). Sandbox Claude TIDAK memiliki akses ke domain OSM,
sehingga skrip ini tidak dijalankan otomatis oleh Claude -- ini adalah
deliverable kode yang sudah lengkap & reproducible untuk Anda jalankan.

Requirements:
    pip install osmnx networkx pandas numpy

Cara pakai:
    python build_pedestrian_graph.py shelters_clean.csv output_graph.json
"""

import sys
import json
import math
from datetime import datetime, timezone

import pandas as pd
import networkx as nx
import osmnx as ox

# -----------------------------------------------------------------------
# 1. BOUNDING BOX
# -----------------------------------------------------------------------
# Dihitung dari seluruh shelter dengan koordinat valid (22 dari 24 titik),
# ditambah padding 0.01 derajat (~1.1 km) di setiap sisi agar simpul jalan
# di pinggir area tetap tercakup untuk snapping.
#
# Sumber koordinat shelter: dua sheet Excel yang diunggah pengguna
# ("Saya_sedang_mengembangkan_aplikasi_pencarian_rute__*.xlsx"),
# berbasis Wijayanto et al. (2025) + verifikasi OSM/Kemenag/Kemendikbud.
#
# PENTING: bbox ini HANYA mencakup shelter, karena pengguna belum
# menyertakan dataset "titik awal" terpisah. Jika Anda punya titik awal
# (misal lokasi wisatawan/penduduk), tambahkan koordinatnya ke
# shelters_clean.csv (atau file terpisah) sebelum menjalankan skrip ini,
# lalu jalankan ulang fungsi compute_bbox().

BBOX_PADDING_DEG = 0.01

def compute_bbox(df, padding=BBOX_PADDING_DEG):
    valid = df[df["validCoordinate"] == True]
    south = valid["lat"].min() - padding
    north = valid["lat"].max() + padding
    west = valid["lon"].min() - padding
    east = valid["lon"].max() + padding
    return south, west, north, east


# -----------------------------------------------------------------------
# 2. AMBIL JARINGAN JALAN PEJALAN KAKI DARI OSM (via OSMnx / Overpass)
# -----------------------------------------------------------------------
# network_type="walk" di OSMnx secara otomatis:
#   - menyaring highway=motorway/trunk dan jalan yang access=private/no
#   - mengizinkan footway, path, pedestrian, living_street, residential,
#     service, steps, track, serta jalan umum yang punya foot=yes/permissive
#   - membuang ruas dengan foot=no secara eksplisit
# Ini menjawab syarat #7 (ikuti akses pejalan kaki, hindari yang tidak bisa
# dilewati pejalan kaki) tanpa perlu menulis filter Overpass QL manual yang
# rawan salah pakai tag.

def fetch_pedestrian_graph(south, west, north, east):
    bbox = (north, south, east, west)  # OSMnx>=2.0 urutan: north,south,east,west
    G = ox.graph_from_bbox(
        bbox=bbox,
        network_type="walk",
        simplify=True,
        retain_all=False,   # buang sub-graph kecil yang tidak terhubung ke komponen utama
    )
    # OSMnx graph sudah punya panjang edge dalam meter di atribut 'length'
    return G


# -----------------------------------------------------------------------
# 3. REPRESENTASI node / edge SESUAI SPESIFIKASI
# -----------------------------------------------------------------------

def graph_to_nodes_edges(G):
    nodes = []
    for node_id, data in G.nodes(data=True):
        nodes.append({
            "id": str(node_id),
            "latitude": data["y"],
            "longitude": data["x"],
        })

    edges = []
    for u, v, data in G.edges(data=True):
        edges.append({
            "from": str(u),
            "to": str(v),
            "distanceMeters": round(float(data.get("length", 0.0)), 2),
        })
    return nodes, edges


# -----------------------------------------------------------------------
# 4-6. NEAREST-NODE SNAPPING SHELTER -> NODE JALAN (haversine, BUKAN tebakan visual)
# -----------------------------------------------------------------------

def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def snap_shelters(shelters_df, G, max_snap_distance_m=300.0):
    """
    Menggunakan ox.distance.nearest_nodes (berbasis k-d tree / BallTree pada
    koordinat geografis sebenarnya, bukan perkiraan visual piksel) untuk tiap
    shelter dengan koordinat valid. Hasil divalidasi ulang dengan haversine
    untuk mendapatkan snapDistanceMeters yang presisi.
    """
    results = []
    failed = []

    for _, row in shelters_df.iterrows():
        if not row["validCoordinate"]:
            failed.append({
                "shelterId": row["shelterId"],
                "name": row["namaSesuaiPaper"],
                "reason": "Tidak ada koordinat valid pada data sumber",
            })
            continue

        try:
            nearest_node = ox.distance.nearest_nodes(G, X=row["lon"], Y=row["lat"])
        except Exception as e:
            failed.append({
                "shelterId": row["shelterId"],
                "name": row["namaSesuaiPaper"],
                "reason": f"Gagal mencari node terdekat: {e}",
            })
            continue

        node_data = G.nodes[nearest_node]
        dist = haversine_m(row["lat"], row["lon"], node_data["y"], node_data["x"])

        if dist > max_snap_distance_m:
            failed.append({
                "shelterId": row["shelterId"],
                "name": row["namaSesuaiPaper"],
                "reason": (f"Node jalan terdekat berjarak {dist:.1f} m, "
                           f"melebihi ambang {max_snap_distance_m} m -- "
                           f"kemungkinan shelter berada di luar jaringan "
                           f"jalan pejalan kaki yang ter-mapping di OSM."),
            })
            continue

        results.append({
            "shelterId": row["shelterId"],
            "shelterLat": row["lat"],
            "shelterLon": row["lon"],
            "nearestNodeId": str(nearest_node),
            "snapDistanceMeters": round(dist, 2),
        })

    return results, failed


# -----------------------------------------------------------------------
# 7. UJI KONEKTIVITAS GRAPH
# -----------------------------------------------------------------------

def connectivity_report(G, snapped_shelters):
    G_undirected = G.to_undirected()
    components = list(nx.connected_components(G_undirected))
    components.sort(key=len, reverse=True)
    largest = components[0] if components else set()

    shelter_in_main_component = []
    shelter_isolated = []
    for s in snapped_shelters:
        node_id = s["nearestNodeId"]
        # node IDs in nx graph are original (int) types; compare as str
        in_main = any(str(n) == node_id for n in largest)
        (shelter_in_main_component if in_main else shelter_isolated).append(s["shelterId"])

    return {
        "totalNodes": G.number_of_nodes(),
        "totalEdges": G.number_of_edges(),
        "numConnectedComponents": len(components),
        "largestComponentSize": len(largest),
        "sheltersInMainComponent": shelter_in_main_component,
        "sheltersInIsolatedComponent": shelter_isolated,
    }


# -----------------------------------------------------------------------
# MAIN
# -----------------------------------------------------------------------

def main(shelters_csv, output_json):
    df = pd.read_csv(shelters_csv)
    df["validCoordinate"] = df["validCoordinate"].astype(str).str.upper() == "TRUE"

    south, west, north, east = compute_bbox(df)
    print(f"Bounding box: south={south:.5f}, west={west:.5f}, north={north:.5f}, east={east:.5f}")

    G = fetch_pedestrian_graph(south, west, north, east)
    nodes, edges = graph_to_nodes_edges(G)

    snapped, failed = snap_shelters(df, G)
    conn = connectivity_report(G, snapped)

    output = {
        "metadata": {
            "sumberData": "OpenStreetMap contributors, via OSMnx/Overpass API "
                           "(overpass-api.de), network_type='walk'",
            "queryDescription": (
                "ox.graph_from_bbox(bbox=(north,south,east,west), "
                "network_type='walk', simplify=True, retain_all=False)"
            ),
            "boundingBox": {"south": south, "west": west, "north": north, "east": east},
            "tanggalPengambilanData": datetime.now(timezone.utc).isoformat(),
            "disclaimer": (
                "Graph ini adalah jaringan jalan dari OpenStreetMap untuk "
                "keperluan prototipe akademik (skripsi/penelitian A* routing). "
                "INI BUKAN data resmi jalur evakuasi tsunami dan tidak boleh "
                "digunakan sebagai rujukan tunggal keselamatan jiwa. Verifikasi "
                "lapangan oleh BPBD/instansi terkait tetap diperlukan untuk "
                "penggunaan operasional."
            ),
        },
        "nodes": nodes,
        "edges": edges,
        "shelterSnapping": snapped,
        "shelterSnapFailed": failed,
        "connectivityTest": conn,
    }

    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Nodes: {len(nodes)}, Edges: {len(edges)}")
    print(f"Shelter terhubung: {len(snapped)}, gagal: {len(failed)}")
    print(f"Komponen graph: {conn['numConnectedComponents']} "
          f"(komponen terbesar: {conn['largestComponentSize']} node)")
    if conn["sheltersInIsolatedComponent"]:
        print("PERINGATAN -- shelter di komponen terisolasi (tidak terhubung "
              f"ke komponen utama): {conn['sheltersInIsolatedComponent']}")


if __name__ == "__main__":
    shelters_csv = sys.argv[1] if len(sys.argv) > 1 else "shelters_clean.csv"
    output_json = sys.argv[2] if len(sys.argv) > 2 else "pedestrian_graph_pangandaran.json"
    main(shelters_csv, output_json)
