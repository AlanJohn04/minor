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
  const [scans, setScans] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  const busIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });

  const passengerIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2830/2830305.png',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Bus Location
        const busRes = await fetch("http://localhost:3000/api/bus");
        const busData = await busRes.json();
        if (busData.location) {
          setPos([busData.location.lat, busData.location.lng]);
          setLastUpdated(new Date().toLocaleTimeString());
        }

        // Fetch Recent Scans
        // We'll need to create this route or use a direct firebase fetch if possible, 
        // but for now let's assume a backend route /api/scans
        const scansRes = await fetch("http://localhost:3000/api/scans");
        const scansData = await scansRes.json();
        setScans(scansData || []);
      } catch (err) {
        console.error("Map fetch error:", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <MapContainer center={pos} zoom={15} style={{ height: "100%", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {/* Bus Marker */}
      <Marker position={pos} icon={busIcon}>
        <Popup>
          <strong>Bus 101</strong> <br />
          Capacity: {pos[0].passenger_count} <br />
          Last active: {lastUpdated}
        </Popup>
      </Marker>

      {/* Passenger Markers */}
      {scans.map((scan, idx) => (
        <Marker 
          key={idx} 
          position={[scan.location.lat, scan.location.lng]} 
          icon={passengerIcon}
        >
          <Popup>
            <strong>{scan.action}</strong> <br />
            User: {scan.userId} <br />
            Time: {new Date(scan.time).toLocaleTimeString()}
          </Popup>
        </Marker>
      ))}

      <RecenterMap position={pos} />
    </MapContainer>
  );
}

export default BusMap;