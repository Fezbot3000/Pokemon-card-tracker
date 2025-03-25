import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

class AuthService {
  constructor() {
    this.auth = auth;
    this.db = db;
  }

  async register(email, password, name) {
    try {
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      // Create user profile in Firestore
      await setDoc(doc(this.db, 'users', user.uid), {
        email,
        name,
        createdAt: new Date().toISOString(),
      });

      return {
        uid: user.uid,
        email: user.email,
        name,
      };
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      // Get user profile from Firestore
      const userDoc = await getDoc(doc(this.db, 'users', user.uid));
      const userData = userDoc.data();

      return {
        uid: user.uid,
        email: user.email,
        name: userData.name,
      };
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async logout() {
    try {
      await signOut(this.auth);
    } catch (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  onAuthStateChanged(callback) {
    return onAuthStateChanged(this.auth, callback);
  }
}

export const authService = new AuthService(); 