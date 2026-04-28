import React, { useState, useRef, useEffect } from 'react';
import { Play, ArrowLeft, Gamepad2, Info, ShieldCheck, Globe, List, ExternalLink, Maximize, TrendingUp, Lock, Settings, User, Save, Key, Edit2, Search, Star, MessageSquarePlus, MessageSquare, Send, Crown, Shield, Heart, Clock, Sparkles } from 'lucide-react';
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
  grantAdminPrivileges,
  revokeAdminPrivileges,
  getSession,
  updateUsername,
  setGamePassword,
  clearGamePassword,
  updateGamePlayTime,
  checkUsernameUnique,
  getUsernameSession,
  setUserPassword,
  rateGame,
  subscribeToGameStats,
  updateSiteTheme,
  sendMessage,
  subscribeToMessages,
  setAgreedChatRules,
  setAgreedSiteRules,
  toggleFavorite,
  subscribeToAuditLogs,
  db
} from './services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function App() {
  const [activeItem, setActiveItem] = useState(null); // unified state for game or proxy
  const [activeTab, setActiveTab] = useState('games');
  const [visitCount, setVisitCount] = useState(0);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPrivileges, setAdminPrivileges] = useState({ banUser: false, viewUser: false, manageAdmins: false, fullAccess: false });
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
  const [gameSortOption, setGameSortOption] = useState('title');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sessionSearch, setSessionSearch] = useState('');
  const [gameStats, setGameStats] = useState({});
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [pendingSession, setPendingSession] = useState(null);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [selectedUserSess, setSelectedUserSess] = useState(null);
  const [isSubmittingName, setIsSubmittingName] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatSubscribed, setIsChatSubscribed] = useState(false);
  const chatEndRef = useRef(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showBanModal, setShowBanModal] = useState(null); // id of user being banned
  const [siteTheme, setSiteTheme] = useState('indigo');
  const [banReason, setBanReason] = useState('');
  const [banRule, setBanRule] = useState('');
  const iframeContainerRef = useRef(null);
  const playStartTimeRef = useRef(null);
  const OWNER_ID = '4CDVMIEU6';

  const THEMES = {
    indigo: {
      primary: 'bg-indigo-600',
      primaryText: 'text-indigo-600',
      hover: 'hover:bg-indigo-500',
      text: 'text-indigo-400',
      accent: 'indigo-500',
      bg: 'bg-indigo-600/10',
      border: 'border-indigo-500/30',
      glow: 'shadow-[0_0_15px_rgba(79,70,229,0.3)]',
      fill: 'fill-indigo-400/20'
    },
    green: {
      primary: 'bg-emerald-600',
      primaryText: 'text-emerald-600',
      hover: 'hover:bg-emerald-500',
      text: 'text-emerald-400',
      accent: 'emerald-500',
      bg: 'bg-emerald-600/10',
      border: 'border-emerald-500/30',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
      fill: 'fill-emerald-400/20'
    },
    pink: {
      primary: 'bg-rose-600',
      primaryText: 'text-rose-600',
      hover: 'hover:bg-rose-500',
      text: 'text-rose-400',
      accent: 'rose-500',
      bg: 'bg-rose-600/10',
      border: 'border-rose-500/30',
      glow: 'shadow-[0_0_15px_rgba(225,29,72,0.3)]',
      fill: 'fill-rose-400/20'
    },
    red: {
      primary: 'bg-red-600',
      primaryText: 'text-red-600',
      hover: 'hover:bg-red-500',
      text: 'text-red-400',
      accent: 'red-500',
      bg: 'bg-red-600/10',
      border: 'border-red-500/30',
      glow: 'shadow-[0_0_15px_rgba(220,38,38,0.3)]',
      fill: 'fill-red-400/20'
    },
    orange: {
      primary: 'bg-amber-600',
      primaryText: 'text-amber-600',
      hover: 'hover:bg-amber-500',
      text: 'text-amber-400',
      accent: 'amber-500',
      bg: 'bg-amber-600/10',
      border: 'border-amber-500/30',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]',
      fill: 'fill-amber-400/20'
    }
  };

  const t = THEMES[siteTheme] || THEMES.indigo;

  useEffect(() => {
    // Session ID management
    let currentSessionId = localStorage.getItem('nebula_session_id');
    if (!currentSessionId) {
      currentSessionId = Math.random().toString(36).substring(2, 11).toUpperCase();
      localStorage.setItem('nebula_session_id', currentSessionId);
    }
    setSessionId(currentSessionId);

    // Bootstrap Admin Privileges for specific session if current user is Owner
    if (currentSessionId === OWNER_ID) {
      const targetSessionId = 'CZ170GS2U';
      grantAdminPrivileges(targetSessionId, {
        banUser: true,
        viewUser: true,
        manageAdmins: true,
        fullAccess: true
      }, currentSessionId);
    }

    // Initial checks
    const init = async () => {
      const banned = await checkBanStatus(currentSessionId);
      if (banned && currentSessionId !== OWNER_ID) {
        setIsBanned(true);
        // Fetch ban details so the user knows why
        const banDoc = await getDoc(doc(db, 'bans', currentSessionId));
        if (banDoc.exists()) {
          setBans([{ id: currentSessionId, ...banDoc.data() }]);
        }
        return;
      }

      const sessionData = await getSession(currentSessionId);
      
      // Always update session to register current activity and userAgent
      updateSession(currentSessionId, sessionData?.username || null);

      if (sessionData && sessionData.username) {
        // CHECK FOR PASSWORD LOCK
        const isAuthConfirmed = sessionStorage.getItem('nebula_auth_confirmed') === 'true';
        if (sessionData.password && !isAuthConfirmed) {
          setUsername(sessionData.username);
          setPendingSession({ id: currentSessionId, ...sessionData });
          setShowPasswordLogin(true);
          setShowNameEntry(true); // Force overlay to show
        } else {
          setUsername(sessionData.username);
          setShowNameEntry(false);
          // Auto-auth owner OR anyone with isAdmin status
          if (currentSessionId === OWNER_ID || sessionData.isAdmin) {
            setIsAdminAuthenticated(true);
            if (sessionData.privileges) {
              setAdminPrivileges(sessionData.privileges);
            } else if (currentSessionId === OWNER_ID) {
              // Owner always has full access
              setAdminPrivileges({ banUser: true, viewUser: true, manageAdmins: true, fullAccess: true });
            }
          }
        }
      } else {
        setShowNameEntry(true);
      }

      const hasVisited = sessionStorage.getItem('hasVisited');
      if (!hasVisited) {
        incrementVisitCount();
        sessionStorage.setItem('hasVisited', 'true');
      }
    };

    // Fullscreen exit sync
    const handleFsChange = () => {
      // We don't necessarily need to do anything here if we don't have state for isFullScreen,
      // but it's good to have for future-proofing or if we wanted to sync state.
    };
    document.addEventListener('fullscreenchange', handleFsChange);

    init();

    // Subscriptions
    const unsubscribeVisits = subscribeToVisitCount(setVisitCount);
    const unsubscribeGameStats = subscribeToGameStats(setGameStats);
    
    // User Profile Subscription
    const unsubscribeProfile = onSnapshot(doc(db, 'sessions', currentSessionId), async (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setUserProfile(data);
        if (data.siteTheme) setSiteTheme(data.siteTheme);

        // Sync Admin State
        if (data.isAdmin || currentSessionId === OWNER_ID) {
          setIsAdminAuthenticated(true);
          if (data.privileges) {
            setAdminPrivileges(data.privileges);
          } else if (currentSessionId === OWNER_ID) {
            setAdminPrivileges({ banUser: true, viewUser: true, manageAdmins: true, fullAccess: true });
          }
        } else {
          // If they were admin and lost it, remove it
          if (!data.isAdmin && currentSessionId !== OWNER_ID) {
            setIsAdminAuthenticated(false);
            setAdminPrivileges({ banUser: false, viewUser: false, manageAdmins: false, fullAccess: false });
          }
        }

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
    let unsubscribeAudit = () => {};

    if (activeTab === 'admin' && selectedUserSess) {
      setAuditLogs([]);
      unsubscribeAudit = subscribeToAuditLogs(selectedUserSess.id, setAuditLogs);
    }

    if (isAdminAuthenticated) {
      unsubscribeSessions = subscribeToSessions(setSessions);
      unsubscribeBans = subscribeToBans(setBans);
    }

    // Chat Subscription (Only subscribe when tab is active)
    let unsubscribeMessages = () => {};
    if (activeTab === 'chat') {
      unsubscribeMessages = subscribeToMessages(setMessages);
    }

    return () => {
      unsubscribeVisits();
      unsubscribeGameStats();
      unsubscribeProfile();
      unsubscribeSessions();
      unsubscribeBans();
      unsubscribeMessages();
      unsubscribeAudit();
    };
  }, [isAdminAuthenticated, activeTab, selectedUserSess]);

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleGameSelect = (game) => {
    // Check if game is locked
    const password = userProfile?.gameLocks?.[game.id];
    if (password && sessionId !== OWNER_ID) {
      setLockedGameAttempt(game);
      setLockPasswordInput('');
      setLockError(false);
    } else {
      setActiveItem(game);
      playStartTimeRef.current = Date.now();
    }
  };

  const handleToggleFavorite = (e, gameId) => {
    e.stopPropagation();
    if (!sessionId) return;
    const isFavorite = userProfile?.favorites?.[gameId];
    toggleFavorite(sessionId, gameId, !isFavorite);
  };

  const handleCloseItem = async () => {
    try {
      if (activeItem && activeItem.type === 'game' && playStartTimeRef.current) {
        const seconds = Math.floor((Date.now() - playStartTimeRef.current) / 1000);
        if (seconds > 0) {
          await updateGamePlayTime(sessionId, activeItem.id, seconds);
        }
      }
    } catch (err) {
      console.error("Failed to update play time:", err);
    } finally {
      setActiveItem(null);
      playStartTimeRef.current = null;
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

  const SITE_RULES = [
    { id: 'R1', title: 'Network Integrity', detail: 'Do not attempt to bypass system security measures or exploit site code.' },
    { id: 'R2', title: 'Protocol Decorum', detail: 'Maintain professional conduct. Zero tolerance for harassment or discriminatory acts.' },
    { id: 'R3', title: 'Data Privacy', detail: 'Do not harvest user data or distribute PII found within the network.' },
    { id: 'R4', title: 'Automated Access', detail: 'Bot usage or automated scraping of the games repository is strictly prohibited.' }
  ];

  const handleBanConfirm = () => {
    if (showBanModal && banReason && banRule) {
      banUser(showBanModal, banReason, banRule, sessionId);
      setShowBanModal(null);
      setBanReason('');
      setBanRule('');
    }
  };

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingName) return;
    setIsSubmittingName(true);
    setNameError('');
    
    try {
      const inputName = nameInput.trim();
      if (inputName.length >= 2) {
        const existingSession = await getUsernameSession(inputName);
        
        // CASE 1: Username is available
        if (!existingSession) {
          await updateUsername(sessionId, inputName);
          setUsername(inputName);
          
          // FOR NEW USERS: Prompt for password setup immediately
          setPendingSession({ id: sessionId, username: inputName, isNew: true });
          setShowPasswordLogin(true);
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
          if (sessionId === OWNER_ID || sessionId === 'ZBA7JG2RX') {
            await updateUsername(sessionId, inputName);
            setUsername(inputName);
            setShowNameEntry(false);
          } else {
            setNameError('Selection Rejected: Identity already active in network.');
          }
        }
      }
    } catch (err) {
      console.error(err);
      setNameError('Initialization failure. Check matrix connection.');
    } finally {
      setIsSubmittingName(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (isSubmittingName) return;
    setIsSubmittingName(true);
    setNameError('');
    try {
      // NEW USER PASSWORD SETUP
      if (pendingSession.isNew) {
        await setUserPassword(sessionId, loginPasswordInput);
        sessionStorage.setItem('nebula_auth_confirmed', 'true');
        setUsername(pendingSession.username);
        setShowNameEntry(false);
        setShowPasswordLogin(false);
        setPendingSession(null);
        setLoginPasswordInput('');
        return;
      }

      if (loginPasswordInput === pendingSession.password) {
        // Identity Verified. 
        sessionStorage.setItem('nebula_auth_confirmed', 'true');
        setUsername(pendingSession.username);
        
        // Update current session if we are taking over an identity
        if (sessionId !== pendingSession.id) {
          await updateUsername(sessionId, pendingSession.username);
        }
        
        // Auto-auth owner if it's the owner session
        if (sessionId === OWNER_ID || pendingSession.id === OWNER_ID) {
          setIsAdminAuthenticated(true);
        }

        setShowNameEntry(false);
        setShowPasswordLogin(false);
        setPendingSession(null);
        setLoginPasswordInput('');
      } else {
        setNameError('Invalid Access Key for this identity.');
      }
    } catch (err) {
      console.error(err);
      setNameError('Network interruption during identity verification.');
    } finally {
      setIsSubmittingName(false);
    }
  };

  const renderChat = () => {
    const hasAgreed = userProfile?.agreedChatRules;

    if (!hasAgreed) {
      return (
        <div className="flex-1 flex items-center justify-center p-6 bg-slate-950/30">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 p-10 shadow-2xl relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-64 h-64 ${t.bg} blur-[100px] -mr-32 -mt-32`}></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-12 h-12 bg-${t.accent}/20 border border-${t.accent}/30 flex items-center justify-center`}>
                  <ShieldCheck size={24} className={t.text} />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-white">COMMUNICATIONS PROTOCOL</h2>
                  <p className={`text-[10px] font-mono ${t.text} uppercase tracking-widest mt-1`}>Rule Agreement Required</p>
                </div>
              </div>

              <div className="space-y-6 mb-10">
                <p className="text-xs font-mono text-slate-400 leading-relaxed uppercase tracking-tight">
                  To ensure a stable and secure environment within the Nebula Network Chat, all operators must adhere to the following directives:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    "No racially motivated or discriminatory communication.",
                    "No sexually explicit content or solicitation.",
                    "No harassment, bullying, or targeted toxicity.",
                    "No spamming, flooding, or automated broadcasting.",
                    "No sharing of personal identifiable information (PII).",
                    "No distribution of malicious code or dangerous links."
                  ].map((rule, idx) => (
                    <div key={idx} className="p-4 bg-slate-950 border border-slate-800 flex flex-col gap-2">
                       <span className={`text-[8px] font-mono ${t.text} font-bold uppercase tracking-widest`}>Rule {idx + 1}</span>
                       <p className="text-[10px] font-mono text-slate-300 uppercase leading-snug">{rule}</p>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] font-mono text-red-500/60 uppercase tracking-widest italic border-t border-slate-800 pt-6">
                  * VIOLATION OF THESE PROTOCOLS MAY RESULT IN PERMANENT SESSION RESTRICTION.
                </p>
              </div>

              <button 
                onClick={() => setAgreedChatRules(sessionId)}
                className={`w-full py-4 ${t.primary} text-[10px] text-white font-bold uppercase tracking-[0.3em] ${t.hover} transition-all ${t.glow}`}
              >
                I AGREE TO THE PROTOCOLS & ENTER
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col h-full bg-slate-950/30 overflow-hidden">
        {/* Chat Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-4">
              <div className={`w-10 h-10 ${t.bg} border ${t.border} flex items-center justify-center`}>
                 <MessageSquare size={20} className={t.text} />
              </div>
              <div>
                 <h2 className="text-lg font-black uppercase tracking-tighter text-white leading-none">GLOBAL TRANSMISSIONS</h2>
                 <p className={`text-[9px] font-mono ${t.text} uppercase tracking-widest mt-1`}>Live Subspace Frequency</p>
              </div>
           </div>
           <div className="flex items-center gap-2">
             <div className={`w-2 h-2 ${t.primary.replace('bg-', 'bg-')} rounded-full animate-pulse ${t.glow.replace('shadow-[', 'shadow-[0_0_8px_')}`}></div>
             <span className={`text-[10px] font-mono ${t.text} font-bold uppercase tracking-widest`}>Network Live</span>
           </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
               <div className="text-center opacity-30">
                  <Globe size={48} className="mx-auto mb-4 text-slate-500 animate-[spin_10s_linear_infinite]" />
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest italic">Awaiting first frequency contact...</p>
               </div>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.senderId === sessionId;
              const isSystem = msg.system;
              
              if (isSystem) {
                return (
                  <div key={msg.id || idx} className="flex justify-center">
                    <span className="px-4 py-1.5 bg-slate-900 border border-slate-800 text-[8px] font-mono text-slate-500 uppercase tracking-widest">
                      SYSTEM: {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-3 mb-1">
                    {!isMe && (
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-mono font-black ${t.text} uppercase`}>{msg.senderName}</span>
                        {msg.senderId === OWNER_ID ? (
                          <Crown size={10} className="text-amber-400 fill-amber-400/20" />
                        ) : msg.isAdmin ? (
                          <Shield size={10} className={`${t.text} ${t.fill}`} />
                        ) : null}
                      </div>
                    )}
                    <span className="text-[8px] font-mono text-slate-600 uppercase">
                      {msg.timestamp?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '---'}
                    </span>
                    {isMe && (
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-mono font-black ${t.text} uppercase`}>{username} (YOU)</span>
                        {sessionId === OWNER_ID ? (
                          <Crown size={10} className="text-amber-400 fill-amber-400/20" />
                        ) : isAdminAuthenticated ? (
                          <Shield size={10} className={`${t.text} ${t.fill}`} />
                        ) : null}
                      </div>
                    )}
                  </div>
                  <div className={`max-w-[80%] md:max-w-[60%] p-3 text-xs font-mono uppercase tracking-tight leading-relaxed shadow-lg ${
                    isMe 
                      ? `${t.bg} ${t.border} ${t.text}` 
                      : 'bg-slate-900 border border-slate-800 text-slate-200'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 md:p-6 bg-slate-900/50 border-t border-slate-800 shrink-0">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (newMessage.trim()) {
                sendMessage(sessionId, username, newMessage.trim(), false, isAdminAuthenticated || sessionId === OWNER_ID);
                setNewMessage('');
              }
            }}
            className="flex gap-4"
          >
            <input 
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Inject message into datastream..."
              className={`flex-1 bg-slate-950 border border-slate-800 p-4 text-slate-200 font-mono text-xs focus:${t.border.replace('border-', 'border-')} outline-none transition-all placeholder:text-slate-800`}
            />
            <button 
              type="submit"
              disabled={!newMessage.trim()}
              className={`px-6 ${t.primary} text-white ${t.hover} transition-all ${t.glow} disabled:opacity-30 disabled:shadow-none`}
            >
              <Send size={18} />
            </button>
          </form>
          <div className="mt-3 flex justify-between">
             <div className="flex items-center gap-4">
               <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">Protocol: UDP Encrypted Branch</span>
               <div className="flex items-center gap-1 text-[8px] font-mono text-cyan-600/60 uppercase tracking-widest">
                 <ShieldCheck size={8} /> Cloudflare WAF: Active | DDoS Protection: Enabled
               </div>
             </div>
             <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">Characters: {newMessage.length}/1000</span>
          </div>
        </div>
      </div>
    );
  };

  const renderProfile = () => {
    const playStats = userProfile?.playStats || {};
    const playedGamesList = Object.entries(playStats)
      .map(([gameId, stats]) => {
        const game = gamesData.find(g => g.id === gameId);
        return { ...stats, game, gameId };
      })
      .filter(s => s.game)
      .sort((a, b) => b.duration - a.duration);

    const top3 = playedGamesList.slice(0, 3);
    const totalSeconds = Object.values(playStats).reduce((acc, s) => acc + (s.duration || 0), 0);
    const totalHours = (totalSeconds / 3600).toFixed(1);

    return (
      <div className="flex-1 p-6 md:p-10 w-full max-w-6xl mx-auto overflow-y-auto bg-slate-950/30 font-sans">
        <div className="mb-10 border-b border-slate-800 pb-6 flex items-end justify-between">
          <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-none flex items-center justify-center border border-slate-900 ${t.primary} ${t.glow}`}>
              <User size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase text-slate-200 mb-1 leading-none">
                USER PROFILE<span className={t.primaryText}>.</span>
              </h1>
              <p className={`text-[10px] font-mono ${t.text} tracking-[0.2em] uppercase`}>
                Operator: {username}
              </p>
            </div>
          </div>
          {isFirstLogin && (
            <div className={`${t.bg} ${t.border} p-4 animate-pulse flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <ShieldCheck className={t.text} size={20} />
                <span className={`text-[10px] font-mono ${t.text} uppercase tracking-widest font-bold text-center sm:text-left`}>
                  Identity Initialization Required: Please set an Account Security Key below.
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Info & Name Update */}
          <div className="bg-slate-900/60 border border-slate-800 p-8 space-y-6">
            <div className={`flex items-center gap-2 ${t.text} font-bold uppercase tracking-widest text-xs mb-4`}>
              <Edit2 size={16} /> Identity Management
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                 <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Network Shield</span>
                 <span className={`text-[10px] font-mono ${t.text} font-bold uppercase tracking-widest`}>Active</span>
              </div>
              <div className="flex items-center gap-2">
                 <ShieldCheck size={12} className={t.text} />
                 <span className="text-[9px] font-mono text-slate-400 uppercase">Cloudflare Global DNS Protected</span>
              </div>
              <div className="mt-2 h-1 bg-slate-900 overflow-hidden">
                 <div className={`h-full ${t.primary} w-full animate-[pulse_2s_infinite]`}></div>
              </div>
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
                      if (isUnique || sessionId === OWNER_ID || sessionId === 'ZBA7JG2RX') {
                        updateUsername(sessionId, val);
                        setNameError('');
                      } else {
                        setNameError('Username taken. Reverting changes.');
                        e.target.value = username;
                      }
                    }
                  }}
                  className={`flex-1 bg-slate-950 border ${nameError && nameError.includes('taken') ? 'border-red-500' : 'border-slate-800'} p-3 text-slate-200 font-mono text-sm focus:${t.border.replace('border-', 'border-')} outline-none transition-all`}
                />
              </div>
              {nameError && nameError.includes('taken') && (
                <p className="text-[9px] text-red-500 mt-2 font-mono uppercase tracking-widest">{nameError}</p>
              )}
            </div>

            <div className="pt-6 border-t border-slate-800/50">
              <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">Network ID</span>
              <code className={`text-xs ${t.text} font-mono bg-slate-950 p-2 block border border-slate-800/50`}>
                {sessionId}
              </code>
            </div>

            <div className="pt-6 border-t border-slate-800/50">
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4">Site Visual Theme</label>
              <div className="grid grid-cols-5 gap-2">
                {Object.keys(THEMES).map(themeKey => (
                  <button
                    key={themeKey}
                    onClick={() => {
                      setSiteTheme(themeKey);
                      updateSiteTheme(sessionId, themeKey);
                    }}
                    className={`h-10 border flex items-center justify-center transition-all ${
                      siteTheme === themeKey 
                        ? 'border-white bg-slate-800' 
                        : 'border-slate-800 bg-slate-950 hover:border-slate-600'
                    }`}
                    title={themeKey.toUpperCase()}
                  >
                    <div className={`w-4 h-4 rounded-full ${THEMES[themeKey].primary} shadow-sm`}></div>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800/50 flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2 font-bold">Account Security Key</label>
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
                    className={`flex-1 bg-slate-950 border border-slate-800 p-3 text-slate-200 font-mono text-sm focus:${t.border.replace('border-', 'border-')} outline-none transition-all`}
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
                    className={`px-4 ${t.primary} text-[10px] text-white font-bold uppercase ${t.hover} transition-all font-mono`}
                  >
                    UPDATE
                  </button>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  sessionStorage.removeItem('nebula_auth_confirmed');
                  setShowNameEntry(true);
                  setShowPasswordLogin(!!userProfile?.password);
                  setPendingSession(userProfile?.password ? userProfile : null);
                }}
                className={`w-full py-3 bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400 uppercase tracking-[0.2em] hover:${t.border} hover:${t.text} transition-all`}
              >
                Lock Terminal / Change Identity
              </button>
            </div>
          </div>

          {/* Stats View */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 p-8">
            <div className={`flex items-center gap-2 ${t.text} font-bold uppercase tracking-widest text-xs mb-6`}>
              <TrendingUp size={16} /> Engagement Metrics
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
               <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Total Playtime</span>
                  <div className="text-3xl font-black text-white">{totalHours} <span className="text-xs text-slate-600">HOURS</span></div>
               </div>
               <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Top Ranking Activity</span>
                  <div className={`text-sm font-bold ${t.text} uppercase truncate`}>
                    {top3[0]?.game?.title || 'No Activity Logged'}
                  </div>
               </div>
            </div>

            <div className="space-y-6">
               <h4 className="text-[10px] font-mono text-white font-bold uppercase border-b border-slate-800 pb-2">Top 3 Most Played</h4>
               {top3.length > 0 ? (
                 <div className="space-y-3">
                   {top3.map((s, idx) => (
                     <div key={s.gameId} className="flex items-center justify-between p-3 bg-slate-950/50 border border-slate-800/50">
                        <div className="flex items-center gap-3">
                           <span className="text-lg font-black text-slate-800">{idx + 1}</span>
                           <div>
                              <div className="text-xs font-bold text-slate-200 uppercase">{s.game.title}</div>
                              <div className="text-[9px] font-mono text-slate-600 uppercase">Last Played: {s.lastPlayed?.toDate?.()?.toLocaleDateString() || 'Recently'}</div>
                           </div>
                        </div>
                        <div className={`text-xs font-mono ${t.text}`}>{(s.duration / 3600).toFixed(1)}h</div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="h-20 flex items-center justify-center text-slate-700 font-mono text-[10px] italic">No engagement data recorded.</div>
               )}

               <h4 className="text-[10px] font-mono text-white font-bold uppercase border-b border-slate-800 pb-2 pt-4">History Breakdown</h4>
               <div className="max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {playedGamesList.length > 0 ? playedGamesList.map(s => (
                    <div key={s.gameId} className="flex justify-between items-center py-2 border-b border-slate-800/30 text-[10px] font-mono">
                       <span className="text-slate-400 uppercase">{s.game.title}</span>
                       <span className={`text-slate-600 group-hover:${t.text}`}>{(s.duration / 60).toFixed(0)}m played</span>
                    </div>
                  )) : (
                    <div className="text-[10px] font-mono text-slate-700 uppercase">Registry Empty</div>
                  )}
               </div>
            </div>
          </div>

          {/* Game Locks */}
          <div className="lg:col-span-3 bg-slate-900/60 border border-slate-800 p-8">
            <div className={`flex items-center gap-2 ${t.text} font-bold uppercase tracking-widest text-xs mb-6`}>
              <Key size={16} /> Game Security
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {gamesData.map(game => {
                const isLocked = !!userProfile?.gameLocks?.[game.id];
                return (
                  <div key={game.id} className={`p-4 bg-slate-950/50 border border-slate-800/50 flex flex-col gap-3 group transition-all hover:${t.border}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-white font-bold truncate pr-4">{game.title}</span>
                      {isLocked && <Lock size={12} className={t.text} />}
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
                            className={`flex-1 bg-slate-900 border border-slate-800 p-1.5 text-[10px] font-mono text-slate-300 outline-none focus:${t.border.replace('border-', 'border-')} transition-all`}
                          />
                          <button 
                            onClick={(e) => {
                              const input = e.currentTarget.previousSibling;
                              if (input.value) {
                                setGamePassword(sessionId, game.id, input.value);
                                input.value = '';
                              }
                            }}
                            className={`px-2 ${t.primary} text-[9px] text-white font-bold uppercase ${t.hover}`}
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
        </div>
      </div>
    );
  };

  const renderAdmin = () => {
    const isOwner = sessionId === OWNER_ID;
    const hasPrivilege = (priv) => isOwner || adminPrivileges.fullAccess || adminPrivileges[priv];
    const displaySess = sessions.find(s => s.id === selectedUserSess?.id) || selectedUserSess;

    return (
      <div className="flex-1 p-6 md:p-10 w-full max-w-6xl mx-auto overflow-y-auto bg-slate-950/30">
        <div className="mb-10 border-b border-slate-800 pb-6 flex items-end justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-none flex items-center justify-center border border-slate-900 ${t.primary} ${t.glow}`}>
              <Lock size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase text-slate-200 mb-1 leading-none">
                {isOwner ? 'OWNER PANEL' : 'ADMIN PANEL'}<span className={t.primaryText}>.</span>
              </h1>
              <p className={`text-[10px] font-mono ${t.text} tracking-[0.2em] uppercase`}>
                {isOwner ? 'Full Authority Access' : 'System Configuration & Monitoring'}
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
              <Lock size={18} className={t.text} />
              Authorization Required
            </h2>
            <form onSubmit={handleAdminAuth}>
              <div className="mb-6">
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">Access Token</label>
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className={`w-full bg-slate-950 border ${authError ? 'border-red-500' : 'border-slate-800'} p-3 text-slate-200 font-mono text-sm focus:${t.border.replace('border-', 'border-')} outline-none transition-all placeholder:text-slate-700`}
                  placeholder="••••••••••••••••"
                />
                {authError && (
                  <p className="text-[10px] text-red-500 mt-2 font-mono uppercase tracking-widest">Access Denied. Incorrect Token.</p>
                )}
              </div>
              <button
                type="submit"
                className={`w-full py-3 ${t.primary} text-[10px] text-white font-bold uppercase tracking-widest ${t.hover} transition-all ${t.glow}`}
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
                <span className={`text-4xl font-black ${t.text}`}>{sessions.length}</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-6 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-2">Banned Users</span>
                <span className="text-4xl font-black text-red-500">{bans.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Session Manager */}
              <div className="bg-slate-900/60 border border-slate-800 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h3 className={`text-sm font-bold uppercase tracking-widest ${t.text} flex items-center gap-2`}>
                    <List size={16} />
                    Session Manager
                  </h3>
                  <div className="relative w-full sm:max-w-[200px]">
                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text"
                      placeholder="SEARCH NODES..."
                      value={sessionSearch}
                      onChange={(e) => setSessionSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 py-1.5 pl-8 pr-2 text-[10px] font-mono text-slate-300 focus:border-slate-600 outline-none transition-all placeholder:text-slate-700 uppercase"
                    />
                  </div>
                </div>
                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                  {sessions
                    .filter(s => 
                      (s.username?.toLowerCase() || 'anonymous').includes(sessionSearch.toLowerCase()) || 
                      s.id.toLowerCase().includes(sessionSearch.toLowerCase())
                    )
                    .map(sess => {
                    const isOwnerSess = sess.id === OWNER_ID;
                    const isCurrent = sess.id === sessionId;
                    const isSelected = selectedUserSess?.id === sess.id;

                    return (
                      <div 
                        key={sess.id} 
                        onClick={() => setSelectedUserSess(sess)}
                        className={`p-4 border transition-all cursor-pointer flex items-center justify-between group ${isSelected ? `${t.bg} ${t.border}` : 'bg-slate-950/50 border-slate-800/50 hover:border-slate-600'}`}
                      >
                        <div className="flex flex-col gap-1 overflow-hidden">
                          <span className={`${isOwnerSess ? 'text-amber-400' : 'text-white'} text-[10px] font-mono font-bold flex items-center gap-2`}>
                            {sess.username || 'Anonymous'}
                            <span className="text-slate-500 font-normal">({sess.id})</span>
                            {isOwnerSess && <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-500 text-[8px] rounded-sm border border-amber-500/30 uppercase">OWNER</span>}
                            {!isOwnerSess && sess.isAdmin && <span className={`px-1.5 py-0.5 ${t.bg} ${t.text} text-[8px] rounded-sm border ${t.border} uppercase`}>ADMIN</span>}
                            {isCurrent && <span className={`px-1.5 py-0.5 ${t.bg} ${t.text} text-[8px] rounded-sm uppercase`}>YOU</span>}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500 uppercase truncate max-w-[200px]">
                            {sess.userAgent}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {sess.id !== sessionId && !isOwnerSess && hasPrivilege('banUser') && !bans.find(b => b.id === sess.id) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowBanModal(sess.id); }}
                              className="px-3 py-1 bg-red-950/30 border border-red-900/30 text-[9px] font-mono text-red-500 uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                            >
                              Ban
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Inspector View */}
              <div className="bg-slate-900/60 border border-slate-800 p-6">
                <h3 className={`text-sm font-bold uppercase tracking-widest ${t.text} mb-6 flex items-center gap-2`}>
                  <User size={16} />
                  Identity Inspector
                </h3>
                
                {!hasPrivilege('viewUser') ? (
                   <div className="h-64 flex flex-col items-center justify-center text-slate-700 bg-slate-950/20 border border-dashed border-slate-800">
                      <ShieldCheck size={48} className="opacity-10 mb-4" />
                      <span className="text-[10px] font-mono uppercase tracking-widest">Inspector privilege required</span>
                      <span className="text-[8px] font-mono text-slate-600 uppercase mt-2">Access denied by node owner</span>
                   </div>
                ) : displaySess ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-3 bg-slate-950 border border-slate-800">
                          <span className="text-[8px] font-mono text-slate-500 uppercase block mb-1">Username</span>
                          <div className="text-xs font-bold text-white uppercase">{displaySess.username || 'NOT_SET'}</div>
                       </div>
                       <div className="p-3 bg-slate-950 border border-slate-800">
                          <span className="text-[8px] font-mono text-slate-500 uppercase block mb-1">Session Token</span>
                          <div className={`text-xs font-mono ${t.text} truncate`}>{displaySess.id}</div>
                       </div>
                       <div className="p-3 bg-slate-950 border border-slate-800">
                          <span className="text-[8px] font-mono text-slate-500 uppercase block mb-1">Security Cipher</span>
                          <div className={`text-xs font-mono ${t.text}`}>
                             {displaySess.id === OWNER_ID ? 'HIDDEN_ADMIN_RESERVED' : (displaySess.password || 'UNSECURED')}
                          </div>
                       </div>
                       <div className="p-3 bg-slate-950 border border-slate-800">
                          <span className="text-[8px] font-mono text-slate-500 uppercase block mb-1">Connection Status</span>
                          <div className={`text-xs font-black uppercase ${displaySess.isOnline ? t.text : 'text-slate-600'}`}>
                            {displaySess.isOnline ? 'ONLINE' : 'OFFLINE'}
                          </div>
                       </div>
                    </div>

                    <div className="p-4 bg-slate-950 border border-slate-800">
                        <span className="text-[8px] font-mono text-slate-500 uppercase block mb-3 border-b border-slate-800 pb-1">Activity Analysis</span>
                        {displaySess.playStats && Object.keys(displaySess.playStats).length > 0 ? (
                           <div className="space-y-2">
                              {Object.entries(displaySess.playStats)
                                .map(([gameId, stats]) => ({ ...stats, game: gamesData.find(g => g.id === gameId) }))
                                .filter(s => s.game)
                                .sort((a, b) => b.duration - a.duration)
                                .slice(0, 5)
                                .map((s, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-[10px] font-mono">
                                     <span className="text-slate-400 uppercase">{s.game.title}</span>
                                     <span className={t.text}>{(s.duration / 60).toFixed(0)}m</span>
                                  </div>
                                ))}
                           </div>
                        ) : (
                          <div className="text-[10px] font-mono text-slate-700 italic">No activity data available for this probe.</div>
                        )}
                    </div>

                    {/* Audit Logs */}
                    <div className="p-4 bg-slate-950 border border-slate-800">
                        <span className={`text-[8px] font-mono ${t.text} uppercase block mb-3 border-b border-slate-800 pb-1 font-black`}>Audit Logs</span>
                        <div className="space-y-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                           {auditLogs.length > 0 ? auditLogs.map(log => (
                             <div key={log.id} className={`text-[9px] font-mono border-l ${t.border} pl-2 py-1`}>
                                <div className={`${t.text} font-bold uppercase`}>{log.action}</div>
                                <div className="text-slate-400 leading-tight uppercase">{log.details}</div>
                                <div className="text-slate-600 text-[8px] mt-1">{log.timestamp?.toDate?.()?.toLocaleString() || '---'}</div>
                             </div>
                           )) : (
                             <div className="text-[9px] font-mono text-slate-700 uppercase italic">No system logs recorded.</div>
                           )}
                        </div>
                    </div>
                    
                    {/* Admin Privilege Management (Owner or Authorized Admin) */}
                    {(sessionId === OWNER_ID || (isAdminAuthenticated && hasPrivilege('manageAdmins'))) && displaySess.id !== OWNER_ID && (
                      <div className="p-4 bg-slate-950 border border-slate-800/30">
                        <span className={`text-[8px] font-mono ${t.text} uppercase block mb-3 border-b ${t.border} pb-1 font-bold`}>Privilege Escalation</span>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-mono text-slate-200 uppercase">Admin Status</span>
                              <span className="text-[8px] font-mono text-slate-500 uppercase">Grants basic admin console access</span>
                            </div>
                            <button 
                              onClick={() => {
                                if (displaySess.isAdmin) {
                                  revokeAdminPrivileges(displaySess.id, sessionId);
                                } else {
                                  grantAdminPrivileges(displaySess.id, { banUser: false, viewUser: false, fullAccess: false, manageAdmins: false }, sessionId);
                                }
                              }}
                              className={`px-3 py-1 text-[8px] font-mono border ${displaySess.isAdmin ? 'border-red-500 text-red-500 bg-red-500/10' : `border-${t.accent} ${t.text} ${t.bg}`} uppercase transition-all`}
                            >
                              {displaySess.isAdmin ? 'REVOKE' : 'GRANT'}
                            </button>
                          </div>

                          {displaySess.isAdmin && (
                            <div className="pt-3 border-t border-slate-800 space-y-3">
                              {[
                                { id: 'banUser', label: 'Ban Power', detail: 'Restrict identities' },
                                { id: 'viewUser', label: 'Inspector Power', detail: 'View full session data' },
                                { id: 'manageAdmins', label: 'Management Power', detail: 'Revoke/Grant privileges' },
                                { id: 'fullAccess', label: 'Full Node Access', detail: 'All admin modules' }
                              ].map(priv => (
                                <div key={priv.id} className="flex items-center justify-between">
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-mono text-slate-400 uppercase">{priv.label}</span>
                                    <span className="text-[7px] font-mono text-slate-600 uppercase">{priv.detail}</span>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      const currentPrivs = displaySess.privileges || {};
                                      grantAdminPrivileges(displaySess.id, {
                                        ...currentPrivs,
                                        [priv.id]: !currentPrivs[priv.id]
                                      }, sessionId);
                                    }}
                                    className={`px-2 py-0.5 text-[8px] font-mono border ${displaySess.privileges?.[priv.id] ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : 'border-slate-700 text-slate-500'} uppercase transition-all`}
                                  >
                                    {displaySess.privileges?.[priv.id] ? 'ENABLED' : 'DISABLED'}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest leading-relaxed">
                       PROBE_ID: {displaySess.id}<br/>
                       LAST_AUTH: {displaySess.lastActive?.toDate?.()?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                ) : (
                  <div className="h-40 flex flex-col items-center justify-center text-slate-700 border border-dashed border-slate-800">
                     <User size={32} className="opacity-20 mb-2" />
                     <span className="text-[10px] font-mono uppercase">Select a session to inspect</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ban Registry */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-900/60 border border-slate-800 p-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-red-500 mb-6 flex items-center gap-2">
                  <ShieldCheck size={16} />
                  Registry of Forbidden Identities
                </h3>
                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                  {bans.length > 0 ? bans.map(ban => (
                    <div key={ban.id} className="p-4 bg-red-950/10 border border-red-900/20 flex items-center justify-between group">
                      <div className="flex flex-col gap-1 overflow-hidden">
                        <span className="text-[10px] font-mono text-red-500 font-bold">
                          {sessions.find(s => s.id === ban.id)?.username || 'Banned Operator'} 
                          <span className="text-slate-600 font-normal ml-2">({ban.id})</span>
                        </span>
                        <span className="text-[8px] font-mono text-slate-600">
                          Banned on: {ban.bannedAt?.toDate?.()?.toLocaleString() || 'Recent'}
                        </span>
                      </div>
                      {hasPrivilege('banUser') && (
                        <button
                          onClick={() => unbanUser(ban.id)}
                          className="px-3 py-1 bg-slate-950/50 border border-slate-800 text-[9px] font-mono text-slate-400 uppercase tracking-widest hover:border-emerald-500 hover:text-emerald-400 transition-all"
                        >
                          Restore Access
                        </button>
                      )}
                    </div>
                  )) : (
                    <div className="h-40 flex items-center justify-center text-slate-600 font-mono text-[10px] uppercase">
                      Registry clear. No restrictions active.
                    </div>
                  )}
                </div>
              </div>

              {hasPrivilege('fullAccess') && (
                <div className="bg-slate-900/60 border border-slate-800 p-8">
                  <h3 className={`text-sm font-bold uppercase tracking-widest ${t.text} mb-6 flex items-center gap-2`}>
                    <Info size={16} />
                    System Configuration
                  </h3>
                  <div className="space-y-4 font-mono text-[11px]">
                    <div className="flex justify-between border-b border-slate-800/50 pb-2">
                      <span className="text-slate-500 uppercase">Core Logic</span>
                      <span className={t.text}>OPERATIONAL</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/50 pb-2">
                      <span className="text-slate-500 uppercase">Database Link</span>
                      <span className={t.text}>ENCRYPTED</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/50 pb-2">
                      <span className="text-slate-500 uppercase">Admin Access</span>
                      <span className={`${isOwner ? t.text : t.text} font-bold`}>
                        {isOwner ? 'OWNER_VERIFIED' : 'AUTHORIZED'}
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
              )}
            </div>
            
            {!isOwner && (
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
  };

  const renderProxies = () => (
    <div className="flex-1 p-6 md:p-10 w-full max-w-6xl mx-auto overflow-y-auto bg-slate-950/30">
      <div className="mb-10 border-b border-slate-800 pb-6 flex items-end justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-none flex overflow-hidden border border-slate-900 ${t.glow}`}>
            <div className="w-1/2 h-full bg-white"></div>
            <div className={`w-1/2 h-full ${t.primary}`}></div>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase text-slate-200 mb-1 leading-none">
              PROXIES<span className={t.primaryText}>.</span>
            </h1>
            <div className="flex items-center gap-4">
              <p className={`text-[10px] font-mono ${t.text} tracking-[0.2em] uppercase`}>
                {proxiesData.length} proxies available
              </p>
              <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>
              <a 
                href="https://forms.gle/tfs9dLpsjz1jBhjZ6"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-2 py-0.5 ${t.bg} border ${t.border} rounded-sm hover:bg-slate-800 transition-all group`}
              >
                <MessageSquarePlus size={10} className={`${t.text} group-hover:text-white`} />
                <span className={`text-[9px] font-mono ${t.text} font-bold tracking-wider uppercase`}>REQUEST NODE</span>
              </a>
            </div>
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
              className={`bg-slate-900/60 backdrop-blur-sm border border-slate-800 p-6 flex flex-col group transition-all hover:${t.border} hover:${t.bg}`}
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className={`text-lg font-black uppercase tracking-tight text-white group-hover:${t.text} transition-colors`}>
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
                className={`mt-auto flex items-center justify-center gap-2 py-3 ${t.primary} text-[10px] text-white font-bold uppercase tracking-widest ${t.hover} transition-all ${t.glow} cursor-pointer`}
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
            The proxy registry is currently empty. You can add your own custom proxy nodes by updating the <code className={`${t.text} px-1 font-mono`}>proxies.json</code> data file.
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
          <p className="text-slate-400 font-mono text-xs uppercase tracking-widest mb-4">
            This session identifier has been restricted from accessing the nebula network.
          </p>
          
          {userProfile?.isAdmin && (
             <div className="mb-6 p-4 bg-red-950/30 border border-red-500/50 text-left">
                <span className="block text-[8px] font-mono text-red-400 uppercase mb-2 font-black">Restricted Access Details</span>
                <p className="text-[10px] font-mono text-slate-200 mb-2 uppercase">Violation: <span className="text-white font-bold">{bans.find(b => b.id === sessionId)?.ruleBroken || 'Unknown Protocol Violation'}</span></p>
                <p className="text-[10px] font-mono text-slate-400 uppercase italic">Reason: {bans.find(b => b.id === sessionId)?.reason || 'Reason not specified in registry.'}</p>
             </div>
          )}
          
          {!userProfile?.isAdmin && isBanned && (
             <div className="mb-6 p-4 bg-red-950/30 border border-red-500/50 text-left">
                <span className="block text-[8px] font-mono text-red-500 uppercase mb-2 font-black">Violation Report</span>
                <p className="text-[10px] font-mono text-slate-200 mb-2 uppercase">Rule: <span className="text-white font-bold">{bans.find(b => b.id === sessionId)?.ruleBroken || 'General Misconduct'}</span></p>
                <p className="text-[10px] font-mono text-slate-400 uppercase italic">Analyst Note: {bans.find(b => b.id === sessionId)?.reason || 'System automated restriction.'}</p>
             </div>
          )}
          <div className="py-2 px-4 bg-slate-900 border border-slate-800 inline-block mb-8">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">ID: </span>
            <span className="text-[10px] font-mono text-red-500 font-bold">{sessionId}</span>
          </div>

          <div>
             <a 
               href="https://forms.gle/T5ESZpQPGDP2xSfZ7"
               target="_blank"
               rel="noopener noreferrer"
               className="inline-flex items-center gap-2 px-6 py-3 bg-red-600/10 border border-red-600/30 text-red-500 text-[10px] font-mono font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all group"
             >
               <MessageSquarePlus size={14} className="group-hover:scale-110 transition-transform" />
               File Ban Appeal
             </a>
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
            <div className={`w-10 h-10 border ${t.border.replace('border-', 'border-')} flex items-center justify-center ${t.bg}`}>
              <User size={20} className={t.text} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white leading-none">
                {userProfile?.username ? `Welcome Back to Nebula Network ${userProfile.username}` : 'Welcome to Nebula Network'}
              </h1>
              <p className={`text-[9px] font-mono ${t.text} uppercase tracking-[0.2em] mt-1`}>
                {userProfile?.username ? 'Personnel Verification' : 'New Node Initialization'}
              </p>
            </div>
          </div>

          {!showPasswordLogin && !userProfile?.agreedSiteRules ? (
            <div className="relative z-10">
              <div className="mb-6 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                <h3 className={`text-xs font-mono font-black ${t.text} uppercase mb-4 sticky top-0 bg-slate-900/80 py-1`}>Nebula Protocol Agreement</h3>
                <div className="space-y-4">
                  {SITE_RULES.map(rule => (
                    <div key={rule.id} className="p-3 bg-slate-950 border border-slate-800">
                      <span className="text-[8px] font-mono text-slate-500 uppercase">{rule.id}</span>
                      <p className="text-[10px] font-mono text-white uppercase font-bold mb-1">{rule.title}</p>
                      <p className="text-[9px] font-mono text-slate-400 uppercase leading-snug">{rule.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setAgreedSiteRules(sessionId)}
                className={`w-full py-4 ${t.primary} text-[10px] text-white font-bold uppercase tracking-[0.3em] ${t.hover} transition-all ${t.glow}`}
              >
                Accept Protocols
              </button>
            </div>
          ) : !showPasswordLogin ? (
            <form onSubmit={handleNameSubmit} className="relative z-10">
              <div className="mb-8">
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3">Operator Codename</label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className={`w-full bg-slate-950 border ${nameError ? 'border-red-500' : 'border-slate-800'} p-4 text-slate-200 font-mono text-sm focus:${t.border.replace('border-', 'border-')} outline-none transition-all placeholder:text-slate-800`}
                  placeholder="Enter Username..."
                  maxLength={20}
                />
                {nameError && (
                  <p className="text-[10px] text-red-500 mt-3 font-mono uppercase tracking-widest bg-red-950/20 p-2 border-l-2 border-red-500 animate-pulse">
                    {nameError}
                  </p>
                )}
                <p className="text-[8px] text-slate-600 mt-3 font-mono uppercase tracking-widest italic leading-relaxed">
                  * This identifier will be linked to your session token. {!userProfile?.username && "You will be prompted to set a security key next."}
                </p>
              </div>

              <button
                type="submit"
                className={`w-full py-4 ${t.primary} text-[10px] text-white font-bold uppercase tracking-[0.3em] ${t.hover} transition-all ${t.glow} flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group`}
                disabled={nameInput.trim().length < 2 || isSubmittingName}
              >
                {isSubmittingName ? 'INITIALIZING...' : 'Initialize Session'}
                {!isSubmittingName && <Play size={14} className="group-hover:translate-x-1 transition-transform" />}
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
                    className={`text-[9px] font-mono ${t.text} uppercase underline bg-transparent border-none p-0`}
                  >
                    Change Name
                  </button>
                </div>
                <p className="text-xs text-white font-bold mb-4 font-mono uppercase tracking-tight">
                  {pendingSession.isNew ? 'Create Security Key for' : 'Verify Identity for'}: <span className={t.text}>{pendingSession.username}</span>
                </p>
                <input
                  type="password"
                  autoFocus
                  required
                  value={loginPasswordInput}
                  onChange={(e) => setLoginPasswordInput(e.target.value)}
                  className={`w-full bg-slate-950 border ${nameError ? 'border-red-500' : 'border-slate-800'} p-4 text-slate-200 font-mono text-sm focus:${t.border.replace('border-', 'border-')} outline-none transition-all placeholder:text-slate-800`}
                  placeholder={pendingSession.isNew ? "Create Account Password..." : "Enter Security Key..."}
                />
                {nameError && (
                  <p className="text-[10px] text-red-500 mt-3 font-mono uppercase tracking-widest bg-red-950/20 p-2 border-l-2 border-red-500 animate-pulse">
                    {nameError}
                  </p>
                )}
                {pendingSession.isNew && (
                  <p className="text-[8px] text-slate-600 mt-3 font-mono uppercase tracking-widest italic leading-relaxed">
                    * This password will be required if you access from a different device.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmittingName || loginPasswordInput.length === 0}
                className={`w-full py-4 ${t.primary} text-[10px] text-white font-bold uppercase tracking-[0.3em] ${t.hover} transition-all ${t.glow} flex items-center justify-center gap-3 disabled:opacity-50`}
              >
                {isSubmittingName ? 'VERIFYING...' : (pendingSession.isNew ? 'Initialize Security' : 'De-Encrypt & Join')}
                {!isSubmittingName && <ShieldCheck size={14} />}
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
              className={`${isActive ? `${t.text} fill-current` : 'text-slate-700' } ${onRate ? 'cursor-pointer hover:scale-125 transition-transform' : ''}`}
              onClick={() => onRate && onRate(starValue)}
            />
          );
        })}
      </div>
    );
  };

  const handleSidebarClick = (tab) => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setActiveTab(tab);
    handleCloseItem();
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
      {/* Ban Reason Modal */}
      {showBanModal && (
        <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-red-900/30 p-10 shadow-2xl">
            <div className="flex items-center gap-4 mb-8 text-red-500">
              <ShieldCheck size={24} />
              <h1 className="text-xl font-black uppercase tracking-tighter">Restriction Directive</h1>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">Protocol Violation</label>
                <select 
                  value={banRule}
                  onChange={(e) => setBanRule(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-3 text-slate-200 font-mono text-xs focus:border-red-500 outline-none"
                >
                  <option value="">Select Rule...</option>
                  {[...SITE_RULES, { id: 'C1', title: 'Chat Misconduct', detail: 'Violation of communications protocol.' }].map(rule => (
                    <option key={rule.id} value={rule.title}>{rule.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">Detailed Reason (Internal)</label>
                <textarea 
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Elaborate on the reason for restriction..."
                  className="w-full bg-slate-950 border border-slate-800 p-3 text-slate-200 font-mono text-xs focus:border-red-500 outline-none h-24 resize-none"
                />
              </div>

              <div className="flex gap-4">
                 <button 
                   onClick={() => { setShowBanModal(null); setBanReason(''); setBanRule(''); }}
                   className="flex-1 py-3 border border-slate-800 text-[10px] font-mono text-slate-500 uppercase hover:text-white"
                 >
                   Abort
                 </button>
                 <button 
                   onClick={handleBanConfirm}
                   disabled={!banRule || !banReason}
                   className="flex-1 py-3 bg-red-600 text-[10px] text-white font-bold uppercase tracking-widest hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                 >
                   Execute Ban
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Locked Game Modal */}
      {lockedGameAttempt && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-10 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Lock size={120} />
             </div>
             
            <div className="flex items-center gap-4 mb-8">
              <div className={`w-10 h-10 border ${t.border.replace('border-', 'border-')} flex items-center justify-center ${t.bg}`}>
                <Lock size={20} className={t.text} />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white leading-none">Access Restricted</h2>
            </div>
            
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-6">
              The game <span className={t.text}>"{lockedGameAttempt.title}"</span> is currently secured by a personal cipher.
            </p>

            <form onSubmit={handleLockVerify} className="relative z-10">
              <div className="mb-6">
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">Security Token</label>
                <input
                  type="password"
                  autoFocus
                  value={lockPasswordInput}
                  onChange={(e) => setLockPasswordInput(e.target.value)}
                  className={`w-full bg-slate-950 border ${lockError ? 'border-red-500' : 'border-slate-800'} p-3 text-slate-200 font-mono text-sm focus:${t.border.replace('border-', 'border-')} outline-none transition-all placeholder:text-slate-800`}
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
                  className={`flex-1 py-3 ${t.primary} text-[10px] text-white font-bold uppercase tracking-widest ${t.hover} transition-all ${t.glow}`}
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
        <div className={`marquee-track text-[10px] font-bold tracking-widest uppercase ${t.text}`}>
          <span className="px-6">/// Nebula Games Portal ///</span>
          <span className="px-6 text-slate-500">Nebula Network™</span>
          <span className="px-6">/// Nebula Games Portal ///</span>
          <span className="px-6 text-slate-500">Nebula Network™</span>
          <span className="px-6">/// Nebula Games Portal ///</span>
          <span className="px-6 text-slate-500">Nebula Network™</span>
          <span className="px-6">/// Nebula Games Portal ///</span>
          <span className="px-6 text-slate-500">Nebula Network™</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <nav className="w-16 md:w-20 border-r border-slate-800 bg-slate-950/40 backdrop-blur-sm flex flex-col items-center py-8 shrink-0 z-40">
          <button
            onClick={() => handleSidebarClick('games')}
            className={`p-4 transition-all ${activeTab === 'games' ? `${t.text} scale-110 ${t.glow}` : 'text-slate-600 hover:text-slate-400'}`}
            title="Games"
          >
            <Gamepad2 size={24} strokeWidth={activeTab === 'games' ? 3 : 2} />
          </button>
          <button
            onClick={() => handleSidebarClick('proxies')}
            className={`p-4 mt-4 transition-all ${activeTab === 'proxies' ? `${t.text} scale-110 ${t.glow}` : 'text-slate-600 hover:text-slate-400'}`}
            title="Proxies"
          >
            <ShieldCheck size={24} strokeWidth={activeTab === 'proxies' ? 3 : 2} />
          </button>
          <button
            onClick={() => handleSidebarClick('chat')}
            className={`p-4 mt-4 transition-all ${activeTab === 'chat' ? `${t.text} scale-110 ${t.glow}` : 'text-slate-600 hover:text-slate-400'}`}
            title="Chat"
          >
            <MessageSquare size={24} strokeWidth={activeTab === 'chat' ? 3 : 2} />
          </button>
          <button
            onClick={() => handleSidebarClick('profile')}
            className={`p-4 mt-4 transition-all ${activeTab === 'profile' ? `${t.text} scale-110 ${t.glow}` : 'text-slate-600 hover:text-slate-400'}`}
            title="Profile"
          >
            <User size={24} strokeWidth={activeTab === 'profile' ? 3 : 2} />
          </button>
          <button
            onClick={() => handleSidebarClick('admin')}
            className={`p-4 mt-4 transition-all ${activeTab === 'admin' ? `${t.text} scale-110 ${t.glow}` : 'text-slate-600 hover:text-slate-400'}`}
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
                <div className={`w-12 h-12 rounded-none flex overflow-hidden border border-slate-900 ${t.glow}`}>
                  <div className="w-1/2 h-full bg-white"></div>
                  <div className={`w-1/2 h-full ${t.primary}`}></div>
                </div>
                <div>
                 <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase text-slate-200 mb-1 leading-none">
                   GAMES<span className={t.primaryText}>.</span>
                 </h1>
                 <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                   <p className={`text-[10px] font-mono ${t.text} tracking-[0.2em] uppercase`}>
                     {gamesData.length} games available
                   </p>
                   <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>
                   <div className="flex items-center gap-3">
                     <div className={`flex items-center gap-2 px-2 py-0.5 ${t.bg} border ${t.border} rounded-sm`}>
                       <TrendingUp size={10} className={t.text} />
                       <span className={`text-[10px] font-mono ${t.text} font-bold tracking-wider`}>
                         {visitCount.toLocaleString()} VISITS
                       </span>
                     </div>
                     <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>
                     <a 
                       href="https://forms.gle/tfs9dLpsjz1jBhjZ6"
                       target="_blank"
                       rel="noopener noreferrer"
                       className={`flex items-center gap-2 px-2 py-0.5 ${t.bg} border ${t.border} rounded-sm hover:bg-slate-800 transition-all group`}
                     >
                       <MessageSquarePlus size={10} className={`${t.text} group-hover:text-white`} />
                       <span className={`text-[9px] font-mono ${t.text} font-bold tracking-wider uppercase`}>REQUEST GAME</span>
                     </a>
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
                        className={`bg-slate-900 border border-slate-800 py-2 pl-10 pr-4 text-[10px] font-mono text-slate-200 focus:${t.border.replace('border-', 'border-')} outline-none transition-all w-full uppercase tracking-tighter`}
                      />
                    </div>
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-sm">
                      <span className="text-[8px] font-mono text-slate-500 uppercase">Sort:</span>
                      <select
                        value={gameSortOption}
                        onChange={(e) => setGameSortOption(e.target.value)}
                        className="bg-transparent text-[10px] font-mono text-slate-200 outline-none cursor-pointer uppercase"
                      >
                        <option value="title" className="bg-slate-950">Title</option>
                        <option value="developer" className="bg-slate-950">Developer</option>
                        <option value="genre" className="bg-slate-950">Genre</option>
                        <option value="rating" className="bg-slate-950">Rating</option>
                      </select>
                    </div>
                    
                    <button
                      onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                      className={`flex items-center gap-2 px-3 py-1.5 border transition-all rounded-sm ${showFavoritesOnly ? `${t.bg} ${t.border} ${t.text}` : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                    >
                      <Heart size={14} className={showFavoritesOnly ? 'fill-current' : ''} />
                      <span className="text-[10px] font-mono uppercase tracking-widest hidden sm:inline">Favorites</span>
                    </button>

                    <div className="hidden md:block">
                      <Gamepad2 size={32} className="text-slate-700" />
                    </div>
                  </div>
                </div>

                {/* Logic for Recently Played and New Arrivals */}
                {(() => {
                  const recentlyPlayed = Object.entries(userProfile?.playStats || {})
                    .sort(([, a], [, b]) => new Date(b.lastPlayed) - new Date(a.lastPlayed))
                    .slice(0, 4)
                    .map(([id]) => gamesData.find(g => g.id === id))
                    .filter(Boolean);

                  const newArrivals = [...gamesData].slice(-4).reverse();

                  if (gameSearchQuery || showFavoritesOnly) return null;

                  return (
                    <div className="w-full mb-10 space-y-10">
                      {recentlyPlayed.length > 0 && (
                        <section>
                          <div className="flex items-center gap-2 mb-4">
                            <Clock size={14} className={t.text} />
                            <h2 className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-slate-500">Recently Played</h2>
                          </div>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {recentlyPlayed.map(game => (
                              <div
                                key={`recent-${game.id}`}
                                onClick={() => handleGameSelect({ ...game, type: 'game' })}
                                className={`bg-slate-900/40 border border-slate-800/50 p-2 flex items-center gap-3 group cursor-pointer hover:${t.border} transition-all`}
                              >
                                <div className="w-10 h-10 bg-slate-950 flex items-center justify-center border border-slate-800">
                                  <Gamepad2 size={16} className="text-slate-700" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-[10px] font-bold text-slate-200 truncate uppercase">{game.title}</h4>
                                  <p className="text-[8px] font-mono text-slate-600 truncate uppercase">{game.genre}</p>
                                </div>
                                <ArrowLeft size={12} className="text-slate-800 -rotate-180 group-hover:text-slate-400 transition-colors" />
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      <section>
                        <div className="flex items-center gap-2 mb-4">
                          <Sparkles size={14} className={t.text} />
                          <h2 className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-slate-500">New Arrivals</h2>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {newArrivals.map(game => (
                            <div
                              key={`new-${game.id}`}
                              onClick={() => handleGameSelect({ ...game, type: 'game' })}
                              className={`bg-slate-900/60 border border-slate-800 p-3 flex flex-col group cursor-pointer hover:${t.bg} transition-all relative overflow-hidden`}
                            >
                              <div className={`absolute top-0 right-0 px-1.5 py-0.5 ${t.bg} text-[7px] font-mono ${t.text} uppercase tracking-tighter border-l border-b ${t.border}`}>NEW</div>
                              <h4 className="text-[11px] font-black text-slate-100 mb-1 uppercase tracking-tighter">{game.title}</h4>
                              <p className="text-[8px] font-mono text-slate-500 uppercase">{game.developer || 'Unknown'}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                      
                      <div className="pt-4 border-t border-slate-900 flex items-center gap-2">
                        <List size={12} className="text-slate-700" />
                        <h2 className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-slate-700">All Datastreams</h2>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
                  {(() => {
                    const filteredGames = gamesData
                      .filter(g => 
                        (g.title.toLowerCase().includes(gameSearchQuery.toLowerCase()) || 
                        g.genre.toLowerCase().includes(gameSearchQuery.toLowerCase()) ||
                        (g.developer && g.developer.toLowerCase().includes(gameSearchQuery.toLowerCase()))) &&
                        (!showFavoritesOnly || userProfile?.favorites?.[g.id])
                      )
                      .sort((a, b) => {
                        if (gameSortOption === 'rating') {
                          const ratingA = (gameStats[a.id]?.ratingSum / (gameStats[a.id]?.ratingCount || 1)) || 0;
                          const ratingB = (gameStats[b.id]?.ratingSum / (gameStats[b.id]?.ratingCount || 1)) || 0;
                          return ratingB - ratingA;
                        }
                        return (a[gameSortOption] || '').localeCompare(b[gameSortOption] || '');
                      });
                    
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
                      <div
                        key={game.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleGameSelect({ ...game, type: 'game' })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleGameSelect({ ...game, type: 'game' });
                          }
                        }}
                        className={`bg-slate-900/60 backdrop-blur-sm border border-slate-800 p-2 flex flex-col text-left group cursor-pointer transition-all hover:${t.border} hover:${t.bg} h-full relative overflow-hidden`}
                      >
                        <div className={`absolute top-0 left-0 w-1 h-0 group-hover:h-full ${t.primary} transition-all duration-300`}></div>
                        
                        <div className="w-full bg-slate-800 mb-3 relative overflow-hidden aspect-video flex justify-center items-center shadow-inner">
                          <div className={`absolute inset-0 bg-gradient-to-br ${t.bg} opacity-20`}></div>
                          
                          <div className={`absolute -right-2 -bottom-2 font-black text-6xl text-slate-700/20 z-0 leading-none group-hover:${t.text.replace('text-', 'text-')}/10 transition-colors`}>
                            {String(index + 1).padStart(2, '0')}
                          </div>

                          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-1.5 py-0.5 bg-slate-950/80 backdrop-blur-sm border border-slate-800/50 rounded-sm z-10">
                            <Star size={10} className={`${t.text} fill-current`} />
                            <span className="text-[9px] font-mono text-slate-200">{avgRating > 0 ? avgRating.toFixed(1) : '---'}</span>
                          </div>

                          <div className="absolute top-2 right-2 flex flex-col gap-1 z-20">
                            {isLocked && (
                              <div className={`p-1 ${t.bg} border ${t.border} rounded-sm`}>
                                <Lock size={10} className={t.text} />
                              </div>
                            )}
                            <button
                              onClick={(e) => handleToggleFavorite(e, game.id)}
                              className={`p-1 bg-slate-950/80 border border-slate-800 rounded-sm transition-all hover:border-slate-600 ${userProfile?.favorites?.[game.id] ? t.text : 'text-slate-500 hover:text-slate-300'}`}
                            >
                              <Heart size={10} className={userProfile?.favorites?.[game.id] ? 'fill-current' : ''} />
                            </button>
                          </div>
                          
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/40 backdrop-blur-[2px] z-10">
                            <div className={`p-3 bg-slate-900 border ${t.border} rounded-full shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-300`}>
                              {isLocked ? <Lock size={20} className={t.text} /> : <Play size={20} className={t.text} fill="currentColor" />}
                            </div>
                          </div>
                        </div>
                        
                        <div className="relative z-10 flex flex-col flex-1 px-1">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h2 className="text-xs font-bold uppercase tracking-tight text-slate-200 group-hover:text-white transition-colors line-clamp-1 flex-1">
                              {game.title}
                            </h2>
                            <span className="px-1.5 py-0.5 bg-slate-950/80 text-[8px] font-mono whitespace-nowrap text-slate-500 uppercase rounded-sm border border-slate-800 shadow-sm">
                              {game.genre}
                            </span>
                          </div>
                          
                          <p className="text-[9px] text-slate-500 uppercase mb-2 font-medium tracking-wider">
                            By {game.developer}
                          </p>
                          
                          {game.description && (
                            <p className="text-[9px] text-slate-400/80 leading-tight mb-4 line-clamp-2 italic opacity-60 group-hover:opacity-100 transition-opacity">
                              {game.description}
                            </p>
                          )}
                          
                          <div className={`mt-auto pt-2 border-t border-slate-800/50 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest`}>
                            <span className={`${t.text} font-bold flex items-center gap-1.5`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${isLocked ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse'}`}></div>
                              {isLocked ? 'Restricted' : 'Active'}
                            </span>
                            <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 ${t.text}`}>
                              <Play size={10} className="fill-current" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                })()}
              </div>
              </div>
            ) : activeTab === 'proxies' ? (
              renderProxies()
            ) : activeTab === 'chat' ? (
              renderChat()
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
                            onClick={handleCloseItem}
                            className={`flex items-center justify-center w-8 h-8 bg-slate-900 border border-slate-700 hover:${t.border} text-slate-400 hover:${t.text} transition-colors shadow-sm cursor-pointer`}
                            title="Go Back"
                          >
                            <ArrowLeft size={16} />
                          </button>
                          <button 
                            onClick={toggleFullscreen}
                            className={`flex items-center justify-center w-8 h-8 bg-slate-900 border border-slate-700 hover:${t.border} text-slate-400 hover:${t.text} transition-colors shadow-sm cursor-pointer`}
                            title="Fullscreen"
                          >
                            <Maximize size={16} />
                          </button>
                          <a
                            href={activeItem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center justify-center w-8 h-8 ${t.bg} border ${t.border} hover:${t.primary} hover:border-transparent text-slate-300 hover:text-white transition-all shadow-sm cursor-pointer`}
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
                          <Info size={14} className={t.text} />
                          <span>{activeItem.genre || 'Secure Node'}</span>
                          <span className="text-slate-700">//</span>
                          <span>{activeItem.developer || activeItem.id}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div 
                      ref={iframeContainerRef}
                      className={`flex-1 w-full border border-slate-800 relative bg-slate-900 p-1 ${t.glow.replace('shadow-[', 'shadow-[0_0_20px_')} overflow-hidden`}
                    >
                      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-${t.accent}-500/50 to-transparent z-10 pointer-events-none`}></div>
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
