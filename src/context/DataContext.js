import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { db } from '../config/firebase';
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

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

    // Fail-safe: Paksa loading berhenti setelah 5 detik biar nggak blank selamanya
    const failSafe = setTimeout(() => {
      setLoading(false);
    }, 5000);

    if (user && user.householdId) {
      setLoading(true);
      const houseRef = doc(db, 'households', user.householdId);

      const checkAllLoaded = () => {
        if (dataLoaded.tx && dataLoaded.goals && dataLoaded.bills && dataLoaded.notif && dataLoaded.accounts) {
          setLoading(false);
          clearTimeout(failSafe);
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

    return () => {
      unsubs.forEach(unsub => unsub());
      clearTimeout(failSafe);
    };
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

  const deleteTransaction = async (txId) => {
    if (!user || !user.householdId) return;
    try {
      const tx = transactions.find(t => t.id === txId);
      if (!tx) return;

      if (tx.type === 'transfer') {
        const fromAcc = accounts.find(a => a.id === tx.fromAccountId);
        const toAcc = accounts.find(a => a.id === tx.toAccountId);
        
        if (fromAcc) {
          await updateAccount(tx.fromAccountId, { balance: (fromAcc.balance || 0) + (tx.amount || 0) });
        }
        if (toAcc) {
          await updateAccount(tx.toAccountId, { balance: (toAcc.balance || 0) - (tx.amount || 0) });
        }
      } else if (tx.accountId) {
        const account = accounts.find(a => a.id === tx.accountId);
        if (account) {
          const totalAmount = Number(tx.myContrib || 0) + Number(tx.partnerContrib || 0);
          const newBalance = tx.type === 'income' 
            ? (account.balance || 0) - totalAmount 
            : (account.balance || 0) + totalAmount;
          await updateAccount(tx.accountId, { balance: newBalance });
        }
      }

      const txRef = doc(db, 'households', user.householdId, 'transactions', txId);
      await deleteDoc(txRef);
    } catch (e) {
      console.error('Failed to delete transaction', e);
    }
  };

  const updateTransaction = async (txId, updateData) => {
    if (!user || !user.householdId) return;
    
    try {
      const txRef = doc(db, 'households', user.householdId, 'transactions', txId);
      const docSnap = await getDoc(txRef);
      
      if (!docSnap.exists()) {
        Alert.alert('Error', 'Data transaksi lama tidak ditemukan di server.');
        throw new Error('Old transaction not found');
      }

      const oldTx = { id: docSnap.id, ...docSnap.data() };
      
      // Alert buat bukti kalau angkanya bener
      // Alert.alert('Debug', 'Simpan nominal baru: ' + updateData.amount);

      // Gunakan map saldo sementara agar perhitungan tidak mengandalkan mutasi state langsung
      const balanceMap = {};
      accounts.forEach(acc => {
        balanceMap[acc.id] = Number(acc.balance) || 0;
      });

      // 1. Revert saldo lama (Kembalikan ke kondisi sebelum transaksi ini ada)
      if (oldTx.type === 'transfer') {
        if (balanceMap[oldTx.fromAccountId] !== undefined) {
          balanceMap[oldTx.fromAccountId] += (oldTx.amount || 0);
        }
        if (balanceMap[oldTx.toAccountId] !== undefined) {
          balanceMap[oldTx.toAccountId] -= (oldTx.amount || 0);
        }
      } else if (oldTx.accountId) {
        if (balanceMap[oldTx.accountId] !== undefined) {
          const oldTotal = Number(oldTx.myContrib || 0) + Number(oldTx.partnerContrib || 0);
          if (oldTx.type === 'income') {
            balanceMap[oldTx.accountId] -= oldTotal;
          } else {
            balanceMap[oldTx.accountId] += oldTotal;
          }
        }
      }

      // 2. Terapkan saldo baru
      const finalType = updateData.type || oldTx.type;
      const finalAmount = updateData.amount !== undefined ? Number(updateData.amount) : (oldTx.amount || 0);

      // 3. Dorong perubahan saldo ke Firestore
      if (finalType === 'transfer') {
        const finalFromId = updateData.fromAccountId || oldTx.fromAccountId;
        const finalToId = updateData.toAccountId || oldTx.toAccountId;
        
        if (balanceMap[finalFromId] !== undefined) balanceMap[finalFromId] -= finalAmount;
        if (balanceMap[finalToId] !== undefined) balanceMap[finalToId] += finalAmount;

        // Update kedua dompet yang terlibat transfer
        await updateAccount(finalFromId, { balance: Number(balanceMap[finalFromId]) || 0 });
        await updateAccount(finalToId, { balance: Number(balanceMap[finalToId]) || 0 });
      } else {
        const finalAccountId = updateData.accountId || oldTx.accountId;
        if (finalAccountId && balanceMap[finalAccountId] !== undefined) {
          const newMy = updateData.myContrib !== undefined ? updateData.myContrib : (oldTx.myContrib || 0);
          const newPar = updateData.partnerContrib !== undefined ? updateData.partnerContrib : (oldTx.partnerContrib || 0);
          const newTotal = Number(newMy) + Number(newPar);

          if (finalType === 'income') {
            balanceMap[finalAccountId] += newTotal;
          } else {
            balanceMap[finalAccountId] -= newTotal;
          }
          await updateAccount(finalAccountId, { balance: Number(balanceMap[finalAccountId]) || 0 });
        }
      }

      // 4. Update dokumen transaksi itu sendiri
      const cleanUpdateData = {};
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          cleanUpdateData[key] = updateData[key];
        }
      });

      await updateDoc(txRef, { ...cleanUpdateData, updatedAt: new Date().toISOString() });
      console.log('Transaction updated successfully:', txId);
    } catch (e) {
      console.error('Failed to update transaction', e);
      throw e; // Lempar error biar ditangkep sama Alert di layar
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
      // Remove undefined fields
      const cleanData = Object.fromEntries(
        Object.entries(updateData).filter(([, v]) => v !== undefined)
      );
      await updateDoc(billRef, cleanData);
    } catch (e) {
      console.error('Failed to update bill', e);
    }
  };

  const payBill = async (billId, accountId) => {
    if (!user || !user.householdId) return;
    try {
      const bill = bills.find(b => b.id === billId);
      if (!bill) return;

      const numAmount = Number(bill.amount);
      const myName = user.name || 'User';

      // 1. Buat Transaksi Pengeluaran
      await addTransaction({
        name: `Bayar Tagihan: ${bill.name}`,
        amount: numAmount,
        myContrib: numAmount,
        partnerContrib: 0,
        type: 'expense',
        category: 'Tagihan',
        icon: bill.icon || 'receipt-long',
        color: bill.color || '#6366F1',
        accountId: accountId,
        owner: myName,
        date: new Date().toISOString(),
      });

      // 2. Update Status Tagihan
      const billRef = doc(db, 'households', user.householdId, 'bills', billId);
      
      if (bill.type === 'recurring') {
        // Geser dueDate ke bulan depan
        const oldDate = new Date(bill.dueDate);
        const nextDate = new Date(oldDate.setMonth(oldDate.getMonth() + 1)).toISOString();
        await updateDoc(billRef, { 
          dueDate: nextDate,
          lastPaidAt: new Date().toISOString()
        });
      } else if (bill.type === 'installment') {
        const nextTenor = (bill.currentTenor || 1) + 1;
        if (nextTenor > (bill.totalTenor || 1)) {
          // Lunas permanen -> Hapus
          await deleteDoc(billRef);
        } else {
          // Geser ke tenor berikutnya
          const oldDate = new Date(bill.dueDate);
          const nextDate = new Date(oldDate.setMonth(oldDate.getMonth() + 1)).toISOString();
          await updateDoc(billRef, { 
            currentTenor: nextTenor,
            dueDate: nextDate,
            lastPaidAt: new Date().toISOString()
          });
        }
      } else {
        // Sekali bayar -> Hapus
        await deleteDoc(billRef);
      }

      // 3. Notifikasi
      await addNotification({
        title: 'Tagihan Terbayar',
        body: `${myName} telah membayar tagihan "${bill.name}" sebesar Rp ${new Intl.NumberFormat('id-ID').format(numAmount)}.`,
        icon: 'check-circle',
        color: 'primary',
        sender: myName,
        targetType: 'bill',
      });

    } catch (e) {
      console.error('Failed to pay bill', e);
      throw e;
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
      setCategories(prev => {
        const updatedCats = {
          ...prev,
          [type]: [...prev[type], newCat]
        };
        AsyncStorage.setItem('@rika_cats_v2', JSON.stringify(updatedCats));
        return updatedCats;
      });
    } catch (e) {
      console.error('Failed to save category', e);
    }
  };

  const updateCategory = async (type, oldName, newCat) => {
    try {
      setCategories(prev => {
        const updatedCats = { ...prev };
        const idx = updatedCats[type].findIndex(c => c.name === oldName);
        if (idx !== -1) {
          updatedCats[type][idx] = newCat;
          AsyncStorage.setItem('@rika_cats_v2', JSON.stringify(updatedCats));
          return updatedCats;
        }
        return prev;
      });
    } catch (e) {
      console.error('Failed to update category', e);
    }
  };

  const deleteCategory = async (type, catName) => {
    try {
      setCategories(prev => {
        const updatedCats = {
          ...prev,
          [type]: prev[type].filter(c => c.name !== catName)
        };
        AsyncStorage.setItem('@rika_cats_v2', JSON.stringify(updatedCats));
        return updatedCats;
      });
    } catch (e) {
      console.error('Failed to delete category', e);
    }
  };

  const addTransfer = async (fromId, toId, amount) => {
    if (!user || !user.householdId) return;
    try {
      const numAmount = Number(amount);
      const fromAcc = accounts.find(a => a.id === fromId);
      const toAcc = accounts.find(a => a.id === toId);

      if (!fromAcc || !toAcc) return;

      // 1. Catat transaksi transfer (agar muncul di riwayat)
      const txRef = collection(db, 'households', user.householdId, 'transactions');
      const docRef = await addDoc(txRef, {
        name: `Transfer: ${fromAcc.name} ➔ ${toAcc.name}`,
        amount: numAmount,
        type: 'transfer',
        category: 'Transfer',
        icon: 'swap-horiz',
        owner: user.name,
        fromAccountId: fromId,
        toAccountId: toId,
        myContrib: numAmount,
        partnerContrib: 0,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      // 2. Update saldo pengirim
      const fromRef = doc(db, 'households', user.householdId, 'accounts', fromId);
      await updateDoc(fromRef, { balance: (fromAcc.balance || 0) - numAmount });

      // 3. Update saldo penerima
      const toRef = doc(db, 'households', user.householdId, 'accounts', toId);
      await updateDoc(toRef, { balance: (toAcc.balance || 0) + numAmount });

      return docRef.id;

    } catch (e) {
      console.error('Failed to process transfer', e);
      throw e;
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
      transactions, addTransaction, updateTransaction, deleteTransaction, addTransfer, getBalance,
      goals, addGoal, updateGoal, deleteGoal,
      bills, addBill, updateBill, deleteBill, payBill,
      accounts, addAccount, updateAccount, deleteAccount,
      notifications, addNotification,
      categories, addCategory, updateCategory, deleteCategory,
      loading
    }}>
      {children}
    </DataContext.Provider>
  );
};
