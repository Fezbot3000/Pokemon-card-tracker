import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  header: {
    fontSize: 20,
    marginBottom: 10,
    textAlign: 'center',
    color: '#1a1a1a',
    fontFamily: 'Helvetica-Bold',
  },
  companyHeader: {
    marginBottom: 20,
    textAlign: 'left',
    fontSize: 11,
  },
  companyName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  invoiceTitle: {
    fontSize: 14,
    marginBottom: 8,
    fontFamily: 'Helvetica-Bold',
  },
  invoiceInfo: {
    marginBottom: 30,
  },
  invoiceInfoText: {
    fontSize: 11,
    marginBottom: 4,
  },
  table: {
    display: 'table',
    width: '100%',
    marginBottom: 30,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    minHeight: 30,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#213547',
    color: '#ffffff',
  },
  tableCell: {
    padding: '8px 6px',
  },
  col1: {
    width: '50%',
    paddingRight: 8,
  },
  col2: {
    width: '25%',
    textAlign: 'center',
  },
  col3: {
    width: '25%',
    textAlign: 'right',
  },
  summary: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  summaryRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  summaryLabel: {
    width: 120,
    textAlign: 'right',
    marginRight: 8,
    color: '#4a4a4a',
  },
  summaryValue: {
    width: 100,
    textAlign: 'right',
  },
  totalAmount: {
    color: '#213547',
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 10,
  },
  headerCell: {
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    fontSize: 11,
  },
  boldText: {
    fontFamily: 'Helvetica-Bold',
  },
  section: {
    marginBottom: 20,
  },
  infoBlock: {
    marginBottom: 10,
  },
  infoLabel: {
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  infoText: {
    marginBottom: 2,
  },
});

const PurchaseInvoicePDF = ({ seller, date, cards, invoiceNumber, notes, totalAmount, profile }) => {
  // Debug log the cards data
  // // console.log('Cards data received in PDF component:', cards);
  // // console.log('Total amount received:', totalAmount);
  // // console.log('Number of cards:', cards.length);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Pokemon Card Purchase</Text>
        
        <View style={styles.invoiceInfo}>
          <Text style={styles.invoiceTitle}>PURCHASE INVOICE</Text>
          
          {/* Invoice Details */}
          <View style={styles.section}>
            <Text style={styles.infoText}>Invoice #: {invoiceNumber}</Text>
            <Text style={styles.infoText}>Date: {date}</Text>
            {notes && <Text style={styles.infoText}>Notes: {notes}</Text>}
          </View>
          
          {/* Seller Information */}
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Purchased From:</Text>
            <Text style={styles.infoText}>{seller}</Text>
          </View>
          
          {/* Buyer Information (Your Company) */}
          {profile && (
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Purchased By:</Text>
              {profile.companyName && <Text style={styles.infoText}>{profile.companyName}</Text>}
              <Text style={styles.infoText}>{`${profile.firstName || ''} ${profile.lastName || ''}`}</Text>
              {profile.address && <Text style={styles.infoText}>{profile.address}</Text>}
              {profile.mobileNumber && <Text style={styles.infoText}>{profile.mobileNumber}</Text>}
              {profile.email && <Text style={styles.infoText}>{profile.email}</Text>}
            </View>
          )}
        </View>

        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={[styles.col1, styles.tableCell]}>
              <Text style={styles.headerCell}>Item Description</Text>
            </View>
            <View style={[styles.col2, styles.tableCell]}>
              <Text style={styles.headerCell}>Serial Number</Text>
            </View>
            <View style={[styles.col3, styles.tableCell]}>
              <Text style={styles.headerCell}>Price</Text>
            </View>
          </View>

          {/* Table Body */}
          {cards.map((card) => {
            // Create a display name for the card dynamically from its properties
            const cardDisplayName = card.name || card.player || card.card || 
              (card.set ? `${card.set} Card` : 'Unnamed Card');
            
            return (
              <View key={card.id} style={styles.tableRow}>
                <View style={[styles.col1, styles.tableCell]}>
                  <Text style={styles.boldText}>
                    {cardDisplayName || 'Unnamed Card'}
                  </Text>
                  {card.set && (
                    <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>
                      {[card.year, card.set, card.cardNumber ? `#${card.cardNumber}` : ''].filter(Boolean).join(' ')}
                    </Text>
                  )}
                  {card.grade && (
                    <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>
                      {`${card.gradeVendor || 'PSA'} ${card.grade}`}
                    </Text>
                  )}
                </View>
                <View style={[styles.col2, styles.tableCell]}>
                  <Text>{card.slabSerial || 'N/A'}</Text>
                </View>
                <View style={[styles.col3, styles.tableCell]}>
                  <Text>{(() => {
                    // Try to get the price from various possible field names
                    let price = parseFloat(card.originalInvestmentAmount || card.investmentAUD || 0);
                    
                    // If no individual price found, but we have a total amount and only one card,
                    // use the total amount as the individual price
                    if (price <= 0 && totalAmount && cards.length === 1) {
                      price = parseFloat(totalAmount);
                    }
                    
                    // If still no price and we have multiple cards, divide total equally
                    if (price <= 0 && totalAmount && cards.length > 1) {
                      price = parseFloat(totalAmount) / cards.length;
                    }
                    
                    return price > 0 ? `$${price.toFixed(2)}` : 'N/A';
                  })()}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, styles.totalAmount]}>Total Amount:</Text>
            <Text style={[styles.summaryValue, styles.totalAmount]}>${totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>Thank you for your purchase!</Text>
      </Page>
    </Document>
  );
};

export default PurchaseInvoicePDF;
