import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { db } from '../config/firebase';
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper to safely parse dates
const safeDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date(0) : d;
};

export const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [bills, setBills] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [categories, setCategories] = useState({ expense: [], income: [] });
  const [loading, setLoading] = useState(true);

  // Load Categories (Tetap lokal)
  useEffect(() => {
    const loadCats = async () => {
      try {
        const storedCats = await AsyncStorage.getItem('@rika_cats_v2');
        if (storedCats) {
          setCategories(JSON.parse(storedCats));
        } else {
          const initialCats = {
            expense: [
              { name: 'Makanan', icon: 'restaurant' },
              { name: 'Transport', icon: 'directions-car' },
              { name: 'Belanja', icon: 'shopping-bag' },
              { name: 'Tagihan', icon: 'receipt' },
              { name: 'Hiburan', icon: 'movie' }
            ],
            income: [
              { name: 'Gaji', icon: 'work' },
              { name: 'Bonus', icon: 'card-giftcard' },
              { name: 'Usaha', icon: 'storefront' },
              { name: 'Hadiah', icon: 'redeem' }
            ]
          };
          setCategories(initialCats);
          await AsyncStorage.setItem('@rika_cats_v2', JSON.stringify(initialCats));
        }
      } catch (e) {
        console.error('Failed to load categories', e);
      }
    };
    loadCats();
  }, []);

  // Listen to Real-time Collections from Firebase
  useEffect(() => {
    let unsubs = [];
    let dataLoaded = { tx: false, goals: false, bills: false, notif: false, accounts: false };

    if (user && user.householdId) {
      setLoading(true);
      const houseRef = doc(db, 'households', user.householdId);

      const checkAllLoaded = () => {
        if (dataLoaded.tx && dataLoaded.goals && dataLoaded.bills && dataLoaded.notif && dataLoaded.accounts) {
          setLoading(false);
        }
      };

      const txSub = onSnapshot(
        collection(houseRef, 'transactions'),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          data.sort((a, b) => safeDate(b.date) - safeDate(a.date));
          setTransactions(data);
          dataLoaded.tx = true;
          checkAllLoaded();
        },
        (error) => {
          console.error('Firestore transactions error:', error);
          dataLoaded.tx = true;
          checkAllLoaded();
        }
      );
      unsubs.push(txSub);

      const goalSub = onSnapshot(
        collection(houseRef, 'goals'),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          data.sort((a, b) => safeDate(b.createdAt) - safeDate(a.createdAt));
          setGoals(data);
          dataLoaded.goals = true;
          checkAllLoaded();
        },
        (error) => {
          console.error('Firestore goals error:', error);
          dataLoaded.goals = true;
          checkAllLoaded();
        }
      );
      unsubs.push(goalSub);

      const billSub = onSnapshot(
        collection(houseRef, 'bills'),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setBills(data);
          dataLoaded.bills = true;
          checkAllLoaded();
        },
        (error) => {
          console.error('Firestore bills error:', error);
          dataLoaded.bills = true;
          checkAllLoaded();
        }
      );
      unsubs.push(billSub);

      const notifSub = onSnapshot(
        collection(houseRef, 'notifications'),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          data.sort((a, b) => safeDate(b.createdAt) - safeDate(a.createdAt));
          setNotifications(data);
          dataLoaded.notif = true;
          checkAllLoaded();
        },
        (error) => {
          console.error('Firestore notifications error:', error);
          dataLoaded.notif = true;
          checkAllLoaded();
        }
      );
      unsubs.push(notifSub);

      const accountSub = onSnapshot(
        collection(houseRef, 'accounts'),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAccounts(data);
          dataLoaded.accounts = true;
          checkAllLoaded();
        },
        (error) => {
          console.error('Firestore accounts error:', error);
          dataLoaded.accounts = true;
          checkAllLoaded();
        }
      );
      unsubs.push(accountSub);

    } else {
      setTransactions([]);
      setGoals([]);
      setBills([]);
      setNotifications([]);
      setAccounts([]);
      setLoading(false);
    }

    return () => unsubs.forEach(unsub => unsub());
  }, [user]);

  // AUTO-MIGRATION: Cek semua user di rumah tangga
  useEffect(() => {
    const migrateAllUsers = async () => {
      // Ambil daftar user unik dari riwayat transaksi
      const householdUsers = [...new Set(transactions.map(tx => tx.owner))].filter(Boolean);

      if (!loading && user && householdUsers.length > 0) {
        for (const uName of householdUsers) {
          const userAccounts = (accounts || []).filter(a => a.owner === uName);
          if (userAccounts.length === 0) {
            const oldBalance = getLegacyBalance(uName);
            if (oldBalance !== 0) {
              await addAccountForUser(uName, {
                name: 'Tunai / Cash',
                type: 'cash',
                balance: oldBalance,
                icon: 'payments',
                color: '#10B981',
              });
            }
          }
        }
      }
    };
    migrateAllUsers();
  }, [loading, user?.householdId, (accounts || []).length, transactions.length]);

  // Helper untuk nambahin akun buat user tertentu (buat migrasi)
  const addAccountForUser = async (ownerName, account) => {
    if (!user || !user.householdId) return;
    try {
      const accountRef = collection(db, 'households', user.householdId, 'accounts');
      await addDoc(accountRef, { 
        ...account, 
        owner: ownerName, 
        createdAt: new Date().toISOString() 
      });
    } catch (e) {
      console.error('Failed to migrate account for ' + ownerName, e);
    }
  };

  // Fungsi lama untuk menghitung saldo dari transaksi (buat migrasi aja)
  const getLegacyBalance = (ownerFilter = 'Kita') => {
    let balance = 0;
    transactions.forEach(tx => {
      let impact = 0;
      if (ownerFilter === 'Kita') {
        impact = (tx.myContrib || 0) + (tx.partnerContrib || 0);
      } else if (ownerFilter === user?.name) {
        impact = (tx.owner === user?.name) ? (tx.myContrib || 0) : (tx.partnerContrib || 0);
      } else {
        if (tx.owner === user?.name) impact = tx.partnerContrib || 0;
        else impact = tx.myContrib || 0;
      }
      if (tx.type === 'income') balance += Number(impact);
      else if (tx.type === 'expense') balance -= Number(impact);
    });
    return balance;
  };

  const addTransaction = async (tx) => {
    if (!user || !user.householdId) return null;
    try {
      const txRef = collection(db, 'households', user.householdId, 'transactions');
      const newTx = { 
        ...tx, 
        date: tx.date || new Date().toISOString(),
        createdAt: new Date().toISOString() 
      };
      
      const docRef = await addDoc(txRef, newTx);
      
      // Update saldo akun jika terpilih
      if (tx.accountId) {
        const account = accounts.find(a => a.id === tx.accountId);
        if (account) {
          const totalAmount = Number(tx.myContrib || 0) + Number(tx.partnerContrib || 0);
          const newBalance = tx.type === 'income' 
            ? (account.balance || 0) + totalAmount 
            : (account.balance || 0) - totalAmount;
          
          await updateAccount(tx.accountId, { balance: newBalance });
        }
      }
      
      return docRef.id;
    } catch (e) {
      console.error('Failed to save transaction to Firebase', e);
      return null;
    }
  };

  const addNotification = async (notif) => {
    if (!user || !user.householdId) return;
    try {
      const notifRef = collection(db, 'households', user.householdId, 'notifications');
      await addDoc(notifRef, { ...notif, createdAt: new Date().toISOString() });
    } catch (e) {
      console.error('Failed to send notification', e);
    }
  };

  const addGoal = async (goal) => {
    if (!user || !user.householdId) return;
    try {
      const goalRef = collection(db, 'households', user.householdId, 'goals');
      // Remove any undefined fields before sending to Firestore (Firestore rejects undefined)
      const cleanGoal = Object.fromEntries(
        Object.entries(goal).filter(([, v]) => v !== undefined)
      );
      const docRef = await addDoc(goalRef, { ...cleanGoal, currentAmount: 0, createdAt: new Date().toISOString() });
      // Return the generated document ID for callers (e.g., to send a notification)
      return docRef.id;
    } catch (e) {
      console.error('Failed to save goal', e);
    }
  };

  const addBill = async (bill) => {
    if (!user || !user.householdId) return;
    try {
      const billRef = collection(db, 'households', user.householdId, 'bills');
      await addDoc(billRef, { ...bill, createdAt: new Date().toISOString() });
    } catch (e) {
      console.error('Failed to save bill', e);
    }
  };

  const updateBill = async (billId, updateData) => {
    if (!user || !user.householdId) return;
    try {
      const billRef = doc(db, 'households', user.householdId, 'bills', billId);
      await updateDoc(billRef, updateData);
    } catch (e) {
      console.error('Failed to update bill', e);
    }
  };

  const deleteBill = async (billId) => {
    if (!user || !user.householdId) return;
    try {
      const billRef = doc(db, 'households', user.householdId, 'bills', billId);
      await deleteDoc(billRef);
    } catch (e) {
      console.error('Failed to delete bill', e);
    }
  };

  const addAccount = async (account) => {
    if (!user || !user.householdId) return;
    try {
      const accountRef = collection(db, 'households', user.householdId, 'accounts');
      const docRef = await addDoc(accountRef, { 
        ...account, 
        owner: user.name, // Set pemilik otomatis ke user yang login
        createdAt: new Date().toISOString() 
      });
      return docRef.id;
    } catch (e) {
      console.error('Failed to save account', e);
    }
  };

  const updateAccount = async (accountId, updates) => {
    if (!user || !user.householdId) return;
    try {
      const accountRef = doc(db, 'households', user.householdId, 'accounts', accountId);
      await updateDoc(accountRef, updates);
    } catch (e) {
      console.error('Failed to update account', e);
    }
  };

  const deleteAccount = async (accountId) => {
    if (!user || !user.householdId) return;
    try {
      await deleteDoc(doc(db, 'households', user.householdId, 'accounts', accountId));
    } catch (e) {
      console.error('Failed to delete account', e);
    }
  };

  const addCategory = async (type, newCat) => {
    try {
      const updatedCats = {
        ...categories,
        [type]: [...categories[type], newCat]
      };
      setCategories(updatedCats);
      await AsyncStorage.setItem('@rika_cats_v2', JSON.stringify(updatedCats));
    } catch (e) {
      console.error('Failed to save category', e);
    }
  };

  const updateGoal = async (goalId, updates) => {
    if (!user || !user.householdId) return;
    try {
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );
      const goalRef = doc(db, 'households', user.householdId, 'goals', goalId);
      await updateDoc(goalRef, cleanUpdates);
    } catch (e) {
      console.error('Failed to update goal', e);
      throw e;
    }
  };

  const deleteGoal = async (goalId) => {
    if (!user || !user.householdId) return;
    try {
      await deleteDoc(doc(db, 'households', user.householdId, 'goals', goalId));
    } catch (e) {
      console.error('Failed to delete goal', e);
      throw e;
    }
  };

  const getBalance = (ownerFilter = 'Kita') => {
    let balance = 0;
    const safeAccounts = accounts || [];
    
    safeAccounts.forEach(acc => {
      if (ownerFilter === 'Kita') {
        balance += (acc.balance || 0);
      } else if (ownerFilter === acc.owner) {
        balance += (acc.balance || 0);
      }
    });
    
    return balance;
  };

  return (
    <DataContext.Provider value={{
      transactions, addTransaction, getBalance,
      goals, addGoal, updateGoal, deleteGoal,
      bills, addBill, updateBill, deleteBill,
      accounts, addAccount, updateAccount, deleteAccount,
      notifications, addNotification,
      categories, addCategory,
      loading
    }}>
      {children}
    </DataContext.Provider>
  );
};
