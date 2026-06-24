import {
  GRAPH_META,
  GRAPH_NODES,
  GRAPH_EDGES,
  buildAdjacencyList,
  estimateGraphTravelTime,
} from './graphData.js';
import { astarGraph, findNearestGraphNode } from './astarGraph.js';

const state = {
  map: null,
  graph: buildAdjacencyList(),
  routeLayer: null,
  startMarker: null,
  nodeLayer: null,
  edgeLayer: null,
  nodesVisible: true,
  selectedStartId: GRAPH_META.eastStartId,
};

export function initGraphView(mapId = 'graphMap', infoId = 'graphInfoPanel') {
  const mapElement = document.getElementById(mapId);
  if (!mapElement || !window.L || state.map) return;

  state.map = window.L.map(mapElement).setView(
    [GRAPH_NODES.V17.lat, GRAPH_NODES.V17.lon],
    16
  );

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(state.map);

  drawGraphNetwork();
  state.map.fitBounds(
    window.L.latLngBounds(
      Object.values(GRAPH_NODES).map(node => [node.lat, node.lon])
    ),
    { padding: [20, 20] }
  );

  state.map.on('click', event => {
    const nearest = findNearestGraphNode(
      GRAPH_NODES,
      event.latlng.lat,
      event.latlng.lng
    );
    if (!nearest) return;
    state.selectedStartId = nearest.node.id;
    runGraphRoute(nearest.node.id, infoId, nearest.distance);
  });

  runGraphRoute(GRAPH_META.eastStartId, infoId);
}

function drawGraphNetwork() {
  state.edgeLayer = window.L.layerGroup().addTo(state.map);
  state.nodeLayer = window.L.layerGroup().addTo(state.map);

  for (const [from, to, distance] of GRAPH_EDGES) {
    const a = GRAPH_NODES[from];
    const b = GRAPH_NODES[to];
    window.L.polyline(
      [[a.lat, a.lon], [b.lat, b.lon]],
      { color: '#607d8b', weight: 3, opacity: 0.6 }
    ).bindTooltip(`${from}-${to}: ${distance.toFixed(2)} m`)
      .addTo(state.edgeLayer);
  }

  for (const node of Object.values(GRAPH_NODES)) {
    const style = getNodeStyle(node.type);
    window.L.circleMarker([node.lat, node.lon], style)
      .bindTooltip(
        `<strong>${node.id}</strong><br>${node.name}`,
        {
          permanent: true,
          direction: 'top',
          offset: [0, -8],
          className: 'journal-node-label',
        }
      )
      .addTo(state.nodeLayer);
  }
}

function getNodeStyle(type) {
  if (type === 'goal') {
    return { radius: 12, color: '#14532d', fillColor: '#4caf50', fillOpacity: 1, weight: 4 };
  }
  if (type.startsWith('start')) {
    return { radius: 11, color: '#831843', fillColor: '#e91e63', fillOpacity: 1, weight: 4 };
  }
  return { radius: 7, color: '#0d47a1', fillColor: '#42a5f5', fillOpacity: 0.95, weight: 2 };
}

export function runGraphScenario(startId, infoId = 'graphInfoPanel') {
  state.selectedStartId = startId;
  runGraphRoute(startId, infoId);
}

export function toggleGraphNodes() {
  if (!state.map || !state.nodeLayer) return false;

  if (state.nodesVisible) {
    state.nodeLayer.remove();
    state.nodesVisible = false;
  } else {
    state.nodeLayer.addTo(state.map);
    state.nodesVisible = true;
  }

  return state.nodesVisible;
}

function runGraphRoute(startId, infoId, snapDistance = null) {
  const t0 = performance.now();
  const result = astarGraph(state.graph, GRAPH_NODES, startId, GRAPH_META.goalId);
  const elapsed = performance.now() - t0;

  if (state.routeLayer) state.routeLayer.remove();
  if (state.startMarker) state.startMarker.remove();

  if (!result.found) {
    updateGraphInfo(infoId, `Rute dari ${startId} ke ${GRAPH_META.goalId} tidak ditemukan.`);
    return;
  }

  const coordinates = result.path.map(id => {
    const node = GRAPH_NODES[id];
    return [node.lat, node.lon];
  });

  state.routeLayer = window.L.polyline(coordinates, {
    color: '#ff6f00',
    weight: 7,
    opacity: 0.95,
  }).addTo(state.map);

  const startNode = GRAPH_NODES[startId];
  state.startMarker = window.L.marker([startNode.lat, startNode.lon])
    .bindPopup(`<strong>Start: ${startId}</strong><br>${startNode.name}`)
    .addTo(state.map);

  state.map.fitBounds(state.routeLayer.getBounds(), { padding: [30, 30] });

  const travelTime = estimateGraphTravelTime(result.totalCost);
  const validation = getJournalValidation(startId, result);
  const snapLine = snapDistance === null
    ? ''
    : `\nSnap ke node terdekat: ${startId} (${snapDistance.toFixed(1)} m dari klik)`;

  updateGraphInfo(
    infoId,
    `Rute graph ditemukan\n` +
    `Dari: ${startId} - ${startNode.name}\n` +
    `Ke: V31 - ${GRAPH_NODES.V31.name}${snapLine}\n` +
    `Path: ${result.path.join(' -> ')}\n` +
    `Jarak graph: ${result.totalCost.toFixed(2)} meter\n` +
    `Estimasi waktu (2,5 km/jam): ${travelTime.formatted}\n` +
    `Node dieksplorasi A*: ${result.nodesExplored}\n` +
    `Waktu komputasi: ${elapsed.toFixed(2)} ms\n` +
    validation
  );
}

function getJournalValidation(startId, result) {
  let reference = null;
  if (startId === GRAPH_META.eastStartId) reference = GRAPH_META.journalRoutes.east;
  if (startId === GRAPH_META.westStartId) reference = GRAPH_META.journalRoutes.west;
  if (!reference) return 'Validasi jurnal: tidak tersedia untuk titik awal ini.';

  const samePath = result.path.join(',') === reference.path.join(',');
  const distanceDifference = result.totalCost - reference.distanceMeters;
  return `Validasi Wijayanto 2025:\n` +
    `- Path jurnal: ${reference.path.join(' -> ')}\n` +
    `- Jarak jurnal: ${reference.distanceMeters} meter\n` +
    `- Waktu jurnal: ${reference.timeMinutes} menit\n` +
    `- Path sama: ${samePath ? 'ya' : 'tidak'}\n` +
    `- Selisih jarak: ${distanceDifference.toFixed(2)} meter`;
}

function updateGraphInfo(infoId, text) {
  const panel = document.getElementById(infoId);
  if (panel) panel.textContent = text;
}

export function invalidateGraphMapSize() {
  if (state.map) {
    state.map.invalidateSize();
    state.map.fitBounds(
      window.L.latLngBounds(
        Object.values(GRAPH_NODES).map(node => [node.lat, node.lon])
      ),
      { padding: [20, 20] }
    );
  }
}
