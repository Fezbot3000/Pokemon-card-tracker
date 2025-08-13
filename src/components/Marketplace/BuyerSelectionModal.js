import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Modal, Button } from '../../design-system';
import { useAuth } from '../../design-system';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase-unified';
import toast from 'react-hot-toast';
import db from '../../services/firestore/dbAdapter';
import LoggingService from '../../services/LoggingService';
import reviewService from '../../services/reviewService';

const BuyerSelectionModal = ({ isOpen, onClose, listing, onExternalSale }) => {
  // Flow state management
  const [flowStep, setFlowStep] = useState('WHERE_SOLD'); // WHERE_SOLD, SELECT_BUYER, REVIEW_BUYER
  const [saleLocation, setSaleLocation] = useState(''); // 'mycardtracker' or 'external'
  
  // Existing states
  const [potentialBuyers, setPotentialBuyers] = useState([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [soldPrice, setSoldPrice] = useState('');
  const [dateSold, setDateSold] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState({});
  
  // Review state
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  
  const { user } = useAuth();
  const { preferredCurrency } = useUserPreferences();

  const fetchPotentialBuyers = useCallback(async () => {
    if (!listing || !listing.id || !user || !user.uid) {
      return;
    }
    
    setLoading(true);
    try {
      // Get all chats for this listing
      // Note: chats use 'cardId' field, not 'listingId'
      const chatsRef = collection(firestoreDb, 'chats');
      const chatsQuery = query(
        chatsRef,
        where('cardId', '==', listing.id),
        where('sellerId', '==', user.uid)
      );

      const chatSnapshot = await getDocs(chatsQuery);
      const buyerIds = new Set();

      chatSnapshot.forEach(doc => {
        const chatData = doc.data();
        if (chatData.buyerId && chatData.buyerId !== user.uid) {
          buyerIds.add(chatData.buyerId);
        }
      });

      // Fetch buyer details
      const buyers = [];
      for (const buyerId of buyerIds) {
        try {
          // Try direct document access first (document ID = UID)
          const directUserDoc = await getDoc(doc(firestoreDb, 'users', buyerId));
          if (directUserDoc.exists()) {
            const userData = directUserDoc.data();
            buyers.push({
              id: buyerId,
              name: userData.displayName || userData.email || 'Unknown User',
            });
          } else {
            // Fallback to query approach
            try {
              const userDoc = await getDocs(
                query(collection(firestoreDb, 'users'), where('uid', '==', buyerId))
              );
              if (!userDoc.empty) {
                const userData = userDoc.docs[0].data();
                buyers.push({
                  id: buyerId,
                  name: userData.displayName || userData.email || 'Unknown User',
                });
              }
            } catch (queryError) {
              LoggingService.error('Query approach failed for buyer ID:', buyerId, queryError);
            }
          }
        } catch (error) {
          LoggingService.error('Error fetching buyer details for', buyerId, ':', error);
        }
      }

      setPotentialBuyers(buyers);
    } catch (error) {
      LoggingService.error('Error fetching potential buyers:', error);
      toast.error('Failed to load potential buyers');
    } finally {
      setLoading(false);
    }
  }, [listing, user]);

  useEffect(() => {
    if (isOpen && listing) {
      // Reset flow to initial state
      setFlowStep('WHERE_SOLD');
      setSaleLocation('');
      setSelectedBuyerId('');
      setRating(0);
      setReviewComment('');
      setDateSold(new Date().toISOString().split('T')[0]);
      setErrors({});
      
      // Only fetch buyers if we're on the buyer selection step
      if (flowStep === 'SELECT_BUYER') {
        fetchPotentialBuyers();
      }
      
      // Initialize sold price with listing price
      setSoldPrice(listing.listingPrice || listing.priceAUD || '');
    }
  }, [isOpen, listing]);
  
  // Fetch buyers when moving to SELECT_BUYER step
  useEffect(() => {
    if (flowStep === 'SELECT_BUYER' && isOpen) {
      fetchPotentialBuyers();
    }
  }, [flowStep, fetchPotentialBuyers, isOpen]);

  // Handle flow navigation
  const handleSaleLocationSelect = (location) => {
    setSaleLocation(location);
    if (location === 'external') {
      // Close this modal and trigger external sale flow
      onClose();
      if (onExternalSale) {
        onExternalSale(listing);
      }
    } else {
      // Move to buyer selection
      setFlowStep('SELECT_BUYER');
    }
  };
  
  const handleBuyerSelect = () => {
    if (!selectedBuyerId) {
      toast.error('Please select a buyer');
      return;
    }
    // Move to review step
    setFlowStep('REVIEW_BUYER');
  };
  
  const handleReviewSubmit = () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    // Proceed to mark as sold
    handleSubmit();
  };
  
  const handleBack = () => {
    if (flowStep === 'SELECT_BUYER') {
      setFlowStep('WHERE_SOLD');
      setSaleLocation('');
    } else if (flowStep === 'REVIEW_BUYER') {
      setFlowStep('SELECT_BUYER');
      setRating(0);
      setReviewComment('');
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!selectedBuyerId) {
      newErrors.buyer = "Please select a buyer";
    }

    const price = parseFloat(soldPrice);
    if (!price || isNaN(price) || price <= 0) {
      newErrors.soldPrice = 'Please enter a valid sale price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      // Show first error
      const firstError = Object.values(errors)[0];
      if (firstError) {
        toast.error(firstError);
      }
      return;
    }

    setSubmitting(true);
    try {
      // First, submit the review if we're in the review flow
      if (saleLocation === 'mycardtracker' && rating > 0) {
        try {
          await reviewService.createReview({
            reviewerId: user.uid,
            revieweeId: selectedBuyerId,
            transactionId: listing.id,
            transactionType: 'marketplace_sale',
            rating: rating,
            comment: reviewComment.trim(),
            reviewerRole: 'seller', // Seller reviewing buyer
          });
        } catch (reviewError) {
          LoggingService.error('Error submitting review:', reviewError);
          // Continue with sale even if review fails
        }
      }
      
      // Update the listing with buyer info and sold status
      const listingRef = doc(firestoreDb, 'marketplaceItems', listing.id);
      await updateDoc(listingRef, {
        status: 'sold',
        soldToBuyerId: selectedBuyerId,
        soldAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

             // Always create sold invoice (no longer optional)
       const buyerData = potentialBuyers.find(
         b => b.id === selectedBuyerId
       );

       // Validate the sold price (only real user input)
       const validSoldPrice = parseFloat(soldPrice);
       if (isNaN(validSoldPrice) || validSoldPrice <= 0) {
         toast.error('Please enter a valid sale price');
         setSubmitting(false);
         return;
       }

       // Create invoice data matching SaleModal structure
       const invoiceData = {
         buyer: buyerData?.name || 'Unknown Buyer',
         dateSold: dateSold,
         invoiceNumber: `SOLD-${Date.now()}`,
         notes: `Sold via marketplace - ${listing.cardTitle || listing.card?.name}`,
         cards: [
           {
             id: listing.id,
             name: listing.cardTitle || listing.card?.name || 'Unknown Card',
             player: listing.card?.player || '',
             set: listing.card?.set || '',
             grade: listing.card?.grade || '',
             grader: listing.card?.grader || '',
             slabSerial: listing.card?.slabSerial || listing.id,
             investmentAUD: parseFloat(listing.card?.investmentAUD || 0),
             originalInvestmentAmount: parseFloat(listing.card?.investmentAUD || 0),
             originalInvestmentCurrency: 'AUD',
             salePrice: validSoldPrice,
             collectionName: 'Marketplace Sale',
           },
         ],
         totalInvestment: parseFloat(listing.card?.investmentAUD || 0),
         totalSale: validSoldPrice,
         totalProfit: validSoldPrice - parseFloat(listing.card?.investmentAUD || 0),
         createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString(),
       };

       try {
         await db.savePurchaseInvoice(invoiceData);
         toast.success('Sold invoice created successfully!');
       } catch (invoiceError) {
         LoggingService.error('Error creating sold invoice:', invoiceError);
         toast.error('Item marked as sold but failed to create invoice');
       }

             // Create a review request in the chat
       if (buyerData) {
        const chatId =
          [user.uid, selectedBuyerId].sort().join('_') + '_' + listing.id;
        const chatRef = doc(firestoreDb, 'chats', chatId);

        // Add system message for review request
        const messagesRef = collection(chatRef, 'messages');
        await addDoc(messagesRef, {
          type: 'system',
          subtype: 'review_request',
          content: `${user.displayName || 'Seller'} has marked this item as sold. Please leave a review for this transaction.`,
          timestamp: serverTimestamp(),
          senderId: 'system',
        });

        // Update chat with pending review
        await updateDoc(chatRef, {
          pendingReview: {
            buyerId: selectedBuyerId,
            sellerId: user.uid,
            listingId: listing.id,
            cardId: listing.id, // Some chats might use cardId instead
            requestedAt: serverTimestamp(),
          },
          lastMessage: 'Review request sent',
          lastUpdated: serverTimestamp(),
        });
      }

             toast.success('Item marked as sold, invoice created, and review request sent!');
      onClose();
    } catch (error) {
      LoggingService.error('Error marking as sold:', error);
      toast.error('Failed to mark item as sold');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Render functions for each step
  const renderWhereSoldStep = () => (
    <div className="space-y-4">
      <p className="text-gray-600 dark:text-gray-400">
        Where did you sell{' '}
        <strong>
          {listing?.cardTitle || listing?.card?.name || 'this item'}
        </strong>
        ?
      </p>
      
      <div className="space-y-3">
        <button
          onClick={() => handleSaleLocationSelect('mycardtracker')}
          className="w-full rounded-lg border-2 border-gray-200 p-4 text-left hover:border-blue-500 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-gray-800"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">
                Sold on MyCardTracker
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                To a user who messaged you through the marketplace
              </p>
            </div>
            <svg className="size-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
        
        <button
          onClick={() => handleSaleLocationSelect('external')}
          className="w-full rounded-lg border-2 border-gray-200 p-4 text-left hover:border-blue-500 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-gray-800"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">
                Sold elsewhere
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Through another platform or in-person
              </p>
            </div>
            <svg className="size-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
  
     const renderBuyerSelectionStep = () => {
     const selectedBuyer = potentialBuyers.find(b => b.id === selectedBuyerId);
     const investment = parseFloat(listing?.card?.investmentAUD || 0);
     const soldPriceNum = parseFloat(soldPrice || 0);
     const profit = soldPriceNum - investment;
     
     return (
       <div className="space-y-6">
         {/* Buyer and Date */}
         <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
           <div>
             <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
               Buyer <span className="text-red-500">*</span>
             </label>
             {loading ? (
               <div className="flex justify-center py-4">
                 <div className="size-6 animate-spin rounded-full border-y-2 border-blue-500"></div>
               </div>
             ) : potentialBuyers.length === 0 ? (
               <div className="py-4 text-center">
                 <p className="text-gray-500 dark:text-gray-400">
                   No potential buyers found. Only users who have messaged you
                   about this item will appear here.
                 </p>
               </div>
             ) : (
               <div className="space-y-2">
                 {potentialBuyers.map(buyer => (
                   <label
                     key={buyer.id}
                     className="flex cursor-pointer items-center rounded-lg border border-gray-200 p-3 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                   >
                     <input
                       type="radio"
                       name="buyer"
                       value={buyer.id}
                       checked={selectedBuyerId === buyer.id}
                       onChange={e => setSelectedBuyerId(e.target.value)}
                       className="mr-3"
                     />
                     <div>
                       <p className="font-medium text-gray-900 dark:text-white">
                         {buyer.name}
                       </p>
                       <p className="text-sm text-gray-500 dark:text-gray-400">
                         Messaged about this item
                       </p>
                     </div>
                   </label>
                 ))}
               </div>
             )}
             {errors.buyer && (
               <p className="mt-1 text-sm text-red-500">{errors.buyer}</p>
             )}
           </div>
           <div>
             <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
               Date Sold
             </label>
             <input
               type="date"
               value={dateSold}
               onChange={e => setDateSold(e.target.value)}
               className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-[#0F0F0F] dark:text-white"
             />
           </div>
         </div>

         {/* Selected Card Details */}
         <div>
           <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
             Selected Card
           </h3>
           <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
             <div className="space-y-4">
               <div>
                 <h4 className="font-semibold text-gray-900 dark:text-white">
                   {listing?.cardTitle || listing?.card?.name || 'Unnamed Card'}
                 </h4>
                 <p className="text-sm text-gray-600 dark:text-gray-400">
                   Investment: {preferredCurrency.symbol}{investment.toFixed(2)}
                 </p>
               </div>

               <div>
                 <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                   Sold Price ({preferredCurrency.code}) <span className="text-red-500">*</span>
                 </label>
                 <div className="relative">
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                     {preferredCurrency.symbol}
                   </span>
                   <input
                     type="number"
                     inputMode="numeric"
                     value={soldPrice}
                     onChange={e => setSoldPrice(e.target.value)}
                     step="0.01"
                     min="0"
                     className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-4 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-[#0F0F0F] dark:text-white dark:placeholder:text-gray-400"
                     placeholder="0.00"
                   />
                 </div>
                 {errors.soldPrice && (
                   <p className="mt-1 text-sm text-red-500">{errors.soldPrice}</p>
                 )}
                 <div className="mt-2 text-sm">
                   <span className="text-gray-600 dark:text-gray-400">Profit: </span>
                   <span
                     className={
                       profit >= 0
                         ? 'text-green-600 dark:text-green-400'
                         : 'text-red-600 dark:text-red-400'
                     }
                   >
                     {preferredCurrency.symbol}{profit.toFixed(2)}
                   </span>
                 </div>
               </div>
             </div>
           </div>
         </div>

         {/* Totals */}
         <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
           <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <span className="text-sm text-gray-600 dark:text-gray-400">
                   Total Sale Price:
                 </span>
                 <div className="font-semibold text-gray-900 dark:text-white">
                   {preferredCurrency.symbol}{soldPriceNum.toFixed(2)}
                 </div>
               </div>
               <div>
                 <span className="text-sm text-gray-600 dark:text-gray-400">
                   Total Profit:
                 </span>
                 <div
                   className={`font-semibold ${
                     profit >= 0
                       ? 'text-green-600 dark:text-green-400'
                       : 'text-red-600 dark:text-red-400'
                   }`}
                 >
                   {preferredCurrency.symbol}{profit.toFixed(2)}
                 </div>
               </div>
             </div>
           </div>
         </div>
       </div>
     );
   };
  
  const renderReviewStep = () => {
    const selectedBuyer = potentialBuyers.find(b => b.id === selectedBuyerId);
    
    return (
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-400">
          Please review your experience with{' '}
          <strong>{selectedBuyer?.name || 'the buyer'}</strong>
        </p>
        
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Rating <span className="text-red-500">*</span>
          </label>
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="text-3xl focus:outline-none"
              >
                {star <= rating ? (
                  <span className="text-yellow-400">★</span>
                ) : (
                  <span className="text-gray-300 dark:text-gray-600">☆</span>
                )}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Comment (optional)
          </label>
          <textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Share your experience with this buyer..."
            rows={4}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        
        <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Your review will help other sellers make informed decisions
          </p>
        </div>
      </div>
    );
  };
  
  // Get modal title based on step
  const getModalTitle = () => {
    switch (flowStep) {
      case 'WHERE_SOLD':
        return 'Mark as Sold';
      case 'SELECT_BUYER':
        return 'Select Buyer';
      case 'REVIEW_BUYER':
        return 'Review Buyer';
      default:
        return 'Mark as Sold';
    }
  };
  
  // Get footer buttons based on step
  const getFooterButtons = () => {
    switch (flowStep) {
      case 'WHERE_SOLD':
        return (
          <div className="flex space-x-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        );
             case 'SELECT_BUYER':
         return (
           <div className="flex w-full items-center justify-between">
             <Button variant="secondary" onClick={handleBack}>
               Back
             </Button>
             <Button
               variant="primary"
               onClick={handleBuyerSelect}
               disabled={!selectedBuyerId || potentialBuyers.length === 0}
             >
               Continue
             </Button>
           </div>
         );
      case 'REVIEW_BUYER':
        return (
          <div className="flex space-x-3">
            <Button variant="secondary" onClick={handleBack}>
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handleReviewSubmit}
              disabled={rating === 0 || submitting}
            >
              {submitting ? 'Processing...' : 'Submit & Mark as Sold'}
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  // Render appropriate content based on flow step
  const renderContent = () => {
    switch (flowStep) {
      case 'WHERE_SOLD':
        return renderWhereSoldStep();
      case 'SELECT_BUYER':
        return renderBuyerSelectionStep();
      case 'REVIEW_BUYER':
        return renderReviewStep();
      default:
        return null;
    }
  };

  return createPortal(
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
      size="modal-width-60"
      position="right"
      closeOnClickOutside={true}
      footer={getFooterButtons()}
    >
      {renderContent()}
    </Modal>,
    document.body
  );
};

export default BuyerSelectionModal;
