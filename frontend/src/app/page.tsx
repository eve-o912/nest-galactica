'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const router = useRouter();

  async function handleAuth() {
    try {
      setError('');
      const endpoint = isSignup ? '/api/signup' : '/api/login';
      const data = isSignup ? { email, password, name } : { email, password };
      
      const response = await api.post(endpoint, data);
      
      localStorage.setItem('userId', response.data.user.id);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || `${isSignup ? 'Signup' : 'Login'} failed`);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 via-purple-600 to-pink-500">
      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-7xl mb-4">🏡</div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Nest
          </h1>
          <p className="text-gray-600">Your AI-Powered Financial Home</p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        {isSignup && (
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        )}
        
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-4 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
          className="w-full p-4 border border-gray-300 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        
        <button
          onClick={handleAuth}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-lg mb-4 hover:from-purple-700 hover:to-pink-700 transition font-semibold text-lg"
        >
          {isSignup ? 'Create Account' : 'Log In'}
        </button>
        
        <button
          onClick={() => {
            setIsSignup(!isSignup);
            setError('');
          }}
          className="w-full text-purple-600 hover:text-purple-700 font-medium"
        >
          {isSignup ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
