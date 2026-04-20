import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Dashboard from '../pages/Dashboard';
import BusMap from '../pages/BusMap';

function ConductorView() {
  const [scanResult, setScanResult] = useState(null);

  const scannerRef = React.useRef(null);

  useEffect(() => {
    if (scannerRef.current) return; // Prevent React Strict Mode double-render crashing camera

    scannerRef.current = new Html5QrcodeScanner("reader", {
      fps: 30,
      rememberLastUsedCamera: true
    });

    scannerRef.current.render(onScanSuccess, onScanError);

    let lastScanTime = 0;

    async function onScanSuccess(decodedText) {
      if (Date.now() - lastScanTime < 3000) return;
      lastScanTime = Date.now();

      setScanResult(decodedText);
      console.log("Scanned:", decodedText);
      
      // Get browser location synchronously if possible
      let coords = { lat: 0, lng: 0 };
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      } catch (err) {
        console.warn("Location access denied or timed out:", err);
      }

      try {
        const res = await fetch(`http://${window.location.hostname}:3000/api/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            qr: decodedText,
            lat: coords.lat,
            lng: coords.lng
          })
        });
        const data = await res.json();
        console.log("Backend response:", data);
      } catch (err) {
        console.error("Failed to send QR to backend:", err);
      }
      
      setTimeout(() => setScanResult(null), 3000);
    }

    function onScanError(err) {}

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().then(() => {
          console.log("Scanner cleared");
        }).catch(err => {
          console.error("Failed to clear scanner:", err);
          // Force remove container content if clear fails to prevent double preview
          const container = document.getElementById("reader");
          if (container) container.innerHTML = "";
        });
        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="conductor-layout">
      <div className="card scanner-card">
        <h2>QR Code Validator</h2>
        <div id="reader" className="scanner-ui"></div>
        {scanResult && (
          <div className="success-banner">
            ✅ Validated: {scanResult.split('|')[0].slice(0, 8)}...
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div className="card">
          <Dashboard />
        </div>
      </div>
    </div>
  );
}

export default ConductorView;
