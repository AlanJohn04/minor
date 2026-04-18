import React from 'react';

function RoleSelection({ onSelect }) {
  return (
    <div className="login-container">
      <h2>Choose your role</h2>
      <div className="role-selection">
        <div className="role-card" onClick={() => onSelect('passenger')}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎫</div>
          <h3>Passenger</h3>
          <p style={{ color: 'var(--text-muted)' }}>Generate and show your QR ticket to the conductor.</p>
        </div>
        <div className="role-card" onClick={() => onSelect('conductor')}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h3>Conductor</h3>
          <p style={{ color: 'var(--text-muted)' }}>Scan passenger tickets and monitor bus status.</p>
        </div>
      </div>
    </div>
  );
}

export default RoleSelection;
