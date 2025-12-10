
import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, Auth, User } from 'firebase/auth';
import { getFirestore, Firestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { FirebaseConfigJson, SavedBill, TariffConfig, Tenant } from '../types';

class FirebaseService {
  private app: FirebaseApp | null = null;
  public auth: Auth | null = null;
  public db: Firestore | null = null;
  private isInitialized = false;

  constructor() {
    this.tryAutoInit();
  }

  // Try to load config from localStorage
  private tryAutoInit() {
    const storedConfig = localStorage.getItem('tmss_firebase_config');
    if (storedConfig) {
      try {
        const config = JSON.parse(storedConfig);
        this.initialize(config);
      } catch (e) {
        console.error("Failed to auto-init firebase", e);
      }
    }
  }

  public initialize(config: FirebaseConfigJson) {
    try {
      if (!getApps().length) {
        this.app = initializeApp(config);
      } else {
        this.app = getApps()[0];
      }
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      this.isInitialized = true;
      localStorage.setItem('tmss_firebase_config', JSON.stringify(config));
    } catch (error) {
      console.error("Firebase Init Error:", error);
      throw error;
    }
  }

  public isReady(): boolean {
    return this.isInitialized && !!this.auth && !!this.db;
  }

  public async login() {
    if (!this.auth) throw new Error("Firebase not initialized");
    const provider = new GoogleAuthProvider();
    return signInWithPopup(this.auth, provider);
  }

  public async logout() {
    if (!this.auth) throw new Error("Firebase not initialized");
    return signOut(this.auth);
  }

  // Firestore Helpers
  // -----------------

  private getUserRef(uid: string) {
      if (!this.db) throw new Error("DB not ready");
      return doc(this.db, 'users', uid);
  }

  // History
  public async saveBill(uid: string, bill: SavedBill) {
    if (!this.db) throw new Error("DB not ready");
    const billRef = doc(this.db, 'users', uid, 'bills', bill.id);
    await setDoc(billRef, bill);
  }

  public async getBills(uid: string): Promise<SavedBill[]> {
    if (!this.db) throw new Error("DB not ready");
    const billsRef = collection(this.db, 'users', uid, 'bills');
    const snapshot = await getDocs(billsRef);
    return snapshot.docs.map(d => d.data() as SavedBill);
  }

  public async deleteBill(uid: string, billId: string) {
    if (!this.db) throw new Error("DB not ready");
    await deleteDoc(doc(this.db, 'users', uid, 'bills', billId));
  }

  // Settings: Tariff
  public async saveTariff(uid: string, config: TariffConfig) {
    if (!this.db) throw new Error("DB not ready");
    await setDoc(doc(this.db, 'users', uid, 'settings', 'tariff'), config);
  }

  public async getTariff(uid: string): Promise<TariffConfig | null> {
    if (!this.db) throw new Error("DB not ready");
    const docRef = doc(this.db, 'users', uid, 'settings', 'tariff');
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as TariffConfig) : null;
  }

  // Settings: Tenants
  public async saveTenants(uid: string, tenants: Tenant[]) {
    if (!this.db) throw new Error("DB not ready");
    // Saving as a single document with array field for simplicity
    await setDoc(doc(this.db, 'users', uid, 'settings', 'tenants'), { list: tenants });
  }

  public async getTenants(uid: string): Promise<Tenant[]> {
    if (!this.db) throw new Error("DB not ready");
    const docRef = doc(this.db, 'users', uid, 'settings', 'tenants');
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data().list as Tenant[]) : [];
  }
}

export const firebaseService = new FirebaseService();
