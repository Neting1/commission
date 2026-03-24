import React, { useState, useEffect } from 'react';
import { Distributor, Currency, CURRENCIES } from './types';
import DistributorPanel from './components/DistributorPanel';
import SalesRepPanel from './components/SalesRepPanel';
import SummaryDashboard from './components/SummaryDashboard';
import { Calculator, PieChart, Users, Settings, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './components/Login';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { ErrorBoundary } from './components/ErrorBoundary';

function MainApp() {
  const { user, signOut } = useAuth();
  
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [currency, setCurrency] = useState<Currency>(CURRENCIES[0]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'distributors' | 'reps' | 'summary'>('distributors');

  // Load data from Firestore on mount
  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.distributors) {
            try { setDistributors(JSON.parse(data.distributors)); } catch (e) {}
          }
          if (data.currency) {
            try { setCurrency(JSON.parse(data.currency)); } catch (e) {}
          }
        } else {
          // Fallback to local storage for first-time migration
          const savedDist = localStorage.getItem(`commissionData_${user.uid}`);
          if (savedDist) {
            try { setDistributors(JSON.parse(savedDist)); } catch (e) {}
          }
          
          const savedCurr = localStorage.getItem(`commissionCurrency_${user.uid}`);
          if (savedCurr) {
            try { setCurrency(JSON.parse(savedCurr)); } catch (e) {}
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      } finally {
        setDataLoaded(true);
      }
    };
    
    loadData();
  }, [user]);

  // Save data to Firestore when it changes
  useEffect(() => {
    if (!user || !dataLoaded) return;
    
    const saveData = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        await setDoc(docRef, {
          uid: user.uid,
          email: user.email,
          distributors: JSON.stringify(distributors),
          currency: JSON.stringify(currency)
        }, { merge: true });
        
        // Keep local storage in sync as a backup
        localStorage.setItem(`commissionData_${user.uid}`, JSON.stringify(distributors));
        localStorage.setItem(`commissionCurrency_${user.uid}`, JSON.stringify(currency));
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
    };
    
    // Debounce saves slightly to prevent too many writes
    const timeoutId = setTimeout(() => {
      saveData();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [distributors, currency, user, dataLoaded]);

  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Calculator size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 hidden sm:block">Commission Calculator</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <Settings size={16} />
              <select
                value={currency.code}
                onChange={(e) => {
                  const curr = CURRENCIES.find(c => c.code === e.target.value);
                  if (curr) setCurrency(curr);
                }}
                className="bg-slate-100 border-none rounded-md py-1 px-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                ))}
              </select>
            </div>
            
            <div className="h-6 w-px bg-slate-200 mx-1"></div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600 hidden md:block">
                {user?.displayName || user?.email}
              </span>
              <button 
                onClick={() => signOut()}
                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl mb-8 w-full max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('distributors')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'distributors' 
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Calculator size={18} />
            Distributors
          </button>
          <button
            onClick={() => setActiveTab('reps')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'reps' 
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Users size={18} />
            Sales Reps
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'summary' 
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <PieChart size={18} />
            Summary
          </button>
        </div>

        <div className="transition-all duration-300 ease-in-out">
          {activeTab === 'distributors' && (
            <DistributorPanel 
              distributors={distributors} 
              setDistributors={setDistributors} 
              currency={currency} 
            />
          )}
          
          {activeTab === 'reps' && (
            <SalesRepPanel 
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
        </div>
      </main>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
