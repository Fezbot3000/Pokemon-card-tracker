/**
 * Migration Diagnostics
 * Run diagnostics to ensure the migration is working correctly
 */

import db from '../services/firestore/dbAdapter';
import firestoreService from '../services/firestore/firestoreService';
import { auth } from '../services/firebase';
import logger from './logger';

export async function runDiagnostics() {
  console.log('🔍 Running Migration Diagnostics...\n');
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    user: {
      authenticated: false,
      userId: null
    },
    adapter: {
      working: false,
      errors: []
    },
    firestore: {
      working: false,
      errors: []
    },
    data: {
      collections: 0,
      soldItems: 0,
      profile: false,
      invoices: 0
    }
  };

  // Check 1: User Authentication
  try {
    const user = auth.currentUser;
    if (user) {
      diagnostics.user.authenticated = true;
      diagnostics.user.userId = user.uid;
      console.log('✅ User authenticated:', user.email);
    } else {
      console.log('❌ No user authenticated');
      return diagnostics;
    }
  } catch (error) {
    console.error('❌ Auth check failed:', error);
    return diagnostics;
  }

  // Check 2: Adapter functionality
  try {
    const userId = db.getCurrentUserId();
    if (userId) {
      diagnostics.adapter.working = true;
      console.log('✅ DB Adapter working');
    }
  } catch (error) {
    diagnostics.adapter.errors.push(error.message);
    console.error('❌ Adapter error:', error);
  }

  // Check 3: Firestore direct access
  try {
    const testUserId = firestoreService.getCurrentUserId();
    if (testUserId) {
      diagnostics.firestore.working = true;
      console.log('✅ Firestore service working');
    }
  } catch (error) {
    diagnostics.firestore.errors.push(error.message);
    console.error('❌ Firestore error:', error);
  }

  // Check 4: Data access
  try {
    // Collections
    const collections = await db.getCollections();
    diagnostics.data.collections = Object.keys(collections).length;
    console.log(`📁 Collections found: ${diagnostics.data.collections}`);
    
    // Sold items
    const soldItems = await db.getSoldCards();
    diagnostics.data.soldItems = soldItems.data?.length || 0;
    console.log(`💰 Sold items found: ${diagnostics.data.soldItems}`);
    
    // Profile
    const profile = await db.getProfile();
    diagnostics.data.profile = !!profile;
    console.log(`👤 Profile exists: ${diagnostics.data.profile}`);
    
    // Invoices
    const invoices = await db.getPurchaseInvoices();
    diagnostics.data.invoices = invoices.length;
    console.log(`📄 Purchase invoices found: ${diagnostics.data.invoices}`);
    
  } catch (error) {
    console.error('❌ Data access error:', error);
  }

  // Summary
  console.log('\n📊 Diagnostics Summary:');
  console.log('====================');
  console.log(`User: ${diagnostics.user.authenticated ? '✅ Authenticated' : '❌ Not authenticated'}`);
  console.log(`Adapter: ${diagnostics.adapter.working ? '✅ Working' : '❌ Not working'}`);
  console.log(`Firestore: ${diagnostics.firestore.working ? '✅ Working' : '❌ Not working'}`);
  console.log(`Data Migration: ${diagnostics.data.collections > 0 ? '✅ Data accessible' : '⚠️  No data found'}`);
  
  return diagnostics;
}

// Check if we need to migrate data from IndexedDB to Firestore
export async function checkDataMigrationNeeded() {
  try {
    // Dynamically import original db to avoid circular dependencies
    const { default: originalDb } = await import('../services/db');
    
    console.log('\n🔄 Checking if data migration is needed...');
    
    // Get data from both sources
    const indexedDBCollections = await originalDb.getCollections();
    const firestoreCollections = await firestoreService.getCollections();
    
    const indexedDBCount = Object.keys(indexedDBCollections).length;
    const firestoreCount = Object.keys(firestoreCollections).length;
    
    console.log(`IndexedDB collections: ${indexedDBCount}`);
    console.log(`Firestore collections: ${firestoreCount}`);
    
    if (indexedDBCount > 0 && firestoreCount === 0) {
      console.log('⚠️  Data exists in IndexedDB but not in Firestore!');
      console.log('Migration needed to copy data to Firestore.');
      return true;
    } else if (indexedDBCount === 0 && firestoreCount === 0) {
      console.log('ℹ️  No data in either database (fresh install)');
      return false;
    } else {
      console.log('✅ Data already exists in Firestore');
      return false;
    }
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.migrationDiagnostics = {
    run: runDiagnostics,
    checkMigration: checkDataMigrationNeeded
  };
  
  // Auto-run diagnostics after a short delay
  setTimeout(() => {
    console.log('💡 Run window.migrationDiagnostics.run() to check migration status');
  }, 2000);
}
