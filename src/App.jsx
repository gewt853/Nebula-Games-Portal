import React, { useState, useRef, useEffect } from 'react';
import { Play, ArrowLeft, Gamepad2, Info, ShieldCheck, Globe, List, ExternalLink, Maximize, TrendingUp, Lock, Settings, User, Save, Key, Edit2, Search, Star } from 'lucide-react';
import gamesData from './data/games.json';
import proxiesData from './data/proxies.json';
import { 
  incrementVisitCount, 
  subscribeToVisitCount, 
  updateSession, 
  checkBanStatus, 
  subscribeToSessions, 
  subscribeToBans, 
  banUser, 
  unbanUser, 
  getSession,
  updateUsername,
  setGamePassword,
  clearGamePassword,
  checkUsernameUnique,
  getUsernameSession,
  setUserPassword,
  rateGame,
  subscribeToGameStats,
  db
} from './services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function App() {
  const [activeItem, setActiveItem] = useState(null); // unified state for game or proxy
  const [activeTab, setActiveTab] = useState('games');
  const [visitCount, setVisitCount] = useState(0);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [bans, setBans] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [username, setUsername] = useState('');
  const [showNameEntry, setShowNameEntry] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [lockedGameAttempt, setLockedGameAttempt] = useState(null);
  const [lockPasswordInput, setLockPasswordInput] = useState('');
  const [lockError, setLockError] = useState(false);
  const [nameError, setNameError] = useState('');
  const [gameSearchQuery, setGameSearchQuery] = useState('');
  const [gameStats, setGameStats] = useState({});
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [pendingSession, setPendingSession] = useState(null);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const iframeContainerRef = useRef(null);

  useEffect(() => {
    // Session ID management
    let currentSessionId = localStorage.getItem('nebula_session_id');
    if (!currentSessionId) {
      currentSessionId = Math.random().toString(36).substring(2, 11).toUpperCase();
      localStorage.setItem('nebula_session_id', currentSessionId);
    }
    setSessionId(currentSessionId);

    // Auto-auth owner
    if (currentSessionId === '4CDVMIEU6') {
      setIsAdminAuthenticated(true);
    }

    // Initial checks
    const init = async () => {
      const banned = await checkBanStatus(currentSessionId);
      if (banned && currentSessionId !== '4CDVMIEU6') {
        setIsBanned(true);
        return;
      }

      const sessionData = await getSession(currentSessionId);
      if (sessionData && sessionData.username) {
        setUsername(sessionData.username);
        setShowNameEntry(false);
      } else {
        setShowNameEntry(true);
      }

      const hasVisited = sessionStorage.getItem('hasVisited');
      if (!hasVisited) {
        incrementVisitCount();
        sessionStorage.setItem('hasVisited', 'true');
      }
      
      if (sessionData && sessionData.username) {
        updateSession(currentSessionId, sessionData.username);
      }
    };

    init();

    // Subscriptions
    const unsubscribeVisits = subscribeToVisitCount(setVisitCount);
    const unsubscribeGameStats = subscribeToGameStats(setGameStats);
    
    // User Profile Subscription
    const unsubscribeProfile = onSnapshot(doc(db, 'sessions', currentSessionId), async (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setUserProfile(data);
        if (data.username) {
          setUsername(data.username);
          // Auto-check if current username is still valid/unique (unless exception ID)
          if (currentSessionId !== 'ZBA7JG2RX' && currentSessionId !== '4CDVMIEU6') {
            const isUnique = await checkUsernameUnique(data.username, currentSessionId);
            if (!isUnique) {
              setShowNameEntry(true);
              setNameError('This username is no longer available. Please select a new identifier.');
            }
          }
        }
      }
    });

    let unsubscribeSessions = () => {};
    let unsubscribeBans = () => {};

    if (isAdminAuthenticated) {
      unsubscribeSessions = subscribeToSessions(setSessions);
      unsubscribeBans = subscribeToBans(setBans);
    }

    return () => {
      unsubscribeVisits();
      unsubscribeGameStats();
      unsubscribeProfile();
      unsubscribeSessions();
      unsubscribeBans();
    };
  }, [isAdminAuthenticated]);

  const handleGameSelect = (game) => {
    // Check if game is locked
    const password = userProfile?.gameLocks?.[game.id];
    if (password && sessionId !== '4CDVMIEU6') {
      setLockedGameAttempt(game);
      setLockPasswordInput('');
      setLockError(false);
    } else {
      setActiveItem(game);
    }
  };

  const handleLockVerify = (e) => {
    e.preventDefault();
    const correctPassword = userProfile?.gameLocks?.[lockedGameAttempt.id];
    if (lockPasswordInput === correctPassword) {
      setActiveItem(lockedGameAttempt);
      setLockedGameAttempt(null);
    } else {
      setLockError(true);
    }
  };

  const toggleFullscreen = () => {
    if (iframeContainerRef.current) {
      if (!document.fullscreenElement) {
        iframeContainerRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  const handleAdminAuth = (e) => {
    e.preventDefault();
    if (adminPasswordInput === '1DoodleBugg4uu18!BoogieLoo!') {
      setIsAdminAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    setNameError('');
    const inputName = nameInput.trim();
    if (inputName.length >= 2) {
      const existingSession = await getUsernameSession(inputName);
      
      // CASE 1: Username is available
      if (!existingSession) {
        setUsername(inputName);
        await updateUsername(sessionId, inputName);
        setIsFirstLogin(true); // Flag to redirect to settings
        setActiveTab('profile'); // Force profile tab
        setShowNameEntry(false);
        return;
      }

      // CASE 2: It's the current user's session
      if (existingSession.id === sessionId) {
        setUsername(inputName);
        setShowNameEntry(false);
        return;
      }

      // CASE 3: Username taken, check for password
      if (existingSession.password) {
        setPendingSession(existingSession);
        setShowPasswordLogin(true);
      } else {
        // Legacy or unprotected session
        if (sessionId === '4CDVMIEU6' || sessionId === 'ZBA7JG2RX') {
          setUsername(inputName);
          updateUsername(sessionId, inputName);
          setShowNameEntry(false);
        } else {
          setNameError('Selection Rejected: Identity already active in network.');
        }
      }
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (loginPasswordInput === pendingSession.password) {
      // Identity Verified. 
      // NOTE: In a real system we'd merge sessions or transfer the ID.
      // For this sandbox, we'll just allow them to use the username if they know the password.
      setUsername(pendingSession.username);
      
      // Update current session to match
      await updateUsername(sessionId, pendingSession.username);
      setShowNameEntry(false);
      setShowPasswordLogin(false);
      setPendingSession(null);
    } else {
      setNameError('Invalid Access Key for this identity.');
    }
  };

  const renderProfile = () => (
    <div className="flex-1 p-6 md:p-10 w-full max-w-6xl mx-auto overflow-y-auto bg-slate-950/30 font-sans">
      <div className="mb-10 border-b border-slate-800 pb-6 flex items-end justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-none flex items-center justify-center border border-slate-900 bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            <User size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase text-slate-200 mb-1 leading-none">
              USER PROFILE<span className="text-emerald-500">.</span>
            </h1>
            <p className="text-[10px] font-mono text-emerald-400 tracking-[0.2em] uppercase">
              Operator: {username}
            </p>
          </div>
        </div>
        {isFirstLogin && (
          <div className="bg-indigo-900/30 border border-indigo-500/50 p-4 animate-pulse flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-indigo-400" size={20} />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest font-bold">
                Identity Initialization Required: Please set an Account Security Key below.
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Info & Name Update */}
        <div className="bg-slate-900/60 border border-slate-800 p-8 space-y-6">
          <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-widest text-xs mb-4">
            <Edit2 size={16} /> Identity Management
          </div>
          
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">Current Username</label>
            <div className="flex gap-2">
              <input 
                type="text"
                defaultValue={username}
                placeholder="Change Username..."
                onBlur={async (e) => {
                  const val = e.target.value.trim();
                  if (val.length >= 2 && val !== username) {
                    const isUnique = await checkUsernameUnique(val, sessionId);
                    if (isUnique || sessionId === '4CDVMIEU6' || sessionId === 'ZBA7JG2RX') {
                      updateUsername(sessionId, val);
                      setNameError('');
                    } else {
                      setNameError('Username taken. Reverting changes.');
                      e.target.value = username;
                    }
                  }
                }}
                className={`flex-1 bg-slate-950 border ${nameError && nameError.includes('taken') ? 'border-red-500' : 'border-slate-800'} p-3 text-slate-200 font-mono text-sm focus:border-emerald-500 outline-none transition-all`}
              />
            </div>
            {nameError && nameError.includes('taken') && (
              <p className="text-[9px] text-red-500 mt-2 font-mono uppercase tracking-widest">{nameError}</p>
            )}
          </div>

          <div className="pt-6 border-t border-slate-800/50">
            <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">Network ID</span>
            <code className="text-xs text-slate-400 font-mono bg-slate-950 p-2 block border border-slate-800/50">
              {sessionId}
            </code>
          </div>

          <div className="pt-6 border-t border-slate-800/50">
            <label className="block text-[10px] font-mono text-indigo-400 uppercase tracking-widest mb-2 font-bold">Account Security Key</label>
            <div className="flex gap-2">
              <input 
                type="password"
                placeholder={userProfile?.password ? "••••••••" : "Set Account Password..."}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value) {
                    setUserPassword(sessionId, e.target.value);
                    e.target.value = '';
                    setIsFirstLogin(false);
                  }
                }}
                className="flex-1 bg-slate-950 border border-slate-800 p-3 text-slate-200 font-mono text-sm focus:border-indigo-500 outline-none transition-all"
              />
              <button 
                onClick={(e) => {
                  const input = e.currentTarget.previousSibling;
                  if (input.value) {
                    setUserPassword(sessionId, input.value);
                    input.value = '';
                    setIsFirstLogin(false);
                  }
                }}
                className="px-4 bg-indigo-600 text-[10px] text-white font-bold uppercase hover:bg-indigo-500 transition-all font-mono"
              >
                UPDATE
              </button>
            </div>
            <p className="text-[9px] text-slate-500 mt-2 font-mono uppercase tracking-widest leading-relaxed">
              This password will be required when logging in with this username from a new device.
            </p>
          </div>
        </div>

        {/* Game Locks */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 p-8">
          <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-widest text-xs mb-6">
            <Key size={16} /> Game Security
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {gamesData.map(game => {
              const isLocked = !!userProfile?.gameLocks?.[game.id];
              return (
                <div key={game.id} className="p-4 bg-slate-950/50 border border-slate-800/50 flex flex-col gap-3 group">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-white font-bold truncate pr-4">{game.title}</span>
                    {isLocked && <Lock size={12} className="text-indigo-500" />}
                  </div>
                  
                  <div className="flex gap-2">
                    {!isLocked ? (
                      <div className="flex-1 flex gap-2">
                        <input 
                          type="password"
                          placeholder="Set Password..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.target.value) {
                              setGamePassword(sessionId, game.id, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="flex-1 bg-slate-900 border border-slate-800 p-1.5 text-[10px] font-mono text-slate-300 outline-none focus:border-indigo-500 transition-all"
                        />
                        <button 
                          onClick={(e) => {
                            const input = e.currentTarget.previousSibling;
                            if (input.value) {
                              setGamePassword(sessionId, game.id, input.value);
                              input.value = '';
                            }
                          }}
                          className="px-2 bg-indigo-600 text-[9px] text-white font-bold uppercase hover:bg-indigo-500"
                        >
                          LOCK
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => clearGamePassword(sessionId, game.id)}
                        className="w-full py-1.5 bg-red-950/20 border border-red-900/30 text-[9px] font-mono text-red-500 uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
                      >
                        UNLOCK GAME
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progressions */}
        <div className="lg:col-span-3 bg-slate-900/60 border border-slate-800 p-8">
          <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-widest text-xs mb-6">
            <Save size={16} /> Data Progression
          </div>
          
          <div className="h-40 flex flex-col items-center justify-center border border-dashed border-slate-800">
             <span className="text-[10px] font-mono text-slate-600 uppercase mb-2">Automated Cloud Sync Active</span>
             <p className="text-[9px] text-slate-500 font-mono text-center max-w-xs leading-relaxed uppercase">
               Your progress in connected games is automatically saved to the nebula matrix. currently monitoring 0 active datastreams.
             </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdmin = () => (
    <div className="flex-1 p-6 md:p-10 w-full max-w-6xl mx-auto overflow-y-auto bg-slate-950/30">
      <div className="mb-10 border-b border-slate-800 pb-6 flex items-end justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-none flex items-center justify-center border border-slate-900 bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.4)]">
            <Lock size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase text-slate-200 mb-1 leading-none">
              {sessionId === '4CDVMIEU6' ? 'OWNER PANEL' : 'ADMIN PANEL'}<span className="text-indigo-500">.</span>
            </h1>
            <p className="text-[10px] font-mono text-indigo-400 tracking-[0.2em] uppercase">
              {sessionId === '4CDVMIEU6' ? 'Full Authority Access' : 'System Configuration & Monitoring'}
            </p>
          </div>
        </div>
        <div className="hidden md:block">
          <Settings size={32} className="text-slate-700" />
        </div>
      </div>

      {!isAdminAuthenticated ? (
        <div className="max-w-md mx-auto mt-12 p-8 bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <h2 className="text-xl font-black uppercase tracking-tight text-white mb-6 flex items-center gap-2">
            <Lock size={18} className="text-indigo-500" />
            Authorization Required
          </h2>
          <form onSubmit={handleAdminAuth}>
            <div className="mb-6">
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">Access Token</label>
              <input
                type="password"
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                className={`w-full bg-slate-950 border ${authError ? 'border-red-500' : 'border-slate-800'} p-3 text-slate-200 font-mono text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700`}
                placeholder="••••••••••••••••"
              />
              {authError && (
                <p className="text-[10px] text-red-500 mt-2 font-mono uppercase tracking-widest">Access Denied. Incorrect Token.</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 text-[10px] text-white font-bold uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-[0_0_15px_rgba(79,70,229,0.2)]"
            >
              Verify Identity
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-8 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/80 border border-slate-800 p-6 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-2">Total Site Visits</span>
              <span className="text-4xl font-black text-white">{visitCount.toLocaleString()}</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-6 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-2">Active Sessions</span>
              <span className="text-4xl font-black text-indigo-400">{sessions.length}</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-6 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-2">Banned Users</span>
              <span className="text-4xl font-black text-red-400">{bans.length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Session Manager */}
            <div className="bg-slate-900/60 border border-slate-800 p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-2">
                <List size={16} />
                Session Manager
              </h3>
              <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                {sessions.map(sess => (
                  <div key={sess.id} className="p-4 bg-slate-950/50 border border-slate-800/50 flex items-center justify-between group">
                    <div className="flex flex-col gap-1 overflow-hidden">
                      <span className="text-[10px] font-mono text-white font-bold flex items-center gap-2">
                        {sess.username || 'Anonymous'}
                        <span className="text-slate-500 font-normal">({sess.id})</span>
                        {sess.id === sessionId && <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[8px] rounded-sm">YOU</span>}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500 uppercase truncate max-w-[200px]">
                        {sess.userAgent}
                      </span>
                      <span className="text-[8px] font-mono text-slate-600">
                        Active: {sess.lastActive?.toDate?.().toLocaleString() || 'Connecting...'}
                      </span>
                    </div>
                    {sess.id !== sessionId && !bans.find(b => b.id === sess.id) && (
                      <button
                        onClick={() => banUser(sess.id)}
                        className="px-3 py-1 bg-red-950/30 border border-red-900/30 text-[9px] font-mono text-red-500 uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                      >
                        Ban
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Ban Notebook */}
            <div className="bg-slate-900/60 border border-slate-800 p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-red-400 mb-6 flex items-center gap-2">
                <ShieldCheck size={16} />
                Banned Registry
              </h3>
              <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                {bans.length > 0 ? bans.map(ban => (
                  <div key={ban.id} className="p-4 bg-red-950/10 border border-red-900/20 flex items-center justify-between group">
                    <div className="flex flex-col gap-1 overflow-hidden">
                      <span className="text-[10px] font-mono text-red-400 font-bold">
                        {sessions.find(s => s.id === ban.id)?.username || 'Banned Operator'} 
                        <span className="text-slate-600 font-normal ml-2">({ban.id})</span>
                      </span>
                      <span className="text-[8px] font-mono text-slate-600">
                        Banned on: {ban.bannedAt?.toDate?.().toLocaleString() || 'Recent'}
                      </span>
                    </div>
                    <button
                      onClick={() => unbanUser(ban.id)}
                      className="px-3 py-1 bg-slate-950/50 border border-slate-800 text-[9px] font-mono text-slate-400 uppercase tracking-widest hover:border-emerald-500 hover:text-emerald-400 transition-all"
                    >
                      Unban User
                    </button>
                  </div>
                )) : (
                  <div className="h-40 flex items-center justify-center text-slate-600 font-mono text-[10px] uppercase">
                    No active bans in registry
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-8">
            <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-2">
              <Info size={16} />
              System Configuration
            </h3>
            <div className="space-y-4 font-mono text-[11px]">
              <div className="flex justify-between border-b border-slate-800/50 pb-2">
                <span className="text-slate-500 uppercase">Core Logic</span>
                <span className="text-emerald-400">OPERATIONAL</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/50 pb-2">
                <span className="text-slate-500 uppercase">Database Link</span>
                <span className="text-emerald-400">ENCRYPTED</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/50 pb-2">
                <span className="text-slate-500 uppercase">Admin Access</span>
                <span className={`${sessionId === '4CDVMIEU6' ? 'text-emerald-400' : 'text-indigo-400'} font-bold`}>
                  {sessionId === '4CDVMIEU6' ? 'OWNER_VERIFIED' : 'AUTHORIZED'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/50 pb-2">
                <span className="text-slate-500 uppercase">Local Session ID</span>
                <span className="text-slate-400 truncate ml-4 tracking-tighter">
                  {sessionId}
                </span>
              </div>
            </div>
          </div>
          
          {sessionId !== '4CDVMIEU6' && (
            <button
              onClick={() => { setIsAdminAuthenticated(false); setAdminPasswordInput(''); }}
              className="px-6 py-2 border border-slate-800 text-[9px] font-mono text-slate-500 hover:border-red-500/50 hover:text-red-400 transition-all uppercase tracking-[0.2em]"
            >
              Revoke Access / Logout
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderProxies = () => (
    <div className="flex-1 p-6 md:p-10 w-full max-w-6xl mx-auto overflow-y-auto bg-slate-950/30">
      <div className="mb-10 border-b border-slate-800 pb-6 flex items-end justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-none flex overflow-hidden border border-slate-900 shadow-[0_0_15px_rgba(79,70,229,0.4)]">
            <div className="w-1/2 h-full bg-white"></div>
            <div className="w-1/2 h-full bg-indigo-600"></div>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase text-slate-200 mb-1 leading-none">
              PROXIES<span className="text-indigo-500">.</span>
            </h1>
            <p className="text-[10px] font-mono text-indigo-400 tracking-[0.2em] uppercase">
              {proxiesData.length} proxies available
            </p>
          </div>
        </div>
        <div className="hidden md:block">
          <Globe size={32} className="text-slate-700" />
        </div>
      </div>

      {proxiesData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {proxiesData.map((proxy) => (
            <div
              key={proxy.id}
              className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 p-6 flex flex-col group transition-all hover:border-indigo-500/50 hover:bg-indigo-500/10"
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-black uppercase tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                  {proxy.name}
                </h2>
                <div className="px-2 py-1 bg-slate-950 text-[8px] font-mono text-emerald-400 border border-emerald-900/30 uppercase">
                  Online
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed flex-1">
                {proxy.description}
              </p>
              <button
                onClick={() => setActiveItem({ ...proxy, type: 'proxy' })}
                className="mt-auto flex items-center justify-center gap-2 py-3 bg-indigo-600 text-[10px] text-white font-bold uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-[0_0_15px_rgba(79,70,229,0.2)] cursor-pointer"
              >
                <Globe size={14} />
                Access Node (Internal)
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-slate-800 p-12 flex flex-col items-center justify-center text-center bg-slate-900/20">
          <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-slate-700 mb-6 border border-slate-800">
            <Globe size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-400 mb-2 uppercase tracking-tight">No Proxy Nodes Found</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            The proxy registry is currently empty. You can add your own custom proxy nodes by updating the <code className="text-indigo-400 px-1 font-mono">proxies.json</code> data file.
          </p>
        </div>
      )}
    </div>
  );

  if (isBanned) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full border border-red-900/50 p-10 bg-red-950/10 backdrop-blur-xl">
          <ShieldCheck size={64} className="text-red-500 mx-auto mb-6" />
          <h1 className="text-3xl font-black uppercase text-white mb-2 tracking-tighter">Access Denied</h1>
          <p className="text-slate-400 font-mono text-xs uppercase tracking-widest mb-8">
            This session identifier has been restricted from accessing the nebula network.
          </p>
          <div className="py-2 px-4 bg-slate-900 border border-slate-800 inline-block">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">ID: </span>
            <span className="text-[10px] font-mono text-red-500 font-bold">{sessionId}</span>
          </div>
        </div>
      </div>
    );
  }

  if (showNameEntry) {
    return (
      <div 
        className="h-screen w-full bg-slate-950 flex items-center justify-center p-6"
        style={{
          backgroundImage: "linear-gradient(rgba(2, 6, 23, 0.85), rgba(2, 6, 23, 0.95)), url('https://mir-s3-cdn-cf.behance.net/project_modules/disp/9c3404112981173.601ebcc1dba2d.gif')",
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 p-10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <User size={120} />
          </div>
          
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 border border-indigo-500 flex items-center justify-center bg-indigo-500/10">
              <User size={20} className="text-indigo-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white leading-none">Identity Check</h1>
              <p className="text-[9px] font-mono text-indigo-400 uppercase tracking-[0.2em] mt-1">Personnel Registration</p>
            </div>
          </div>

          {!showPasswordLogin ? (
            <form onSubmit={handleNameSubmit} className="relative z-10">
              <div className="mb-8">
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3">Operator Codename</label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className={`w-full bg-slate-950 border ${nameError ? 'border-red-500' : 'border-slate-800'} p-4 text-slate-200 font-mono text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-slate-800`}
                  placeholder="Enter Username..."
                  maxLength={20}
                />
                {nameError && (
                  <p className="text-[10px] text-red-500 mt-3 font-mono uppercase tracking-widest bg-red-950/20 p-2 border-l-2 border-red-500 animate-pulse">
                    {nameError}
                  </p>
                )}
                <p className="text-[8px] text-slate-600 mt-3 font-mono uppercase tracking-widest italic">
                  * This identifier will be linked to your session token
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-indigo-600 text-[10px] text-white font-bold uppercase tracking-[0.3em] hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                disabled={nameInput.trim().length < 2}
              >
                Initialize Session
                <Play size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordLogin} className="relative z-10">
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest">Identity Authentication</label>
                  <button 
                    type="button"
                    onClick={() => setShowPasswordLogin(false)}
                    className="text-[9px] font-mono text-indigo-400 uppercase underline bg-transparent border-none p-0"
                  >
                    Change Name
                  </button>
                </div>
                <p className="text-xs text-white font-bold mb-4 font-mono uppercase tracking-tight">Login for: <span className="text-indigo-400">{pendingSession.username}</span></p>
                <input
                  type="password"
                  autoFocus
                  required
                  value={loginPasswordInput}
                  onChange={(e) => setLoginPasswordInput(e.target.value)}
                  className={`w-full bg-slate-950 border ${nameError ? 'border-red-500' : 'border-slate-800'} p-4 text-slate-200 font-mono text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-slate-800`}
                  placeholder="Enter Security Key..."
                />
                {nameError && (
                  <p className="text-[10px] text-red-500 mt-3 font-mono uppercase tracking-widest bg-red-950/20 p-2 border-l-2 border-red-500 animate-pulse">
                    {nameError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-indigo-600 text-[10px] text-white font-bold uppercase tracking-[0.3em] hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] flex items-center justify-center gap-3 flex items-center justify-center gap-3"
              >
                De-Encrypt & Join
                <Play size={14} />
              </button>
            </form>
          )}
          
          <div className="mt-10 pt-6 border-t border-slate-800/50 flex justify-between items-center opacity-40">
             <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-1 h-1 bg-slate-500"></div>
                ))}
             </div>
             <span className="text-[8px] font-mono text-slate-500 uppercase">SYS_VERSION_1.0.4</span>
          </div>
        </div>
      </div>
    );
  }

  const RatingStars = ({ rating, max = 5, onRate = null, size = 12 }) => {
    return (
      <div className="flex gap-0.5">
        {[...Array(max)].map((_, i) => {
          const starValue = i + 1;
          const isActive = starValue <= Math.round(rating);
          return (
            <Star 
              key={i} 
              size={size} 
              className={`${isActive ? 'text-amber-400 fill-amber-400' : 'text-slate-700' } ${onRate ? 'cursor-pointer hover:scale-125 transition-transform' : ''}`}
              onClick={() => onRate && onRate(starValue)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div 
      className="h-screen w-full text-slate-200 font-sans flex flex-col overflow-hidden relative"
      style={{
        backgroundImage: "linear-gradient(rgba(2, 6, 23, 0.65), rgba(2, 6, 23, 0.75)), url('https://mir-s3-cdn-cf.behance.net/project_modules/disp/9c3404112981173.601ebcc1dba2d.gif')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Locked Game Modal */}
      {lockedGameAttempt && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-10 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Lock size={120} />
             </div>
             
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 border border-indigo-500 flex items-center justify-center bg-indigo-500/10">
                <Lock size={20} className="text-indigo-500" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white leading-none">Access Restricted</h2>
            </div>
            
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-6">
              The game <span className="text-indigo-400">"{lockedGameAttempt.title}"</span> is currently secured by a personal cipher.
            </p>

            <form onSubmit={handleLockVerify} className="relative z-10">
              <div className="mb-6">
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">Security Token</label>
                <input
                  type="password"
                  autoFocus
                  value={lockPasswordInput}
                  onChange={(e) => setLockPasswordInput(e.target.value)}
                  className={`w-full bg-slate-950 border ${lockError ? 'border-red-500' : 'border-slate-800'} p-3 text-slate-200 font-mono text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-slate-800`}
                  placeholder="••••••••"
                />
                {lockError && (
                  <p className="text-[10px] text-red-500 mt-2 font-mono uppercase tracking-widest">Verification Failed. Invalid Cipher.</p>
                )}
              </div>
              
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setLockedGameAttempt(null)}
                  className="flex-1 py-3 border border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-widest hover:text-white hover:border-slate-600 transition-all"
                >
                  ABORT
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 text-[10px] text-white font-bold uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.2)]"
                >
                  DECRYPT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Header marquee */}
      <header className="h-12 border-b border-slate-800 bg-slate-900/50 flex items-center overflow-hidden shrink-0 z-50">
        <div className="marquee-track text-[10px] font-bold tracking-widest uppercase text-indigo-400">
          <span className="px-6">/// NEBULA GAMES PORTAL ///</span>
          <span className="px-6 text-slate-500">UNBLOCKED & READY TO PLAY</span>
          <span className="px-6">/// NETWORK BYPASS ACTIVE ///</span>
          <span className="px-6 text-slate-500">STAY ANONYMOUS</span>
          <span className="px-6">/// NEBULA GAMES PORTAL ///</span>
          <span className="px-6 text-slate-500">UNBLOCKED & READY TO PLAY</span>
          <span className="px-6">/// NETWORK BYPASS ACTIVE ///</span>
          <span className="px-6 text-slate-500">STAY ANONYMOUS</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <nav className="w-16 md:w-20 border-r border-slate-800 bg-slate-950/40 backdrop-blur-sm flex flex-col items-center py-8 shrink-0 z-40">
          <button
            onClick={() => { setActiveTab('games'); setActiveItem(null); }}
            className={`p-4 transition-all ${activeTab === 'games' ? 'text-indigo-500 scale-110 shadow-[0_0_15px_rgba(79,70,229,0.2)]' : 'text-slate-600 hover:text-slate-400'}`}
            title="Games"
          >
            <Gamepad2 size={24} strokeWidth={activeTab === 'games' ? 3 : 2} />
          </button>
          <button
            onClick={() => { setActiveTab('proxies'); setActiveItem(null); }}
            className={`p-4 mt-4 transition-all ${activeTab === 'proxies' ? 'text-emerald-500 scale-110 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'text-slate-600 hover:text-slate-400'}`}
            title="Proxies"
          >
            <ShieldCheck size={24} strokeWidth={activeTab === 'proxies' ? 3 : 2} />
          </button>
          <button
            onClick={() => { setActiveTab('profile'); setActiveItem(null); }}
            className={`p-4 mt-4 transition-all ${activeTab === 'profile' ? 'text-indigo-400 scale-110 shadow-[0_0_15px_rgba(129,140,248,0.2)]' : 'text-slate-600 hover:text-slate-400'}`}
            title="Profile"
          >
            <User size={24} strokeWidth={activeTab === 'profile' ? 3 : 2} />
          </button>
          <button
            onClick={() => { setActiveTab('admin'); setActiveItem(null); }}
            className={`p-4 mt-4 transition-all ${activeTab === 'admin' ? 'text-indigo-500 scale-110 shadow-[0_0_15px_rgba(79,70,229,0.2)]' : 'text-slate-600 hover:text-slate-400'}`}
            title="Admin"
          >
            <Lock size={24} strokeWidth={activeTab === 'admin' ? 3 : 2} />
          </button>
        </nav>

        <main className="flex-1 flex overflow-hidden relative border-l border-slate-900">
          {!activeItem ? (
            activeTab === 'games' ? (
            <div className="flex-1 p-6 md:p-10 w-full max-w-6xl mx-auto overflow-y-auto bg-slate-950/20">
                <div className="mb-10 border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-none flex overflow-hidden border border-slate-900 shadow-[0_0_15px_rgba(79,70,229,0.4)]">
                       <div className="w-1/2 h-full bg-white"></div>
                       <div className="w-1/2 h-full bg-indigo-600"></div>
                     </div>
                     <div>
                      <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase text-slate-200 mb-1 leading-none">
                        GAMES<span className="text-indigo-500">.</span>
                      </h1>
                      <div className="flex items-center gap-4">
                        <p className="text-[10px] font-mono text-indigo-400 tracking-[0.2em] uppercase">
                          {gamesData.length} games available
                        </p>
                        <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>
                        <div className="flex items-center gap-2 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-sm">
                          <TrendingUp size={10} className="text-indigo-400" />
                          <span className="text-[10px] font-mono text-indigo-200 font-bold tracking-wider">
                            {visitCount.toLocaleString()} VISITS
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="text"
                        placeholder="SEARCH GAMES..."
                        value={gameSearchQuery}
                        onChange={(e) => setGameSearchQuery(e.target.value)}
                        className="bg-slate-900 border border-slate-800 py-2 pl-10 pr-4 text-[10px] font-mono text-slate-200 focus:border-indigo-500 outline-none transition-all w-full uppercase tracking-tighter"
                      />
                    </div>
                    <div className="hidden md:block">
                      <Gamepad2 size={32} className="text-slate-700" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
                  {(() => {
                    const filteredGames = gamesData.filter(g => 
                      g.title.toLowerCase().includes(gameSearchQuery.toLowerCase()) || 
                      g.genre.toLowerCase().includes(gameSearchQuery.toLowerCase())
                    );
                    
                    if (filteredGames.length === 0) {
                      return (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-slate-800 bg-slate-900/20">
                          <Search size={48} className="text-slate-800 mb-4" />
                          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest leading-none">NO MATCHING DATASTREAMS FOUND</p>
                        </div>
                      );
                    }
                    
                    return filteredGames.map((game, index) => {
                      const isLocked = !!userProfile?.gameLocks?.[game.id];
                      const stats = gameStats[game.id];
                      const avgRating = stats ? stats.ratingSum / stats.ratingCount : 0;
                      
                      return (
                      <button
                        key={game.id}
                        onClick={() => handleGameSelect({ ...game, type: 'game' })}
                        className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 p-2 flex flex-col text-left group cursor-pointer transition-all hover:border-indigo-500/50 hover:bg-indigo-500/10 h-full relative"
                      >
                        <div className="w-full bg-slate-800 mb-3 relative overflow-hidden aspect-video flex justify-center items-center shadow-inner">
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent"></div>
                          
                          <div className="absolute -right-2 -bottom-2 font-black text-6xl text-slate-700/20 z-0 leading-none group-hover:text-indigo-500/20 transition-colors">
                            {String(index + 1).padStart(2, '0')}
                          </div>
                          
                          <span className="absolute bottom-2 left-2 px-2 py-1 bg-slate-950/80 text-[9px] font-mono text-indigo-300 uppercase z-10 border border-indigo-900/30 shadow-sm">
                            {game.genre}
                          </span>

                          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-1.5 py-0.5 bg-slate-950/60 backdrop-blur-sm border border-slate-800/50 rounded-sm">
                            <Star size={10} className="text-amber-400 fill-amber-400" />
                            <span className="text-[9px] font-mono text-amber-200">{avgRating > 0 ? avgRating.toFixed(1) : '---'}</span>
                          </div>

                          {isLocked && (
                            <div className="absolute top-2 right-2 p-1 bg-indigo-900/80 border border-indigo-500/50 rounded-sm z-20">
                              <Lock size={10} className="text-indigo-300" />
                            </div>
                          )}
                        </div>
                        
                        <div className="relative z-10 flex flex-col flex-1 px-1">
                          <h2 className="text-xs font-bold uppercase tracking-tight text-slate-200 group-hover:text-white transition-colors mb-1 truncate">
                            {game.title}
                          </h2>
                          
                          <p className="text-[10px] text-slate-500 uppercase mb-3 truncate">
                            By {game.developer}
                          </p>
                          
                          <div className="mt-auto flex items-center gap-2 text-[10px] text-indigo-500 font-bold uppercase tracking-widest group-hover:text-indigo-400 transition-colors">
                            {isLocked ? <Lock size={12} /> : <Play className="fill-current" size={12} />}
                            {isLocked ? 'Verify Access' : 'Launch Game'}
                          </div>
                        </div>
                      </button>
                    );
                  })
                })()}
              </div>
              </div>
            ) : activeTab === 'proxies' ? (
              renderProxies()
            ) : activeTab === 'profile' ? (
              renderProfile()
            ) : (
              renderAdmin()
            )
          ) : (
            <div className="flex flex-col flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 overflow-hidden h-full">
              {(() => {
                const isGame = activeItem.type === 'game';
                const stats = isGame ? gameStats[activeItem.id] : null;
                const avgRating = stats ? stats.ratingSum / stats.ratingCount : 0;
                const userRating = isGame ? userProfile?.ratings?.[activeItem.id] || 0 : 0;

                return (
                  <>
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800 shrink-0">
                      <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setActiveItem(null)}
                            className="flex items-center justify-center w-8 h-8 bg-slate-900 border border-slate-700 hover:border-indigo-500 text-slate-400 hover:text-indigo-400 transition-colors shadow-sm cursor-pointer"
                            title="Go Back"
                          >
                            <ArrowLeft size={16} />
                          </button>
                          <button 
                            onClick={toggleFullscreen}
                            className="flex items-center justify-center w-8 h-8 bg-slate-900 border border-slate-700 hover:border-indigo-500 text-slate-400 hover:text-indigo-400 transition-colors shadow-sm cursor-pointer"
                            title="Fullscreen"
                          >
                            <Maximize size={16} />
                          </button>
                          <a
                            href={activeItem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-8 h-8 bg-indigo-900/30 border border-indigo-700/50 hover:bg-indigo-600 hover:border-indigo-500 text-indigo-400 hover:text-white transition-all shadow-sm cursor-pointer"
                            title="Open in New Tab (Fallback)"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                        <div className="h-6 w-px bg-slate-800"></div>
                        <div className="flex flex-col">
                          <h2 className="text-lg font-black tracking-tighter uppercase text-slate-200 truncate leading-none mb-1">
                            {activeItem.title || activeItem.name}
                          </h2>
                          {isGame && (
                            <div className="flex items-center gap-2">
                              <RatingStars rating={avgRating} />
                              <span className="text-[9px] font-mono text-slate-500">({stats?.ratingCount || 0})</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="hidden md:flex items-center gap-6">
                        {isGame && (
                          <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-sm">
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest leading-none">Your Rating:</span>
                            <RatingStars rating={userRating} onRate={(r) => rateGame(sessionId, activeItem.id, r)} size={14} />
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                          <Info size={14} className="text-indigo-500" />
                          <span>{activeItem.genre || 'Secure Node'}</span>
                          <span className="text-slate-700">//</span>
                          <span>{activeItem.developer || activeItem.id}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div 
                      ref={iframeContainerRef}
                      className="flex-1 w-full border border-slate-800 relative bg-slate-900 p-1 shadow-[0_0_20px_rgba(79,70,229,0.05)] overflow-hidden"
                    >
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent z-10 pointer-events-none"></div>
                      <iframe 
                        src={activeItem.url} 
                        className="w-full h-full bg-slate-950 block border-0"
                        title={activeItem.title || activeItem.name}
                        scrolling="no"
                        frameBorder="0"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-popups-to-escape-sandbox allow-downloads allow-storage-access-by-user-activation allow-modals"
                        allow="accelerometer *; ambient-light-sensor *; autoplay *; camera *; clipboard-read *; clipboard-write *; encrypted-media *; fullscreen *; geolocation *; gyroscope *; local-network-access *; magnetometer *; microphone *; midi *; payment *; picture-in-picture *; screen-wake-lock *; speaker *; sync-xhr *; usb *; vibrate *; vr *; web-share *"
                        allowFullScreen
                      />
                    </div>
                    <div className="mt-2 text-center py-2 h-8">
                      <p className="text-[9px] text-slate-600 font-mono uppercase tracking-[0.2em]">
                        If the page fails to load, click the <ExternalLink size={10} className="inline mx-1" /> icon to launch in a new tab.
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
