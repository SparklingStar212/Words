import React, { useState } from 'react';

interface AuthScreenProps {
  isRegistering: boolean;
  setIsRegistering: (val: boolean) => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  registerLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  setRegisterLevel: (val: 'Beginner' | 'Intermediate' | 'Advanced') => void;
  error: string;
  isLoading: boolean; // Added loading state prop
  handleAuth: (e: React.FormEvent) => void;
}

export default function AuthScreen({
  isRegistering,
  setIsRegistering,
  email,
  setEmail,
  password,
  setPassword,
  registerLevel,
  setRegisterLevel,
  error,
  isLoading,
  handleAuth,
}: AuthScreenProps) {
  const [showPassword, setShowPassword] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#1C1C1A] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-[#E5E2DC] rounded-xl p-8 shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-serif tracking-wide mb-1">words</h1>
          <p className="text-sm text-[#787570]">
            {isRegistering ? 'Create an account to start your habit.' : 'Welcome back. Keep your streak alive.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#787570] mb-1">Preferred Level</label>
              <select
                value={registerLevel}
                onChange={(e) => setRegisterLevel(e.target.value as 'Beginner' | 'Intermediate' | 'Advanced')}
                className="w-full px-3 py-2 border border-[#E5E2DC] rounded-lg focus:outline-none focus:border-[#D97757] bg-[#F7F5F0]/30 text-sm"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#787570] mb-1">Email</label>
            <input
              type="email"
              required
              disabled={isLoading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E2DC] rounded-lg focus:outline-none focus:border-[#D97757] bg-[#F7F5F0]/30 text-sm"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#787570] mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-[#E5E2DC] rounded-lg focus:outline-none focus:border-[#D97757] bg-[#F7F5F0]/30 text-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#787570] hover:text-[#1C1C1A] text-sm focus:outline-none cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#D97757] text-white py-2.5 rounded-lg font-medium shadow-sm hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{isRegistering ? 'Creating Account...' : 'Signing In...'}</span>
              </>
            ) : (
              <span>{isRegistering ? 'Create Account' : 'Sign In'}</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[#787570]">
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-[#D97757] font-medium hover:underline focus:outline-none cursor-pointer"
          >
            {isRegistering ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}