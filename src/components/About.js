import React from 'react';
import { Link } from 'react-router-dom';
import NavigationBar from './NavigationBar';
import Footer from './Footer';

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
      <section className="relative overflow-hidden px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 md:pb-24 md:pt-32 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
        <div className="absolute left-1/4 top-1/4 size-96 rounded-full bg-blue-500/5 blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 size-96 rounded-full bg-purple-500/5 blur-3xl"></div>
        
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="bg-white/10 border-white/20 mb-6 inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-sm sm:mb-8 sm:px-4 sm:py-2 sm:text-sm">
            <span className="mr-2 size-1.5 rounded-full bg-green-400 sm:size-2"></span>
            Trusted by 50,000+ Collectors
          </div>
          
          <h1 className="mb-4 text-3xl font-bold leading-tight sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl">
            About
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Collectibles Tracker
            </span>
          </h1>
          
          <p className="mx-auto mb-8 max-w-3xl text-base leading-relaxed text-gray-300 sm:mb-12 sm:text-lg md:text-xl lg:text-2xl">
            We're on a mission to empower collectors worldwide with professional-grade tools to manage, track, and grow their collections.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="bg-black px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-6 text-2xl font-bold sm:text-3xl md:text-4xl">
                Our Story
              </h2>
              <div className="space-y-6 leading-relaxed text-gray-300">
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
              <div className="from-white/10 to-white/5 border-white/10 rounded-3xl border bg-gradient-to-br p-8 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-6">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <div className="mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
                        {stat.number}
                      </div>
                      <div className="text-sm text-gray-400">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission & Values */}
      <section className="bg-black px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center sm:mb-16">
            <h2 className="mb-4 text-2xl font-bold sm:mb-6 sm:text-3xl md:text-4xl">
              Our Mission & Values
            </h2>
            <p className="mx-auto max-w-2xl text-base text-gray-300 sm:text-lg">
              Guided by principles that put collectors first and drive innovation in the industry
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
            {values.map((value, index) => (
              <div key={index} className="from-white/10 to-white/5 border-white/10 hover:border-white/20 group rounded-2xl border bg-gradient-to-br p-6 text-center backdrop-blur-sm transition-all duration-300">
                <div className="mb-4 text-4xl transition-transform duration-300 group-hover:scale-110">
                  {value.icon}
                </div>
                <h3 className="mb-3 text-xl font-bold">{value.title}</h3>
                <p className="leading-relaxed text-gray-400">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-black px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center sm:mb-16">
            <h2 className="mb-4 text-2xl font-bold sm:mb-6 sm:text-3xl md:text-4xl">
              Our Journey
            </h2>
            <p className="mx-auto max-w-2xl text-base text-gray-300 sm:text-lg">
              From a personal project to serving collectors worldwide
            </p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 h-full w-1 -translate-x-1/2 rounded-full bg-gradient-to-b from-blue-500 to-purple-500"></div>
            
            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <div key={index} className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                    <div className="from-white/10 to-white/5 border-white/10 rounded-2xl border bg-gradient-to-br p-6 backdrop-blur-sm">
                      <div className="mb-3 text-3xl">{milestone.icon}</div>
                      <div className="mb-2 text-lg font-bold text-blue-400">{milestone.year}</div>
                      <h3 className="mb-2 text-xl font-bold">{milestone.title}</h3>
                      <p className="text-gray-400">{milestone.description}</p>
                    </div>
                  </div>
                  
                  {/* Timeline dot */}
                  <div className="relative z-10 size-4 rounded-full border-4 border-[#1B2131] bg-gradient-to-r from-blue-500 to-purple-500"></div>
                  
                  <div className="w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="bg-black px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center sm:mb-16">
            <h2 className="mb-4 text-2xl font-bold sm:mb-6 sm:text-3xl md:text-4xl">
              Meet Our Team
            </h2>
            <p className="mx-auto max-w-2xl text-base text-gray-300 sm:text-lg">
              Passionate collectors and technologists working to build the future of collection management
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
            {teamMembers.map((member, index) => (
              <div key={index} className="from-white/10 to-white/5 border-white/10 hover:border-white/20 group rounded-2xl border bg-gradient-to-br p-6 text-center backdrop-blur-sm transition-all duration-300">
                <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                  <span className="text-2xl">👤</span>
                </div>
                <h3 className="mb-1 text-xl font-bold">{member.name}</h3>
                <p className="mb-3 font-medium text-blue-400">{member.role}</p>
                <p className="mb-4 text-sm leading-relaxed text-gray-400">{member.bio}</p>
                <div className="flex flex-wrap justify-center gap-1">
                  {member.expertise.map((skill, skillIndex) => (
                    <span key={skillIndex} className="rounded-full bg-blue-500/20 px-2 py-1 text-xs text-blue-300">
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
      <section className="bg-black px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-6 text-2xl font-bold sm:text-3xl md:text-4xl">
                Technology & Security
              </h2>
              <div className="space-y-6 leading-relaxed text-gray-300">
                <p>
                  Our platform is built on modern, scalable technology that ensures reliability, security, and performance. 
                  We use industry-leading practices to protect your data and provide a seamless experience across all devices.
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="bg-white/5 rounded-xl p-4">
                    <h4 className="mb-2 font-bold text-blue-400">🔒 Security</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• End-to-end encryption</li>
                      <li>• SOC 2 Type II compliance</li>
                      <li>• Regular security audits</li>
                      <li>• Two-factor authentication</li>
                    </ul>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <h4 className="mb-2 font-bold text-blue-400">⚡ Performance</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• 99.9% uptime guarantee</li>
                      <li>• Global CDN network</li>
                      <li>• Real-time synchronization</li>
                      <li>• Optimized mobile apps</li>
                    </ul>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <h4 className="mb-2 font-bold text-blue-400">📊 Analytics</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• Real-time market data</li>
                      <li>• Advanced reporting</li>
                      <li>• Custom dashboards</li>
                      <li>• API integrations</li>
                    </ul>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <h4 className="mb-2 font-bold text-blue-400">🌍 Global</h4>
                    <ul className="space-y-1 text-sm">
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
              <div className="from-white/10 to-white/5 border-white/10 rounded-2xl border bg-gradient-to-br p-6 backdrop-blur-sm">
                <h3 className="mb-4 text-xl font-bold">🏆 Awards & Recognition</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="mr-3 size-2 rounded-full bg-yellow-400"></span>
                    <span className="text-gray-300">Best Collectibles App 2024 - Collectors Choice Awards</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-3 size-2 rounded-full bg-yellow-400"></span>
                    <span className="text-gray-300">Innovation in FinTech 2023 - TechCrunch</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-3 size-2 rounded-full bg-yellow-400"></span>
                    <span className="text-gray-300">Top Startup 2022 - Australian Tech Awards</span>
                  </div>
                </div>
              </div>
              
              <div className="from-white/10 to-white/5 border-white/10 rounded-2xl border bg-gradient-to-br p-6 backdrop-blur-sm">
                <h3 className="mb-4 text-xl font-bold">🤝 Partnerships</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="mr-3 size-2 rounded-full bg-blue-400"></span>
                    <span className="text-gray-300">PSA Authentication Services</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-3 size-2 rounded-full bg-blue-400"></span>
                    <span className="text-gray-300">Beckett Grading Services</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-3 size-2 rounded-full bg-blue-400"></span>
                    <span className="text-gray-300">Major Card Distributors</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-black px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-2xl font-bold sm:mb-6 sm:text-3xl md:text-4xl">
            Join Our Community
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-base text-gray-300 sm:mb-12 sm:text-lg md:text-xl">
            Become part of a global community of collectors who trust Collectibles Tracker to manage their valuable collections.
          </p>
          
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <Link 
              to="/login?signup=true" 
              className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-4 text-center text-lg font-semibold shadow-lg transition-all duration-300 hover:scale-105 hover:from-blue-600 hover:to-purple-700 hover:shadow-xl sm:w-auto"
            >
              Start Your Journey
            </Link>
            <Link 
              to="/help-center" 
              className="bg-white/10 border-white/20 hover:bg-white/20 w-full rounded-2xl border px-8 py-4 text-center text-lg font-semibold backdrop-blur-sm transition-all duration-300 hover:scale-105 sm:w-auto"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
