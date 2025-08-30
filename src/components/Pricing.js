import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import NavigationBar from './NavigationBar';
import Footer from './Footer';
import { Button } from '../design-system';

const Pricing = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Free Plan',
      price: 'Free',
      period: 'forever',
      description: 'Perfect for getting started with basic collection tracking',
      features: [
        'Single collection tracking',
        'Basic card management',
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
        'Multiple collections',
        'PSA search & integration',
        'Marketplace selling',
        'Purchase invoicing',
        'Sold items tracking',
        'Collection sharing',
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
        'Multiple collections',
        'PSA search & integration',
        'Marketplace selling',
        'Purchase invoicing',
        'Sold items tracking',
        'Collection sharing',
        'Priority customer support',
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
      <section className="relative overflow-hidden px-4 pb-16 pt-24 md:pb-24 md:pt-32 sm:px-6 sm:pb-20 sm:pt-28 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
        <div className="absolute left-1/4 top-1/4 size-96 rounded-full bg-blue-500/5 blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 size-96 rounded-full bg-purple-500/5 blur-3xl"></div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="bg-white/10 border-white/20 mb-6 inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm sm:mb-8 sm:px-4 sm:py-2 sm:text-sm">
            <span className="mr-2 size-1.5 rounded-full bg-green-400 sm:size-2"></span>
            Try Premium Free for 7 Days
          </div>

          <h1 className="mb-4 text-3xl font-bold leading-tight text-white md:text-5xl sm:mb-6 sm:text-4xl lg:text-6xl">
            Choose Your
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Perfect Plan
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-3xl text-base leading-relaxed text-gray-300 md:text-xl sm:mb-12 sm:text-lg lg:text-2xl">
            Start free, upgrade when ready. All plans include secure cloud
            storage and mobile access.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="bg-black px-4 py-12 md:py-24 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex h-full flex-col rounded-3xl border backdrop-blur-sm transition-all duration-300 ${
                  plan.popular
                    ? 'border-green-500/30 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-green-500/10 shadow-2xl shadow-green-500/20 hover:border-green-500/50 hover:shadow-green-500/30'
                    : 'border-white/20 hover:border-white/30 hover:shadow-white/10 bg-gradient-to-br from-white/10 to-white/5 hover:shadow-xl'
                } hover:scale-[1.02]`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
                    <div className="rounded-full bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="flex h-full flex-col p-8">
                  {/* Header */}
                  <div className="mb-8 text-center">
                    <h3 className="mb-3 text-2xl font-bold text-white">
                      {plan.name}
                    </h3>
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-white lg:text-5xl">
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className="ml-2 text-lg text-gray-400">/{plan.period}</span>
                      )}
                    </div>
                    <p className="text-gray-300">
                      {plan.description}
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="mb-8 flex-1 space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start">
                        <div className="mr-3 mt-0.5 flex size-5 items-center justify-center rounded-full bg-green-500/20">
                          <span className="text-sm text-green-400">✓</span>
                        </div>
                        <span className="text-gray-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    onClick={() => navigate('/login?signup=true')}
                    variant={plan.popular ? 'success' : 'primary'}
                    size="lg"
                    className="w-full"
                  >
                    {plan.cta}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-black px-4 py-12 md:py-24 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center lg:mb-16">
            <h2 className="mb-4 text-2xl font-bold text-white md:text-4xl sm:mb-6 sm:text-3xl">
              Frequently Asked Questions
            </h2>
            <p className="mx-auto max-w-2xl text-base text-gray-300 md:text-xl sm:text-lg">
              Everything you need to know about our pricing and plans.
            </p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq) => (
              <div
                key={faq.question}
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
      <section className="bg-black px-4 py-12 md:py-24 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-2xl font-bold text-white md:text-4xl sm:mb-6 sm:text-3xl">
            Ready to Start Your Collection Journey?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-base text-gray-300 md:text-xl sm:mb-12 sm:text-lg">
            Join thousands of collectors who trust MyCardTracker to manage their
            valuable collections.
          </p>

          <Button
            onClick={() => navigate('/login?signup=true')}
            variant="primary"
            size="lg"
          >
            Start Your Free Trial
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Pricing;
