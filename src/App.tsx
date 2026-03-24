import React, { useState, useEffect } from 'react';
import { Distributor, Currency, CURRENCIES } from './types';
import DistributorPanel from './components/DistributorPanel';
import SalesRepPanel from './components/SalesRepPanel';
import SummaryDashboard from './components/SummaryDashboard';
import UserManagement from './components/UserManagement';
import { Calculator, PieChart, Users, Settings, LogOut, ShieldAlert, UserCog } from 'lucide-react';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './components/Login';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { ErrorBoundary } from './components/ErrorBoundary';

function MainApp() {
  const { user, userProfile, signOut } = useAuth();
  
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [currency, setCurrency] = useState<Currency>(CURRENCIES[0]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'distributors' | 'reps' | 'summary' | 'users'>('summary');

  // Load data from Firestore on mount
  useEffect(() => {
    if (!user || !userProfile) return;
    
    const docRef = doc(db, 'global', 'data');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
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
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'global/data');
      setDataLoaded(true);
    });
    
    return () => unsubscribe();
  }, [user, userProfile]);

  // Save data to Firestore when it changes (only for admins/managers)
  useEffect(() => {
    if (!user || !userProfile || !dataLoaded) return;
    if (userProfile.role === 'sales_rep') return; // Sales reps can't save global data
    
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const isAdminOrManager = userProfile.role === 'admin' || userProfile.role === 'manager';

  // Filter distributors for sales rep
  const visibleDistributors = isAdminOrManager 
    ? distributors 
    : distributors.map(d => ({
        ...d,
        salesReps: d.salesReps.filter(r => r.email === userProfile.email || r.name.toLowerCase() === userProfile.name?.toLowerCase())
      })).filter(d => d.salesReps.length > 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Calculator size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 hidden sm:block">Twinhill Commission</h1>
            <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 capitalize border border-slate-200">
              {userProfile.role.replace('_', ' ')}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {isAdminOrManager && (
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
            )}
            
            <div className="h-6 w-px bg-slate-200 mx-1"></div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600 hidden md:block">
                {userProfile.name || userProfile.email}
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
        {isAdminOrManager ? (
          <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl mb-8 w-full max-w-lg mx-auto">
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
            {userProfile.role === 'admin' && (
              <button
                onClick={() => setActiveTab('users')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'users' 
                    ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <UserCog size={18} />
                Users
              </button>
            )}
          </div>
        ) : (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">My Commissions</h2>
            <p className="text-slate-500 mt-1">View your earned commissions across all distributors.</p>
          </div>
        )}

        <div className="transition-all duration-300 ease-in-out">
          {isAdminOrManager && activeTab === 'distributors' && (
            <DistributorPanel 
              distributors={distributors} 
              setDistributors={setDistributors} 
              currency={currency} 
            />
          )}
          
          {isAdminOrManager && activeTab === 'reps' && (
            <SalesRepPanel 
              distributors={distributors} 
              setDistributors={setDistributors} 
              currency={currency} 
            />
          )}
          
          {(activeTab === 'summary' || !isAdminOrManager) && (
            <SummaryDashboard 
              distributors={visibleDistributors} 
              currency={currency} 
              isSalesRep={!isAdminOrManager}
            />
          )}

          {userProfile.role === 'admin' && activeTab === 'users' && (
            <UserManagement />
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
