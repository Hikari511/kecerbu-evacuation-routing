import { haversineDistance } from './astarGraph.js';
import {
  filterBlockedEdges,
  graphEdgeKey,
  rankShelterRoutes,
} from './osmRouting.js';

const GRAPH_URL = './data/pedestrian_graph_pangandaran.json';

const state = {
  map: null,
  raw: null,
  nodes: {},
  baseGraph: {},
  graph: {},
  edgeLookup: new Map(),
  routeLayer: null,
  startMarker: null,
  snapMarker: null,
  snapConnector: null,
  shelterLayer: null,
  failedLayer: null,
  nodeLayer: null,
  nodeMarkers: [],
  shelterMarkers: new Map(),
  nodesVisible: false,
  blockedEdges: new Set(),
  blockageLayer: null,
  reportMode: false,
  activeStart: null,
  activeBest: null,
  activeInfoId: 'osmGraphInfoPanel',
  activeRankingId: 'osmShelterRanking',
};

export async function initOsmGraphView(
  mapId = 'osmGraphMap',
  infoId = 'osmGraphInfoPanel',
  rankingId = 'osmShelterRanking'
) {
  const mapElement = document.getElementById(mapId);
  if (!mapElement || !window.L || state.map) return;

  updateInfo(infoId, 'Memuat graph pedestrian OpenStreetMap...');

  try {
    const response = await fetch(GRAPH_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    state.raw = await response.json();
    prepareGraph(state.raw);
    initMap(mapElement, infoId, rankingId);
  } catch (error) {
    updateInfo(
      infoId,
      `Graph OSM gagal dimuat: ${error.message}\n` +
      'Jalankan aplikasi melalui local web server, bukan file://.'
    );
  }
}

function prepareGraph(data) {
  state.nodes = Object.fromEntries(
    data.nodes.map(node => [
      node.id,
      { id: node.id, lat: node.lat, lon: node.lon },
    ])
  );
  state.baseGraph = Object.fromEntries(data.nodes.map(node => [node.id, []]));

  for (const edge of data.edges) {
    if (!state.baseGraph[edge.from] || !state.baseGraph[edge.to]) continue;
    const lookupKey = `${edge.from}-${edge.to}`;
    const existing = state.edgeLookup.get(lookupKey);

    if (!existing || edge.distanceMeters < existing.distanceMeters) {
      state.edgeLookup.set(lookupKey, edge);
    }
  }

  for (const edge of state.edgeLookup.values()) {
    state.baseGraph[edge.from].push({
      to: edge.to,
      distance: edge.distanceMeters,
    });
  }
  state.graph = filterBlockedEdges(state.baseGraph, state.blockedEdges);
}

function initMap(mapElement, infoId, rankingId) {
  const bbox = state.raw.metadata.bbox;
  state.map = window.L.map(mapElement);
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(state.map);

  state.map.fitBounds([
    [bbox.south, bbox.west],
    [bbox.north, bbox.east],
  ]);

  drawShelters();
  state.blockageLayer = window.L.layerGroup().addTo(state.map);
  state.map.on('click', event => {
    if (state.reportMode) {
      reportBlockageAt(event.latlng);
      return;
    }
    runFromCoordinate(event.latlng.lat, event.latlng.lng, infoId, rankingId);
  });
  state.map.on('zoomend', updateOsmNodePresentation);

  const east = state.raw.startPoints.find(start => start.startId === 'V1');
  if (east) {
    runFromStartPoint(east, infoId, rankingId);
  }
}

function drawShelters() {
  state.shelterLayer = window.L.layerGroup().addTo(state.map);
  state.failedLayer = window.L.layerGroup().addTo(state.map);

  for (const shelter of state.raw.shelters) {
    const marker = window.L.marker(
      [shelter.lat, shelter.lon],
      { icon: createShelterIcon(shelter, false) }
    );
    marker.bindTooltip(
      `<strong>${shelter.name}</strong><br>` +
      `Snap ke edge: ${shelter.snapDistanceMeters.toFixed(1)} m<br>` +
      `Kapasitas: ${shelter.capacity ?? 'tidak tersedia'}`
    );
    marker.addTo(state.shelterLayer);
    state.shelterMarkers.set(shelter.shelterId, marker);
  }

  for (const shelter of state.raw.failedShelters) {
    if (shelter.lat == null || shelter.lon == null) continue;
    window.L.circleMarker([shelter.lat, shelter.lon], {
      radius: 5,
      color: '#b71c1c',
      weight: 2,
      fillColor: '#ef9a9a',
      fillOpacity: 0.8,
    }).bindTooltip(
      `<strong>${shelter.name}</strong><br>Tidak lolos audit: ${shelter.reason}`
    ).addTo(state.failedLayer);
  }
}

function createShelterIcon(shelter, selected) {
  const statusClass = shelter.statusShelter === 'existing'
    ? 'shelter-existing'
    : 'shelter-potential';
  return window.L.divIcon({
    className: '',
    html: `
      <div class="osm-shelter-marker ${statusClass} ${selected ? 'shelter-selected' : ''}">
        S
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function runOsmGraphScenario(
  startId,
  infoId = 'osmGraphInfoPanel',
  rankingId = 'osmShelterRanking'
) {
  if (!state.raw) return;
  const start = state.raw.startPoints.find(item => item.startId === startId);
  if (start) runFromStartPoint(start, infoId, rankingId);
}

function runFromStartPoint(start, infoId, rankingId) {
  runBestShelterRoute({
    lat: start.lat,
    lon: start.lon,
    nearestNodeId: start.nearestNodeId,
    snapDistanceMeters: start.snapDistanceMeters,
    label: `${start.name} (${start.startId})`,
  }, infoId, rankingId);
}

function runFromCoordinate(lat, lon, infoId, rankingId) {
  const nearest = findNearestNode(lat, lon);
  if (!nearest) return;
  runBestShelterRoute({
    lat,
    lon,
    nearestNodeId: nearest.node.id,
    snapDistanceMeters: nearest.distance,
    label: 'Titik klik pengguna',
  }, infoId, rankingId);
}

function findNearestNode(lat, lon) {
  const target = { lat, lon };
  let nearest = null;
  for (const node of Object.values(state.nodes)) {
    const distance = haversineDistance(target, node);
    if (!nearest || distance < nearest.distance) {
      nearest = { node, distance };
    }
  }
  return nearest;
}

function runBestShelterRoute(start, infoId, rankingId) {
  state.activeStart = start;
  state.activeInfoId = infoId;
  state.activeRankingId = rankingId;
  const t0 = performance.now();
  const ranking = rankShelterRoutes(
    state.graph,
    state.nodes,
    start,
    state.raw.shelters
  );
  const best = ranking[0];
  state.activeBest = best ?? null;

  if (!best) {
    updateInfo(infoId, 'Tidak ada shelter yang dapat dicapai dari titik ini.');
    renderRanking(rankingId, []);
    return;
  }

  drawRoute(start, best);
  highlightSelectedShelter(best.shelter);
  renderRanking(rankingId, ranking.slice(0, 3));
  const elapsed = performance.now() - t0;

  updateInfo(
    infoId,
    `Rute OSM multi-shelter ditemukan\n` +
    `Dari: ${start.label}\n` +
    `Start node OSM: ${start.nearestNodeId}\n` +
    `Snap start: ${start.snapDistanceMeters.toFixed(1)} meter\n` +
    `Rute pedestrian terpendek: ${best.shelter.name}\n` +
    `Status: ${best.shelter.statusShelter}\n` +
    `Kapasitas: ${best.shelter.capacity ?? 'tidak tersedia'} jiwa\n` +
    `Elevasi: ${best.shelter.elevationMeters ?? 'tidak tersedia'} meter\n` +
    `Snap shelter ke edge: ${best.shelter.snapDistanceMeters.toFixed(1)} meter\n` +
    `Jarak graph: ${best.result.totalCost.toFixed(1)} meter\n` +
    `Total termasuk snapping: ${best.totalDistance.toFixed(1)} meter\n` +
    `Estimasi waktu (2,5 km/jam): ${best.timeMinutes.toFixed(2)} menit\n` +
    `Node dieksplorasi: ${best.result.nodesExplored}\n` +
    `Waktu komputasi: ${elapsed.toFixed(2)} ms\n` +
    `Kandidat lolos audit: ${state.raw.shelters.length}\n` +
    `Kandidat gagal audit: ${state.raw.failedShelters.length}\n\n` +
    `Hambatan aktif: ${state.blockedEdges.size / 2} ruas\n` +
    `Catatan: peringkat berdasarkan jarak pedestrian, bukan tingkat keamanan.`
  );
}

function highlightSelectedShelter(selectedShelter) {
  for (const shelter of state.raw.shelters) {
    const marker = state.shelterMarkers.get(shelter.shelterId);
    if (!marker) continue;
    marker.setIcon(
      createShelterIcon(
        shelter,
        shelter.shelterId === selectedShelter.shelterId
      )
    );
  }
}

function renderRanking(rankingId, routes) {
  const container = document.getElementById(rankingId);
  if (!container) return;

  if (routes.length === 0) {
    container.innerHTML = '<p class="ranking-empty">Tidak ada kandidat yang dapat dicapai.</p>';
    return;
  }

  container.innerHTML = routes.map((route, index) => {
    const shelter = route.shelter;
    const withinWindow = route.timeMinutes <= 40;
    return `
      <article class="ranking-card ${index === 0 ? 'ranking-winner' : ''}">
        <div class="ranking-position">${index + 1}</div>
        <div class="ranking-content">
          <strong>${escapeHtml(shelter.name)}</strong>
          <span>${route.totalDistance.toFixed(1)} m · ${route.timeMinutes.toFixed(2)} menit</span>
          <small>
            ${escapeHtml(shelter.statusShelter)} · kapasitas ${shelter.capacity ?? '-'} ·
            elevasi ${shelter.elevationMeters ?? '-'} m
          </small>
          <em class="${withinWindow ? 'time-ok' : 'time-warning'}">
            ${withinWindow ? 'Dalam batas 40 menit' : 'Melewati batas 40 menit'}
          </em>
        </div>
      </article>
    `;
  }).join('');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function drawRoute(start, best) {
  if (state.routeLayer) state.routeLayer.remove();
  if (state.startMarker) state.startMarker.remove();
  if (state.snapMarker) state.snapMarker.remove();
  if (state.snapConnector) state.snapConnector.remove();

  const snappedNode = state.nodes[start.nearestNodeId];
  const latLngs = [[start.lat, start.lon], [snappedNode.lat, snappedNode.lon]];
  const graphPath = best.result.path;

  for (let i = 1; i < graphPath.length; i++) {
    appendEdgeGeometry(latLngs, graphPath[i - 1], graphPath[i]);
  }
  latLngs.push([best.shelter.lat, best.shelter.lon]);

  state.routeLayer = window.L.polyline(latLngs, {
    color: '#d84315',
    weight: 6,
    opacity: 0.95,
  }).addTo(state.map);

  state.startMarker = window.L.circleMarker([start.lat, start.lon], {
    radius: 8,
    color: '#880e4f',
    fillColor: '#e91e63',
    fillOpacity: 1,
    weight: 3,
  }).bindTooltip(start.label).addTo(state.map);

  state.snapMarker = window.L.circleMarker(
    [snappedNode.lat, snappedNode.lon],
    {
      radius: 6,
      color: '#0d47a1',
      fillColor: '#42a5f5',
      fillOpacity: 1,
      weight: 2,
    }
  ).bindTooltip(`Start node OSM: ${start.nearestNodeId}`).addTo(state.map);

  state.snapConnector = window.L.polyline(
    [[start.lat, start.lon], [snappedNode.lat, snappedNode.lon]],
    {
      color: '#ad1457',
      weight: 3,
      dashArray: '6 5',
      opacity: 0.9,
    }
  ).addTo(state.map);

  state.map.fitBounds(state.routeLayer.getBounds(), { padding: [30, 30] });
}

function appendEdgeGeometry(latLngs, from, to) {
  const edge = state.edgeLookup.get(`${from}-${to}`);
  if (edge?.geometry?.length) {
    for (const coordinate of edge.geometry) {
      latLngs.push(coordinate);
    }
    return;
  }

  const node = state.nodes[to];
  latLngs.push([node.lat, node.lon]);
}

function updateInfo(infoId, text) {
  const panel = document.getElementById(infoId);
  if (panel) panel.textContent = text;
}

export function showAllOsmShelters() {
  if (!state.map || !state.raw) return;
  const points = [
    ...state.raw.shelters.map(shelter => [shelter.lat, shelter.lon]),
    ...state.raw.failedShelters
      .filter(shelter => shelter.lat != null && shelter.lon != null)
      .map(shelter => [shelter.lat, shelter.lon]),
  ];
  if (points.length > 0) {
    state.map.fitBounds(points, { padding: [30, 30] });
  }
}

export function toggleOsmNodes() {
  if (!state.map || !state.raw) return false;

  if (!state.nodeLayer) {
    const renderer = window.L.canvas({ padding: 0.5 });
    const style = getOsmNodeStyle();
    state.nodeLayer = window.L.layerGroup();
    for (const node of state.raw.nodes) {
      const marker = window.L.circleMarker([node.lat, node.lon], {
        renderer,
        radius: style.radius,
        stroke: true,
        color: '#083c75',
        weight: style.weight,
        fillColor: '#1565c0',
        fillOpacity: style.fillOpacity,
        interactive: true,
      }).bindTooltip(`Node OSM ${node.id}`);
      marker.addTo(state.nodeLayer);
      state.nodeMarkers.push(marker);
    }
  }

  if (state.nodesVisible) {
    state.nodeLayer.remove();
    state.nodesVisible = false;
  } else {
    state.nodeLayer.addTo(state.map);
    state.nodesVisible = true;
  }
  return state.nodesVisible;
}

function getOsmNodeStyle() {
  const zoom = state.map?.getZoom() ?? 14;
  if (zoom >= 18) return { radius: 7, weight: 2, fillOpacity: 0.95 };
  if (zoom >= 16) return { radius: 5, weight: 2, fillOpacity: 0.9 };
  if (zoom >= 15) return { radius: 3.5, weight: 1.5, fillOpacity: 0.82 };
  return { radius: 2.5, weight: 1, fillOpacity: 0.72 };
}

function updateOsmNodePresentation() {
  if (!state.nodeMarkers.length) return;
  const style = getOsmNodeStyle();
  for (const marker of state.nodeMarkers) {
    marker.setStyle({
      radius: style.radius,
      weight: style.weight,
      fillOpacity: style.fillOpacity,
    });
  }
}

export function toggleBlockageReportMode() {
  state.reportMode = !state.reportMode;
  if (state.map) {
    state.map.getContainer().classList.toggle(
      'blockage-report-mode',
      state.reportMode
    );
  }
  return state.reportMode;
}

export function resetReportedBlockages() {
  state.blockedEdges.clear();
  state.graph = filterBlockedEdges(state.baseGraph, state.blockedEdges);
  if (state.blockageLayer) state.blockageLayer.clearLayers();
  state.reportMode = false;
  if (state.map) {
    state.map.getContainer().classList.remove('blockage-report-mode');
  }
  if (state.activeStart) {
    runBestShelterRoute(
      state.activeStart,
      state.activeInfoId,
      state.activeRankingId
    );
  }
}

function reportBlockageAt(latlng) {
  if (!state.activeBest?.result?.path?.length) {
    state.reportMode = false;
    return;
  }

  const blocked = findNearestActivePathEdge(latlng);
  if (!blocked || blocked.pixelDistance > 35) {
    updateInfo(
      state.activeInfoId,
      'Klik lebih dekat ke garis rute aktif untuk melaporkan hambatan.'
    );
    return;
  }

  state.blockedEdges.add(graphEdgeKey(blocked.from, blocked.to));
  state.blockedEdges.add(graphEdgeKey(blocked.to, blocked.from));
  state.graph = filterBlockedEdges(state.baseGraph, state.blockedEdges);

  window.L.circleMarker(latlng, {
    radius: 8,
    color: '#b71c1c',
    fillColor: '#f44336',
    fillOpacity: 1,
    weight: 3,
  }).bindTooltip(
    `Hambatan dilaporkan: edge ${blocked.from} - ${blocked.to}`
  ).addTo(state.blockageLayer);

  state.reportMode = false;
  state.map.getContainer().classList.remove('blockage-report-mode');
  window.dispatchEvent(new CustomEvent('evatour:blockage-reported'));
  runBestShelterRoute(
    state.activeStart,
    state.activeInfoId,
    state.activeRankingId
  );
}

function findNearestActivePathEdge(latlng) {
  const clickPoint = state.map.latLngToContainerPoint(latlng);
  const path = state.activeBest.result.path;
  let nearest = null;

  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1];
    const to = path[i];
    const a = state.nodes[from];
    const b = state.nodes[to];
    if (!a || !b) continue;

    const pointA = state.map.latLngToContainerPoint([a.lat, a.lon]);
    const pointB = state.map.latLngToContainerPoint([b.lat, b.lon]);
    const pixelDistance = pointToSegmentDistance(clickPoint, pointA, pointB);

    if (!nearest || pixelDistance < nearest.pixelDistance) {
      nearest = { from, to, pixelDistance };
    }
  }
  return nearest;
}

function pointToSegmentDistance(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) {
    return point.distanceTo(start);
  }

  const t = Math.max(0, Math.min(1,
    ((point.x - start.x) * dx + (point.y - start.y) * dy) /
    (dx * dx + dy * dy)
  ));
  const projection = window.L.point(start.x + t * dx, start.y + t * dy);
  return point.distanceTo(projection);
}
