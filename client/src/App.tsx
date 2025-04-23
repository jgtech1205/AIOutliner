import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { LogIn, UserPlus, Image as ImageIcon } from 'lucide-react';
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center">
                <ImageIcon className="w-8 h-8 text-indigo-600" />
                <span className="ml-2 text-xl font-semibold">AI Outliner</span>
              </div>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </div>
        </nav>
        <ImageUpload />
        <Toaster position="top-center" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-8">
            <ImageIcon className="w-10 h-10 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900 ml-3">AI Outliner</h1>
          </div>

          <div className="space-x-2 mb-8">
            <button
              onClick={() => setAuthMode('login')}
              className={`px-4 py-2 rounded-lg ${
                authMode === 'login'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <LogIn className="w-4 h-4 inline-block mr-2" />
              Login
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              className={`px-4 py-2 rounded-lg ${
                authMode === 'signup'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <UserPlus className="w-4 h-4 inline-block mr-2" />
              Sign Up
            </button>
          </div>

          <Auth mode={authMode} onModeChange={setAuthMode} />
        </div>

        <p className="text-center mt-8 text-gray-600">
          AI Outliner - Transform your images with AI-powered outlines
        </p>
      </div>
      <Toaster position="top-center" />
    </div>
  );
}

export default App;
