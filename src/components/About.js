import React from 'react';
import { Link } from 'react-router-dom';
import NavigationBar from './NavigationBar';

const About = () => {
  const teamMembers = [
    {
      name: 'Matthew Chen',
      role: 'Founder & CEO',
      bio: 'Passionate collector with 15+ years experience in the trading card industry. Former software engineer at leading tech companies.',
      image: '/team/matthew.jpg',
      expertise: ['Product Strategy', 'Collection Management', 'Market Analysis']
    },
    {
      name: 'Sarah Williams',
      role: 'Head of Engineering',
      bio: 'Full-stack developer with expertise in scalable web applications and mobile development. 10+ years in fintech and marketplace platforms.',
      image: '/team/sarah.jpg',
      expertise: ['Backend Development', 'Mobile Apps', 'Cloud Infrastructure']
    },
    {
      name: 'David Rodriguez',
      role: 'Head of Design',
      bio: 'UX/UI designer focused on creating intuitive experiences for complex data. Previously designed for major e-commerce platforms.',
      image: '/team/david.jpg',
      expertise: ['User Experience', 'Interface Design', 'Design Systems']
    },
    {
      name: 'Emily Thompson',
      role: 'Community Manager',
      bio: 'Long-time collector and community builder. Connects with users to understand their needs and improve the platform.',
      image: '/team/emily.jpg',
      expertise: ['Community Building', 'Customer Success', 'Content Strategy']
    }
  ];

  const milestones = [
    {
      year: '2020',
      title: 'The Beginning',
      description: 'Started as a personal project to track a growing collection',
      icon: '🌱'
    },
    {
      year: '2021',
      title: 'First Users',
      description: 'Launched beta version and gained first 100 collectors',
      icon: '👥'
    },
    {
      year: '2022',
      title: 'Marketplace Launch',
      description: 'Introduced secure marketplace for buying and selling',
      icon: '🏪'
    },
    {
      year: '2023',
      title: 'Mobile App',
      description: 'Released full-featured mobile applications',
      icon: '📱'
    },
    {
      year: '2024',
      title: 'Global Expansion',
      description: 'Expanded to serve collectors worldwide with 50,000+ users',
      icon: '🌍'
    },
    {
      year: '2025',
      title: 'AI Integration',
      description: 'Launching AI-powered card recognition and valuation',
      icon: '🤖'
    }
  ];

  const values = [
    {
      title: 'Collector-First',
      description: 'Every feature is designed with collectors in mind, built by collectors for collectors.',
      icon: '🎯'
    },
    {
      title: 'Trust & Security',
      description: 'Your collection data and transactions are protected with enterprise-grade security.',
      icon: '🔒'
    },
    {
      title: 'Innovation',
      description: 'We continuously innovate to bring cutting-edge tools to the collecting community.',
      icon: '💡'
    },
    {
      title: 'Community',
      description: 'Building a global community where collectors can connect, trade, and grow together.',
      icon: '🤝'
    },
    {
      title: 'Transparency',
      description: 'Open communication about our platform, pricing, and future development.',
      icon: '🔍'
    },
    {
      title: 'Excellence',
      description: 'Committed to delivering the highest quality tools and user experience.',
      icon: '⭐'
    }
  ];

  const stats = [
    { number: '50,000+', label: 'Active Collectors' },
    { number: '$2M+', label: 'Cards Tracked' },
    { number: '100,000+', label: 'Marketplace Listings' },
    { number: '25+', label: 'Countries Served' },
    { number: '99.9%', label: 'Uptime' },
    { number: '4.9/5', label: 'User Rating' }
  ];

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
            Trusted by 50,000+ Collectors
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
            About
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Collectibles Tracker
            </span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed">
            We're on a mission to empower collectors worldwide with professional-grade tools to manage, track, and grow their collections.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
                Our Story
              </h2>
              <div className="space-y-6 text-gray-300 leading-relaxed">
                <p>
                  Collectibles Tracker was born from a simple frustration: the lack of professional tools for serious collectors. 
                  Our founder, Matthew, was managing a growing collection using spreadsheets and basic apps that couldn't 
                  handle the complexity of modern collecting.
                </p>
                <p>
                  What started as a personal project quickly evolved into something bigger when other collectors saw the 
                  potential. We realized that collectors deserved better than makeshift solutions – they needed professional-grade 
                  tools that could handle everything from basic tracking to advanced portfolio analytics.
                </p>
                <p>
                  Today, we're proud to serve over 50,000 collectors worldwide, helping them manage collections worth millions 
                  of dollars. Our platform has facilitated thousands of secure transactions and helped collectors make informed 
                  decisions about their investments.
                </p>
                <p>
                  But we're just getting started. Our vision is to become the global standard for collection management, 
                  connecting collectors worldwide and providing the tools they need to succeed in an increasingly complex market.
                </p>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
                <div className="grid grid-cols-2 gap-6">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                        {stat.number}
                      </div>
                      <div className="text-gray-400 text-sm">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission & Values */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
              Our Mission & Values
            </h2>
            <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto">
              Guided by principles that put collectors first and drive innovation in the industry
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {values.map((value, index) => (
              <div key={index} className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 group text-center">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {value.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{value.title}</h3>
                <p className="text-gray-400 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
              Our Journey
            </h2>
            <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto">
              From a personal project to serving collectors worldwide
            </p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
            
            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <div key={index} className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                      <div className="text-3xl mb-3">{milestone.icon}</div>
                      <div className="text-blue-400 font-bold text-lg mb-2">{milestone.year}</div>
                      <h3 className="text-xl font-bold mb-2">{milestone.title}</h3>
                      <p className="text-gray-400">{milestone.description}</p>
                    </div>
                  </div>
                  
                  {/* Timeline dot */}
                  <div className="relative z-10 w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full border-4 border-[#1B2131]"></div>
                  
                  <div className="w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
              Meet Our Team
            </h2>
            <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto">
              Passionate collectors and technologists working to build the future of collection management
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {teamMembers.map((member, index) => (
              <div key={index} className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 group text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
                <h3 className="text-xl font-bold mb-1">{member.name}</h3>
                <p className="text-blue-400 font-medium mb-3">{member.role}</p>
                <p className="text-gray-400 text-sm mb-4 leading-relaxed">{member.bio}</p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {member.expertise.map((skill, skillIndex) => (
                    <span key={skillIndex} className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology & Security */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
                Technology & Security
              </h2>
              <div className="space-y-6 text-gray-300 leading-relaxed">
                <p>
                  Our platform is built on modern, scalable technology that ensures reliability, security, and performance. 
                  We use industry-leading practices to protect your data and provide a seamless experience across all devices.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-4">
                    <h4 className="font-bold text-blue-400 mb-2">🔒 Security</h4>
                    <ul className="text-sm space-y-1">
                      <li>• End-to-end encryption</li>
                      <li>• SOC 2 Type II compliance</li>
                      <li>• Regular security audits</li>
                      <li>• Two-factor authentication</li>
                    </ul>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <h4 className="font-bold text-blue-400 mb-2">⚡ Performance</h4>
                    <ul className="text-sm space-y-1">
                      <li>• 99.9% uptime guarantee</li>
                      <li>• Global CDN network</li>
                      <li>• Real-time synchronization</li>
                      <li>• Optimized mobile apps</li>
                    </ul>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <h4 className="font-bold text-blue-400 mb-2">📊 Analytics</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Real-time market data</li>
                      <li>• Advanced reporting</li>
                      <li>• Custom dashboards</li>
                      <li>• API integrations</li>
                    </ul>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <h4 className="font-bold text-blue-400 mb-2">🌍 Global</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Multi-language support</li>
                      <li>• Local currency options</li>
                      <li>• Regional compliance</li>
                      <li>• 24/7 support coverage</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h3 className="text-xl font-bold mb-4">🏆 Awards & Recognition</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></span>
                    <span className="text-gray-300">Best Collectibles App 2024 - Collectors Choice Awards</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></span>
                    <span className="text-gray-300">Innovation in FinTech 2023 - TechCrunch</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></span>
                    <span className="text-gray-300">Top Startup 2022 - Australian Tech Awards</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h3 className="text-xl font-bold mb-4">🤝 Partnerships</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                    <span className="text-gray-300">PSA Authentication Services</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                    <span className="text-gray-300">Beckett Grading Services</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                    <span className="text-gray-300">Major Card Distributors</span>
                  </div>
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
            Join Our Community
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 sm:mb-12 max-w-2xl mx-auto">
            Become part of a global community of collectors who trust Collectibles Tracker to manage their valuable collections.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
            <Link 
              to="/login?signup=true" 
              className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-center"
            >
              Start Your Journey
            </Link>
            <Link 
              to="/help-center" 
              className="w-full sm:w-auto bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 text-center"
            >
              Contact Us
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

export default About;
