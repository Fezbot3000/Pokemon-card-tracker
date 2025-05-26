import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import NavigationBar from './NavigationBar';

const Privacy = () => {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: 'Overview', icon: '📋' },
    { id: 'collection', title: 'Data Collection', icon: '📊' },
    { id: 'usage', title: 'How We Use Data', icon: '🔧' },
    { id: 'sharing', title: 'Data Sharing', icon: '🤝' },
    { id: 'security', title: 'Security', icon: '🔒' },
    { id: 'cookies', title: 'Cookies', icon: '🍪' },
    { id: 'rights', title: 'Your Rights', icon: '⚖️' },
    { id: 'children', title: 'Children\'s Privacy', icon: '👶' },
    { id: 'changes', title: 'Policy Changes', icon: '📝' },
    { id: 'contact', title: 'Contact Us', icon: '📞' }
  ];

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#1B2131] text-white">
      <NavigationBar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 sm:pt-28 sm:pb-20 md:pt-32 md:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 backdrop-blur-sm rounded-full text-xs sm:text-sm font-medium mb-6 sm:mb-8 border border-white/20">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full mr-2"></span>
            Last Updated: January 2024
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
            Privacy
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Policy
            </span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed">
            Your privacy is important to us. This policy explains how we collect, use, and protect your information.
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
                      onClick={() => scrollToSection(section.id)}
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
                <div className="prose prose-invert max-w-none">
                  
                  {/* Overview */}
                  <section id="overview" className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 flex items-center">
                      <span className="mr-3">📋</span>
                      Overview
                    </h2>
                    <div className="space-y-4 text-gray-300 leading-relaxed">
                      <p>
                        Welcome to Collectibles Tracker ("we," "our," or "us"). This Privacy Policy explains how we collect, 
                        use, disclose, and safeguard your information when you use our website, mobile application, and related services 
                        (collectively, the "Service").
                      </p>
                      <p>
                        By using our Service, you agree to the collection and use of information in accordance with this policy. 
                        We will not use or share your information with anyone except as described in this Privacy Policy.
                      </p>
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                        <h4 className="font-bold text-blue-400 mb-2">Key Points:</h4>
                        <ul className="space-y-1 text-sm">
                          <li>• We collect minimal data necessary to provide our services</li>
                          <li>• Your collection data is encrypted and secure</li>
                          <li>• We never sell your personal information</li>
                          <li>• You have full control over your data</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* Data Collection */}
                  <section id="collection" className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 flex items-center">
                      <span className="mr-3">📊</span>
                      Information We Collect
                    </h2>
                    <div className="space-y-6 text-gray-300 leading-relaxed">
                      <div>
                        <h3 className="text-xl font-bold text-blue-400 mb-3">Personal Information</h3>
                        <p className="mb-3">When you create an account or use our Service, we may collect:</p>
                        <ul className="space-y-2 ml-6">
                          <li>• <strong>Account Information:</strong> Name, email address, username, password</li>
                          <li>• <strong>Profile Information:</strong> Profile picture, bio, location (optional)</li>
                          <li>• <strong>Payment Information:</strong> Billing address, payment method details (processed securely)</li>
                          <li>• <strong>Communication Data:</strong> Messages, support tickets, feedback</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="text-xl font-bold text-blue-400 mb-3">Collection Data</h3>
                        <ul className="space-y-2 ml-6">
                          <li>• Card information, conditions, and valuations</li>
                          <li>• Collection organization and categories</li>
                          <li>• Purchase history and transaction data</li>
                          <li>• Photos and images of your collectibles</li>
                          <li>• Custom fields and notes</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-xl font-bold text-blue-400 mb-3">Technical Information</h3>
                        <ul className="space-y-2 ml-6">
                          <li>• Device information (type, operating system, browser)</li>
                          <li>• IP address and location data</li>
                          <li>• Usage patterns and feature interactions</li>
                          <li>• Performance and error logs</li>
                          <li>• Cookies and similar tracking technologies</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* How We Use Data */}
                  <section id="usage" className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 flex items-center">
                      <span className="mr-3">🔧</span>
                      How We Use Your Information
                    </h2>
                    <div className="space-y-4 text-gray-300 leading-relaxed">
                      <p>We use the information we collect to:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-xl p-4">
                          <h4 className="font-bold text-green-400 mb-2">📥 Service Provision</h4>
                          <ul className="text-sm space-y-1">
                            <li>• Provide and maintain our Service</li>
                            <li>• Process transactions and payments</li>
                            <li>• Sync data across your devices</li>
                            <li>• Generate analytics and reports</li>
                          </ul>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <h4 className="font-bold text-green-400 mb-2">✉️ Communication</h4>
                          <ul className="text-sm space-y-1">
                            <li>• Send service notifications</li>
                            <li>• Respond to support requests</li>
                            <li>• Share product updates</li>
                            <li>• Send marketing communications (opt-in)</li>
                          </ul>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <h4 className="font-bold text-green-400 mb-2">📈 Improvement</h4>
                          <ul className="text-sm space-y-1">
                            <li>• Analyze usage patterns</li>
                            <li>• Develop new features</li>
                            <li>• Fix bugs and issues</li>
                            <li>• Optimize performance</li>
                          </ul>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <h4 className="font-bold text-green-400 mb-2">🔒 Security</h4>
                          <ul className="text-sm space-y-1">
                            <li>• Prevent fraud and abuse</li>
                            <li>• Ensure account security</li>
                            <li>• Comply with legal obligations</li>
                            <li>• Protect user safety</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Data Sharing */}
                  <section id="sharing" className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 flex items-center">
                      <span className="mr-3">🤝</span>
                      Information Sharing and Disclosure
                    </h2>
                    <div className="space-y-4 text-gray-300 leading-relaxed">
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                        <h4 className="font-bold text-red-400 mb-2">We Never Sell Your Data</h4>
                        <p className="text-sm">We do not sell, trade, or rent your personal information to third parties for marketing purposes.</p>
                      </div>
                      
                      <p>We may share your information only in the following circumstances:</p>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-bold text-blue-400 mb-2">Service Providers</h4>
                          <p>We work with trusted third-party service providers who help us operate our Service:</p>
                          <ul className="mt-2 ml-6 space-y-1">
                            <li>• Cloud hosting and storage providers</li>
                            <li>• Payment processors</li>
                            <li>• Email and communication services</li>
                            <li>• Analytics and monitoring tools</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-bold text-blue-400 mb-2">Legal Requirements</h4>
                          <p>We may disclose your information if required by law or in response to:</p>
                          <ul className="mt-2 ml-6 space-y-1">
                            <li>• Valid legal process or government requests</li>
                            <li>• Enforcement of our Terms of Service</li>
                            <li>• Protection of rights, property, or safety</li>
                            <li>• Investigation of fraud or security issues</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-bold text-blue-400 mb-2">Business Transfers</h4>
                          <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Security */}
                  <section id="security" className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 flex items-center">
                      <span className="mr-3">🔒</span>
                      Data Security
                    </h2>
                    <div className="space-y-4 text-gray-300 leading-relaxed">
                      <p>
                        We implement industry-standard security measures to protect your information against unauthorized access, 
                        alteration, disclosure, or destruction.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-xl p-4">
                          <h4 className="font-bold text-purple-400 mb-2">🔐 Encryption</h4>
                          <ul className="text-sm space-y-1">
                            <li>• Data encrypted in transit (TLS 1.3)</li>
                            <li>• Data encrypted at rest (AES-256)</li>
                            <li>• End-to-end encryption for sensitive data</li>
                          </ul>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <h4 className="font-bold text-purple-400 mb-2">🛡️ Access Controls</h4>
                          <ul className="text-sm space-y-1">
                            <li>• Multi-factor authentication</li>
                            <li>• Role-based access controls</li>
                            <li>• Regular access reviews</li>
                          </ul>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <h4 className="font-bold text-purple-400 mb-2">🔍 Monitoring</h4>
                          <ul className="text-sm space-y-1">
                            <li>• 24/7 security monitoring</li>
                            <li>• Intrusion detection systems</li>
                            <li>• Regular security audits</li>
                          </ul>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <h4 className="font-bold text-purple-400 mb-2">📋 Compliance</h4>
                          <ul className="text-sm space-y-1">
                            <li>• SOC 2 Type II certified</li>
                            <li>• GDPR compliant</li>
                            <li>• Regular penetration testing</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Cookies */}
                  <section id="cookies" className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 flex items-center">
                      <span className="mr-3">🍪</span>
                      Cookies and Tracking
                    </h2>
                    <div className="space-y-4 text-gray-300 leading-relaxed">
                      <p>
                        We use cookies and similar tracking technologies to enhance your experience and analyze usage patterns.
                      </p>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-bold text-orange-400 mb-2">Essential Cookies</h4>
                          <p>Required for the Service to function properly. These cannot be disabled.</p>
                          <ul className="mt-2 ml-6 space-y-1">
                            <li>• Authentication and session management</li>
                            <li>• Security and fraud prevention</li>
                            <li>• Load balancing and performance</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-bold text-orange-400 mb-2">Analytics Cookies</h4>
                          <p>Help us understand how you use our Service. You can opt out of these.</p>
                          <ul className="mt-2 ml-6 space-y-1">
                            <li>• Usage statistics and patterns</li>
                            <li>• Feature adoption metrics</li>
                            <li>• Performance monitoring</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-bold text-orange-400 mb-2">Preference Cookies</h4>
                          <p>Remember your settings and preferences.</p>
                          <ul className="mt-2 ml-6 space-y-1">
                            <li>• Language and region settings</li>
                            <li>• Theme and display preferences</li>
                            <li>• Notification preferences</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                        <h4 className="font-bold text-yellow-400 mb-2">Cookie Management</h4>
                        <p className="text-sm">You can control cookies through your browser settings or our cookie preference center. Note that disabling certain cookies may affect functionality.</p>
                      </div>
                    </div>
                  </section>

                  {/* Your Rights */}
                  <section id="rights" className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 flex items-center">
                      <span className="mr-3">⚖️</span>
                      Your Rights and Choices
                    </h2>
                    <div className="space-y-4 text-gray-300 leading-relaxed">
                      <p>You have several rights regarding your personal information:</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-xl p-4">
                          <h4 className="font-bold text-cyan-400 mb-2">📥 Access</h4>
                          <p className="text-sm">Request a copy of your personal data we hold</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <h4 className="font-bold text-cyan-400 mb-2">✏️ Correction</h4>
                          <p className="text-sm">Update or correct inaccurate information</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <h4 className="font-bold text-cyan-400 mb-2">🗑️ Deletion</h4>
                          <p className="text-sm">Request deletion of your personal data</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <h4 className="font-bold text-cyan-400 mb-2">📤 Portability</h4>
                          <p className="text-sm">Export your data in a machine-readable format</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <h4 className="font-bold text-cyan-400 mb-2">🚫 Restriction</h4>
                          <p className="text-sm">Limit how we process your information</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <h4 className="font-bold text-cyan-400 mb-2">✋ Objection</h4>
                          <p className="text-sm">Object to certain types of processing</p>
                        </div>
                      </div>
                      
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                        <h4 className="font-bold text-blue-400 mb-2">How to Exercise Your Rights</h4>
                        <p className="text-sm mb-2">To exercise any of these rights, contact us at:</p>
                        <ul className="text-sm space-y-1">
                          <li>• Email: privacy@collectiblestracker.com</li>
                          <li>• Through your account settings</li>
                          <li>• Via our support system</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* Children's Privacy */}
                  <section id="children" className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 flex items-center">
                      <span className="mr-3">👶</span>
                      Children's Privacy
                    </h2>
                    <div className="space-y-4 text-gray-300 leading-relaxed">
                      <p>
                        Our Service is not intended for children under 13 years of age. We do not knowingly collect 
                        personal information from children under 13.
                      </p>
                      <p>
                        If you are a parent or guardian and believe your child has provided us with personal information, 
                        please contact us immediately. We will take steps to remove such information from our systems.
                      </p>
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                        <h4 className="font-bold text-orange-400 mb-2">Age Verification</h4>
                        <p className="text-sm">Users must be at least 13 years old to create an account. Users between 13-17 require parental consent.</p>
                      </div>
                    </div>
                  </section>

                  {/* Policy Changes */}
                  <section id="changes" className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 flex items-center">
                      <span className="mr-3">📝</span>
                      Changes to This Policy
                    </h2>
                    <div className="space-y-4 text-gray-300 leading-relaxed">
                      <p>
                        We may update this Privacy Policy from time to time. We will notify you of any changes by:
                      </p>
                      <ul className="ml-6 space-y-2">
                        <li>• Posting the new Privacy Policy on this page</li>
                        <li>• Sending you an email notification</li>
                        <li>• Displaying a prominent notice in our Service</li>
                        <li>• Updating the "Last Updated" date at the top of this policy</li>
                      </ul>
                      <p>
                        Your continued use of the Service after any changes constitutes acceptance of the new Privacy Policy.
                      </p>
                    </div>
                  </section>

                  {/* Contact */}
                  <section id="contact" className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 flex items-center">
                      <span className="mr-3">📞</span>
                      Contact Information
                    </h2>
                    <div className="space-y-4 text-gray-300 leading-relaxed">
                      <p>
                        If you have any questions about this Privacy Policy or our data practices, please contact us:
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-xl p-4">
                          <h4 className="font-bold text-green-400 mb-2">📧 Email</h4>
                          <p className="text-sm">privacy@collectiblestracker.com</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <h4 className="font-bold text-green-400 mb-2">📮 Mail</h4>
                          <p className="text-sm">
                            Collectibles Tracker<br />
                            Privacy Department<br />
                            123 Tech Street<br />
                            Sydney, NSW 2000<br />
                            Australia
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <h4 className="font-bold text-green-400 mb-2">💬 Support</h4>
                          <p className="text-sm">Use our in-app support system for privacy-related inquiries</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <h4 className="font-bold text-green-400 mb-2">⏰ Response Time</h4>
                          <p className="text-sm">We respond to privacy inquiries within 30 days</p>
                        </div>
                      </div>
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
            Questions About Privacy?
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 sm:mb-12 max-w-2xl mx-auto">
            Our privacy team is here to help. Contact us with any questions or concerns about your data.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
            <Link 
              to="/help-center" 
              className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-center"
            >
              Contact Support
            </Link>
            <Link 
              to="/terms" 
              className="w-full sm:w-auto bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 text-center"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1 md:col-span-1">
              <h3 className="text-xl font-bold mb-4">Collectibles Tracker</h3>
              <p className="text-gray-400 text-sm mb-6">
                Australia's most trusted platform for collectible management and trading.
              </p>
            </div>
            
            <div className="col-span-1">
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/login" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Sign Up</Link></li>
                <li><Link to="/features" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Features</Link></li>
                <li><Link to="/pricing" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>
            
            <div className="col-span-1">
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/help-center" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link to="/collecting-guide" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Collecting Guide</Link></li>
                <li><Link to="/grading-integration" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Grading Integration</Link></li>
              </ul>
            </div>
            
            <div className="col-span-1">
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/about" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">About</Link></li>
                <li><Link to="/privacy" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link to="/terms" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10 text-center">
            <p className="text-gray-400 text-sm">
              {new Date().getFullYear()} Collectibles Tracker. Made with ❤️ for collectors worldwide.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Privacy;
