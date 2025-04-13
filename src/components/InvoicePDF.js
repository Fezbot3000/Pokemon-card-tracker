import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { formatCurrency } from '../utils/currencyAPI';

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
    marginBottom: 30,
    textAlign: 'center',
    color: '#1a1a1a',
    fontFamily: 'Helvetica-Bold',
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
    width: '45%',
    paddingRight: 8,
  },
  col2: {
    width: '20%',
    textAlign: 'right',
  },
  col3: {
    width: '20%',
    textAlign: 'right',
  },
  col4: {
    width: '15%',
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
  totalProfit: {
    color: '#22c55e',
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

const InvoicePDF = ({ buyer, date, cards, invoiceId, profile }) => {
  const totalInvestment = cards.reduce((sum, card) => sum + card.investmentAUD, 0);
  const totalSale = cards.reduce((sum, card) => sum + card.finalValueAUD, 0);
  const totalProfit = totalSale - totalInvestment;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Pokemon Card Sales</Text>
        
        <View style={styles.invoiceInfo}>
          <Text style={styles.invoiceTitle}>INVOICE</Text>
          
          {/* Invoice Details */}
          <View style={styles.section}>
            <Text style={styles.infoText}>Invoice #: {invoiceId}</Text>
            <Text style={styles.infoText}>Date: {date}</Text>
          </View>
          
          {/* Seller Information */}
          {profile && (
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>From:</Text>
              {profile.companyName && <Text style={styles.infoText}>{profile.companyName}</Text>}
              <Text style={styles.infoText}>{`${profile.firstName || ''} ${profile.lastName || ''}`}</Text>
              {profile.mobileNumber && <Text style={styles.infoText}>{profile.mobileNumber}</Text>}
              {profile.address && <Text style={styles.infoText}>{profile.address}</Text>}
            </View>
          )}

          {/* Buyer Information */}
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>To:</Text>
            <Text style={styles.infoText}>{buyer}</Text>
          </View>
        </View>

        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={[styles.col1, styles.tableCell]}>
              <Text style={styles.headerCell}>Item Description</Text>
            </View>
            <View style={[styles.col2, styles.tableCell]}>
              <Text style={styles.headerCell}>Investment</Text>
            </View>
            <View style={[styles.col3, styles.tableCell]}>
              <Text style={styles.headerCell}>Sold For</Text>
            </View>
            <View style={[styles.col4, styles.tableCell]}>
              <Text style={styles.headerCell}>Profit</Text>
            </View>
          </View>

          {/* Table Body */}
          {cards.map((card) => (
            <View key={card.slabSerial} style={styles.tableRow}>
              <View style={[styles.col1, styles.tableCell]}>
                <Text>{card.card} {card.player ? `- ${card.player}` : ''}</Text>
                <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>
                  Serial: {card.slabSerial}
                </Text>
              </View>
              <View style={[styles.col2, styles.tableCell]}>
                <Text>{formatCurrency(card.investmentAUD)}</Text>
              </View>
              <View style={[styles.col3, styles.tableCell]}>
                <Text>{formatCurrency(card.finalValueAUD)}</Text>
              </View>
              <View style={[styles.col4, styles.tableCell]}>
                <Text>{formatCurrency(card.finalProfitAUD)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Investment:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalInvestment)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Sale:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalSale)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, styles.totalProfit]}>Total Profit:</Text>
            <Text style={[styles.summaryValue, styles.totalProfit]}>{formatCurrency(totalProfit)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>Thank you for your business!</Text>
      </Page>
    </Document>
  );
};

export default InvoicePDF; 