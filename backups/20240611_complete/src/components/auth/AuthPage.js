import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="w-full p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <img 
              src="/icon-192x192.png" 
              alt="Pokemon Card Tracker" 
              className="w-10 h-10 rounded-xl"
            />
            <h1 className="text-2xl font-bold text-white">Pokemon Card Tracker</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Side - Card Grid Background (simplified to solid color) */}
        <div className="hidden md:block md:w-2/3 bg-green-800 relative"></div>

        {/* Right Side - Auth Form */}
        <div className="w-full md:w-1/3 bg-white flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {isLogin ? (
              <Login onToggleForm={() => setIsLogin(false)} />
            ) : (
              <Register onToggleForm={() => setIsLogin(true)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage; 