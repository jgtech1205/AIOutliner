import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { LogIn, UserPlus, Image as ImageIcon, Sparkles, Zap } from 'lucide-react';
import { Auth } from './components/Auth';
import ImageUpload from './components/ImageUpload';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

function App() {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <nav className="bg-white/80 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <ImageIcon className="w-8 h-8 text-indigo-600" />
                  <Sparkles className="w-4 h-4 text-amber-400 absolute -top-1 -right-1" />
                </div>
                <div>
                  <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    AI Outliner
                  </span>
                  <div className="text-xs text-gray-500 font-medium">Transform with AI</div>
                </div>
              </div>
              <button
                onClick={() => supabase.auth.signOut()}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Sign Out
              </button>
            </div>
          </div>
        </nav>
        <ImageUpload />
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#f9fafb',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '14px',
            },
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <ImageIcon className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Zap className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              AI Outliner
            </h1>
            <p className="text-gray-300 text-sm">
              Transform your images with AI-powered outlines
            </p>
          </div>

          {/* Auth Mode Toggle */}
          <div className="flex bg-white/10 rounded-xl p-1 mb-8 backdrop-blur-sm">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                authMode === 'login'
                  ? 'bg-white text-gray-900 shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Login
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                authMode === 'signup'
                  ? 'bg-white text-gray-900 shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Sign Up
            </button>
          </div>

          {/* Auth Form */}
          <Auth mode={authMode} onModeChange={setAuthMode} />
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            Powered by advanced AI technology
          </p>
          <div className="flex items-center justify-center mt-2 space-x-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse animation-delay-1000"></div>
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse animation-delay-2000"></div>
          </div>
        </div>
      </div>
      
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(17, 24, 39, 0.9)',
            color: '#f9fafb',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '14px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
      />
    </div>
  );
}

export default App;
