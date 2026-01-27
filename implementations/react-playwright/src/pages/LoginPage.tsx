import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authClient } from '../lib/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('new@customer.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await authClient.login(email, password);
      navigate('/cart');
    } catch {
      setError('Invalid credentials. Try vip@techhome.com or new@customer.com');
    }
  };

  const setDemoUser = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('password');
  };

  return (
    <div className="login-page" data-testid="login-page">
      <div className="login-container">
        <Link to="/" className="logo">TechHome Direct</Link>

        <h1>Sign In</h1>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email-input">Email</label>
            <input
              id="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="email-input"
            />
          </div>

          <div>
            <label htmlFor="password-input">Password</label>
            <input
              id="password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              data-testid="password-input"
            />
          </div>

          <button type="submit" data-testid="login-button">
            Sign In
          </button>
        </form>

        <div className="demo-users">
          <h3>Demo Users</h3>
          <button onClick={() => setDemoUser('vip@techhome.com')} data-testid="demo-vip">
            VIP User (4 years tenure)
          </button>
          <button onClick={() => setDemoUser('new@customer.com')} data-testid="demo-new">
            New User (0 years tenure)
          </button>
        </div>

        <p className="register-link">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
