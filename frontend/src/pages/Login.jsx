import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Login = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(username, password);
      showToast('Successfully authenticated into SafeOps Platform', 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        'Authentication failed. Please verify credentials or backend connection.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand-blue/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-brand-cyan/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Logo and Brand Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-blue to-brand-cyan text-white shadow-xl shadow-blue-500/20 mb-4 border border-blue-400/30">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            SafeOps Platform
          </h1>
          <p className="mt-2 text-sm text-gray-400 font-medium">
            Safe Autonomous IT Operations Remediation
          </p>
          <div className="mt-1 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-green" />
            <span className="text-xs text-gray-400 font-mono">
              Automation safe enough to leave switched on
            </span>
          </div>
        </div>

        {/* Card Form */}
        <div className="card bg-dark-900/90 border-gray-800 backdrop-blur-xl shadow-2xl p-6 sm:p-8 rounded-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/60 border border-brand-red/50 text-red-200 text-xs">
                <AlertCircle className="w-4 h-4 text-brand-red shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input pl-9 text-sm"
                  placeholder="Enter username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-9 text-sm"
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5 text-sm font-semibold mt-2 shadow-lg shadow-blue-500/25"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo Hint */}
          <div className="mt-6 pt-5 border-t border-gray-800/80 text-center">
            <p className="text-xs text-gray-400">
              Demo Credentials:{' '}
              <span className="font-mono text-brand-cyan bg-dark-800 px-2 py-0.5 rounded border border-gray-700">
                admin
              </span>{' '}
              /{' '}
              <span className="font-mono text-brand-cyan bg-dark-800 px-2 py-0.5 rounded border border-gray-700">
                admin123
              </span>
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center text-xs text-gray-500">
          Autonomous operations are governed by immutable policy v1.0 and fail-closed safety constraints.
        </div>
      </div>
    </div>
  );
};

export default Login;
