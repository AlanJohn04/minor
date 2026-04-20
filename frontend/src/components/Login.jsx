import React, { useState } from 'react';
import { loginWithGoogle, loginEmail, registerEmail } from '../firebase';

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    const user = await loginWithGoogle();
    if (user) onLogin(user);
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError("");
    try {
      let user;
      if (isRegister) {
        user = await registerEmail(email, password);
      } else {
        user = await loginEmail(email, password);
      }
      if (user) onLogin(user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Smart Bus</h1>
        <p className="subtitle">Next-gen transit monitoring</p>

        <form onSubmit={handleEmailAuth} className="auth-form">
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <button type="submit" className="btn-primary">
            {isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        {error && <p className="auth-error">{error}</p>}

        <p className="toggle-text" onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? "Already have an account? Sign In" : "New here? Create an account"}
        </p>

        <div className="separator">
          <span>OR</span>
        </div>

        <button className="btn-google" onClick={handleGoogleLogin}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="20" />
          Continue with Google
        </button>
      </div>
    </div>
  );
}

export default Login;
