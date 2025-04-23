import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AuthProps {
  mode: 'login' | 'signup' | 'forgot';
  onModeChange: (mode: 'login' | 'signup' | 'forgot') => void;
}

export function Auth({ mode, onModeChange }: AuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'signup' && !termsAccepted) {
      toast.error('Please accept the Terms and Privacy Policy');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;
        toast.success('Check your email for the confirmation link!');
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        toast.success('Successfully logged in!');
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        toast.success('Password reset instructions sent to your email!');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An unknown error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {mode !== 'forgot' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      )}

      {mode === 'signup' && (
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="terms" className="font-medium text-gray-700">
              I agree to the{' '}
              <a href="#" className="text-indigo-600 hover:text-indigo-500">
                Terms
              </a>{' '}
              and{' '}
              <a href="#" className="text-indigo-600 hover:text-indigo-500">
                Privacy Policy
              </a>
            </label>
          </div>
        </div>
      )}

      {mode === 'login' && (
        <div className="text-right">
          <button
            type="button"
            onClick={() => onModeChange('forgot')}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            Forgot password?
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || (mode === 'signup' && !termsAccepted)}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {loading ? (
          'Processing...'
        ) : mode === 'forgot' ? (
          'Send Reset Instructions'
        ) : (
          <>
            <KeyRound className="w-4 h-4 mr-2" />
            {mode === 'login' ? 'Sign In' : 'Sign Up'}
          </>
        )}
      </button>

      {mode === 'forgot' && (
        <button
          type="button"
          onClick={() => onModeChange('login')}
          className="w-full text-center text-sm text-indigo-600 hover:text-indigo-500"
        >
          Back to login
        </button>
      )}
    </form>
  );
}
