import React from 'react';
import { loginWithGoogle } from '../firebase';

function Login({ onLogin }) {
  const handleLogin = async () => {
    const user = await loginWithGoogle();
    if (user) {
      onLogin(user);
    }
  };

  return (
    <div className="login-container">
      <h1>Smart Bus System</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Next-gen transit monitoring & validation</p>
      <button className="btn-google" onClick={handleLogin}>
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="20" />
        Continue with Google
      </button>
    </div>
  );
}

export default Login;
