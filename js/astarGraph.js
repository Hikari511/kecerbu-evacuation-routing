/**
 * A* untuk weighted graph jalan.
 *
 * Berbeda dari astar.js yang memakai grid 2D, modul ini menerima adjacency
 * list. Heuristik menggunakan Haversine distance antarkoordinat geografis.
 */

class GraphMinHeap {
  constructor() {
    this.data = [];
  }

  get size() {
    return this.data.length;
  }

  push(item) {
    this.data.push(item);
    let index = this.data.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.data[parent].priority <= item.priority) break;
      this.data[index] = this.data[parent];
      index = parent;
    }
    this.data[index] = item;
  }

  pop() {
    if (this.data.length === 0) return null;
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length === 0) return top;

    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.data.length) break;

      let smallest = left;
      if (
        right < this.data.length &&
        this.data[right].priority < this.data[left].priority
      ) {
        smallest = right;
      }
      if (this.data[smallest].priority >= last.priority) break;

      this.data[index] = this.data[smallest];
      index = smallest;
    }
    this.data[index] = last;
    return top;
  }
}

export function haversineDistance(a, b) {
  const earthRadiusMeters = 6371000;
  const toRadians = degrees => degrees * Math.PI / 180;
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLon = toRadians(b.lon - a.lon);

  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);
  const h = sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function astarGraph(graph, nodes, startId, goalId) {
  if (!nodes[startId] || !nodes[goalId] || !graph[startId] || !graph[goalId]) {
    return {
      found: false,
      path: [],
      totalCost: 0,
      nodesExplored: 0,
      exploredNodes: [],
    };
  }

  const open = new GraphMinHeap();
  const gScore = Object.fromEntries(Object.keys(nodes).map(id => [id, Infinity]));
  const cameFrom = {};
  const closed = new Set();
  const exploredNodes = [];

  gScore[startId] = 0;
  open.push({
    id: startId,
    priority: haversineDistance(nodes[startId], nodes[goalId]),
    g: 0,
  });

  while (open.size > 0) {
    const current = open.pop();
    if (closed.has(current.id)) continue;

    closed.add(current.id);
    exploredNodes.push(current.id);

    if (current.id === goalId) {
      const path = reconstructGraphPath(cameFrom, startId, goalId);
      return {
        found: true,
        path,
        totalCost: gScore[goalId],
        nodesExplored: exploredNodes.length,
        exploredNodes,
      };
    }

    for (const edge of graph[current.id]) {
      if (closed.has(edge.to)) continue;
      const tentativeG = gScore[current.id] + edge.distance;

      if (tentativeG < gScore[edge.to]) {
        gScore[edge.to] = tentativeG;
        cameFrom[edge.to] = current.id;
        const h = haversineDistance(nodes[edge.to], nodes[goalId]);
        open.push({ id: edge.to, priority: tentativeG + h, g: tentativeG });
      }
    }
  }

  return {
    found: false,
    path: [],
    totalCost: 0,
    nodesExplored: exploredNodes.length,
    exploredNodes,
  };
}

function reconstructGraphPath(cameFrom, startId, goalId) {
  const path = [goalId];
  let current = goalId;

  while (current !== startId) {
    current = cameFrom[current];
    if (!current) return [];
    path.push(current);
  }

  return path.reverse();
}

export function findNearestGraphNode(nodes, lat, lon) {
  const target = { lat, lon };
  let nearest = null;

  for (const node of Object.values(nodes)) {
    const distance = haversineDistance(target, node);
    if (!nearest || distance < nearest.distance) {
      nearest = { node, distance };
    }
  }

  return nearest;
}
