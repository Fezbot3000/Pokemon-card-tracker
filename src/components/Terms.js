import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import NavigationBar from './NavigationBar';
import Footer from './Footer';
import { Button } from '../design-system';

const Terms = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const sectionRefs = useRef({});
  const observerRef = useRef(null);

  const sections = [
    { id: 'overview', title: 'Overview', icon: '📋' },
    { id: 'acceptance', title: 'Acceptance', icon: '✅' },
    { id: 'accounts', title: 'User Accounts', icon: '👤' },
    { id: 'usage', title: 'Acceptable Use', icon: '✔️' },
    { id: 'content', title: 'User Content', icon: '📝' },
    { id: 'marketplace', title: 'Marketplace', icon: '🏪' },
    { id: 'termination', title: 'Termination', icon: '🚪' },
    { id: 'liability', title: 'Liability', icon: '⚖️' },
    { id: 'contact', title: 'Contact', icon: '📞' },
  ];

  // Scroll to section function
  const scrollToSection = (sectionId) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      const headerOffset = 100; // Account for navigation bar and spacing
      const elementPosition = element.offsetTop;
      const offsetPosition = elementPosition - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Set up intersection observer for scroll spy
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-100px 0px -70% 0px', // Trigger when section is near top
      threshold: 0
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    // Observe all sections
    Object.values(sectionRefs.current).forEach((section) => {
      if (section) {
        observerRef.current.observe(section);
      }
    });

    // Cleanup observer on unmount
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Set section refs
  const setSectionRef = (id, element) => {
    sectionRefs.current[id] = element;
  };

  return (
    <div className="min-h-screen bg-[#1B2131] text-white">
      <Helmet>
        <title>Terms of Service | MyCardTracker - Trading Card Platform Legal</title>
        <meta
          name="description"
          content="Read MyCardTracker's Terms of Service covering acceptable use, user accounts, marketplace rules, and legal obligations for Australian trading card collectors."
        />
        <meta
          name="keywords"
          content="terms of service, trading card platform legal, mycardtracker terms, marketplace rules, user agreement australia, card collecting terms"
        />
        <meta property="og:title" content="Terms of Service | MyCardTracker - Trading Card Platform Legal" />
        <meta
          property="og:description"
          content="Read MyCardTracker's Terms of Service covering acceptable use, user accounts, marketplace rules, and legal obligations."
        />
        <meta property="og:url" content="https://www.mycardtracker.com.au/terms" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://www.mycardtracker.com.au/terms" />
        <meta name="robots" content="index, follow" />
      </Helmet>
      <NavigationBar />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pb-16 pt-24 md:pb-24 md:pt-32 sm:px-6 sm:pb-20 sm:pt-28 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="bg-white/10 border-white/20 mb-6 inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-sm sm:mb-8 sm:px-4 sm:py-2 sm:text-sm">
            <span className="mr-2 size-1.5 rounded-full bg-green-400 sm:size-2"></span>
            Last Updated: January 2024
          </div>

          <h1 className="mb-4 text-3xl font-bold leading-tight md:text-5xl sm:mb-6 sm:text-4xl lg:text-6xl">
            Terms of
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Service
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-3xl text-base leading-relaxed text-gray-300 md:text-xl sm:mb-12 sm:text-lg lg:text-2xl">
            Please read these terms carefully before using our service. By using
            Collectibles Tracker, you agree to these terms.
          </p>
        </div>
      </section>

      {/* Navigation & Content */}
      <section className="bg-black px-4 py-12 md:py-24 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 z-10">
                <h3 className="mb-4 text-lg font-bold">Quick Navigation</h3>
                <nav className="space-y-2">
                  {sections.map(section => (
                    <Button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      variant={activeSection === section.id ? 'primary' : 'glass'}
                      size="md"
                      className="flex w-full items-center justify-start"
                    >
                      <span className="mr-3">{section.icon}</span>
                      <span className="text-sm font-medium">
                        {section.title}
                      </span>
                    </Button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="border-white/10 rounded-3xl border bg-gradient-to-br from-white/10 to-white/5 p-8 backdrop-blur-sm">
                <div className="prose prose-invert max-w-none space-y-8">
                  {/* Overview */}
                  <section id="overview" ref={(el) => setSectionRef('overview', el)}>
                    <h2 className="mb-4 flex items-center text-2xl font-bold">
                      <span className="mr-3">📋</span>Overview
                    </h2>
                    <div className="space-y-4 text-gray-300">
                      <p>
                        These Terms of Service govern your use of Collectibles
                        Tracker and related services. By accessing or using our
                        service, you agree to be bound by these terms.
                      </p>
                    </div>
                  </section>

                  {/* Acceptance */}
                  <section id="acceptance" ref={(el) => setSectionRef('acceptance', el)}>
                    <h2 className="mb-4 flex items-center text-2xl font-bold">
                      <span className="mr-3">✅</span>Acceptance of Terms
                    </h2>
                    <div className="space-y-4 text-gray-300">
                      <p>
                        By creating an account or using our service, you
                        acknowledge that you have read, understood, and agree to
                        these terms. If you do not agree, please do not use our
                        service.
                      </p>
                    </div>
                  </section>

                  {/* User Accounts */}
                  <section id="accounts" ref={(el) => setSectionRef('accounts', el)}>
                    <h2 className="mb-4 flex items-center text-2xl font-bold">
                      <span className="mr-3">👤</span>User Accounts
                    </h2>
                    <div className="space-y-4 text-gray-300">
                      <p>
                        You are responsible for maintaining the security of your
                        account and all activities under your account. You must
                        provide accurate information and keep it updated.
                      </p>
                      <ul className="ml-6 space-y-2">
                        <li>
                          • You must be at least 13 years old to create an
                          account
                        </li>
                        <li>• One account per person</li>
                        <li>• Keep your login credentials secure</li>
                        <li>
                          • Notify us immediately of any unauthorized access
                        </li>
                      </ul>
                    </div>
                  </section>

                  {/* Acceptable Use */}
                  <section id="usage" ref={(el) => setSectionRef('usage', el)}>
                    <h2 className="mb-4 flex items-center text-2xl font-bold">
                      <span className="mr-3">✔️</span>Acceptable Use
                    </h2>
                    <div className="space-y-4 text-gray-300">
                      <p>
                        You agree to use our service only for lawful purposes.
                        Prohibited activities include:
                      </p>
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
                  <section id="content" ref={(el) => setSectionRef('content', el)}>
                    <h2 className="mb-4 flex items-center text-2xl font-bold">
                      <span className="mr-3">📝</span>User Content
                    </h2>
                    <div className="space-y-4 text-gray-300">
                      <p>
                        You retain ownership of content you upload but grant us
                        license to use it for providing our services. You are
                        responsible for ensuring you have rights to all content
                        you upload.
                      </p>
                    </div>
                  </section>

                  {/* Marketplace */}
                  <section id="marketplace" ref={(el) => setSectionRef('marketplace', el)}>
                    <h2 className="mb-4 flex items-center text-2xl font-bold">
                      <span className="mr-3">🏪</span>Marketplace Terms
                    </h2>
                    <div className="space-y-4 text-gray-300">
                      <p>
                        Our marketplace facilitates transactions between users.
                        We are not a party to these transactions but provide
                        tools and security measures to help ensure safe trading.
                      </p>
                    </div>
                  </section>

                  {/* Termination */}
                  <section id="termination" ref={(el) => setSectionRef('termination', el)}>
                    <h2 className="mb-4 flex items-center text-2xl font-bold">
                      <span className="mr-3">🚪</span>Termination
                    </h2>
                    <div className="space-y-4 text-gray-300">
                      <p>
                        Either party may terminate this agreement at any time.
                        We may suspend or terminate accounts that violate these
                        terms. Upon termination, you may export your data for 30
                        days.
                      </p>
                    </div>
                  </section>

                  {/* Liability */}
                  <section id="liability" ref={(el) => setSectionRef('liability', el)}>
                    <h2 className="mb-4 flex items-center text-2xl font-bold">
                      <span className="mr-3">⚖️</span>Limitation of Liability
                    </h2>
                    <div className="space-y-4 text-gray-300">
                      <p>
                        Our service is provided "as is" without warranties. We
                        are not liable for indirect damages. Our total liability
                        is limited to the amount you paid in the last 12 months.
                      </p>
                    </div>
                  </section>

                  {/* Contact */}
                  <section id="contact" ref={(el) => setSectionRef('contact', el)}>
                    <h2 className="mb-4 flex items-center text-2xl font-bold">
                      <span className="mr-3">📞</span>Contact Information
                    </h2>
                    <div className="space-y-4 text-gray-300">
                      <p>
                        For questions about these terms, contact us at
                        legal@collectiblestracker.com
                      </p>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-black px-4 py-12 md:py-24 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-2xl font-bold md:text-4xl sm:mb-6 sm:text-3xl">
            Questions About Our Terms?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-base text-gray-300 md:text-xl sm:mb-12 sm:text-lg">
            Our legal team is available to help clarify any questions about our
            terms of service.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <Button as={Link} to="/help-center" variant="primary" size="md" className="w-full sm:w-auto">
              Contact Support
            </Button>
            <Button as={Link} to="/privacy" variant="outline" size="md" className="w-full sm:w-auto">
              Privacy Policy
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Terms;
