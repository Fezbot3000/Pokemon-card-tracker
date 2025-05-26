import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import NavigationBar from './NavigationBar';
import Footer from './Footer';

const GradingIntegration = () => {
  const [activeService, setActiveService] = useState('psa');

  const gradingServices = [
    { 
      id: 'psa', 
      name: 'PSA', 
      logo: '🏆', 
      description: 'Professional Sports Authenticator',
      grades: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
      specialGrades: ['AUTH', 'DNA'],
      turnaround: '20-45 business days',
      pricing: '$25-$300+',
      specialty: 'Sports cards, Pokemon, Trading cards'
    },
    { 
      id: 'bgs', 
      name: 'BGS', 
      logo: '💎', 
      description: 'Beckett Grading Services',
      grades: ['1', '2', '3', '4', '5', '6', '7', '8', '8.5', '9', '9.5', '10'],
      specialGrades: ['Black Label', 'Pristine 10'],
      turnaround: '15-30 business days',
      pricing: '$20-$250+',
      specialty: 'Modern cards, Subgrades'
    },
    { 
      id: 'sgc', 
      name: 'SGC', 
      logo: '⚡', 
      description: 'Sportscard Guaranty Corporation',
      grades: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
      specialGrades: ['Authentic', 'Fair'],
      turnaround: '10-20 business days',
      pricing: '$15-$200+',
      specialty: 'Vintage cards, Fast turnaround'
    }
  ];

  const renderServiceDetails = () => {
    const service = gradingServices.find(s => s.id === activeService);
    if (!service) return null;

    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4 mb-6">
          <span className="text-4xl">{service.logo}</span>
          <div>
            <h2 className="text-3xl font-bold">{service.name}</h2>
            <p className="text-gray-400">{service.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/5 rounded-xl p-6">
            <h3 className="text-xl font-bold text-blue-400 mb-4">📊 Grading Scale</h3>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {service.grades.map(grade => (
                <div key={grade} className="bg-white/10 rounded-lg p-2 text-center text-sm">
                  {grade}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-green-400">Special Grades:</h4>
              {service.specialGrades.map(grade => (
                <span key={grade} className="inline-block bg-green-600/20 text-green-400 px-2 py-1 rounded text-xs mr-2">
                  {grade}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-6">
            <h3 className="text-xl font-bold text-purple-400 mb-4">⏱️ Service Details</h3>
            <div className="space-y-3">
              <div>
                <span className="font-semibold text-gray-300">Turnaround: </span>
                <span className="text-gray-400">{service.turnaround}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-300">Pricing: </span>
                <span className="text-gray-400">{service.pricing}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-300">Specialty: </span>
                <span className="text-gray-400">{service.specialty}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-6">
          <h3 className="text-xl font-bold text-yellow-400 mb-4">🔗 Integration Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ul className="space-y-2 text-gray-300">
              <li>• Automatic cert number verification</li>
              <li>• Grade tracking and history</li>
              <li>• Population report integration</li>
              <li>• Submission tracking</li>
            </ul>
            <ul className="space-y-2 text-gray-300">
              <li>• Value estimation based on grade</li>
              <li>• Grading cost calculator</li>
              <li>• Turnaround time estimates</li>
              <li>• Grade comparison tools</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#1B2131] text-white">
      <NavigationBar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 sm:pt-28 sm:pb-20 md:pt-32 md:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 backdrop-blur-sm rounded-full text-xs sm:text-sm font-medium mb-6 sm:mb-8 border border-white/20">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full mr-2"></span>
            Professional Authentication
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
            Grading
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Integration
            </span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed">
            Seamlessly integrate with PSA, BGS, SGC and other major grading services to track your certified cards.
          </p>
        </div>
      </section>

      {/* Service Selection */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {gradingServices.map((service) => (
              <button
                key={service.id}
                onClick={() => setActiveService(service.id)}
                className={`flex items-center gap-3 px-6 py-4 rounded-xl transition-all duration-300 ${
                  activeService === service.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                <span className="text-2xl">{service.logo}</span>
                <div className="text-left">
                  <div className="font-bold">{service.name}</div>
                  <div className="text-xs opacity-75">{service.description}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="bg-white/5 rounded-2xl p-8">
            {renderServiceDetails()}
          </div>
        </div>
      </section>

      {/* Integration Benefits */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why Use Grading Integration?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/5 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-bold mb-3">Accurate Valuations</h3>
              <p className="text-gray-400">Get real-time market values based on actual graded card sales data.</p>
            </div>
            
            <div className="bg-white/5 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-bold mb-3">Authentication</h3>
              <p className="text-gray-400">Verify certificate numbers and ensure your cards are legitimate.</p>
            </div>
            
            <div className="bg-white/5 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold mb-3">Population Data</h3>
              <p className="text-gray-400">Access population reports to understand card rarity and market positioning.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default GradingIntegration;
