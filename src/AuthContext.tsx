import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole } from './types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  resetPassword: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          
          // Add a timeout to getDoc to prevent indefinite hanging
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Firestore request timed out. Please check your connection or Firebase configuration.")), 10000)
          );
          
          const docSnap = await Promise.race([
            getDoc(docRef),
            timeoutPromise
          ]);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProfile({
              uid: data.uid,
              email: data.email,
              role: data.role || 'user',
              name: data.name || currentUser.displayName || undefined,
            });
          } else {
            // Create a new user profile, default to admin if it's the first user, else user
            // For simplicity, let's make the first user an admin, or just default to admin for now
            // In a real app, you'd have a more robust way to assign roles
            const isFirstUser = currentUser.email === 'infotech.peadato@gmail.com';
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              role: isFirstUser ? 'admin' : 'user',
            };
            if (currentUser.displayName) {
              newProfile.name = currentUser.displayName;
            }
            
            const setDocTimeout = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error("Firestore write timed out. Please check your connection or Firebase configuration.")), 10000)
            );
            
            await Promise.race([
              setDoc(docRef, newProfile, { merge: true }),
              setDocTimeout
            ]);
            
            setUserProfile(newProfile);
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (error) {
    throw error;
  }

  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider).catch((error) => {
      console.error('Error signing in with Google', error);
      throw error;
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in with email', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing up with email', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error resetting password', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
