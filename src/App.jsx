import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import Papa from 'papaparse';
import './App.css';
import 'leaflet/dist/leaflet.css';

function App() {
  const [markerCount, setMarkerCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('');
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
    // Clear previous markers
    if (markerLayerRef.current) {
      markerLayerRef.current.clearLayers();
    } else {
      markerLayerRef.current = L.layerGroup().addTo(map);
    }

    setMarkerCount(0); // Reset count before adding new markers

    fetch('/claims.csv')
      .then(response => response.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          complete: function (results) {
            let count = 0;
            results.data.forEach((row) => {
              const { Lat, Lon, ClaimID, Location, Date } = row;

              if (!Lat || !Lon) {
                console.warn(`⚠️ Missing coordinates for row:`, row);
                return;
              }

              if (selectedCategory && !ClaimID.startsWith(selectedCategory)) return;

              const categoryKey = ClaimID.split('-')[0];
              const icon = categoryIcons[categoryKey] || categoryIcons.default;

              const marker = L.marker([parseFloat(Lat), parseFloat(Lon)], { icon })
  .bindPopup(`<strong>${ClaimID}</strong><br>${Location}<br>${Date}`);
              markerLayerRef.current.addLayer(marker);
              count++;
            });
            setMarkerCount(count);
          }
        });
      });
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

    loadAndDisplayMarkers(map);
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      loadAndDisplayMarkers(mapRef.current);
    }
  }, [selectedCategory]);

  return (
    <div className="App">
      <div style={{ padding: "1rem", background: "#f0f0f0" }}>
        <label>
          Filter by category:{" "}
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
            <option value="">Show all</option>
            <option value="A2.1">A2.1</option>
            <option value="A3.1">A3.1</option>
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