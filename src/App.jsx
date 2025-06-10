import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import Papa from 'papaparse';
import './App.css';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet’s default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerRetina,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

function App() {
  const [markerCount, setMarkerCount] = useState(0);
  const [viewMode, setViewMode] = useState('markers');
  const [selectedLocationType, setSelectedLocationType] = useState('event');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [availableCategories, setAvailableCategories] = useState([]);
  const [rows, setRows] = useState([]);
  
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}claims.csv`)
      .then(res => res.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: ({ data }) => {
            setRows(data);
            const cats = Array.from(
              new Set(data.map(r => r.ClaimID?.split('-')[0]).filter(Boolean))
            ).sort();
            setAvailableCategories(cats);
          }
        });
      });
  }, []);

  const categoryIcons = {
    'A2.1': new L.Icon({
      iconUrl: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    }),
    'A3.1': new L.Icon({
      iconUrl: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    }),
    default: new L.Icon.Default()
  };

  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);

 function loadAndDisplayMarkers(map) {
  // Ensure the layer group exists, then clear it
  if (markerLayerRef.current) {
    markerLayerRef.current.clearLayers();
  } else {
    markerLayerRef.current = L.layerGroup().addTo(map);
  }

  // ─── HEATMAP MODE ────────────────────────────────────────────────────────
  if (viewMode === 'heatmap') {
    const heatmapPoints = rows.reduce((acc, row) => {
      const cat = row.ClaimID?.split('-')[0];
      if (selectedCategory && cat !== selectedCategory) return acc;
      const latRaw = selectedLocationType === 'claimant'
        ? row.ClaimantLatitude
        : row.EventLatitude;
      const lonRaw = selectedLocationType === 'claimant'
        ? row.ClaimantLongitude
        : row.EventLongitude;
      const lat = parseFloat(latRaw);
      const lon = parseFloat(lonRaw);
      if (!isNaN(lat) && !isNaN(lon)) acc.push([lat, lon, 1]);
      return acc;
    }, []);

    if (heatmapPoints.length) {
      L.heatLayer(heatmapPoints, { radius: 25, blur: 15, maxZoom: 17 })
        .addTo(markerLayerRef.current);
    }

    setMarkerCount(heatmapPoints.length);
    return;  // skip drawing markers
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ─── MARKERS MODE ─────────────────────────────────────────────────────────
  let validCount = 0;
  const categorySet = new Set();

  rows.forEach(row => {
    const claimId = row.ClaimID;
    const cat = claimId?.split('-')[0];
    if (selectedCategory && cat !== selectedCategory) return;

    const latRaw = selectedLocationType === 'claimant'
      ? row.ClaimantLatitude
      : row.EventLatitude;
    const lonRaw = selectedLocationType === 'claimant'
      ? row.ClaimantLongitude
      : row.EventLongitude;
    const lat = parseFloat(latRaw);
    const lon = parseFloat(lonRaw);
    if (!claimId || isNaN(lat) || isNaN(lon)) return;

    const icon = categoryIcons[cat] || categoryIcons.default;
    const locText = selectedLocationType === 'claimant'
      ? row.ClaimantLocation
      : row.EventLocation;

    L.marker([lat, lon], { icon })
      .bindPopup(`<strong>${claimId}</strong><br>${locText}<br>${row.EventDate}`)
      .addTo(markerLayerRef.current);

    validCount++;
    categorySet.add(cat);
  });

  setMarkerCount(validCount);
  setAvailableCategories([...categorySet].sort());
}

  useEffect(() => {
    const mapContainer = document.getElementById('map');
    if (!mapContainer || mapContainer._leaflet_id) return;

    const map = L.map('map').setView([48.3794, 31.1656], 6);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);

  }, []);

  useEffect(() => {
    if (mapRef.current && rows.length > 0) {
      loadAndDisplayMarkers(mapRef.current);
    }
}, [rows, selectedCategory, selectedLocationType, viewMode]);
  return (
    <div className="App">
      <div style={{ padding: "1rem", background: "#f0f0f0" }}>
        <label>
          Filter by category:{" "}
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
            <option value="">Show all</option>
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </label>
        <label style={{ marginLeft: "2rem" }}>
          Show:{" "}
          <select value={selectedLocationType} onChange={e => setSelectedLocationType(e.target.value)}>
            <option value="event">Event Location</option>
            <option value="claimant">Claimant Location</option>
          </select>
        </label>
        <label style={{ marginLeft: "2rem" }}>
          View Mode:{" "}
          <select
            value={viewMode}
              onChange={e => setViewMode(e.target.value)}
            >
              <option value="markers">Markers</option>
              <option value="heatmap">Heatmap</option>
            </select>
          </label>
      </div>
      <div style={{ padding: "1rem", background: "#e0e0e0" }}>
        <strong>Markers on map:</strong> {markerCount}
      </div>
      <header style={{ padding: "1rem", background: "#282c34", color: "white" }}>
        <h1>Claim Map of Ukraine</h1>
      </header>
      <main style={{ height: "calc(100vh - 80px)" }}>
        <div id="map" style={{ height: "100%", width: "100%" }} />
      </main>
    </div>
  );
}

export default App;