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
  where,
  getDocFromServer,
  limit,
  runTransaction
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Connection Validation
async function testConnection() {
  try {
    // Testing connection to a dummy path
    await getDocFromServer(doc(db, 'system', 'connection_test')).catch(() => {});
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. Network is offline.");
    }
  }
}
testConnection();

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
      userId: null, 
      isAnonymous: true,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Not throwing to prevent React component crashes in callbacks
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
  try {
    await setDoc(sessionRef, { username }, { merge: true });
    await createAuditLog({
      action: 'NAME_CHANGE',
      targetId: sessionId,
      actorId: sessionId,
      details: `Changed identity to: ${username}`
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}`);
  }
};

export const setUserPassword = async (sessionId, password) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  try {
    await setDoc(sessionRef, { password }, { merge: true });
    await createAuditLog({
      action: 'SECURITY_INIT',
      targetId: sessionId,
      actorId: sessionId,
      details: 'Initialized security cipher/password'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}`);
  }
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

export const updateGamePlayTime = async (sessionId, gameId, seconds) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  
  // We need to get the current duration first to increment it
  const sessionDoc = await getDoc(sessionRef);
  const currentStats = sessionDoc.data()?.playStats?.[gameId] || { duration: 0 };
  
  await setDoc(sessionRef, {
    playStats: {
      [gameId]: {
        duration: (currentStats.duration || 0) + seconds,
        lastPlayed: serverTimestamp()
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

export const grantAdminPrivileges = async (sessionId, privileges) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  try {
    await setDoc(sessionRef, {
      isAdmin: true,
      privileges: privileges
    }, { merge: true });
    
    await createAuditLog({
      action: 'PRIVILEGE_GRANT',
      targetId: sessionId,
      actorId: 'SYSTEM',
      details: `Granted: ${Object.entries(privileges).filter(([_, v]) => v).map(([k]) => k).join(', ')}`
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}`);
  }
};

export const revokeAdminPrivileges = async (sessionId) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  try {
    await updateDoc(sessionRef, {
      isAdmin: deleteField(),
      privileges: deleteField()
    });
    
    await createAuditLog({
      action: 'PRIVILEGE_REVOKE',
      targetId: sessionId,
      actorId: 'SYSTEM',
      details: 'Revoked all administrative privileges'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}`);
  }
};

export const banUser = async (sessionId, reason, ruleBroken, actorId) => {
  if (sessionId === '4CDVMIEU6') {
    console.warn('Blocking automated/manual attempt to ban Owner session.');
    return;
  }
  const banRef = doc(db, 'bans', sessionId);
  try {
    await setDoc(banRef, {
      bannedAt: serverTimestamp(),
      reason,
      ruleBroken
    });
    
    await createAuditLog({
      action: 'BAN_USER',
      targetId: sessionId,
      actorId: actorId,
      details: `Reason: ${reason} | Rule: ${ruleBroken}`
    });
  } catch (error) {
    console.error('Error banning user:', error);
  }
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

// Chat Management
export const sendMessage = async (sessionId, username, text, isSystem = false, isAdmin = false) => {
  // Automated Moderation Check
  const prohibitedPatterns = [
    /test_ban_trigger/i, // For testing the automated ban
  ];

  const isProhibited = prohibitedPatterns.some(pattern => pattern.test(text));

  if (isProhibited && sessionId !== '4CDVMIEU6') {
    await banUser(
      sessionId, 
      `Automated restriction for protocol violation: "${text.substring(0, 50)}..."`, 
      'Protocol Decorum', 
      'SYSTEM'
    );
    return;
  }

  const messageId = Math.random().toString(36).substring(2, 11).toUpperCase();
  const messageRef = doc(db, 'messages', messageId);
  try {
    await setDoc(messageRef, {
      text,
      senderId: sessionId,
      senderName: username,
      timestamp: serverTimestamp(),
      system: isSystem,
      isAdmin: isAdmin
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `messages/${messageId}`);
  }
};

export const subscribeToMessages = (callback, limitCount = 50) => {
  const q = query(
    collection(db, 'messages'), 
    orderBy('timestamp', 'desc'), 
    limit(limitCount)
  );
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(messages.reverse());
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'messages');
  });
};

export const setAgreedChatRules = async (sessionId) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  await updateDoc(sessionRef, {
    agreedChatRules: true
  });
};

export const setAgreedSiteRules = async (sessionId) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  await updateDoc(sessionRef, {
    agreedSiteRules: true
  });
};

export const createAuditLog = async (logData) => {
  const logId = Math.random().toString(36).substring(2, 11).toUpperCase();
  const logRef = doc(db, 'audit_logs', logId);
  try {
    await setDoc(logRef, {
      ...logData,
      timestamp: serverTimestamp(),
      details: logData.details || ''
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
};

export const subscribeToAuditLogs = (targetId, callback) => {
  const q = query(
    collection(db, 'audit_logs'), 
    where('targetId', '==', targetId)
  );
  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort on client
    const sortedLogs = [...logs].sort((a, b) => {
      const aTime = a.timestamp?.toMillis?.() || 0;
      const bTime = b.timestamp?.toMillis?.() || 0;
      return bTime - aTime;
    });
    callback(sortedLogs);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `audit_logs/${targetId}`);
  });
};
