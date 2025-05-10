import React, { useState, useEffect } from 'react';
import { useAuth } from '../../design-system';
import db from '../../services/db';
import { toast } from 'react-hot-toast';
import CreateInvoiceModal from './CreateInvoiceModal';

/**
 * PurchaseInvoices component
 * 
 * Displays and manages purchase invoices for Pokemon cards
 */
const PurchaseInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { currentUser } = useAuth();

  // Load purchase invoices
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);
        
        // First try to sync invoices from Firebase
        try {
          await db.syncPurchaseInvoicesFromFirestore();
          console.log('Synced purchase invoices from Firebase');
        } catch (syncError) {
          console.error('Error syncing invoices from Firebase:', syncError);
        }
        
        // Get purchase invoices from database
        const purchaseInvoices = await db.getPurchaseInvoices() || [];
        setInvoices(purchaseInvoices);
      } catch (error) {
        // Handle error silently - the database might be initializing
        console.log('Note: Purchase invoices store might be initializing');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadInvoices();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  return (
    <div className="container mx-auto px-4 py-8 mt-16 sm:mt-20">
      <div className="bg-white dark:bg-[#1B2131] rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Purchase Invoices
        </h1>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400 mb-4">
              No purchase invoices found
            </div>
            <button 
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              onClick={() => setShowCreateModal(true)}
            >
              Create New Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Seller
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    # of Cards
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-[#1B2131] divide-y divide-gray-200 dark:divide-gray-700">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {invoice.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {invoice.seller}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ${invoice.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {invoice.cardCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <button 
                        className="text-primary hover:text-primary/80 transition-colors mr-3"
                        onClick={() => {
                          // Open a modal to view invoice details (to be implemented)
                          toast.success('View invoice feature coming soon!');
                        }}
                      >
                        View
                      </button>
                      <button 
                        className="text-red-500 hover:text-red-700 transition-colors"
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to delete this invoice?')) {
                            try {
                              await db.deletePurchaseInvoice(invoice.id);
                              setInvoices(prev => prev.filter(i => i.id !== invoice.id));
                              toast.success('Invoice deleted successfully');
                            } catch (error) {
                              console.error('Error deleting invoice:', error);
                              toast.error('Failed to delete invoice');
                            }
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Create Invoice Modal */}
      <CreateInvoiceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={(newInvoice) => {
          // Add the new invoice to the list
          setInvoices(prev => [newInvoice, ...prev]);
        }}
      />
    </div>
  );
};

export default PurchaseInvoices;
