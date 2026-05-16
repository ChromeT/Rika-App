import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { db } from '../config/firebase';
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, getDoc, deleteField, arrayUnion, query, orderBy, limit } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { formatMoney } from '../utils/formatUtils';

// Helper to safely parse dates
const safeDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date(0) : d;
};

export const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const { user, householdUsers, householdData } = useContext(AuthContext);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [bills, setBills] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [categories, setCategories] = useState({ expense: [], income: [] });
  const [loading, setLoading] = useState(true);

  // Load & Sync Categories with Cloud
  useEffect(() => {
    const syncCats = async () => {
      // 1. Jika di Cloud (Firestore) sudah ada, pakai itu
      if (householdData && householdData.categories) {
        setCategories(householdData.categories);
        // Backup ke lokal buat offline
        await AsyncStorage.setItem('@rika_cats_v2', JSON.stringify(householdData.categories));
        return;
      }

      // 2. Jika di Cloud belum ada, cek lokal (Migrasi)
      try {
        const storedCats = await AsyncStorage.getItem('@rika_cats_v2');
        let catsToUse = null;

        if (storedCats) {
          catsToUse = JSON.parse(storedCats);
        } else {
          // Default awal
          catsToUse = {
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
          await AsyncStorage.setItem('@rika_cats_v2', JSON.stringify(catsToUse));
        }

        setCategories(catsToUse);

        // 3. Jika sudah login tapi di Firestore belum ada, upload (Migrasi ke Cloud)
        if (user && user.householdId && !householdData?.categories) {
          console.log('Migrating categories to Cloud...');
          await updateDoc(doc(db, 'households', user.householdId), {
            categories: catsToUse
          });
        }
      } catch (e) {
        console.error('Failed to sync categories', e);
      }
    };

    syncCats();
  }, [householdData?.categories, user?.householdId]);

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

      const txQuery = query(
        collection(houseRef, 'transactions'),
        orderBy('date', 'desc'),
        limit(150)
      );

      const txSub = onSnapshot(
        txQuery,
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

      const notifQuery = query(
        collection(houseRef, 'notifications'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const notifSub = onSnapshot(
        notifQuery,
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
      
      // Update saldo akun secara cerdas
      if (tx.accountId) {
        const selectedAcc = accounts.find(a => a.id === tx.accountId);
        if (selectedAcc) {
          // KASUS 1: Menggunakan Dompet Bersama (Potong total langsung)
          if (selectedAcc.owner === 'Bersama') {
            const total = Number(tx.myContrib || 0) + Number(tx.partnerContrib || 0);
            const newBal = tx.type === 'income' ? (selectedAcc.balance || 0) + total : (selectedAcc.balance || 0) - total;
            await updateAccount(tx.accountId, { balance: newBal });
            // Jika dompet bersama, status langsung completed
            await updateDoc(docRef, { status: 'completed' });
          } 
          // KASUS 2: Split (Uang Bersama/Patungan) menggunakan Dompet Pribadi
          else if (tx.isPatungan || tx.isJoint) {
            const myPortion = Number(tx.myContrib || 0);
            const newMyBal = tx.type === 'income' ? (selectedAcc.balance || 0) + myPortion : (selectedAcc.balance || 0) - myPortion;
            await updateAccount(tx.accountId, { balance: newMyBal });

            // Set status jadi pending_partner jika porsi pasangan > 0
            if (Number(tx.partnerContrib || 0) > 0) {
              await updateDoc(docRef, { status: 'pending_partner' });
              
              // KIRIM NOTIFIKASI (Akan memicu Push HP otomatis via addNotification)
              // Helper to format money inside DataContext if needed or use raw
              const formattedPart = Number(tx.partnerContrib || 0).toLocaleString('id-ID');
              const splitType = tx.isJoint ? 'Bagi rata 50:50' : 'Patungan Custom';

              await addNotification({
                title: 'Butuh Konfirmasi!',
                message: `${user?.name} butuh konfirmasi untuk bayar ${tx.category} [${splitType} • Rp ${formatMoney(tx.partnerContrib)}]`,
                type: 'split_pending',
                txId: docRef.id,
                sender: user?.name
              });
            } else {
              await updateDoc(docRef, { status: 'completed' });
            }
          }
          // KASUS 3: Transaksi Pribadi Biasa
          else {
            const total = Number(tx.myContrib || 0) + Number(tx.partnerContrib || 0);
            const newBal = tx.type === 'income' ? (selectedAcc.balance || 0) + total : (selectedAcc.balance || 0) - total;
            await updateAccount(tx.accountId, { balance: newBal });
            await updateDoc(docRef, { status: 'completed' });
          }
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
          const isSplit = tx.isPatungan || tx.isJoint;
          if (account.owner === 'Bersama' || !isSplit) {
            // Revert total dari satu dompet
            const totalAmount = Number(tx.myContrib || 0) + Number(tx.partnerContrib || 0);
            const newBalance = tx.type === 'income' ? (account.balance || 0) - totalAmount : (account.balance || 0) + totalAmount;
            await updateAccount(tx.accountId, { balance: newBalance });
          } else {
            // Revert porsi masing-masing
            const myPortion = Number(tx.myContrib || 0);
            const newMyBal = tx.type === 'income' ? (account.balance || 0) - myPortion : (account.balance || 0) + myPortion;
            await updateAccount(tx.accountId, { balance: newMyBal });

            if (tx.status === 'completed') {
              const partnerPortion = Number(tx.partnerContrib || 0);
              const pAccId = tx.partnerAccountId;
              const partnerAcc = accounts.find(a => pAccId ? a.id === pAccId : (a.owner !== user?.name && a.owner !== 'Bersama'));
              if (partnerAcc) {
                const newPartBal = tx.type === 'income' ? (partnerAcc.balance || 0) - partnerPortion : (partnerAcc.balance || 0) + partnerPortion;
                await updateAccount(partnerAcc.id, { balance: newPartBal });
              }
            }
          }
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
        const oldAcc = accounts.find(a => a.id === oldTx.accountId);
        if (oldAcc) {
          const wasSplit = oldTx.isPatungan || oldTx.isJoint;
          if (oldAcc.owner === 'Bersama' || !wasSplit) {
            const oldTotal = Number(oldTx.myContrib || 0) + Number(oldTx.partnerContrib || 0);
            balanceMap[oldTx.accountId] = oldTx.type === 'income' ? balanceMap[oldTx.accountId] - oldTotal : balanceMap[oldTx.accountId] + oldTotal;
          } else {
            const oldMy = Number(oldTx.myContrib || 0);
            balanceMap[oldTx.accountId] = oldTx.type === 'income' ? balanceMap[oldTx.accountId] - oldMy : balanceMap[oldTx.accountId] + oldMy;

            if (oldTx.status === 'completed') {
              const oldPar = Number(oldTx.partnerContrib || 0);
              const pAccId = oldTx.partnerAccountId;
              const partnerAcc = accounts.find(a => pAccId ? a.id === pAccId : (a.owner !== user?.name && a.owner !== 'Bersama'));
              if (partnerAcc && balanceMap[partnerAcc.id] !== undefined) {
                balanceMap[partnerAcc.id] = oldTx.type === 'income' ? balanceMap[partnerAcc.id] - oldPar : balanceMap[partnerAcc.id] + oldPar;
              }
            }
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

      // Tentukan status baru
      let newStatus = 'completed';
      const finalAcc = accounts.find(a => a.id === (updateData.accountId || oldTx.accountId));
      const finalIsSplit = updateData.isPatungan || updateData.isJoint || oldTx.isPatungan || oldTx.isJoint;
      const finalPartnerContrib = updateData.partnerContrib !== undefined ? Number(updateData.partnerContrib) : Number(oldTx.partnerContrib || 0);

      if (finalAcc && finalAcc.owner !== 'Bersama' && finalIsSplit && finalPartnerContrib > 0) {
        newStatus = 'pending_partner';
        // Reset partnerAccountId karena butuh konfirmasi ulang ke dompet baru
        cleanUpdateData.partnerAccountId = deleteField();
      }

      await updateDoc(txRef, { ...cleanUpdateData, status: newStatus, updatedAt: new Date().toISOString() });
      
      // 5. Dorong semua perubahan saldo map ke Firestore
      for (const accId in balanceMap) {
        const currentAcc = accounts.find(a => a.id === accId);
        if (currentAcc && currentAcc.balance !== balanceMap[accId]) {
          await updateAccount(accId, { balance: balanceMap[accId] });
        }
      }
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
      await addDoc(notifRef, {
        ...notif,
        readBy: [],
        createdAt: new Date().toISOString()
      });
      
      // OTOMATIS KIRIM PUSH KE RIKA (kecuali jika notif ini untuk diri sendiri)
      const partnerName = householdUsers.find(u => u !== user?.name);
      if (partnerName) {
        sendPushNotification(partnerName, notif.title || 'Rika App', notif.message || 'Ada kabar baru buat kamu!');
      }
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
      const docRef = await addDoc(billRef, { ...bill, createdAt: new Date().toISOString() });
      return docRef.id;
    } catch (e) {
      console.error('Failed to save bill', e);
      return null;
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
      const newTxId = await addTransaction({
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
        billId: billId, // PENTING: Untuk highlight di riwayat
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

      // 3. Notifikasi (Menggunakan format transaksi agar highlight 100% akurat)
      await addNotification({
        title: 'Tagihan Terbayar',
        body: `${myName} telah membayar tagihan "${bill.name}" sebesar Rp ${formatMoney(numAmount)}.`,
        icon: 'check-circle',
        color: 'primary',
        sender: myName,
        targetType: 'transaction', 
        targetId: newTxId, 
        targetName: `Bayar Tagihan: ${bill.name}`, 
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
      // CEK DUPLIKAT: Pastikan user ini tidak punya dompet dengan nama yang sama
      const isDuplicate = accounts.some(acc => 
        acc.owner === user.name && 
        acc.name.toLowerCase().trim() === account.name.toLowerCase().trim()
      );
      
      if (isDuplicate) {
        throw new Error('DUPLICATE_NAME');
      }

      const accountRef = collection(db, 'households', user.householdId, 'accounts');
      const docRef = await addDoc(accountRef, {
        ...account,
        owner: user.name, // Set pemilik otomatis ke user yang login
        createdAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (e) {
      console.error('Failed to save account', e);
      throw e; // Rethrow to handle in UI
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
      
      // Update Local State & Storage
      setCategories(updatedCats);
      await AsyncStorage.setItem('@rika_cats_v2', JSON.stringify(updatedCats));

      // Update Cloud
      if (user && user.householdId) {
        await updateDoc(doc(db, 'households', user.householdId), {
          categories: updatedCats
        });
      }
    } catch (e) {
      console.error('Failed to save category', e);
    }
  };

  const updateCategory = async (type, oldName, newCat) => {
    try {
      const updatedCats = { ...categories };
      const idx = updatedCats[type].findIndex(c => c.name === oldName);
      if (idx !== -1) {
        updatedCats[type][idx] = newCat;
        
        // Update Local State & Storage
        setCategories(updatedCats);
        await AsyncStorage.setItem('@rika_cats_v2', JSON.stringify(updatedCats));

        // Update Cloud
        if (user && user.householdId) {
          await updateDoc(doc(db, 'households', user.householdId), {
            categories: updatedCats
          });
        }
      }
    } catch (e) {
      console.error('Failed to update category', e);
    }
  };

  const deleteCategory = async (type, catName) => {
    try {
      const updatedCats = {
        ...categories,
        [type]: categories[type].filter(c => c.name !== catName)
      };

      // Update Local State & Storage
      setCategories(updatedCats);
      await AsyncStorage.setItem('@rika_cats_v2', JSON.stringify(updatedCats));

      // Update Cloud
      if (user && user.householdId) {
        await updateDoc(doc(db, 'households', user.householdId), {
          categories: updatedCats
        });
      }
    } catch (e) {
      console.error('Failed to delete category', e);
    }
  };

  const confirmSplitTransaction = async (txId, partnerAccountId) => {
    if (!user || !user.householdId) return;
    try {
      const tx = transactions.find(t => t.id === txId);
      const acc = accounts.find(a => a.id === partnerAccountId);
      if (!tx || !acc) return;

      const partnerPortion = Number(tx.partnerContrib || 0);
      const newBalance = tx.type === 'income' 
        ? (acc.balance || 0) + partnerPortion 
        : (acc.balance || 0) - partnerPortion;

      // 1. Potong saldo dompet yang dipilih pasangan
      await updateAccount(partnerAccountId, { balance: newBalance });

      // 2. Update status transaksi jadi lunas & simpan
      await updateDoc(doc(db, 'households', user.householdId, 'transactions', tx.id), {
        status: 'completed',
        partnerAccountId: partnerAccountId,
        updatedAt: new Date().toISOString()
      });

      // 3. Kirim notifikasi balik (Akan memicu push otomatis)
      await addNotification({
        title: 'Patungan Disetujui',
        body: `${user.name} telah menyetujui patungan "${tx.name}" menggunakan dompet ${acc.name}.`,
        icon: 'check-circle',
        color: 'success',
        sender: user.name,
        targetType: 'transaction',
        targetId: txId
      });
    } catch (e) {
      console.error('Failed to confirm split', e);
      throw e;
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

  const sendPushNotification = async (targetUserName, title, body) => {
    if (!householdData || !householdData.fcmTokens) return;
    const targetToken = householdData.fcmTokens[targetUserName];
    if (!targetToken) {
      console.log('No FCM Token found for', targetUserName);
      return;
    }

    try {
      // Panggil API Route Vercel kita
      // PENTING: Pake URL absolut kalau buat aplikasi native/Android
      const API_URL = 'https://rika-app-omega.vercel.app'; 
      const response = await fetch(`${API_URL}/api/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: targetToken,
          title: title,
          body: body,
          data: {
            click_action: '/',
            type: 'notification'
          }
        }),
      });

      const result = await response.json();
      if (!result.success) {
        console.error('Push API Error:', result.error);
      }
    } catch (error) {
      console.error('Failed to send push notification via API:', error);
    }
  };

  const markSingleNotifAsRead = async (notifId) => {
    if (!user || !user.householdId || !notifId) return;
    try {
      const notifRef = doc(db, 'households', user.householdId, 'notifications', notifId);
      await updateDoc(notifRef, {
        readBy: arrayUnion(user.name)
      });
    } catch (e) {
      console.error('Failed to mark single notif as read', e);
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!user || !user.householdId) return;
    try {
      const unread = notifications.filter(n => !n.readBy?.includes(user?.name));
      if (unread.length === 0) return;
      
      const batchPromises = unread.map(n => {
        const notifRef = doc(db, 'households', user.householdId, 'notifications', n.id);
        return updateDoc(notifRef, {
          readBy: arrayUnion(user.name)
        });
      });
      await Promise.all(batchPromises);
    } catch (e) {
      console.error('Failed to mark all as read', e);
    }
  };

  const migrateUserData = async (oldName, newName) => {
    if (!oldName || !newName || oldName === newName || !user?.householdId) return;
    const houseId = user.householdId;
    try {
      for (const acc of accounts) {
        if (acc.owner === oldName) await updateDoc(doc(db, 'households', houseId, 'accounts', acc.id), { owner: newName });
      }
      for (const tx of transactions) {
        if (tx.owner === oldName) await updateDoc(doc(db, 'households', houseId, 'transactions', tx.id), { owner: newName });
      }
      for (const goal of goals) {
        let nUpdate = false;
        let uData = {};
        if (goal.owner === oldName) { uData.owner = newName; nUpdate = true; }
        if (Array.isArray(goal.memories)) {
          const nm = goal.memories.map(m => m.addedBy === oldName ? { ...m, addedBy: newName } : m);
          if (JSON.stringify(nm) !== JSON.stringify(goal.memories)) { uData.memories = nm; nUpdate = true; }
        }
        if (nUpdate) await updateDoc(doc(db, 'households', houseId, 'goals', goal.id), uData);
      }
      console.log('[Migration] Success!');
    } catch (e) { console.error('[Migration] Failed:', e); }
  };

  const forceCleanHistoricalData = async (correctName) => {
    if (!correctName || !user?.householdId) return;
    const houseId = user.householdId;
    const norm = correctName.toLowerCase().trim();
    const isMatch = (v) => v && (v.toLowerCase().trim() === norm || v.toLowerCase().trim().includes(norm) || norm.includes(v.toLowerCase().trim()));
    try {
      setLoading(true);
      console.log('[CleanUp] Starting Wallets...');
      for (const acc of accounts) {
        if (acc.owner !== 'Bersama' && isMatch(acc.owner) && acc.owner !== correctName) {
          console.log(`[CleanUp] Updating Wallet: ${acc.name} (${acc.owner} -> ${correctName})`);
          await updateDoc(doc(db, 'households', houseId, 'accounts', acc.id), { owner: correctName });
        }
      }
      
      console.log('[CleanUp] Starting Transactions...');
      for (const tx of transactions) {
        if (isMatch(tx.owner) && tx.owner !== correctName) {
          console.log(`[CleanUp] Updating Transaction: ${tx.name} (${tx.owner} -> ${correctName})`);
          await updateDoc(doc(db, 'households', houseId, 'transactions', tx.id), { owner: correctName });
        }
      }

      console.log('[CleanUp] Starting Goals...');
      for (const goal of goals) {
        let nUpdate = false;
        let uData = {};
        if (isMatch(goal.owner) && goal.owner !== correctName) { 
          console.log(`[CleanUp] Updating Goal Owner: ${goal.title} (${goal.owner} -> ${correctName})`);
          uData.owner = correctName; 
          nUpdate = true; 
        }
        if (Array.isArray(goal.memories)) {
          const nm = goal.memories.map(m => isMatch(m.addedBy) ? { ...m, addedBy: correctName } : m);
          if (JSON.stringify(nm) !== JSON.stringify(goal.memories)) { 
            console.log(`[CleanUp] Updating Memories in: ${goal.title}`);
            uData.memories = nm; 
            nUpdate = true; 
          }
        }
        if (nUpdate) await updateDoc(doc(db, 'households', houseId, 'goals', goal.id), uData);
      }
      console.log('[CleanUp] DONE!');
      Alert.alert('Berhasil', 'Data kamu sudah dibersihkan!');
    } catch (e) { 
      console.error('[CleanUp] CRITICAL ERROR:', e); 
      Alert.alert('Error', 'Gagal membersihkan data: ' + e.message);
    } finally { 
      setLoading(false); 
    }
  };

  const markGoalAchieved = async (goalId) => {
    if (!user || !user.householdId) return;
    try {
      const goalRef = doc(db, 'households', user.householdId, 'goals', goalId);
      await updateDoc(goalRef, { 
        status: 'achieved', 
        achievedAt: new Date().toISOString() 
      });
    } catch (e) {
      console.error('Failed to mark goal as achieved', e);
    }
  };

  return (
    <DataContext.Provider value={{
      transactions, addTransaction, updateTransaction, deleteTransaction, addTransfer, getBalance, confirmSplitTransaction,
      goals, addGoal, updateGoal, deleteGoal, markGoalAchieved,
      bills, addBill, updateBill, deleteBill, payBill,
      accounts, addAccount, updateAccount, deleteAccount,
      notifications, addNotification, sendPushNotification, markSingleNotifAsRead, markAllNotificationsAsRead,
      categories, addCategory, updateCategory, deleteCategory, migrateUserData, forceCleanHistoricalData,
      loading
    }}>
      {children}
    </DataContext.Provider>
  );
};
