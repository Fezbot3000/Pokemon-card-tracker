import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import NavigationBar from './NavigationBar';

const HelpCenter = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const helpArticles = [
    // Getting Started
    {
      id: 1,
      title: 'Getting Started with Collectibles Tracker',
      category: 'getting-started',
      content: 'Learn how to set up your account and start tracking your collection.',
      fullContent: `
        Welcome to Collectibles Tracker! This guide will help you get started with managing your collection.

        **Step 1: Create Your Account**
        - Sign up with your email address
        - Verify your email to activate your account
        - Complete your profile setup

        **Step 2: Create Your First Collection**
        - Click "Add Collection" from your dashboard
        - Choose a name and description for your collection
        - Set privacy settings (public/private)

        **Step 3: Add Your First Cards**
        - Use the "Add Cards" button
        - Search for cards by name or set
        - Add condition, price, and other details
        - Upload photos for better tracking

        **Step 4: Explore Features**
        - View your collection statistics
        - Use filters to find specific cards
        - Export your data for backup
        - Explore the marketplace for trading
      `,
      tags: ['setup', 'beginner', 'account', 'first-time']
    },
    {
      id: 2,
      title: 'Adding Cards to Your Collection',
      category: 'collection-management',
      content: 'Step-by-step guide on how to add cards to your collection.',
      fullContent: `
        Adding cards to your collection is simple and flexible. Here are the different methods:

        **Manual Entry**
        1. Click "Add Card" button
        2. Fill in card details:
           - Card name
           - Set/Series
           - Card number
           - Condition (Mint, Near Mint, etc.)
           - Purchase price
           - Current market value
        3. Upload photos (front and back)
        4. Add personal notes
        5. Save the card

        **Bulk Import via CSV**
        1. Download our CSV template
        2. Fill in your card data
        3. Use the "Import CSV" feature
        4. Review and confirm imports
        5. Cards are added automatically

        **Barcode Scanning (Premium)**
        1. Use the mobile app
        2. Scan card barcodes
        3. Auto-populate card details
        4. Verify and save

        **Tips for Better Organization**
        - Use consistent naming conventions
        - Add detailed condition notes
        - Include purchase date and location
        - Tag cards for easy searching
        - Regular photo updates for valuable cards
      `,
      tags: ['adding', 'cards', 'import', 'csv', 'barcode']
    },
    {
      id: 3,
      title: 'Understanding Card Conditions',
      category: 'collection-management',
      content: 'Learn about different card conditions and how they affect value.',
      fullContent: `
        Card condition is crucial for accurate valuation. Here's our grading system:

        **Mint (M)**
        - Perfect condition
        - No visible flaws
        - Sharp corners
        - Perfect centering
        - No surface wear

        **Near Mint (NM)**
        - Excellent condition
        - Minor flaws only visible under close inspection
        - Slight corner wear acceptable
        - Good centering
        - Minimal surface wear

        **Excellent (EX)**
        - Good condition
        - Light wear visible
        - Corner wear present but not excessive
        - Centering may be slightly off
        - Light surface scratches

        **Very Good (VG)**
        - Moderate wear
        - Noticeable corner wear
        - Possible small creases
        - Off-center printing
        - Surface scratches visible

        **Good (G)**
        - Heavy wear
        - Significant corner damage
        - Creases and bends
        - Poor centering
        - Major surface damage

        **Poor (P)**
        - Severe damage
        - Major creases, tears, or stains
        - Rounded corners
        - Heavy surface damage
        - Still recognizable but heavily damaged

        **Grading Tips**
        - Use good lighting when assessing
        - Compare with grading guides
        - Be conservative in your assessment
        - Consider professional grading for valuable cards
        - Document condition with photos
      `,
      tags: ['condition', 'grading', 'mint', 'value', 'assessment']
    },
    {
      id: 4,
      title: 'Using the Marketplace',
      category: 'marketplace',
      content: 'How to buy and sell cards safely on our marketplace.',
      fullContent: `
        Our marketplace connects collectors worldwide. Here's how to use it safely:

        **Selling Cards**
        1. Navigate to Marketplace > Sell
        2. Select cards from your collection
        3. Set your asking price
        4. Add detailed description
        5. Upload high-quality photos
        6. Choose shipping options
        7. Publish your listing

        **Buying Cards**
        1. Browse or search for cards
        2. Use filters to narrow results
        3. Check seller ratings and reviews
        4. Read item descriptions carefully
        5. Ask questions if needed
        6. Make offers or buy immediately
        7. Complete secure payment

        **Safety Guidelines**
        - Always use our secure payment system
        - Check seller ratings before purchasing
        - Read return policies carefully
        - Report suspicious activity
        - Keep all communications on platform
        - Document condition upon receipt

        **Shipping Best Practices**
        - Use protective sleeves and toploaders
        - Package securely to prevent damage
        - Include tracking information
        - Communicate shipping updates
        - Insure valuable items

        **Dispute Resolution**
        - Contact seller first for issues
        - Use our mediation service if needed
        - Provide evidence (photos, messages)
        - Follow our dispute process
        - Leave honest feedback after resolution
      `,
      tags: ['marketplace', 'buying', 'selling', 'safety', 'shipping']
    },
    {
      id: 5,
      title: 'Cloud Backup and Sync',
      category: 'premium-features',
      content: 'Learn how to backup and sync your collection across devices.',
      fullContent: `
        Premium users can backup and sync their collections across all devices.

        **Setting Up Cloud Backup**
        1. Upgrade to Premium subscription
        2. Go to Settings > Cloud Backup
        3. Enable automatic backup
        4. Choose backup frequency
        5. Verify backup completion

        **Manual Backup**
        1. Click "Backup Now" button
        2. Wait for upload completion
        3. Verify backup in cloud storage
        4. Download backup file if needed

        **Syncing Across Devices**
        1. Log in to your account on new device
        2. Cloud sync happens automatically
        3. Wait for data to download
        4. Verify all collections are present
        5. Enable auto-sync for future updates

        **Backup Contents**
        - All collection data
        - Card photos and images
        - Personal notes and tags
        - Purchase history
        - Marketplace activity
        - Settings and preferences

        **Restore from Backup**
        1. Go to Settings > Restore
        2. Select backup date
        3. Choose what to restore
        4. Confirm restoration
        5. Wait for process completion

        **Troubleshooting Sync Issues**
        - Check internet connection
        - Verify subscription status
        - Force sync manually
        - Clear app cache if needed
        - Contact support for persistent issues
      `,
      tags: ['backup', 'sync', 'cloud', 'premium', 'restore']
    },
    {
      id: 6,
      title: 'Advanced Analytics and Reports',
      category: 'premium-features',
      content: 'Understand your collection analytics and generate reports.',
      fullContent: `
        Premium analytics help you understand your collection's performance and value trends.

        **Collection Overview**
        - Total collection value
        - Number of cards by set
        - Condition distribution
        - Purchase vs current value
        - Top performers and losers

        **Value Tracking**
        - Historical price charts
        - Market trend analysis
        - ROI calculations
        - Profit/loss tracking
        - Price alerts for specific cards

        **Performance Reports**
        - Monthly/yearly summaries
        - Best performing sets
        - Acquisition cost analysis
        - Market timing insights
        - Portfolio diversification

        **Custom Reports**
        1. Choose report type
        2. Select date range
        3. Filter by collection/set
        4. Customize data points
        5. Generate and export

        **Report Types Available**
        - Collection valuation report
        - Purchase history analysis
        - Market performance summary
        - Insurance documentation
        - Tax preparation reports

        **Exporting Data**
        - PDF reports for sharing
        - Excel files for analysis
        - CSV for other software
        - Print-friendly formats
        - Email delivery options

        **Setting Up Alerts**
        - Price increase/decrease alerts
        - New listing notifications
        - Market milestone alerts
        - Collection goal reminders
        - Backup completion notices
      `,
      tags: ['analytics', 'reports', 'value', 'tracking', 'premium']
    },
    {
      id: 7,
      title: 'Troubleshooting Common Issues',
      category: 'troubleshooting',
      content: 'Solutions to frequently encountered problems.',
      fullContent: `
        Here are solutions to the most common issues users encounter:

        **Login Problems**
        - Forgot password: Use "Reset Password" link
        - Account locked: Wait 15 minutes or contact support
        - Email not verified: Check spam folder, resend verification
        - Two-factor issues: Use backup codes or contact support

        **Collection Issues**
        - Cards not saving: Check internet connection, try again
        - Images not uploading: Reduce file size, check format (JPG/PNG)
        - Data missing: Check if logged into correct account
        - Slow loading: Clear browser cache, check connection

        **Marketplace Problems**
        - Payment failed: Verify card details, check bank approval
        - Item not received: Contact seller, check tracking
        - Wrong item received: Document with photos, contact seller
        - Dispute resolution: Use our mediation service

        **Mobile App Issues**
        - App crashes: Update to latest version, restart device
        - Sync problems: Check internet, force close and reopen
        - Camera not working: Check app permissions
        - Notifications not working: Check notification settings

        **Performance Issues**
        - Slow loading: Clear cache, check internet speed
        - Images not displaying: Refresh page, check ad blockers
        - Features not working: Try different browser, disable extensions
        - Data not syncing: Force refresh, check subscription status

        **Account Issues**
        - Subscription problems: Check payment method, contact billing
        - Profile updates not saving: Check required fields
        - Privacy settings: Review and update in account settings
        - Data export: Use backup feature or contact support

        **Still Need Help?**
        - Check our FAQ section
        - Contact support via chat
        - Email us at support@collectiblestracker.com
        - Join our community forum
      `,
      tags: ['troubleshooting', 'problems', 'solutions', 'support', 'help']
    },
    {
      id: 8,
      title: 'Mobile App Features',
      category: 'mobile',
      content: 'Learn about mobile-specific features and functionality.',
      fullContent: `
        Our mobile app offers unique features for on-the-go collection management.

        **Key Mobile Features**
        - Barcode scanning for quick card entry
        - Photo capture with auto-cropping
        - Offline mode for limited connectivity
        - Push notifications for important updates
        - Location-based marketplace search

        **Barcode Scanning**
        1. Open the mobile app
        2. Tap the scan button
        3. Point camera at barcode
        4. Wait for automatic recognition
        5. Review and confirm card details
        6. Add to your collection

        **Photo Management**
        - High-quality image capture
        - Automatic image optimization
        - Batch photo upload
        - Image editing tools
        - Cloud storage integration

        **Offline Functionality**
        - View your collection without internet
        - Add cards offline (sync later)
        - Basic search and filtering
        - Photo capture and storage
        - Automatic sync when online

        **Push Notifications**
        - Price alerts for watched cards
        - Marketplace activity updates
        - Backup completion notices
        - Security alerts
        - Feature announcements

        **Mobile-Optimized Interface**
        - Touch-friendly navigation
        - Swipe gestures for quick actions
        - Responsive design for all screen sizes
        - Dark mode support
        - Accessibility features

        **Tips for Mobile Use**
        - Enable auto-sync for real-time updates
        - Use WiFi for large uploads
        - Keep app updated for latest features
        - Enable notifications for important alerts
        - Use offline mode in poor signal areas
      `,
      tags: ['mobile', 'app', 'barcode', 'offline', 'notifications']
    }
  ];

  const categories = [
    { id: 'all', name: 'All Topics', icon: '📚' },
    { id: 'getting-started', name: 'Getting Started', icon: '🚀' },
    { id: 'collection-management', name: 'Collection Management', icon: '📦' },
    { id: 'marketplace', name: 'Marketplace', icon: '🏪' },
    { id: 'premium-features', name: 'Premium Features', icon: '⭐' },
    { id: 'mobile', name: 'Mobile App', icon: '📱' },
    { id: 'troubleshooting', name: 'Troubleshooting', icon: '🔧' }
  ];

  const filteredArticles = useMemo(() => {
    return helpArticles.filter(article => {
      const matchesSearch = searchTerm === '' || 
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const [expandedArticle, setExpandedArticle] = useState(null);

  const toggleArticle = (articleId) => {
    setExpandedArticle(expandedArticle === articleId ? null : articleId);
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
            24/7 Support Available
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
            Help Center
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              & Support
            </span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed">
            Find answers to your questions and learn how to get the most out of Collectibles Tracker
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for help articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-300"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                🔍
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'bg-white/10 backdrop-blur-sm border border-white/20 text-gray-300 hover:bg-white/20'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Help Articles */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-4xl mx-auto">
          {filteredArticles.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold mb-2">No articles found</h3>
              <p className="text-gray-400">Try adjusting your search terms or category filter</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredArticles.map((article) => (
                <div key={article.id} className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300">
                  <button
                    onClick={() => toggleArticle(article.id)}
                    className="w-full p-6 text-left flex items-center justify-between hover:bg-white/5 rounded-2xl transition-all duration-300"
                  >
                    <div>
                      <h3 className="text-xl font-bold mb-2">{article.title}</h3>
                      <p className="text-gray-400">{article.content}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {article.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className={`text-2xl transition-transform duration-300 ${expandedArticle === article.id ? 'rotate-180' : ''}`}>
                      ⌄
                    </div>
                  </button>
                  
                  {expandedArticle === article.id && (
                    <div className="px-6 pb-6">
                      <div className="border-t border-white/10 pt-6">
                        <div className="prose prose-invert max-w-none">
                          {article.fullContent.split('\n').map((line, index) => {
                            if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
                              return <h4 key={index} className="text-lg font-bold text-blue-400 mt-6 mb-3">{line.replace(/\*\*/g, '')}</h4>;
                            } else if (line.trim().startsWith('- ')) {
                              return <li key={index} className="text-gray-300 ml-4">{line.substring(2)}</li>;
                            } else if (line.trim()) {
                              return <p key={index} className="text-gray-300 mb-4 leading-relaxed">{line}</p>;
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
            Still Need Help?
          </h2>
          <p className="text-base sm:text-lg text-gray-300 mb-8 sm:mb-12 max-w-2xl mx-auto">
            Our support team is here to help you with any questions or issues you might have.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-bold mb-2">Live Chat</h3>
              <p className="text-gray-400 mb-4">Get instant help from our support team</p>
              <button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-4 py-2 rounded-xl font-medium transition-all duration-300">
                Start Chat
              </button>
            </div>
            
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
              <div className="text-4xl mb-4">📧</div>
              <h3 className="text-xl font-bold mb-2">Email Support</h3>
              <p className="text-gray-400 mb-4">Send us a detailed message</p>
              <a 
                href="mailto:support@collectiblestracker.com"
                className="block w-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 px-4 py-2 rounded-xl font-medium transition-all duration-300 text-center"
              >
                Send Email
              </a>
            </div>
            
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
              <div className="text-4xl mb-4">🎥</div>
              <h3 className="text-xl font-bold mb-2">Video Tutorials</h3>
              <p className="text-gray-400 mb-4">Watch step-by-step guides</p>
              <button className="w-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 px-4 py-2 rounded-xl font-medium transition-all duration-300">
                Watch Videos
              </button>
            </div>
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

export default HelpCenter;
