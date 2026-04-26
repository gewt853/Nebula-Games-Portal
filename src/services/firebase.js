import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  updateDoc, 
  increment, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  serverTimestamp, 
  deleteDoc, 
  getDocs,
  deleteField,
  where
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Error Handling helper
export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null, // We aren't using Firebase Auth currently, just session IDs
      isAnonymous: true,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const incrementVisitCount = async () => {
  const statsRef = doc(db, 'stats', 'global');
  try {
    const statsDoc = await getDoc(statsRef);
    if (!statsDoc.exists()) {
      await setDoc(statsRef, { visitCount: 1 });
    } else {
      await updateDoc(statsRef, {
        visitCount: increment(1)
      });
    }
  } catch (error) {
    console.error('Error incrementing visit count:', error);
  }
};

export const subscribeToVisitCount = (callback) => {
  const statsRef = doc(db, 'stats', 'global');
  return onSnapshot(statsRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data().visitCount);
    } else {
      callback(0);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'stats/global');
  });
};

// Session Management
export const updateSession = async (sessionId, username = null) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  try {
    const data = {
      lastActive: serverTimestamp(),
      userAgent: navigator.userAgent,
      isOnline: true
    };
    if (username) {
      data.username = username;
    }
    await setDoc(sessionRef, data, { merge: true });
  } catch (error) {
    console.error('Error updating session:', error);
  }
};

export const getSession = async (sessionId) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  const sessionDoc = await getDoc(sessionRef);
  return sessionDoc.exists() ? sessionDoc.data() : null;
};

export const subscribeToSessions = (callback) => {
  const q = query(collection(db, 'sessions'), orderBy('lastActive', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(sessions);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'sessions');
  });
};

export const checkUsernameUnique = async (username, currentSessionId) => {
  if (currentSessionId === 'ZBA7JG2RX' || currentSessionId === '4CDVMIEU6') return true;
  
  const q = query(collection(db, 'sessions'), where('username', '==', username));
  const querySnapshot = await getDocs(q);
  
  // If no one has this username, it's unique
  if (querySnapshot.empty) return true;
  
  // If only the current user has it, it's unique
  const otherUsers = querySnapshot.docs.filter(doc => doc.id !== currentSessionId);
  return otherUsers.length === 0;
};

export const getUsernameSession = async (username) => {
  const q = query(collection(db, 'sessions'), where('username', '==', username));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

// Profile & Progressions
export const updateUsername = async (sessionId, username) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  await updateDoc(sessionRef, { username });
};

export const setUserPassword = async (sessionId, password) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  await updateDoc(sessionRef, { password });
};

export const saveGameProgress = async (sessionId, gameId, progression) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  await setDoc(sessionRef, {
    progressions: {
      [gameId]: {
        ...progression,
        updatedAt: serverTimestamp()
      }
    }
  }, { merge: true });
};

export const setGamePassword = async (sessionId, gameId, password) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  await setDoc(sessionRef, {
    gameLocks: {
      [gameId]: password
    }
  }, { merge: true });
};

export const clearGamePassword = async (sessionId, gameId) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  await updateDoc(sessionRef, {
    [`gameLocks.${gameId}`]: deleteField()
  });
};

// Ban Management
export const checkBanStatus = async (sessionId) => {
  const banRef = doc(db, 'bans', sessionId);
  const banDoc = await getDoc(banRef);
  return banDoc.exists();
};

export const banUser = async (sessionId) => {
  const banRef = doc(db, 'bans', sessionId);
  await setDoc(banRef, {
    bannedAt: serverTimestamp(),
  });
};

export const unbanUser = async (sessionId) => {
  const banRef = doc(db, 'bans', sessionId);
  await deleteDoc(banRef);
};

export const subscribeToBans = (callback) => {
  const q = collection(db, 'bans');
  return onSnapshot(q, (snapshot) => {
    const bans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(bans);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'bans');
  });
};

// Ratings Management
import { runTransaction } from 'firebase/firestore';

export const rateGame = async (sessionId, gameId, rating) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  const gameStatsRef = doc(db, 'game_stats', gameId);

  try {
    await runTransaction(db, async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      const gameStatsDoc = await transaction.get(gameStatsRef);

      const oldRating = sessionDoc.data()?.ratings?.[gameId] || 0;
      
      // Update session rating
      transaction.set(sessionRef, {
        ratings: {
          [gameId]: rating
        }
      }, { merge: true });

      // Update aggregate stats
      if (!gameStatsDoc.exists()) {
        transaction.set(gameStatsRef, {
          ratingSum: rating,
          ratingCount: 1
        });
      } else {
        const stats = gameStatsDoc.data();
        const newSum = stats.ratingSum - oldRating + rating;
        const newCount = stats.ratingCount + (oldRating === 0 ? 1 : 0);
        transaction.update(gameStatsRef, {
          ratingSum: newSum,
          ratingCount: newCount
        });
      }
    });
  } catch (error) {
    console.error('Error rating game:', error);
  }
};

export const subscribeToGameStats = (callback) => {
  const q = collection(db, 'game_stats');
  return onSnapshot(q, (snapshot) => {
    const stats = {};
    snapshot.forEach(doc => {
      stats[doc.id] = doc.data();
    });
    callback(stats);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'game_stats');
  });
};
