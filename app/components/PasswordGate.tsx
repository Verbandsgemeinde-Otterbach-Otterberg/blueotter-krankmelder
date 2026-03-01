'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useGlobalSettings } from '@/app/lib/useGlobalSettings';

interface PasswordGateProps {
  children: React.ReactNode;
  /** When true, require username + password (admin). When false/undefined, require only password (public). */
  requireUsername?: boolean;
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
}

export default function PasswordGate({
  children,
  requireUsername,
  title,
  subtitle,
  showLogo = false,
}: PasswordGateProps) {
  const globalSettings = useGlobalSettings();
  const finalTitle = title || globalSettings.appName || 'Zugang erforderlich';
  const finalSubtitle = subtitle || globalSettings.appSlogan || '';

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [requestingPassword, setRequestingPassword] = useState(false);
  const [requestEmail, setRequestEmail] = useState('');
  const [requestStatus, setRequestStatus] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);

  // Combined mount + token check on mount
  useEffect(() => {
    const checkAuth = async () => {
      // First check: saved credentials for admin
      if (requireUsername) {
        const savedAuth = localStorage.getItem('sb-auth-token');
        const savedUsername = localStorage.getItem('sb-username');
        if (savedAuth === 'authenticated' && savedUsername) {
          setIsAuthenticated(true);
          setIsMounted(true);
          return;
        }
      }

      // Second check: token-based bypass for public access
      if (!requireUsername) {
        try {
          const params = new URLSearchParams(window.location.search);
          const token = params.get('access_token') || params.get('token');
          
          if (token && token.trim()) {
            try {
              const res = await fetch('/api/auth/validate-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
              });
              const json = await res.json();
              if (json && json.success) {
                setIsAuthenticated(true);
                setIsMounted(true);
                return;
              }
            } catch (err) {
              // ignore token validation errors
            }
          }
        } catch (e) {
          // ignore
        }
      }

      setIsMounted(true);
    };

    checkAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: requireUsername ? username : undefined, password }),
      });
      const json = await res.json();
      if (json.success) {
        // Save credentials if Remember Me is checked (only for admin login)
        if (rememberMe && requireUsername) {
          localStorage.setItem('sb-auth-token', 'authenticated');
          localStorage.setItem('sb-username', username);
        }
        setIsAuthenticated(true);
        setPassword('');
        setUsername('');
      } else {
        setError(json.error || 'Authentifizierung fehlgeschlagen');
        setPassword('');
      }
    } catch (err) {
      console.error('Auth request failed', err);
      setError('Serverfehler bei der Authentifizierung');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRequestStatus('');
    setRequestingPassword(true);
    try {
      const res = await fetch('/api/auth/request-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // No email needed - uses global SB_EMAIL
      });
      const json = await res.json();
      if (json.success) {
        setRequestStatus('Zugangsdaten wurden versendet.');
      } else {
        setRequestStatus(json.error || 'Fehler beim Versand.');
      }
    } catch (err) {
      console.error('Password request failed', err);
      setRequestStatus('Serverfehler beim Versand.');
    } finally {
      setRequestingPassword(false);
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100   flex items-center justify-center p-4 transition-colors">
      <div className="bg-white  rounded-lg shadow-2xl p-8 w-full max-w-md">
        {showLogo && (
          <div className="flex justify-center mb-8">
            <Image
              src="/logoheader.jpg"
              alt="Verbandsgemeinde Otterbach-Otterberg"
              width={140}
              height={100}
              className="object-contain"
              priority
            />
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800  mb-2">{finalTitle}</h1>
          {finalSubtitle && <p className="text-gray-600 font-semibold">{finalSubtitle}</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            {requireUsername && (
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Benutzername</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Benutzername"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Passwort</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Passwort eingeben"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path
                        fillRule="evenodd"
                        d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                        clipRule="evenodd"
                      />
                      <path d="M15.171 13.576l1.414 1.414A1 1 0 0016.885 16a1 1 0 01-1.414-1.414l-1.3-1.3a4 4 0 00-5.478-5.478l-1.515-1.514A10.011 10.011 0 0110 3a10.014 10.014 0 004.512 1.074l1.415 1.414a9.959 9.959 0 01.244 15.088z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
              ⚠ {error}
            </div>
          )}

          {requireUsername && (
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded cursor-pointer disabled:opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Angemeldet bleiben</span>
            </label>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-4 rounded-lg transition"
          >
            {isLoading ? 'Anmelden...' : 'Anmelden'}
          </button>

          {requireUsername && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              {!showRequestForm && (
                <button
                  type="button"
                  onClick={() => setShowRequestForm(true)}
                  className="w-full text-blue-600 hover:text-blue-800 font-semibold underline mb-3"
                >
                  Passwort vergessen?
                </button>
              )}
              {showRequestForm && (
                <form onSubmit={handleRequestPassword} className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Passwort anfordern</label>
                  <p className="text-xs text-gray-600 mb-3">Klicken Sie auf den Button, um ein Passwort an die registrierte Adresse zu versendet:</p>
                  <button
                    type="submit"
                    disabled={requestingPassword}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded-lg transition"
                  >
                    {requestingPassword ? 'Wird versendet...' : 'Passwort versendet'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRequestForm(false)}
                    className="w-full text-gray-500 hover:text-gray-700 font-semibold underline mt-2"
                  >
                    Abbrechen
                  </button>
                  {requestStatus && (
                    <div className="p-2 bg-gray-100 border border-gray-300 rounded text-gray-700 text-sm mt-2">{requestStatus}</div>
                  )}
                </form>
              )}
            </div>
          )}
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Dieses System ist geschützt.
            <br />
            Nur autorisierte Benutzer haben Zugriff.
          </p>
        <div className="mt-4 text-xs text-gray-500 text-center">
          v10.02 • 20.02.2026
        </div>
      </div>
      </div>
    </div>
  );
}
