import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, logout } from "./firebase";
import Login from "./components/Login";
import RoleSelection from "./components/RoleSelection";
import PassengerView from "./components/PassengerView";
import ConductorView from "./components/ConductorView";

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="login-container"><h2>Loading...</h2></div>;
  }

  if (!role) {
    return <RoleSelection onSelect={setRole} />;
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="app-container">
      <header className="dashboard-header">
        <div className="user-profile">
          <img src={user.photoURL} alt="Avatar" className="user-avatar" />
          <div>
            <p style={{ fontWeight: 700, margin: 0 }}>{user.displayName}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase' }}>
              {role}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-logout" onClick={() => setRole(null)}>Change Role</button>
          <button className="btn-logout" style={{ background: '#fee2e2', color: '#991b1b' }} onClick={logout}>Sign Out</button>
        </div>
      </header>

      <main>
        {role === 'passenger' ? (
          <PassengerView user={user} />
        ) : (
          <ConductorView />
        )}
      </main>
    </div>
  );
}

export default App;