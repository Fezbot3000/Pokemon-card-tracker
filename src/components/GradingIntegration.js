import React, { useState } from 'react';
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
      specialty: 'Sports cards, Pokemon, Trading cards',
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
      specialty: 'Modern cards, Subgrades',
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
      specialty: 'Vintage cards, Fast turnaround',
    },
  ];

  const renderServiceDetails = () => {
    const service = gradingServices.find(s => s.id === activeService);
    if (!service) return null;

    return (
      <div className="space-y-8">
        <div className="mb-6 flex items-center gap-4">
          <span className="text-4xl">{service.logo}</span>
          <div>
            <h2 className="text-3xl font-bold">{service.name}</h2>
            <p className="text-gray-400">{service.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="bg-white/5 rounded-xl p-6">
            <h3 className="mb-4 text-xl font-bold text-blue-400">
              📊 Grading Scale
            </h3>
            <div className="mb-4 grid grid-cols-5 gap-2">
              {service.grades.map(grade => (
                <div
                  key={grade}
                  className="bg-white/10 rounded-lg p-2 text-center text-sm"
                >
                  {grade}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-green-400">Special Grades:</h4>
              {service.specialGrades.map(grade => (
                <span
                  key={grade}
                  className="mr-2 inline-block rounded bg-green-600/20 px-2 py-1 text-xs text-green-400"
                >
                  {grade}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-6">
            <h3 className="mb-4 text-xl font-bold text-purple-400">
              ⏱️ Service Details
            </h3>
            <div className="space-y-3">
              <div>
                <span className="font-semibold text-gray-300">
                  Turnaround:{' '}
                </span>
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
          <h3 className="mb-4 text-xl font-bold text-yellow-400">
            🔗 Integration Features
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
      <section className="relative overflow-hidden px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 md:pb-24 md:pt-32 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="bg-white/10 border-white/20 mb-6 inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-sm sm:mb-8 sm:px-4 sm:py-2 sm:text-sm">
            <span className="mr-2 size-1.5 rounded-full bg-green-400 sm:size-2"></span>
            Professional Authentication
          </div>

          <h1 className="mb-4 text-3xl font-bold leading-tight sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl">
            Grading
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Integration
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-3xl text-base leading-relaxed text-gray-300 sm:mb-12 sm:text-lg md:text-xl lg:text-2xl">
            Seamlessly integrate with PSA, BGS, SGC and other major grading
            services to track your certified cards.
          </p>
        </div>
      </section>

      {/* Service Selection */}
      <section className="bg-black px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-wrap justify-center gap-4">
            {gradingServices.map(service => (
              <button
                key={service.id}
                onClick={() => setActiveService(service.id)}
                className={`flex items-center gap-3 rounded-xl px-6 py-4 transition-all duration-300 ${
                  activeService === service.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300'
                }`}
              >
                <span className="text-2xl">{service.logo}</span>
                <div className="text-left">
                  <div className="font-bold">{service.name}</div>
                  <div className="text-xs opacity-75">
                    {service.description}
                  </div>
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
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Why Use Grading Integration?
          </h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="bg-white/5 rounded-xl p-6 text-center">
              <div className="mb-4 text-4xl">📈</div>
              <h3 className="mb-3 text-xl font-bold">Accurate Valuations</h3>
              <p className="text-gray-400">
                Get real-time market values based on actual graded card sales
                data.
              </p>
            </div>

            <div className="bg-white/5 rounded-xl p-6 text-center">
              <div className="mb-4 text-4xl">🔒</div>
              <h3 className="mb-3 text-xl font-bold">Authentication</h3>
              <p className="text-gray-400">
                Verify certificate numbers and ensure your cards are legitimate.
              </p>
            </div>

            <div className="bg-white/5 rounded-xl p-6 text-center">
              <div className="mb-4 text-4xl">📊</div>
              <h3 className="mb-3 text-xl font-bold">Population Data</h3>
              <p className="text-gray-400">
                Access population reports to understand card rarity and market
                positioning.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default GradingIntegration;
