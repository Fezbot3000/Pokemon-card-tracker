import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import NavigationBar from './NavigationBar';
import Footer from './Footer';

const Pricing = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Free Plan',
      price: 'Free',
      period: 'forever',
      description: 'Perfect for getting started with basic collection tracking',
      features: [
        'Track up to 100 cards',
        'Basic collection management',
        'Mobile app access',
        'Community support',
      ],
      cta: 'Get Started',
      popular: false,
    },
    {
      name: '7-Day Free Trial',
      price: 'Free',
      period: '7 days',
      description: 'Try all premium features risk-free',
      features: [
        'Everything in Premium',
        'Unlimited card tracking',
        'Advanced analytics',
        'Priority support',
        'Export capabilities',
        'Marketplace access',
      ],
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      name: 'Premium Plan',
      price: '$9.99',
      period: 'month',
      description: 'Full access to all features for serious collectors',
      features: [
        'Unlimited card tracking',
        'Advanced portfolio analytics',
        'Price tracking & alerts',
        'Marketplace trading',
        'Priority customer support',
        'Export & backup tools',
        'Investment insights',
      ],
      cta: 'Start Premium',
      popular: false,
    },
  ];

  const faqs = [
    {
      question: 'What happens after my 7-day free trial?',
      answer:
        "After your trial ends, you'll be moved to the Free plan automatically. You can upgrade to Premium at any time to regain access to all features.",
    },
    {
      question: 'Can I cancel my subscription anytime?',
      answer:
        'Yes! You can cancel your Premium subscription at any time. Your account will remain active until the end of your billing period.',
    },
    {
      question: 'Is my card data secure?',
      answer:
        'Absolutely. We use bank-level encryption to protect your data and never share your information with third parties.',
    },
    {
      question: 'Can I export my collection data?',
      answer:
        'Yes, Premium users can export their collection data in multiple formats (CSV, JSON, PDF) at any time.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-red-500 to-green-500">
      <Helmet>
        <title>Pricing - Choose Your Plan | MyCardTracker</title>
        <meta
          name="description"
          content="Choose the perfect plan for your trading card collection. Start with our 7-day free trial or use our forever-free plan. Premium features available for $9.99/month."
        />
        <meta
          name="keywords"
          content="trading card tracker pricing, pokemon card collection plans, collectibles tracker cost"
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.mycardtracker.com.au/pricing" />
      </Helmet>

      <NavigationBar />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 md:pb-24 md:pt-32 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
        <div className="absolute left-1/4 top-1/4 size-96 rounded-full bg-blue-500/5 blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 size-96 rounded-full bg-purple-500/5 blur-3xl"></div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="bg-white/10 border-white/20 mb-6 inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-sm sm:mb-8 sm:px-4 sm:py-2 sm:text-sm">
            <span className="mr-2 size-1.5 rounded-full bg-green-400 sm:size-2"></span>
            Try Premium Free for 7 Days
          </div>

          <h1 className="mb-4 text-3xl font-bold leading-tight sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl">
            Choose Your
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Perfect Plan
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-3xl text-base leading-relaxed text-gray-300 sm:mb-12 sm:text-lg md:text-xl lg:text-2xl">
            Start free, upgrade when ready. All plans include secure cloud
            storage and mobile access.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="bg-black px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative rounded-3xl border bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:scale-105 lg:p-8 ${
                  plan.popular
                    ? 'border-green-500/50 shadow-2xl shadow-green-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="rounded-full bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-2 text-sm font-semibold text-white">
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="mb-6 text-center lg:mb-8">
                  <h3 className="mb-2 text-xl font-bold text-white lg:text-2xl">
                    {plan.name}
                  </h3>
                  <div className="mb-2">
                    <span className="text-3xl font-bold text-white lg:text-4xl">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="ml-2 text-gray-400">/{plan.period}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 lg:text-base">
                    {plan.description}
                  </p>
                </div>

                <ul className="mb-6 space-y-3 lg:mb-8 lg:space-y-4">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <span className="mr-3 mt-1 text-green-400">✓</span>
                      <span className="text-sm text-gray-300 lg:text-base">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => navigate('/login?signup=true')}
                  className={`w-full rounded-xl px-6 py-3 text-lg font-semibold transition-all duration-300 hover:scale-105 lg:py-4${
                    plan.popular
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:from-green-600 hover:to-emerald-700 hover:shadow-green-500/25'
                      : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:from-blue-600 hover:to-purple-700 hover:shadow-blue-500/25'
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
      <section className="bg-black px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center lg:mb-16">
            <h2 className="mb-4 text-2xl font-bold text-white sm:mb-6 sm:text-3xl md:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mx-auto max-w-2xl text-base text-gray-300 sm:text-lg md:text-xl">
              Everything you need to know about our pricing and plans.
            </p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border-white/10 rounded-2xl border bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur-sm lg:p-8"
              >
                <h3 className="mb-3 text-lg font-semibold text-white lg:mb-4 lg:text-xl">
                  {faq.question}
                </h3>
                <p className="text-sm leading-relaxed text-gray-300 lg:text-base">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-black px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-2xl font-bold text-white sm:mb-6 sm:text-3xl md:text-4xl">
            Ready to Start Your Collection Journey?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-base text-gray-300 sm:mb-12 sm:text-lg md:text-xl">
            Join thousands of collectors who trust MyCardTracker to manage their
            valuable collections.
          </p>

          <button
            onClick={() => navigate('/login?signup=true')}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-4 text-lg font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-blue-600 hover:to-purple-700 hover:shadow-blue-500/25"
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
