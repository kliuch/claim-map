import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import Papa from 'papaparse';
import './App.css';
import 'leaflet/dist/leaflet.css';

function App() {
  const [markerCount, setMarkerCount] = useState(0);
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
  if (markerLayerRef.current) {
    markerLayerRef.current.clearLayers();
  } else {
    markerLayerRef.current = L.layerGroup().addTo(map);
  }

  setMarkerCount(0);
  const categorySet = new Set();

  fetch(`${import.meta.env.BASE_URL}claims.csv`)
    .then(response => response.text())
    .then(csvText => {
      console.log("📦 Fetching claims.csv...");
      Papa.parse(csvText, {
        header: true,
        complete: function (results) {
  let total = 0;
  let valid = 0;

            results.data.forEach((row) => {
              console.log(`🔍 Processing row:`, row);
              if (row.ClaimID) categorySet.add(row.ClaimID.split('-')[0]);

              const claimId = row.ClaimID;
              if (selectedCategory && claimId.split('-')[0] !== selectedCategory) {
                return;
              }
              const location = selectedLocationType === 'claimant' ? row.ClaimantLocation : row.EventLocation;
              const latRaw = selectedLocationType === 'claimant' ? row.ClaimantLatitude : row.EventLatitude;
              const lonRaw = selectedLocationType === 'claimant' ? row.ClaimantLongitude : row.EventLongitude;

              console.warn(`⚠️ Skipping row due to missing coords for ${selectedLocationType} location:`, {
                claimId, latRaw, lonRaw
              });
              if (!claimId || isNaN(parseFloat(latRaw)) || isNaN(parseFloat(lonRaw))) {
                console.warn(`⚠️ Skipping invalid row:`, row);
                return;
              }

              const lat = parseFloat(latRaw);
              const lon = parseFloat(lonRaw);
              const icon = categoryIcons[claimId.split('-')[0]] || categoryIcons.default;

              const marker = L.marker([lat, lon], { icon })
                .bindPopup(`<strong>${claimId}</strong><br>${location}<br>${row.EventDate}`);

              markerLayerRef.current.addLayer(marker);
              valid++;
              categorySet.add(claimId.split('-')[0]);
            });

            console.log(`📊 Total rows: ${total}, valid markers: ${valid}`);
            setAvailableCategories([...categorySet].sort());
            setMarkerCount(valid);
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
  }, [selectedCategory, selectedLocationType]);

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