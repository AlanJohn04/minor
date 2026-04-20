import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import BusMap from '../pages/BusMap';
import Dashboard from '../pages/Dashboard';

function PassengerView({ user }) {
  const ticketData = `${user.uid}|${new Date().toISOString()}`;

  return (
    <div className="passenger">
      <div className="card ticket-card" style={{ textAlign: 'center' }}>
        <h2>Personal QR Ticket</h2>
        <p className="subtitle">Scan this code when boarding</p>
        <div className="qr-display">
          <QRCodeSVG value={ticketData} size={220} level="M" includeMargin={true} />
        </div>
        <div className="ticket-info">
          <p><strong>Passenger:</strong> {user.displayName || user.email}</p>
          <p><strong>Ticket ID:</strong> {user.uid.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <div className="stats-map-grid">
        <div className="card">
          <Dashboard />
        </div>
        <div className="card">
          <h2>Live Tracking</h2>
          <div className="map-wrapper">
            <BusMap />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PassengerView;
