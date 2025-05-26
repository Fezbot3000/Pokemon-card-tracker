import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import NavigationBar from './NavigationBar';
import Footer from './Footer';

const Terms = () => {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: 'Overview', icon: '📋' },
    { id: 'acceptance', title: 'Acceptance', icon: '✅' },
    { id: 'accounts', title: 'User Accounts', icon: '👤' },
    { id: 'usage', title: 'Acceptable Use', icon: '✔️' },
    { id: 'content', title: 'User Content', icon: '📝' },
    { id: 'marketplace', title: 'Marketplace', icon: '🏪' },
    { id: 'payment', title: 'Payment Terms', icon: '💳' },
    { id: 'termination', title: 'Termination', icon: '🚪' },
    { id: 'liability', title: 'Liability', icon: '⚖️' },
    { id: 'contact', title: 'Contact', icon: '📞' }
  ];

  return (
    <div className="min-h-screen bg-[#1B2131] text-white">
      <NavigationBar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 sm:pt-28 sm:pb-20 md:pt-32 md:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 backdrop-blur-sm rounded-full text-xs sm:text-sm font-medium mb-6 sm:mb-8 border border-white/20">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full mr-2"></span>
            Last Updated: January 2024
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
            Terms of
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Service
            </span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed">
            Please read these terms carefully before using our service. By using Collectibles Tracker, you agree to these terms.
          </p>
        </div>
      </section>

      {/* Navigation & Content */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <h3 className="text-lg font-bold mb-4">Quick Navigation</h3>
                <nav className="space-y-2">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 flex items-center ${
                        activeSection === section.id
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <span className="mr-3">{section.icon}</span>
                      <span className="text-sm font-medium">{section.title}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
                <div className="prose prose-invert max-w-none space-y-8">
                  
                  {/* Overview */}
                  <section id="overview">
                    <h2 className="text-2xl font-bold mb-4 flex items-center">
                      <span className="mr-3">📋</span>Overview
                    </h2>
                    <div className="text-gray-300 space-y-4">
                      <p>These Terms of Service govern your use of Collectibles Tracker and related services. By accessing or using our service, you agree to be bound by these terms.</p>
                    </div>
                  </section>

                  {/* Acceptance */}
                  <section id="acceptance">
                    <h2 className="text-2xl font-bold mb-4 flex items-center">
                      <span className="mr-3">✅</span>Acceptance of Terms
                    </h2>
                    <div className="text-gray-300 space-y-4">
                      <p>By creating an account or using our service, you acknowledge that you have read, understood, and agree to these terms. If you do not agree, please do not use our service.</p>
                    </div>
                  </section>

                  {/* User Accounts */}
                  <section id="accounts">
                    <h2 className="text-2xl font-bold mb-4 flex items-center">
                      <span className="mr-3">👤</span>User Accounts
                    </h2>
                    <div className="text-gray-300 space-y-4">
                      <p>You are responsible for maintaining the security of your account and all activities under your account. You must provide accurate information and keep it updated.</p>
                      <ul className="ml-6 space-y-2">
                        <li>• You must be at least 13 years old to create an account</li>
                        <li>• One account per person</li>
                        <li>• Keep your login credentials secure</li>
                        <li>• Notify us immediately of any unauthorized access</li>
                      </ul>
                    </div>
                  </section>

                  {/* Acceptable Use */}
                  <section id="usage">
                    <h2 className="text-2xl font-bold mb-4 flex items-center">
                      <span className="mr-3">✔️</span>Acceptable Use
                    </h2>
                    <div className="text-gray-300 space-y-4">
                      <p>You agree to use our service only for lawful purposes. Prohibited activities include:</p>
                      <ul className="ml-6 space-y-2">
                        <li>• Violating any laws or regulations</li>
                        <li>• Infringing on intellectual property rights</li>
                        <li>• Harassing or threatening other users</li>
                        <li>• Attempting to gain unauthorized access</li>
                        <li>• Distributing malware or harmful content</li>
                      </ul>
                    </div>
                  </section>

                  {/* User Content */}
                  <section id="content">
                    <h2 className="text-2xl font-bold mb-4 flex items-center">
                      <span className="mr-3">📝</span>User Content
                    </h2>
                    <div className="text-gray-300 space-y-4">
                      <p>You retain ownership of content you upload but grant us license to use it for providing our services. You are responsible for ensuring you have rights to all content you upload.</p>
                    </div>
                  </section>

                  {/* Marketplace */}
                  <section id="marketplace">
                    <h2 className="text-2xl font-bold mb-4 flex items-center">
                      <span className="mr-3">🏪</span>Marketplace Terms
                    </h2>
                    <div className="text-gray-300 space-y-4">
                      <p>Our marketplace facilitates transactions between users. We are not a party to these transactions but provide tools and security measures to help ensure safe trading.</p>
                    </div>
                  </section>

                  {/* Payment Terms */}
                  <section id="payment">
                    <h2 className="text-2xl font-bold mb-4 flex items-center">
                      <span className="mr-3">💳</span>Payment Terms
                    </h2>
                    <div className="text-gray-300 space-y-4">
                      <p>Subscription fees are billed in advance. Refunds are provided according to our refund policy. Prices may change with 30 days notice.</p>
                    </div>
                  </section>

                  {/* Termination */}
                  <section id="termination">
                    <h2 className="text-2xl font-bold mb-4 flex items-center">
                      <span className="mr-3">🚪</span>Termination
                    </h2>
                    <div className="text-gray-300 space-y-4">
                      <p>Either party may terminate this agreement at any time. We may suspend or terminate accounts that violate these terms. Upon termination, you may export your data for 30 days.</p>
                    </div>
                  </section>

                  {/* Liability */}
                  <section id="liability">
                    <h2 className="text-2xl font-bold mb-4 flex items-center">
                      <span className="mr-3">⚖️</span>Limitation of Liability
                    </h2>
                    <div className="text-gray-300 space-y-4">
                      <p>Our service is provided "as is" without warranties. We are not liable for indirect damages. Our total liability is limited to the amount you paid in the last 12 months.</p>
                    </div>
                  </section>

                  {/* Contact */}
                  <section id="contact">
                    <h2 className="text-2xl font-bold mb-4 flex items-center">
                      <span className="mr-3">📞</span>Contact Information
                    </h2>
                    <div className="text-gray-300 space-y-4">
                      <p>For questions about these terms, contact us at legal@collectiblestracker.com</p>
                    </div>
                  </section>

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
            Questions About Our Terms?
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 sm:mb-12 max-w-2xl mx-auto">
            Our legal team is available to help clarify any questions about our terms of service.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
            <Link 
              to="/help-center" 
              onClick={() => window.scrollTo(0, 0)} 
              className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-center"
            >
              Contact Support
            </Link>
            <Link 
              to="/privacy" 
              onClick={() => window.scrollTo(0, 0)} 
              className="w-full sm:w-auto bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 text-center"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Terms;
