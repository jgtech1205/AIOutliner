import React, { useState } from 'react';
import { KeyRound, Mail, Lock, Eye, EyeOff, ArrowRight, Shield } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);

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
      {/* Email Field */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-200">Email</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm transition-all duration-200"
            placeholder="Enter your email"
          />
        </div>
      </div>

      {/* Password Field */}
      {mode !== 'forgot' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm transition-all duration-200"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300 transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
      )}

      {/* Terms and Conditions for Signup */}
      {mode === 'signup' && (
        <div className="flex items-start space-x-3">
          <div className="flex items-center h-5">
            <input
              id="terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded bg-white/10 border-white/20"
            />
          </div>
          <div className="text-sm">
            <label htmlFor="terms" className="text-gray-300 leading-relaxed">
              I agree to the{' '}
              <a href="#" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                Privacy Policy
              </a>
            </label>
          </div>
        </div>
      )}

      {/* Forgot Password Link */}
      {mode === 'login' && (
        <div className="text-right">
          <button
            type="button"
            onClick={() => onModeChange('forgot')}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2"
          >
            Forgot password?
          </button>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || (mode === 'signup' && !termsAccepted)}
        className="w-full group relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
            Processing...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            {mode === 'forgot' ? (
              <>
                <Shield className="w-5 h-5 mr-2" />
                Send Reset Instructions
              </>
            ) : (
              <>
                <KeyRound className="w-5 h-5 mr-2" />
                {mode === 'login' ? 'Sign In' : 'Create Account'}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </div>
        )}
        
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </button>

      {/* Back to Login Link */}
      {mode === 'forgot' && (
        <button
          type="button"
          onClick={() => onModeChange('login')}
          className="w-full text-center text-sm text-gray-300 hover:text-white transition-colors py-2"
        >
          ← Back to login
        </button>
      )}
    </form>
  );
}
