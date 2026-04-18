import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Dashboard from '../pages/Dashboard';
import BusMap from '../pages/BusMap';

function ConductorView() {
  const [scanResult, setScanResult] = useState(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    });

    scanner.render(onScanSuccess, onScanError);

    function onScanSuccess(decodedText) {
      setScanResult(decodedText);
      // Here you would typically call the backend to validate the scan
      console.log("Scanned:", decodedText);
      
      // Flash success message
      setTimeout(() => setScanResult(null), 3000);
    }

    function onScanError(err) {
      // console.warn(err);
    }

    return () => scanner.clear();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="card">
        <h2>QR Code Validator</h2>
        <div id="reader" className="scanner-container"></div>
        {scanResult && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#dcfce7', color: '#166534', borderRadius: '0.5rem' }}>
            Success! Scanned: {scanResult.split('|')[0]}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div className="card">
          <Dashboard />
        </div>
        <div className="card">
          <h2>Vehicle Tracking</h2>
          <div className="map-wrapper">
            <BusMap />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConductorView;
