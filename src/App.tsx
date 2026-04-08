import React, { useState, useEffect } from 'react';
import { Distributor, Currency, CURRENCIES } from './types';
import DistributorPanel from './components/DistributorPanel';
import SummaryDashboard from './components/SummaryDashboard';
import UserManagement from './components/UserManagement';
import ProfileSettings from './components/ProfileSettings';
import ThemeToggle from './components/ThemeToggle';
import { Calculator, PieChart, Users, Settings, LogOut, ShieldAlert, UserCog, Shield } from 'lucide-react';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './components/Login';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useTheme } from './ThemeContext';

function MainApp() {
  const { user, userProfile, signOut } = useAuth();
  const { theme } = useTheme();
  
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [currency, setCurrency] = useState<Currency>(CURRENCIES[0]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'distributors' | 'summary' | 'users' | 'profile'>('summary');
  const [error, setError] = useState<Error | null>(null);

  // Load data from Firestore on mount
  useEffect(() => {
    if (!user || !userProfile) return;
    
    const docRef = doc(db, 'global', 'data');
    
    let timeoutId: NodeJS.Timeout;
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      clearTimeout(timeoutId);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.distributors) {
          try { setDistributors(JSON.parse(data.distributors)); } catch (e) {}
        }
        if (data.currency) {
          try { setCurrency(JSON.parse(data.currency)); } catch (e) {}
        }
      } else {
        // Initialize global data if it doesn't exist and user is admin
        if (userProfile.role === 'admin') {
          setDoc(docRef, {
            distributors: '[]',
            currency: JSON.stringify(CURRENCIES[0])
          }).catch(e => console.error(e));
        }
      }
      setDataLoaded(true);
    }, (err) => {
      clearTimeout(timeoutId);
      try {
        handleFirestoreError(err, OperationType.GET, 'global/data');
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
      }
      setDataLoaded(true);
    });
    
    timeoutId = setTimeout(() => {
      setError(new Error("Firestore request timed out. Please check your connection or Firebase configuration."));
      setDataLoaded(true);
    }, 10000);
    
    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [user, userProfile]);

  if (error) {
    throw error;
  }

  // Save data to Firestore when it changes
  useEffect(() => {
    if (!user || !userProfile || !dataLoaded) return;
    
    const saveData = async () => {
      try {
        const docRef = doc(db, 'global', 'data');
        await setDoc(docRef, {
          distributors: JSON.stringify(distributors),
          currency: JSON.stringify(currency)
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'global/data');
      }
    };
    
    // Debounce saves slightly to prevent too many writes
    const timeoutId = setTimeout(() => {
      saveData();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [distributors, currency, user, userProfile, dataLoaded]);

  if (!dataLoaded || !userProfile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  const isAdminOrManager = userProfile.role === 'admin' || userProfile.role === 'manager';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans transition-colors duration-200">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 dark:bg-indigo-500 p-2 rounded-2xl text-white">
              <Calculator size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white hidden sm:block">Twinhill Commission</h1>
            <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 capitalize border border-slate-200 dark:border-slate-600">
              {userProfile.role.replace('_', ' ')}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {isAdminOrManager && (
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                <Settings size={16} />
                <select
                  value={currency.code}
                  onChange={(e) => {
                    const curr = CURRENCIES.find(c => c.code === e.target.value);
                    if (curr) setCurrency(curr);
                  }}
                  className="bg-slate-100 dark:bg-slate-700 border-none rounded-xl py-1 px-2 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none dark:text-white"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
            
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 hidden md:block">
                {userProfile.name || userProfile.email}
              </span>
              <button 
                onClick={() => signOut()}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                title="Sign Out"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-1 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl mb-8 w-full max-w-lg mx-auto">
          <button
            onClick={() => setActiveTab('distributors')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'distributors' 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Calculator size={18} />
            Calculations
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'summary' 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <PieChart size={18} />
            Summary
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'profile' 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Shield size={18} />
            Security
          </button>
          {userProfile.role === 'admin' && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'users' 
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <UserCog size={18} />
              Users
            </button>
          )}
        </div>

        <div className="transition-all duration-300 ease-in-out">
          {activeTab === 'distributors' && (
            <DistributorPanel 
              distributors={distributors} 
              setDistributors={setDistributors} 
              currency={currency} 
            />
          )}
          
          {activeTab === 'summary' && (
            <SummaryDashboard 
              distributors={distributors} 
              currency={currency} 
            />
          )}

          {userProfile.role === 'admin' && activeTab === 'users' && (
            <UserManagement />
          )}

          {activeTab === 'profile' && (
            <ProfileSettings />
          )}
        </div>
      </main>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center transition-colors">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <MainApp />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
