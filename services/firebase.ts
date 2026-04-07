
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithCredential,
  User as FirebaseUser
} from "firebase/auth";
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  limit,
  writeBatch,
  increment,
  orderBy 
} from "firebase/firestore";
import { ProductData, User, ISubmission, IProduct } from "../types";
import { env } from "./config";

const firebaseConfig = {
  apiKey: env.firebaseApiKey || "AIzaSyC-98paOL4X9ZJ3dLHXY5Z5zKifwwl1JEE",
  authDomain: env.firebaseAuthDomain || "kamekhalal-e3eaa.firebaseapp.com",
  projectId: env.firebaseProjectId || "kamekhalal-e3eaa",
  storageBucket: env.firebaseStorageBucket || "kamekhalal-e3eaa.firebasestorage.app",
  messagingSenderId: env.firebaseMessagingSenderId || "194397858986",
  appId: env.firebaseAppId || "1:194397858986:web:363ed70a713cba8a8834d3",
  measurementId: env.firebaseMeasurementId || "G-XHG1NLM74Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

void isAnalyticsSupported()
  .then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  })
  .catch((error) => {
    console.warn("Firebase analytics unavailable in this environment.", error);
  });

// Helper to remove undefined values and ensure plain object
const sanitizeData = (data: any) => {
  return JSON.parse(JSON.stringify(data));
};

export const authService = {
  auth,
  
  signUp: async (email: string, pass: string, name: string) => {
    // Set persistence before signing up as well
    await setPersistence(auth, browserLocalPersistence);
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    if (userCredential.user) {
      // 1. Update Display Name in Auth
      await updateProfile(userCredential.user, {
        displayName: name,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
      });
      // 2. Send Verification Email
      await sendEmailVerification(userCredential.user);
    }
    return userCredential.user;
  },

  signInWithGoogle: async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        const idToken = result.credential?.idToken;
        if (!idToken) throw new Error('No Google ID token');
        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        return userCredential.user;
      } else {
        const { signInWithPopup } = await import("firebase/auth");
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        return userCredential.user;
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  },

  signIn: async (email: string, pass: string) => {
    // Explicitly set persistence to LOCAL (survives browser close)
    await setPersistence(auth, browserLocalPersistence);
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  },

  resendVerificationEmail: async (user: FirebaseUser) => {
    await sendEmailVerification(user);
  },

  // NEW: Added this wrapper function
  sendPasswordResetEmail: async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  },

  logout: async () => {
    await signOut(auth);
  },

  subscribe: (callback: (user: FirebaseUser | null) => void) => {
    return onAuthStateChanged(auth, callback);
  }
};

export const dbService = {
  db,

  // --- Users Collection ---
  
  // Save user data to Firestore 'users' collection
  saveUser: async (user: User) => {
    try {
      const userRef = doc(db, "users", user.id);
      // Sanitize user object
      const cleanUser = sanitizeData({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone || "",
        dob: user.dob || "",
        totalContributions: user.totalContributions || 0,
        points: user.points || 0
      });
      await setDoc(userRef, cleanUser, { merge: true });
    } catch (e) {
      console.error("Error adding user: ", e);
      throw e;
    }
  },

  // Get user data from Firestore
  getUser: async (userId: string): Promise<Partial<User> | null> => {
    try {
      const docRef = doc(db, "users", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as Partial<User>;
      } else {
        return null;
      }
    } catch (e) {
      console.error("Error getting user: ", e);
      return null;
    }
  },

  // Get Top Contributors (Leaderboard) - NOW SORTED BY POINTS
  getTopContributors: async (limitCount: number = 20): Promise<User[]> => {
    try {
      // Changed sorting to 'points'
      const q = query(collection(db, "users"), orderBy("points", "desc"), limit(limitCount));
      const snapshot = await getDocs(q);
      const users: User[] = [];
      snapshot.forEach(doc => {
          const data = doc.data();
          users.push({
              id: doc.id,
              name: data.name || 'Anonymous',
              email: data.email || '',
              avatar: data.avatar || '',
              role: data.role || 'user',
              totalContributions: data.totalContributions || 0,
              points: data.points || 0
          } as User);
      });
      return users;
    } catch (e) {
      console.error("Error getting leaderboard", e);
      return [];
    }
  },

  // --- Products Collection (scanned_products) ---

  // Add new product
  addProduct: async (product: ProductData) => {
    try {
      await setDoc(doc(db, "scanned_products", product.id), sanitizeData(product));
    } catch (e) {
      console.error("Error adding product: ", e);
      throw e;
    }
  },

  // Get product by Barcode
  getProductByBarcode: async (barcode: string): Promise<ProductData | null> => {
    try {
      const q = query(collection(db, "scanned_products"), where("barcode", "==", barcode), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data() as ProductData;
      }
      return null;
    } catch (e) {
      console.error("Error checking barcode: ", e);
      return null;
    }
  },

  // Get all products (For Admin or Global view)
  getAllProducts: async (): Promise<ProductData[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, "scanned_products"));
      const products: ProductData[] = [];
      querySnapshot.forEach((doc) => {
        products.push(doc.data() as ProductData);
      });
      // Sort by timestamp descending (newest first)
      return products.sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      console.error("Error getting products: ", e);
      return [];
    }
  },

  // Get products for specific user
  getUserProducts: async (userId: string): Promise<ProductData[]> => {
    try {
      const q = query(collection(db, "scanned_products"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const products: ProductData[] = [];
      querySnapshot.forEach((doc) => {
        products.push(doc.data() as ProductData);
      });
      return products.sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      console.error("Error getting user products: ", e);
      return [];
    }
  },

  // NEW: Feature Monetization / Recommendation System
  getHalalAlternatives: async (category: string, excludeId: string): Promise<ProductData[]> => {
    try {
      // Logic: Get products in same category, that are APPROVED and usually strictly HALAL JAKIM
      // Limitation: Firestore simple queries can't do complex ORs without indexes easily, 
      // so we fetch category matches and filter in code for flexibility.
      const q = query(
        collection(db, "scanned_products"), 
        where("mainCategory", "==", category),
        where("approvalStatus", "==", "approved"),
        limit(20) // Fetch slightly more to filter client-side
      );
      
      const querySnapshot = await getDocs(q);
      const suggestions: ProductData[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as ProductData;
        // Strict Filter: Must be different ID AND have "JAKIM" in status
        if (data.id !== excludeId && data.statusHalal && data.statusHalal.toUpperCase().includes("JAKIM")) {
          suggestions.push(data);
        }
      });

      // Return top 3 suggestions
      return suggestions.slice(0, 3);
    } catch (e) {
      console.error("Error fetching alternatives: ", e);
      return [];
    }
  },

  // NEW: Get all products from same company (For Menu List View)
  getCompanyProducts: async (companyName: string): Promise<ProductData[]> => {
    if (!companyName) return [];
    try {
        const q = query(
            collection(db, "scanned_products"),
            where("namaPengeluar", "==", companyName),
            where("approvalStatus", "==", "approved"),
            limit(50) 
        );
        const snapshot = await getDocs(q);
        const products: ProductData[] = [];
        snapshot.forEach(doc => products.push(doc.data() as ProductData));
        return products.sort((a, b) => a.namaProduk.localeCompare(b.namaProduk));
    } catch (e) {
        console.error("Error fetching company products", e);
        return [];
    }
  },

  // Update a product
  updateProduct: async (product: ProductData) => {
    try {
      const productRef = doc(db, "scanned_products", product.id);
      await updateDoc(productRef, sanitizeData(product));
    } catch (e) {
      console.error("Error updating product: ", e);
      throw e;
    }
  },

  // PROPAGATE COMPANY DETAILS TO ALL PRODUCTS
  updateCompanyDetails: async (companyName: string, details: {
      alias?: string;
      website?: string;
      facebook?: string;
      tiktok?: string;
      threads?: string;
      instagram?: string;
  }) => {
      try {
          if (!companyName) return;
          // Find all products by this company
          const q = query(collection(db, "scanned_products"), where("namaPengeluar", "==", companyName));
          const snapshot = await getDocs(q);
          
          const batch = writeBatch(db);
          let count = 0;
          const cleanDetails = sanitizeData(details);

          snapshot.forEach(doc => {
              batch.update(doc.ref, cleanDetails);
              count++;
          });

          if (count > 0) {
              await batch.commit();
              console.log(`Updated company details for ${count} products.`);
          }
      } catch (e) {
          console.error("Error propagating company details:", e);
          throw e;
      }
  },

  // Merge Products: Updates Master, Deletes Duplicate
  mergeProducts: async (masterId: string, duplicateId: string, mergedData: Partial<ProductData>) => {
    try {
      const batch = writeBatch(db);
      
      const masterRef = doc(db, "scanned_products", masterId);
      const duplicateRef = doc(db, "scanned_products", duplicateId);

      // Update master with any merged fields (e.g. taking image from duplicate)
      batch.update(masterRef, sanitizeData(mergedData));
      
      // Delete duplicate
      batch.delete(duplicateRef);

      await batch.commit();
    } catch (e) {
      console.error("Error merging products: ", e);
      throw e;
    }
  },

  // Delete a product
  deleteProduct: async (productId: string) => {
    try {
      await deleteDoc(doc(db, "scanned_products", productId));
    } catch (e) {
      console.error("Error deleting product: ", e);
      throw e;
    }
  },

  // NEW: Bulk Delete Products (Chunks of 500)
  bulkDeleteProducts: async (productIds: string[]) => {
    try {
        // Firestore limits batches to 500 operations. We need to chunk.
        const chunkSize = 500;
        for (let i = 0; i < productIds.length; i += chunkSize) {
            const chunk = productIds.slice(i, i + chunkSize);
            const batch = writeBatch(db);
            
            chunk.forEach(id => {
                const docRef = doc(db, "scanned_products", id);
                batch.delete(docRef);
            });

            await batch.commit();
        }
    } catch (e) {
        console.error("Error batch deleting products: ", e);
        throw e;
    }
  },

  // --- Fasa 1: New Submission Logic ---

  // 1. Submit Product (User)
  // GAMIFICATION: +1 Point on Submission
  submitProduct: async (submission: ISubmission) => {
    try {
      const batch = writeBatch(db);
      
      // 1. Save submission
      const subRef = doc(db, "submissions", submission.id);
      batch.set(subRef, sanitizeData(submission));

      // 2. Increment User Points (Immediate Reward)
      const userRef = doc(db, "users", submission.contributorUid);
      batch.update(userRef, { 
          points: increment(1) 
      });

      await batch.commit();
    } catch (e) {
      console.error("Error submitting product: ", e);
      throw e;
    }
  },

  // 2. Update User Contribution Stats (Helper)
  updateUserContribution: async (uid: string, incrementValue: 1 | -1) => {
    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, {
        totalContributions: increment(incrementValue)
      });
    } catch (e) {
      console.error("Error updating contribution stats: ", e);
    }
  },

  // 3. Get Pending Submissions (Admin)
  getPendingSubmissions: async (): Promise<ISubmission[]> => {
    try {
      const q = query(collection(db, "submissions"), where("status", "==", "Pending"));
      const snapshot = await getDocs(q);
      const submissions: ISubmission[] = [];
      snapshot.forEach(doc => submissions.push(doc.data() as ISubmission));
      // Sort by newest submission first
      return submissions.sort((a, b) => b.submissionTimestamp - a.submissionTimestamp);
    } catch (e) {
       console.error("Error getting pending submissions: ", e);
       return [];
    }
  },

  // 4. Get User Submissions (Profile History)
  getUserSubmissions: async (userId: string): Promise<ISubmission[]> => {
    try {
      const q = query(collection(db, "submissions"), where("contributorUid", "==", userId));
      const snapshot = await getDocs(q);
      const subs: ISubmission[] = [];
      snapshot.forEach(doc => subs.push(doc.data() as ISubmission));
      // Sort by newest submission first
      return subs.sort((a, b) => b.submissionTimestamp - a.submissionTimestamp);
    } catch (e) {
      console.error("Error getting user submissions: ", e);
      return [];
    }
  },

  // 5. Approve Submission (Admin)
  // GAMIFICATION: +1 Point on Approval (Bonus) + 1 Contribution Count
  approveSubmission: async (submissionId: string, productData: ProductData) => {
    try {
      const batch = writeBatch(db);

      // A. Add to 'scanned_products' (The active collection)
      const productRef = doc(db, "scanned_products", productData.id);
      batch.set(productRef, sanitizeData(productData));

      // B. Update submission status to 'Approved'
      const submissionRef = doc(db, "submissions", submissionId);
      batch.update(submissionRef, { status: 'Approved' });

      // C. Increment User Contribution & Points
      // We read the submission doc first to ensure we attribute the correct user
      const submissionSnap = await getDoc(submissionRef);
      if (submissionSnap.exists()) {
          const subData = submissionSnap.data() as ISubmission;
          if (subData.contributorUid) {
              const userRef = doc(db, "users", subData.contributorUid);
              batch.update(userRef, { 
                  totalContributions: increment(1),
                  points: increment(1) // Additional point for quality approval
              });
          }
      }

      await batch.commit();

    } catch (e) {
      console.error("Error approving submission: ", e);
      throw e;
    }
  },

  // 6. Reject Submission (Admin)
  // GAMIFICATION: -1 Point (Take back the submission point)
  rejectSubmission: async (submissionId: string) => {
      try {
          const batch = writeBatch(db);

          const subRef = doc(db, "submissions", submissionId);
          batch.update(subRef, { status: 'Rejected' });

          // Decrease point because it was bad data
          const submissionSnap = await getDoc(subRef);
          if (submissionSnap.exists()) {
              const subData = submissionSnap.data() as ISubmission;
              if (subData.contributorUid) {
                  const userRef = doc(db, "users", subData.contributorUid);
                  batch.update(userRef, { 
                      points: increment(-1) // Reverse the point gained during submission
                  });
              }
          }
          
          await batch.commit();
      } catch(e) {
          console.error("Error rejecting submission", e);
          throw e;
      }
  }
};
