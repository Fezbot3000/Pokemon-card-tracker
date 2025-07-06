import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import NavigationBar from './NavigationBar';
import Footer from './Footer';

const Pricing = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: "Free Plan",
      price: "Free",
      period: "forever",
      description: "Perfect for getting started with basic collection tracking",
      features: [
        "Track up to 100 cards",
        "Basic collection management",
        "Mobile app access",
        "Community support"
      ],
      cta: "Get Started",
      popular: false
    },
    {
      name: "7-Day Free Trial",
      price: "Free",
      period: "7 days",
      description: "Try all premium features risk-free",
      features: [
        "Everything in Premium",
        "Unlimited card tracking",
        "Advanced analytics",
        "Priority support",
        "Export capabilities",
        "Marketplace access"
      ],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Premium Plan",
      price: "$9.99",
      period: "month",
      description: "Full access to all features for serious collectors",
      features: [
        "Unlimited card tracking",
        "Advanced portfolio analytics",
        "Price tracking & alerts",
        "Marketplace trading",
        "Priority customer support",
        "Export & backup tools",
        "Investment insights"
      ],
      cta: "Start Premium",
      popular: false
    }
  ];

  const faqs = [
    {
      question: "What happens after my 7-day free trial?",
      answer: "After your trial ends, you'll be moved to the Free plan automatically. You can upgrade to Premium at any time to regain access to all features."
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes! You can cancel your Premium subscription at any time. Your account will remain active until the end of your billing period."
    },
    {
      question: "Is my card data secure?",
      answer: "Absolutely. We use bank-level encryption to protect your data and never share your information with third parties."
    },
    {
      question: "Can I export my collection data?",
      answer: "Yes, Premium users can export their collection data in multiple formats (CSV, JSON, PDF) at any time."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-red-500 to-green-500">
      <Helmet>
        <title>Pricing - Choose Your Plan | MyCardTracker</title>
        <meta name="description" content="Choose the perfect plan for your trading card collection. Start with our 7-day free trial or use our forever-free plan. Premium features available for $9.99/month." />
        <meta name="keywords" content="trading card tracker pricing, pokemon card collection plans, collectibles tracker cost" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.mycardtracker.com.au/pricing" />
      </Helmet>
      
      <NavigationBar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 sm:pt-28 sm:pb-20 md:pt-32 md:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 backdrop-blur-sm rounded-full text-xs sm:text-sm font-medium mb-6 sm:mb-8 border border-white/20">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full mr-2"></span>
            Try Premium Free for 7 Days
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
            Choose Your
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Perfect Plan
            </span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed">
            Start free, upgrade when ready. All plans include secure cloud storage and mobile access.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl p-6 lg:p-8 border transition-all duration-300 hover:scale-105 ${
                  plan.popular
                    ? 'border-green-500/50 shadow-2xl shadow-green-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold px-6 py-2 rounded-full">
                      Most Popular
                    </div>
                  </div>
                )}
                
                <div className="text-center mb-6 lg:mb-8">
                  <h3 className="text-xl lg:text-2xl font-bold mb-2 text-white">{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-3xl lg:text-4xl font-bold text-white">{plan.price}</span>
                    {plan.period && <span className="text-gray-400 ml-2">/{plan.period}</span>}
                  </div>
                  <p className="text-gray-300 text-sm lg:text-base">{plan.description}</p>
                </div>
                
                <ul className="space-y-3 lg:space-y-4 mb-6 lg:mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <span className="text-green-400 mr-3 mt-1">✓</span>
                      <span className="text-gray-300 text-sm lg:text-base">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => navigate('/login?signup=true')}
                  className={`w-full py-3 lg:py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-green-500/25'
                      : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-blue-500/25'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              Everything you need to know about our pricing and plans.
            </p>
          </div>
          
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-6 lg:p-8 border border-white/10">
                <h3 className="text-lg lg:text-xl font-semibold mb-3 lg:mb-4 text-white">{faq.question}</h3>
                <p className="text-gray-300 text-sm lg:text-base leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-white">
            Ready to Start Your Collection Journey?
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 sm:mb-12 max-w-2xl mx-auto">
            Join thousands of collectors who trust MyCardTracker to manage their valuable collections.
          </p>
          
          <button
            onClick={() => navigate('/login?signup=true')}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300"
          >
            Start Your Free Trial
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Pricing; 