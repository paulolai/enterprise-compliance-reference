import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authClient } from '../lib/auth';

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await authClient.register(email, name, password);
      navigate('/cart');
    } catch {
      setError('Registration failed. Email may already be in use.');
    }
  };

  return (
    <div className="register-page" data-testid="register-page">
      <div className="login-container">
        <Link to="/" className="logo">TechHome Direct</Link>

        <h1>Create Account</h1>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="register-name">Name</label>
            <input
              id="register-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              data-testid="register-name"
            />
          </div>

          <div>
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="register-email"
            />
          </div>

          <div>
            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              data-testid="register-password"
            />
          </div>

          <button type="submit" data-testid="register-button">
            Create Account
          </button>
        </form>

        <p className="login-link">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
