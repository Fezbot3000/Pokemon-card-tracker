import React from 'react';
import PurchaseInvoices from '../../components/PurchaseInvoices/PurchaseInvoices';
import SoldItems from '../../components/SoldItems/SoldItems';

function SalesView({ currentView }) {
  if (currentView === 'purchase-invoices' || currentView === 'sold') {
    return <PurchaseInvoices />;
  }
  if (currentView === 'sold-items') {
    return <SoldItems />;
  }
  return null;
}

export default SalesView;


