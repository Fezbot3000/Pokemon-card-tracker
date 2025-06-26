import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { doc, getDoc } from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import { useAuth } from '../../design-system';
import ListingDetailModal from './ListingDetailModal';
import logger from '../../utils/logger';

function MarketplaceListing() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadListing = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!listingId) {
          setError('No listing ID provided');
          return;
        }

        // Fetch the listing from Firestore
        const listingRef = doc(firestoreDb, 'marketplaceItems', listingId);
        const listingDoc = await getDoc(listingRef);

        if (!listingDoc.exists()) {
          setError('Listing not found');
          return;
        }

        const listingData = {
          id: listingDoc.id,
          ...listingDoc.data()
        };

        setListing(listingData);
      } catch (err) {
        logger.error('Error loading marketplace listing:', err);
        setError('Failed to load listing');
      } finally {
        setLoading(false);
      }
    };

    loadListing();
  }, [listingId]);

  const handleClose = () => {
    navigate('/dashboard'); // Navigate back to dashboard
  };

  // Get the first image for meta tags
  const getListingImage = () => {
    if (!listing) return null;
    
    const card = listing.card || {};
    const firstImage = card.cloudImageUrl || 
                      card.imageURL || 
                      card.imageUrl || 
                      card.img || 
                      listing.images?.[0] || 
                      null;
    
    // Ensure the image URL is absolute
    if (firstImage && !firstImage.startsWith('http')) {
      return `${window.location.origin}${firstImage}`;
    }
    
    return firstImage;
  };

  // Generate meta tags for social sharing
  const generateMetaTags = () => {
    if (!listing) return null;

    const card = listing.card || {};
    const cardName = card.name || listing.title || 'Trading Card';
    const price = listing.price ? `$${listing.price}` : 'Price on request';
    const location = listing.location || 'Australia';
    const condition = card.condition || 'Unknown condition';
    const image = getListingImage();
    
    const title = `${cardName} - ${price} | MyCardTracker Marketplace`;
    const description = `${cardName} for sale in ${location}. Condition: ${condition}. ${price}. Buy and sell trading cards on Australia's #1 marketplace.`;
    const url = `https://www.mycardtracker.com.au/marketplace/listing/${listingId}`;

    return {
      title,
      description,
      image,
      url
    };
  };

  const metaTags = generateMetaTags();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="w-full max-w-4xl mx-auto p-4">
          {/* Header skeleton */}
          <div className="bg-white dark:bg-[#0F0F0F] rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 dark:bg-[#0F0F0F] rounded-lg animate-pulse"></div>
              <div className="flex-1">
                <div className="h-6 bg-gray-200 dark:bg-[#0F0F0F] rounded w-3/4 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-[#0F0F0F] rounded w-1/2 animate-pulse"></div>
              </div>
            </div>
          </div>
          
          {/* Content skeleton */}
          <div className="bg-white dark:bg-[#0F0F0F] rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Image skeleton */}
              <div className="aspect-[2.5/3.5] bg-gray-200 dark:bg-[#0F0F0F] rounded-lg animate-pulse"></div>
              
              {/* Details skeleton */}
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 dark:bg-[#0F0F0F] rounded w-3/4 animate-pulse"></div>
                <div className="h-6 bg-gray-200 dark:bg-[#0F0F0F] rounded w-1/2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-[#0F0F0F] rounded w-full animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-[#0F0F0F] rounded w-5/6 animate-pulse"></div>
                <div className="h-10 bg-gray-200 dark:bg-[#0F0F0F] rounded w-1/3 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <>
        {metaTags && (
          <Helmet>
            <title>Listing Not Found | MyCardTracker Marketplace</title>
            <meta name="description" content="The requested marketplace listing could not be found." />
            <meta property="og:title" content="Listing Not Found | MyCardTracker Marketplace" />
            <meta property="og:description" content="The requested marketplace listing could not be found." />
            <meta property="og:type" content="website" />
            <meta property="og:url" content="https://www.mycardtracker.com.au/marketplace" />
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:title" content="Listing Not Found | MyCardTracker Marketplace" />
            <meta property="twitter:description" content="The requested marketplace listing could not be found." />
          </Helmet>
        )}
        <div className="min-h-screen bg-gray-50 dark:bg-[#0F0F0F] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {error === 'Listing not found' ? 'Listing Not Found' : 'Error Loading Listing'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error === 'Listing not found' 
                ? 'The listing you\'re looking for doesn\'t exist or has been removed.'
                : 'There was an error loading this listing. Please try again later.'
              }
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go to Marketplace
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Dynamic meta tags for social sharing */}
      {metaTags && (
        <Helmet>
          <title>{metaTags.title}</title>
          <meta name="description" content={metaTags.description} />
          
          {/* Open Graph / Facebook */}
          <meta property="og:type" content="product" />
          <meta property="og:url" content={metaTags.url} />
          <meta property="og:title" content={metaTags.title} />
          <meta property="og:description" content={metaTags.description} />
          {metaTags.image && <meta property="og:image" content={metaTags.image} />}
          <meta property="og:site_name" content="MyCardTracker" />
          
          {/* Twitter */}
          <meta property="twitter:card" content="summary_large_image" />
          <meta property="twitter:url" content={metaTags.url} />
          <meta property="twitter:title" content={metaTags.title} />
          <meta property="twitter:description" content={metaTags.description} />
          {metaTags.image && <meta property="twitter:image" content={metaTags.image} />}
          
          {/* Additional meta tags for better SEO */}
          <meta name="robots" content="index, follow" />
          <link rel="canonical" href={metaTags.url} />
        </Helmet>
      )}

      {/* Show the listing in a modal-like view that covers the full screen */}
      <div className="min-h-screen bg-gray-50 dark:bg-[#0F0F0F]">
        <ListingDetailModal
          isOpen={true}
          onClose={handleClose}
          listing={listing}
          onContactSeller={() => {
            // Handle contact seller - could redirect to login if not authenticated
            if (!user) {
              navigate('/login');
            }
          }}
          onReportListing={() => {
            // Handle report listing
          }}
          onViewSellerProfile={() => {
            // Handle view seller profile
          }}
          onEditListing={() => {
            // Handle edit listing - only if user owns the listing
          }}
          onMarkAsPending={() => {
            // Handle mark as pending - only if user owns the listing
          }}
          onMarkAsSold={() => {
            // Handle mark as sold - only if user owns the listing
          }}
          onViewChange={() => {
            // Handle view change
          }}
        />
      </div>
    </>
  );
}

export default MarketplaceListing;
