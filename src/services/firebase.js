// Deprecated shim: re-export unified Firebase instance to prevent duplicate initialization
export { app, db, auth, storage, functions, googleProvider, httpsCallable } from './firebase-unified';
export { default } from './firebase-unified';
