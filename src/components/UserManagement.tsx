import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { Shield, Trash2, UserCog, AlertCircle, X } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Firestore request timed out.")), 10000)
      );
      
      const querySnapshot = await Promise.race([
        getDocs(collection(db, 'users')),
        timeoutPromise
      ]);
      
      const fetchedUsers: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        fetchedUsers.push(doc.data() as UserProfile);
      });
      setUsers(fetchedUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    setActionError(null);
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { role: newRole });
      setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error("Error updating user role:", err);
      setActionError("Failed to update user role.");
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setActionError(null);
    try {
      const userRef = doc(db, 'users', userToDelete);
      await deleteDoc(userRef);
      setUsers(users.filter(u => u.uid !== userToDelete));
      setUserToDelete(null);
    } catch (err) {
      console.error("Error deleting user:", err);
      setActionError("Failed to delete user.");
      setUserToDelete(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div></div>;
  }

  if (error) {
    return <div className="text-red-600 dark:text-red-400 text-center py-8">{error}</div>;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden relative">
      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
              <AlertCircle size={24} />
              <h3 className="text-lg font-semibold">Delete User</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Are you sure you want to delete this user? This action cannot be undone and will permanently remove their access.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 rounded-lg transition-colors font-medium"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <UserCog size={24} className="text-indigo-600 dark:text-indigo-400" />
            User Management
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage user roles and permissions</p>
        </div>
      </div>
      
      {actionError && (
        <div className="m-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/30 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{actionError}</p>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
            <X size={18} />
          </button>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Email</th>
              <th className="p-4 font-medium">Role</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-700/50">
            {users.map(user => (
              <tr key={user.uid} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{user.name || 'N/A'}</td>
                <td className="p-4 text-slate-600 dark:text-slate-300">{user.email}</td>
                <td className="p-4">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded-md py-1 px-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="user">User</option>
                  </select>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => setUserToDelete(user.uid)}
                    className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1"
                    title="Delete User"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400 italic">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
