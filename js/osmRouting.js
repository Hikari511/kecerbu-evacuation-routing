import { astarGraph } from './astarGraph.js';

export const JOURNAL_WALK_SPEED_MPS = 2.5 / 3.6;

export function graphEdgeKey(from, to) {
  return `${from}-${to}`;
}

/**
 * Buat adjacency list aktif setelah edge hambatan dikeluarkan.
 * Set blockedEdges menyimpan key berarah; caller dapat memasukkan dua arah.
 */
export function filterBlockedEdges(baseGraph, blockedEdges) {
  return Object.fromEntries(
    Object.entries(baseGraph).map(([from, edges]) => [
      from,
      edges.filter(edge => !blockedEdges.has(graphEdgeKey(from, edge.to))),
    ])
  );
}

/**
 * Hitung dan urutkan semua rute shelter yang dapat dicapai.
 *
 * Kriteria ranking saat ini hanya total jarak pedestrian:
 * snap start + jarak graph + snap shelter.
 */
export function rankShelterRoutes(graph, nodes, start, shelters) {
  const routes = [];

  for (const shelter of shelters) {
    const result = astarGraph(
      graph,
      nodes,
      start.nearestNodeId,
      shelter.nearestNodeId
    );
    if (!result.found) continue;

    const totalDistance =
      start.snapDistanceMeters +
      result.totalCost +
      shelter.snapDistanceMeters;

    routes.push({
      shelter,
      result,
      totalDistance,
      timeMinutes: totalDistance / JOURNAL_WALK_SPEED_MPS / 60,
    });
  }

  return routes.sort((a, b) => a.totalDistance - b.totalDistance);
}
