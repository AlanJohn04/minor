import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

function PassengerView({ user }) {
  const ticketData = `${user.uid}|${new Date().toISOString()}`;

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h2>Personal QR Ticket</h2>
      <p style={{ color: 'var(--text-muted)' }}>Scan this code when boarding</p>
      <div className="qr-display">
        <QRCodeSVG value={ticketData} size={250} level="H" includeMargin={true} />
      </div>
      <div style={{ marginTop: '1rem', padding: '1rem', borderTop: '1px solid var(--border)' }}>
        <p><strong>Passenger:</strong> {user.displayName}</p>
        <p><strong>Ticket ID:</strong> {user.uid.slice(0, 8).toUpperCase()}</p>
      </div>
    </div>
  );
}

export default PassengerView;
