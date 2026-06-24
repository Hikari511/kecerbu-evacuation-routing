"""
Build EvaTour's pedestrian OSM graph and snap Husa (2019) shelters.

Usage:
    python scripts/build_osm_graph.py

Requires:
    pip install osmnx networkx pandas numpy scikit-learn
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import networkx as nx
import osmnx as ox
import pandas as pd
from pyproj import Transformer
from shapely.geometry import LineString, Point
from shapely.ops import substring


BBOX_PADDING_DEG = 0.005
MAX_SNAP_DISTANCE_METERS = 100.0
SNAP_METHOD = "edge"
DEFAULT_INPUT = "data/shelters_verified.csv"
DEFAULT_OUTPUT = "data/pedestrian_graph_pangandaran.json"

# Starting points from Wijayanto et al. (2025), Table 3.
START_POINTS = [
    {
        "startId": "V1",
        "name": "Pantai Timur",
        "lat": -(7 + 41 / 60 + 46.44 / 3600),
        "lon": 108 + 39 / 60 + 37.30 / 3600,
    },
    {
        "startId": "V25",
        "name": "Pantai Barat",
        "lat": -(7 + 41 / 60 + 46.06 / 3600),
        "lon": 108 + 39 / 60 + 14.74 / 3600,
    },
]


def load_shelters(csv_path):
    frame = pd.read_csv(csv_path)
    frame["validCoordinate"] = (
        frame["validCoordinate"].astype(str).str.upper() == "TRUE"
    )
    for column in ("lat", "lon", "capacity", "elevationMeters"):
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
    return frame


def compute_bbox(shelters, padding=BBOX_PADDING_DEG):
    valid = shelters[
        shelters["validCoordinate"]
        & shelters["lat"].notna()
        & shelters["lon"].notna()
    ]
    latitudes = valid["lat"].tolist() + [point["lat"] for point in START_POINTS]
    longitudes = valid["lon"].tolist() + [point["lon"] for point in START_POINTS]
    return {
        "west": min(longitudes) - padding,
        "south": min(latitudes) - padding,
        "east": max(longitudes) + padding,
        "north": max(latitudes) + padding,
    }


def fetch_pedestrian_graph(bbox):
    # OSMnx 2.x uses (left, bottom, right, top).
    bounds = (bbox["west"], bbox["south"], bbox["east"], bbox["north"])
    return ox.graph_from_bbox(
        bbox=bounds,
        network_type="walk",
        simplify=True,
        retain_all=True,
    )


def serializable(value):
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (list, tuple)):
        return [serializable(item) for item in value]
    return str(value)


def serialize_geometry(geometry):
    if geometry is None:
        return None
    return [[lat, lon] for lon, lat in geometry.coords]


def graph_to_json(graph):
    nodes = [
        {"id": str(node_id), "lat": float(data["y"]), "lon": float(data["x"])}
        for node_id, data in graph.nodes(data=True)
    ]
    edges = []
    for from_id, to_id, key, data in graph.edges(keys=True, data=True):
        edges.append({
            "from": str(from_id),
            "to": str(to_id),
            "key": int(key),
            "distanceMeters": round(float(data.get("length", 0.0)), 3),
            "name": serializable(data.get("name")),
            "highway": serializable(data.get("highway")),
            "oneway": bool(data.get("oneway", False)),
            "geometry": serialize_geometry(data.get("geometry")),
        })
    return nodes, edges


def component_lookup(graph):
    components = list(nx.connected_components(graph.to_undirected()))
    components.sort(key=len, reverse=True)
    lookup = {}
    for component_id, component in enumerate(components):
        for node_id in component:
            lookup[node_id] = component_id
    return components, lookup


def snap_point(graph, lon, lat):
    node_id, distance = ox.distance.nearest_nodes(
        graph, X=lon, Y=lat, return_dist=True
    )
    return node_id, float(distance)


def edge_geometry(graph, from_id, to_id, key):
    data = graph.edges[from_id, to_id, key]
    if data.get("geometry") is not None:
        return data["geometry"]
    from_node = graph.nodes[from_id]
    to_node = graph.nodes[to_id]
    return LineString([
        (from_node["x"], from_node["y"]),
        (to_node["x"], to_node["y"]),
    ])


def reverse_linestring(line):
    return LineString(list(line.coords)[::-1])


def transform_linestring(line, transformer):
    return LineString([transformer.transform(x, y) for x, y in line.coords])


def add_virtual_shelter_node(graph, shelter_id, snap):
    virtual_id = f"shelter:{shelter_id}"
    graph.add_node(
        virtual_id,
        x=snap["lon"],
        y=snap["lat"],
        virtual=True,
        shelterId=shelter_id,
    )

    edge_name = "virtual shelter connector"
    highway = "connector"

    graph.add_edge(
        snap["from"],
        virtual_id,
        key=0,
        length=snap["distanceFromU"],
        name=edge_name,
        highway=highway,
        geometry=snap["geometryFromU"],
    )
    graph.add_edge(
        virtual_id,
        snap["from"],
        key=0,
        length=snap["distanceFromU"],
        name=edge_name,
        highway=highway,
        geometry=reverse_linestring(snap["geometryFromU"]),
    )
    graph.add_edge(
        virtual_id,
        snap["to"],
        key=0,
        length=snap["distanceToV"],
        name=edge_name,
        highway=highway,
        geometry=snap["geometryToV"],
    )
    graph.add_edge(
        snap["to"],
        virtual_id,
        key=0,
        length=snap["distanceToV"],
        name=edge_name,
        highway=highway,
        geometry=reverse_linestring(snap["geometryToV"]),
    )
    return virtual_id


def snap_to_edge(graph, projected_graph, to_projected, to_latlon, lon, lat):
    x, y = to_projected.transform(lon, lat)
    (from_id, to_id, key), distance = ox.distance.nearest_edges(
        projected_graph,
        X=x,
        Y=y,
        return_dist=True,
    )

    line_projected = edge_geometry(projected_graph, from_id, to_id, key)
    projected_point = Point(x, y)
    position = line_projected.project(projected_point)
    snapped_projected = line_projected.interpolate(position)
    snapped_lon, snapped_lat = to_latlon.transform(
        snapped_projected.x,
        snapped_projected.y,
    )

    line_length = line_projected.length
    distance_from_u = position
    distance_to_v = max(0.0, line_length - position)

    geometry_from_u_projected = substring(line_projected, 0, position)
    geometry_to_v_projected = substring(line_projected, position, line_length)

    # substring can collapse to a Point when the shelter snaps exactly to an
    # endpoint. Keep a valid LineString so the frontend can serialize geometry.
    if geometry_from_u_projected.geom_type != "LineString":
        geometry_from_u_projected = LineString([
            line_projected.coords[0],
            (snapped_projected.x, snapped_projected.y),
        ])
    if geometry_to_v_projected.geom_type != "LineString":
        geometry_to_v_projected = LineString([
            (snapped_projected.x, snapped_projected.y),
            line_projected.coords[-1],
        ])

    return {
        "from": from_id,
        "to": to_id,
        "key": key,
        "distance": float(distance),
        "lat": float(snapped_lat),
        "lon": float(snapped_lon),
        "distanceFromU": float(distance_from_u),
        "distanceToV": float(distance_to_v),
        "geometryFromU": transform_linestring(geometry_from_u_projected, to_latlon),
        "geometryToV": transform_linestring(geometry_to_v_projected, to_latlon),
    }


def optional_number(value, integer=False):
    if pd.isna(value):
        return None
    return int(value) if integer else float(value)


def snap_shelters(frame, graph, projected_graph, to_projected, to_latlon):
    snapped = []
    failed = []
    for _, row in frame.iterrows():
        base = {
            "shelterId": row["shelterId"],
            "name": row["namaSesuaiPaper"],
            "modernName": row["namaModern"],
            "statusShelter": row["statusShelter"],
            "capacity": optional_number(row["capacity"], integer=True),
            "elevationMeters": optional_number(row["elevationMeters"]),
            "confidence": row["tingkatKeyakinan"],
            "sourceTable": row["sourceTable"],
            "sourceMethod": row["sourceMethod"],
            "sourceUrl": None if pd.isna(row["sourceUrl"]) else row["sourceUrl"],
        }
        if (
            not row["validCoordinate"]
            or pd.isna(row["lat"])
            or pd.isna(row["lon"])
        ):
            failed.append({**base, "reason": "missing or unverified coordinates"})
            continue

        snap = snap_to_edge(
            graph,
            projected_graph,
            to_projected,
            to_latlon,
            float(row["lon"]),
            float(row["lat"]),
        )
        result = {
            **base,
            "lat": float(row["lat"]),
            "lon": float(row["lon"]),
            "snapMethod": SNAP_METHOD,
            "snapDistanceMeters": round(snap["distance"], 3),
            "nearestEdge": {
                "from": str(snap["from"]),
                "to": str(snap["to"]),
                "key": int(snap["key"]),
            },
            "snappedLat": snap["lat"],
            "snappedLon": snap["lon"],
        }
        if snap["distance"] > MAX_SNAP_DISTANCE_METERS:
            failed.append({
                **result,
                "reason": (
                    f"nearest pedestrian edge is {snap['distance']:.1f} m away; "
                    f"threshold is {MAX_SNAP_DISTANCE_METERS:.0f} m"
                ),
            })
        else:
            virtual_node_id = add_virtual_shelter_node(
                graph,
                row["shelterId"],
                snap,
            )
            result["nearestNodeId"] = virtual_node_id
            snapped.append(result)
    return snapped, failed


def snap_starts(graph, components):
    output = []
    for start in START_POINTS:
        node_id, distance = snap_point(graph, start["lon"], start["lat"])
        output.append({
            **start,
            "nearestNodeId": str(node_id),
            "snapDistanceMeters": round(distance, 3),
            "componentId": components.get(node_id),
        })
    return output


def reachability_by_start(starts, shelters):
    return {
        start["startId"]: {
            "componentId": start["componentId"],
            "reachableShelterIds": [
                shelter["shelterId"]
                for shelter in shelters
                if shelter["componentId"] == start["componentId"]
            ],
        }
        for start in starts
    }


def main(input_csv=DEFAULT_INPUT, output_json=DEFAULT_OUTPUT):
    shelters = load_shelters(input_csv)
    bbox = compute_bbox(shelters)
    print("Bounding box:", bbox)

    graph = fetch_pedestrian_graph(bbox)
    projected_graph = ox.project_graph(graph)
    to_projected = Transformer.from_crs(
        graph.graph["crs"],
        projected_graph.graph["crs"],
        always_xy=True,
    )
    to_latlon = Transformer.from_crs(
        projected_graph.graph["crs"],
        graph.graph["crs"],
        always_xy=True,
    )
    snapped_shelters, failed_shelters = snap_shelters(
        shelters,
        graph,
        projected_graph,
        to_projected,
        to_latlon,
    )
    component_sets, component_ids = component_lookup(graph)
    for shelter in snapped_shelters:
        shelter["componentId"] = component_ids.get(shelter["nearestNodeId"])
    nodes, edges = graph_to_json(graph)
    starts = snap_starts(graph, component_ids)
    reachability = reachability_by_start(starts, snapped_shelters)

    output = {
        "metadata": {
            "title": "EvaTour Pangandaran pedestrian OSM graph",
            "retrievedAtUtc": datetime.now(timezone.utc).isoformat(),
            "osmSource": "OpenStreetMap contributors via OSMnx/Overpass",
            "osmnxVersion": ox.__version__,
            "networkType": "walk",
            "bbox": bbox,
            "bboxOrder": "west,south,east,north",
            "retainAllComponents": True,
            "shelterSnapMethod": SNAP_METHOD,
            "maxSnapDistanceMeters": MAX_SNAP_DISTANCE_METERS,
            "warning": "Academic prototype; not official evacuation-route data.",
        },
        "nodes": nodes,
        "edges": edges,
        "startPoints": starts,
        "shelters": snapped_shelters,
        "failedShelters": failed_shelters,
        "connectivityTest": {
            "nodeCount": graph.number_of_nodes(),
            "edgeCount": graph.number_of_edges(),
            "componentCount": len(component_sets),
            "componentSizesDescending": [len(c) for c in component_sets],
            "reachabilityFromStarts": reachability,
        },
    }

    target = Path(output_json)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(
        f"nodes={len(nodes)}, edges={len(edges)}, "
        f"shelters={len(snapped_shelters)}, failed={len(failed_shelters)}"
    )
    for start_id, report in reachability.items():
        print(
            f"{start_id}: {len(report['reachableShelterIds'])} reachable shelters"
        )


if __name__ == "__main__":
    source = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_INPUT
    target = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUTPUT
    main(source, target)
