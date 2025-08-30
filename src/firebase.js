// Shim to preserve legacy imports like "import('../firebase')" from components
// Re-exports the canonical Firebase instances from services/firebase-unified

import unified from './services/firebase-unified';
export { app, db, auth, storage, functions, googleProvider, httpsCallable } from './services/firebase-unified';

export default unified;
