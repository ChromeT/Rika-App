import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { name: 'Ayip', householdId: 'X8P2K9' }
  const [householdUsers, setHouseholdUsers] = useState([]); // ['Ayip', 'Ika']
  const [householdAvatars, setHouseholdAvatars] = useState({});
  const [customColors, setCustomColors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [avatar, setAvatar] = useState('person');
  const [lastReadNotif, setLastReadNotif] = useState(0);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('@rika_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        const storedAvatar = await AsyncStorage.getItem('@rika_avatar');
        if (storedAvatar) setAvatar(storedAvatar);
      } catch (e) {
        console.error('Failed to load user', e);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Listen to Household Document changes
  useEffect(() => {
    let unsubscribe = () => {};
    if (user && user.householdId) {
      const docRef = doc(db, 'households', user.householdId);
      unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setHouseholdUsers(data.users || []);
          if (data.avatars) {
            setHouseholdAvatars(data.avatars);
          }
          if (data.customColors) {
            setCustomColors(data.customColors);
          }
          if (data.lastReadNotif && data.lastReadNotif[user.name] !== undefined) {
            setLastReadNotif(data.lastReadNotif[user.name]);
          }
        }
      }, (error) => {
        console.error("Error listening to household:", error);
      });
    } else {
      setHouseholdUsers([]);
      setLastReadNotif(0);
    }
    return () => unsubscribe();
  }, [user]);

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createHousehold = async (userName) => {
    const code = generateCode();
    try {
      await setDoc(doc(db, 'households', code), {
        users: [userName],
        createdAt: new Date().toISOString()
      });
      const userData = { name: userName, householdId: code };
      return { success: true, code, userData };
    } catch (error) {
      console.error('Error creating household', error);
      return { success: false, message: error.message };
    }
  };

  const loginWithData = async (userData) => {
    setUser(userData);
    await AsyncStorage.setItem('@rika_user', JSON.stringify(userData));
  };

  const joinHousehold = async (userName, code) => {
    const upperCode = code.toUpperCase();
    try {
      const docRef = doc(db, 'households', upperCode);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const currentUsers = docSnap.data().users || [];
        
        // Cek apakah pengguna mencoba masuk kembali ke akun lama
        const existingUserIndex = currentUsers.findIndex(u => u.toLowerCase() === userName.toLowerCase());
        
        if (existingUserIndex !== -1) {
          // Re-login untuk device baru
          const userData = { name: currentUsers[existingUserIndex], householdId: upperCode };
          await loginWithData(userData);
          
          // Restore avatar if exists
          const data = docSnap.data();
          if (data.avatars && data.avatars[userData.name]) {
            setAvatar(data.avatars[userData.name]);
            await AsyncStorage.setItem('@rika_avatar', data.avatars[userData.name]);
          }
          
          return { success: true };
        }

        if (currentUsers.length >= 2) {
          return { success: false, message: 'Ruang finansial ini sudah penuh (maksimal 2 orang).' };
        }
        await updateDoc(docRef, {
          users: arrayUnion(userName)
        });
        const userData = { name: userName, householdId: upperCode };
        await loginWithData(userData);
        return { success: true };
      } else {
        return { success: false, message: 'Kode tidak ditemukan di database.' };
      }
    } catch (error) {
      console.error('Error joining household', error);
      return { success: false, message: error.message };
    }
  };

  const logout = async () => {
    setUser(null);
    setHouseholdUsers([]);
    await AsyncStorage.removeItem('@rika_user');
  };

  const updateAvatar = async (iconName) => {
    setAvatar(iconName);
    await AsyncStorage.setItem('@rika_avatar', iconName);
    if (user && user.householdId) {
      try {
        await updateDoc(doc(db, 'households', user.householdId), {
          [`avatars.${user.name}`]: iconName
        });
      } catch (e) {
        console.error('Failed to sync avatar to database', e);
      }
    }
  };

  const markNotificationsAsRead = async (timestamp) => {
    setLastReadNotif(timestamp);
    if (user && user.householdId) {
      try {
        await updateDoc(doc(db, 'households', user.householdId), {
          [`lastReadNotif.${user.name}`]: timestamp
        });
      } catch (e) {
        console.error('Failed to sync lastReadNotif', e);
      }
    }
  };

  const addCustomColor = async (colorHex) => {
    if (user && user.householdId) {
      try {
        await updateDoc(doc(db, 'households', user.householdId), {
          customColors: arrayUnion(colorHex)
        });
      } catch (e) {
        console.error('Failed to sync custom color to database', e);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, householdUsers, householdAvatars, customColors, addCustomColor, loading, createHousehold, joinHousehold, loginWithData, logout, avatar, updateAvatar, lastReadNotif, markNotificationsAsRead }}>
      {children}
    </AuthContext.Provider>
  );
};
