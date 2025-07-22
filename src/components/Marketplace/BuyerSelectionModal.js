import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button } from '../../design-system';
import { useAuth } from '../../design-system';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db as firestoreDb } from '../../services/firebase';
import toast from 'react-hot-toast';
import db from '../../services/firestore/dbAdapter';
import LoggingService from '../../services/LoggingService';

const BuyerSelectionModal = ({ isOpen, onClose, listing }) => {
  const [potentialBuyers, setPotentialBuyers] = useState([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createSoldInvoice, setCreateSoldInvoice] = useState(false);
  const [soldPrice, setSoldPrice] = useState('');
  const { user } = useAuth();
  const { preferredCurrency } = useUserPreferences();

  const fetchPotentialBuyers = useCallback(async () => {
    setLoading(true);
    try {
      // Get all chats for this listing
      const chatsRef = collection(firestoreDb, 'chats');
      const chatsQuery = query(
        chatsRef,
        where('listingId', '==', listing.id),
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
        } catch (error) {
          LoggingService.error('Error fetching buyer details:', error);
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
      fetchPotentialBuyers();
      // Initialize sold price with listing price
      setSoldPrice(listing.listingPrice || listing.priceAUD || '');
    }
  }, [isOpen, listing, fetchPotentialBuyers]);

  const handleSubmit = async () => {
    if (!selectedBuyerId) {
      toast.error('Please select a buyer');
      return;
    }

    if (createSoldInvoice && !soldPrice) {
      toast.error('Please enter the sold price');
      return;
    }

    setSubmitting(true);
    try {
      // Update the listing with buyer info and sold status
      const listingRef = doc(firestoreDb, 'marketplaceItems', listing.id);
      await updateDoc(listingRef, {
        status: 'sold',
        soldToBuyerId: selectedBuyerId,
        soldAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create sold invoice if requested
      if (createSoldInvoice) {
        const selectedBuyer = potentialBuyers.find(
          b => b.id === selectedBuyerId
        );

        // Create invoice data
        const invoiceData = {
          seller: selectedBuyer?.name || 'Unknown Buyer',
          date: new Date().toISOString().split('T')[0],
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
              slabSerial: listing.card?.slabSerial || '',
              investmentAUD: parseFloat(listing.card?.investmentAUD || 0),
              purchasePrice: parseFloat(listing.card?.investmentAUD || 0),
              salePrice: parseFloat(soldPrice),
              collectionName: 'Marketplace Sale',
            },
          ],
          totalInvestment: parseFloat(listing.card?.investmentAUD || 0),
          totalSale: parseFloat(soldPrice),
          totalProfit:
            parseFloat(soldPrice) -
            parseFloat(listing.card?.investmentAUD || 0),
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
      }

      // Create a review request in the chat
      const selectedBuyer = potentialBuyers.find(b => b.id === selectedBuyerId);
      if (selectedBuyer) {
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
            requestedAt: serverTimestamp(),
          },
          lastMessage: 'Review request sent',
          lastUpdated: serverTimestamp(),
        });
      }

      toast.success(
        createSoldInvoice
          ? 'Item marked as sold, invoice created, and review request sent!'
          : 'Item marked as sold and review request sent!'
      );
      onClose();
    } catch (error) {
      LoggingService.error('Error marking as sold:', error);
      toast.error('Failed to mark item as sold');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mark as Sold"
      size="md"
      closeOnClickOutside={true}
      footer={
        <div className="flex space-x-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={
              !selectedBuyerId || submitting || potentialBuyers.length === 0
            }
          >
            {submitting ? 'Processing...' : 'Mark as Sold'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="mb-4">
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            Who purchased{' '}
            <strong>
              {listing?.cardTitle || listing?.card?.name || 'this item'}
            </strong>
            ?
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="size-8 animate-spin rounded-full border-y-2 border-blue-500"></div>
            </div>
          ) : potentialBuyers.length === 0 ? (
            <div className="py-8 text-center">
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
        </div>

        {/* Sold Invoice Option */}
        <div className="mb-4 rounded-lg border border-gray-200 p-4 dark:border-gray-600">
          <label className="mb-3 flex items-center">
            <input
              type="checkbox"
              checked={createSoldInvoice}
              onChange={e => setCreateSoldInvoice(e.target.checked)}
              className="mr-3"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Create sold invoice
            </span>
          </label>

          {createSoldInvoice && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Final Sale Price ({preferredCurrency.code})
              </label>
              <input
                type="number"
                step="0.01"
                value={soldPrice}
                onChange={e => setSoldPrice(e.target.value)}
                placeholder="Enter final sale price"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This will create an invoice record for your sold item
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default BuyerSelectionModal;
