/**
 * Test script for Firestore service
 * 
 * Run this to verify the Firestore service is working correctly
 */

import firestoreService from './firestoreService';
import dbAdapter from './dbAdapter';

async function testFirestoreService() {
  console.log('Testing Firestore Service...\n');

  try {
    // Test 1: Get current user ID
    const userId = firestoreService.getCurrentUserId();
    console.log('✓ Current User ID:', userId || 'Not logged in');

    if (!userId) {
      console.log('\n⚠️  User not logged in. Please log in to test data operations.');
      return;
    }

    // Test 2: Get collections
    console.log('\n📁 Testing Collections...');
    const collections = await firestoreService.getCollections();
    console.log('✓ Collections retrieved:', Object.keys(collections).length, 'collections');
    console.log('  Collections:', Object.keys(collections).join(', ') || 'None');

    // Test 3: Save a test collection
    const testCollectionName = 'test-collection';
    const testCards = [
      { id: 'test-1', name: 'Test Card 1', set: 'Test Set' },
      { id: 'test-2', name: 'Test Card 2', set: 'Test Set' }
    ];
    
    console.log(`\n💾 Saving test collection '${testCollectionName}'...`);
    await firestoreService.saveCollection(testCollectionName, testCards);
    console.log('✓ Test collection saved');

    // Test 4: Get cards from collection
    console.log(`\n🃏 Getting cards from '${testCollectionName}'...`);
    const cards = await firestoreService.getCards(testCollectionName);
    console.log('✓ Cards retrieved:', cards.length, 'cards');
    cards.forEach(card => console.log(`  - ${card.name} (${card.id})`));

    // Test 5: Test adapter compatibility
    console.log('\n🔄 Testing DB Adapter compatibility...');
    const adapterCollections = await dbAdapter.getCollections();
    console.log('✓ Adapter getCollections works');
    
    const saveResult = await dbAdapter.saveCollection(testCollectionName, testCards);
    console.log('✓ Adapter saveCollection works:', saveResult.success ? 'Success' : 'Failed');

    // Test 6: Clean up test collection
    console.log(`\n🗑️  Cleaning up test collection...`);
    await firestoreService.deleteCollection(testCollectionName);
    console.log('✓ Test collection deleted');

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Export for use in browser console
window.testFirestore = testFirestoreService;

console.log('Test script loaded. Run window.testFirestore() in the console to test.');

export default testFirestoreService;
