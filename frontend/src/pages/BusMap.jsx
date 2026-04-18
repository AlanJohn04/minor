import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect, useState } from "react";
import L from 'leaflet';

// Fix for missing marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position);
  }, [position]);
  return null;
}

function BusMap() {
  const [pos, setPos] = useState([13.0827, 80.2707]);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const fetchBus = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/bus");
        const data = await res.json();
        if (data.location && data.location.lat && data.location.lng) {
          setPos([data.location.lat, data.location.lng]);
          setLastUpdated(new Date().toLocaleTimeString());
        }
      } catch (err) {
        console.error("Failed to fetch bus location:", err);
      }
    };

    fetchBus();
    const interval = setInterval(fetchBus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <MapContainer center={pos} zoom={15} style={{ height: "100%", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={pos}>
        <Popup>
          Bus 101 <br /> 
          Last updated: {lastUpdated || 'Never'}
        </Popup>
      </Marker>
      <RecenterMap position={pos} />
    </MapContainer>
  );
}

export default BusMap;