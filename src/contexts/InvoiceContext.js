import React, { createContext, useContext, useState, useEffect } from 'react';
import db from '../services/firestore/dbAdapter';
import LoggingService from '../services/LoggingService';

// Create a context for invoice data
const InvoiceContext = createContext();

// Custom hook to use the invoice context
export const useInvoiceContext = () => useContext(InvoiceContext);

// Provider component
export const InvoiceProvider = ({ children }) => {
  const [invoiceCards, setInvoiceCards] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Load all purchase invoices and extract card IDs
  useEffect(() => {
    const loadInvoiceCards = async () => {
      try {
        setLoading(true);

        // Get all purchase invoices
        const invoices = await db.getPurchaseInvoices();

        // Create a set of all card IDs that are in any invoice
        const cardIds = new Set();

        invoices.forEach(invoice => {
          if (invoice.cards && Array.isArray(invoice.cards)) {
            invoice.cards.forEach(card => {
              if (card.id) {
                cardIds.add(card.id);
              }
            });
          }
        });

        setInvoiceCards(cardIds);
      } catch (error) {
        LoggingService.error('Error loading invoice cards:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInvoiceCards();
  }, []);

  // Check if a card is in any invoice
  const isCardInInvoice = cardId => {
    return invoiceCards.has(cardId);
  };

  // Refresh the invoice cards data
  const refreshInvoiceCards = async () => {
    try {
      setLoading(true);

      // Get all purchase invoices
      const invoices = await db.getPurchaseInvoices();

      // Create a set of all card IDs that are in any invoice
      const cardIds = new Set();

      invoices.forEach(invoice => {
        if (invoice.cards && Array.isArray(invoice.cards)) {
          invoice.cards.forEach(card => {
            if (card.id) {
              cardIds.add(card.id);
            }
          });
        }
      });

      setInvoiceCards(cardIds);
    } catch (error) {
      LoggingService.error('Error refreshing invoice cards:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <InvoiceContext.Provider
      value={{
        isCardInInvoice,
        refreshInvoiceCards,
        loading,
      }}
    >
      {children}
    </InvoiceContext.Provider>
  );
};

export default InvoiceProvider;
