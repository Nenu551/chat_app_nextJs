"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ref,
  push,
  query,
  limitToLast,
  onValue,
  set,
  remove,
  onDisconnect,
  update,
} from "firebase/database";
import { db } from "@/lib/firebase";
import DisplayNameModal from "./DisplayNameModal";

export default function ChatInterface({ roomId }) {
  // Session tracking
  const [myUserId] = useState(() => "user_" + Math.random().toString(36).substring(2, 9));
  
  // UI states
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [theme, setTheme] = useState("light");
  
  // Settings & Actions
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [activePickerId, setActivePickerId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");
  
  // Dynamic features
  const [presenceCount, setPresenceCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const isInitialScrollRef = useRef(true);
  const typingTimeoutRef = useRef(null);
  const settingsRef = useRef(null);
  const lastMessageIdRef = useRef(null);

  // Synthesize sound via Web Audio API (zero external assets)
  const playPopSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(350, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.error("Audio playback blocked/failed:", e);
    }
  };

  // Close settings or emoji pickers on outside clicks
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
      if (activePickerId && !e.target.closest(".picker-trigger") && !e.target.closest(".picker-box")) {
        setActivePickerId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [activePickerId]);

  // Initial load config
  useEffect(() => {
    setIsMounted(true);
    
    // Display Name
    const savedName = localStorage.getItem("anon_chat_display_name");
    if (savedName) {
      setDisplayName(savedName);
    } else {
      setShowNameModal(true);
    }

    // Audio Preference
    const savedSound = localStorage.getItem("sound_enabled");
    if (savedSound !== null) {
      setSoundEnabled(savedSound === "true");
    }

    // Theme Config
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(savedTheme);
    } else {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialTheme = systemDark ? "dark" : "light";
      setTheme(initialTheme);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(initialTheme);
    }
  }, []);

  // Firebase Realtime DB subscriptions
  useEffect(() => {
    if (!db || !roomId) return;

    // 1. Connection status listener
    const connectedRef = ref(db, ".info/connected");
    const unsubscribeConnected = onValue(connectedRef, (snap) => {
      setIsConnected(snap.val() === true);
    });

    // 2. Messages listener (limited to last 200)
    const messagesQuery = query(
      ref(db, `rooms/${roomId}/messages`),
      limitToLast(200)
    );

    const unsubscribeMessages = onValue(messagesQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed = Object.entries(data)
          .map(([id, val]) => ({
            id,
            ...val,
          }))
          .sort((a, b) => a.timestamp - b.timestamp);
        setMessages(parsed);
      } else {
        setMessages([]);
      }
    });

    // 3. Typing indicator listener
    const typingRef = ref(db, `rooms/${roomId}/typing`);
    const unsubscribeTyping = onValue(typingRef, (snap) => {
      const val = snap.val();
      if (val) {
        const typers = Object.entries(val)
          .filter(([id]) => id !== myUserId)
          .map(([, name]) => name);
        setTypingUsers(typers);
      } else {
        setTypingUsers([]);
      }
    });

    return () => {
      unsubscribeConnected();
      unsubscribeMessages();
      unsubscribeTyping();
    };
  }, [roomId]);

  // Presence tracker effect
  useEffect(() => {
    if (!db || !roomId || !displayName) return;

    const myPresenceRef = ref(db, `rooms/${roomId}/presence/${myUserId}`);
    set(myPresenceRef, {
      name: displayName,
      timestamp: Date.now(),
    });
    onDisconnect(myPresenceRef).remove();

    const presenceRef = ref(db, `rooms/${roomId}/presence`);
    const unsubscribePresence = onValue(presenceRef, (snap) => {
      const val = snap.val();
      if (val) {
        setPresenceCount(Object.keys(val).length);
      } else {
        setPresenceCount(0);
      }
    });

    return () => {
      remove(myPresenceRef);
      unsubscribePresence();
    };
  }, [roomId, displayName]);

  // Listen to new messages to trigger pop sound
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMessageIdRef.current && lastMessageIdRef.current !== lastMsg.id) {
        if (lastMsg.sender !== displayName && soundEnabled) {
          playPopSound();
        }
      }
      lastMessageIdRef.current = lastMsg.id;
    }
  }, [messages, soundEnabled, displayName]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      if (isInitialScrollRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "auto" });
        isInitialScrollRef.current = false;
      } else {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages]);

  // Theme controls
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(newTheme);
  };

  // Sound toggle
  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem("sound_enabled", String(newVal));
  };

  const handleSaveName = (name) => {
    localStorage.setItem("anon_chat_display_name", name);
    setDisplayName(name);
    setShowNameModal(false);
  };

  const handleCloseNameModal = () => {
    const savedName = localStorage.getItem("anon_chat_display_name");
    if (!savedName) {
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const guestName = `Guest${randomId}`;
      handleSaveName(guestName);
    } else {
      setShowNameModal(false);
    }
  };

  // Textarea typing handler
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    if (!db || !roomId || !displayName) return;

    if (!isTyping && val.trim().length > 0) {
      setIsTyping(true);
      const myTypingRef = ref(db, `rooms/${roomId}/typing/${myUserId}`);
      set(myTypingRef, displayName);
      onDisconnect(myTypingRef).remove();
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      remove(ref(db, `rooms/${roomId}/typing/${myUserId}`));
    }, 1500);
  };

  // Send message
  const handleSend = (e) => {
    if (e) e.preventDefault();
    const trimmedText = inputText.trim();

    if (!trimmedText || trimmedText.length > 2000 || !db) return;

    const messagesRef = ref(db, `rooms/${roomId}/messages`);
    push(messagesRef, {
      sender: displayName || "Anonymous",
      text: trimmedText,
      timestamp: Date.now(),
    });

    setInputText("");
    
    // Clear typing indicator immediately on send
    setIsTyping(false);
    remove(ref(db, `rooms/${roomId}/typing/${myUserId}`));
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Message edits/deletes
  const handleDeleteMessage = (msgId) => {
    if (!db || !roomId) return;
    if (confirm("Are you sure you want to delete this message?")) {
      remove(ref(db, `rooms/${roomId}/messages/${msgId}`));
    }
  };

  const handleStartEdit = (msgId, text) => {
    setEditingMessageId(msgId);
    setEditText(text);
  };

  const handleSaveEdit = (msgId) => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed.length > 2000 || !db) return;
    
    update(ref(db, `rooms/${roomId}/messages/${msgId}`), {
      text: trimmed,
      edited: true,
    });
    setEditingMessageId(null);
    setEditText("");
  };

  // Emoji Reactions Toggle
  const toggleReaction = (msgId, emoji) => {
    if (!db || !roomId || !displayName) return;
    
    const message = messages.find((m) => m.id === msgId);
    const hasReacted = message?.reactions?.[emoji]?.[myUserId];
    
    const reactionRef = ref(
      db,
      `rooms/${roomId}/messages/${msgId}/reactions/${emoji}/${myUserId}`
    );

    if (hasReacted) {
      remove(reactionRef);
    } else {
      set(reactionRef, displayName);
    }
    setActivePickerId(null);
  };

  // Clear Room history
  const handleClearHistory = () => {
    if (!db || !roomId) return;
    if (
      confirm("WARNING: This will permanently wipe all message logs in this room for everyone. Proceed?")
    ) {
      remove(ref(db, `rooms/${roomId}/messages`));
      setShowSettings(false);
    }
  };

  const copyRoomLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Safe regex markdown parser
  const formatMessageText = (text) => {
    if (!text) return "";

    // Escape raw HTML strings
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    // Bold (**text**)
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Italic (*text*)
    escaped = escaped.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // Inline Code (`code`)
    escaped = escaped.replace(
      /`/g,
      ""
    ); // clear raw backticks when rendering structured styles
    
    // Convert text inside backticks to styled code blocks
    let rawCodeRegex = /`([^`]+)`/g;
    escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
      
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    escaped = escaped.replace(/\*(.*?)\*/g, "<em>$1</em>");
    escaped = escaped.replace(
      rawCodeRegex,
      '<code class="px-1.5 py-0.5 font-mono text-xs rounded bg-zinc-100 dark:bg-zinc-800 text-rose-600 dark:text-rose-400 font-semibold">$1</code>'
    );

    // Hyperlinks
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    escaped = escaped.replace(
      urlRegex,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="underline text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-semibold break-all">$1</a>'
    );

    return { __html: escaped };
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isFirebaseConfigured = !!db;

  if (!isMounted) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-650"></div>
      </div>
    );
  }

  if (!isFirebaseConfigured) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 min-h-screen bg-zinc-50 dark:bg-zinc-950 text-center">
        <div className="w-full max-w-lg p-8 bg-white dark:bg-zinc-900 border border-red-100 dark:border-red-950 rounded-2xl shadow-xl">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Firebase Config Missing</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
            Firebase Database credentials are not configured. Add them to your <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-red-600 font-mono text-xs">.env.local</code> and restart your development server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden font-sans">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition text-zinc-600 dark:text-zinc-400"
            title="Go home"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </a>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-zinc-900 dark:text-zinc-50 tracking-tight max-w-[100px] sm:max-w-[200px] truncate">
                #{roomId}
              </h1>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
                title={isConnected ? "Connected" : "Connecting..."}
              />
              <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-500 dark:text-zinc-400 font-medium">
                {presenceCount} online
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[150px] sm:max-w-none">
              Your name: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{displayName || "..."}</span>
            </div>
          </div>
        </div>

        {/* Action Center */}
        <div className="flex items-center gap-1.5 relative">
          
          {/* Light / Dark Mode */}
          <button
            onClick={toggleTheme}
            className="p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition cursor-pointer"
            title={theme === "dark" ? "Light theme" : "Dark theme"}
          >
            {theme === "dark" ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21M5.22 5.22l1.59 1.59m10.38 10.38 1.59 1.59M3 12h2.25m13.5 0H21M5.22 18.78l1.59-1.59m10.38-10.38 1.59-1.59M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
            )}
          </button>

          {/* Edit Name */}
          <button
            onClick={() => setShowNameModal(true)}
            className="px-2.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition cursor-pointer"
          >
            Edit Name
          </button>

          {/* Share room */}
          <button
            onClick={copyRoomLink}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
              isCopied
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-indigo-600 text-white hover:bg-indigo-500"
            }`}
          >
            {isCopied ? "Copied!" : "Share"}
          </button>

          {/* Settings Dropdown Wrapper */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
              </svg>
            </button>

            {showSettings && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 p-1.5 flex flex-col gap-1">
                <button
                  onClick={toggleSound}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition text-left cursor-pointer"
                >
                  {soundEnabled ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                      </svg>
                      Mute Sounds
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                      </svg>
                      Unmute Sounds
                    </>
                  )}
                </button>
                <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-red-650 dark:text-red-400 transition text-left cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 9m-4.78 0L9 9m4.78-3L12 2.5 9.22 6M3.75 6.125h16.5M4.5 6.125l1 13.5a2.25 2.25 0 0 0 2.25 2.25h8.5a2.25 2.25 0 0 0 2.25-2.25l1-13.5" />
                  </svg>
                  Clear History
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Message history */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl flex items-center justify-center text-indigo-500 dark:text-indigo-400 mb-4 animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Room is quiet...</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
              No messages have been sent yet. Share the link with friends to start chatting in real time!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === displayName;
            const isEditing = editingMessageId === msg.id;
            
            return (
              <div
                key={msg.id}
                className={`group relative flex flex-col max-w-[85%] sm:max-w-[70%] ${
                  isMe ? "ml-auto items-end" : "mr-auto items-start"
                }`}
              >
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                    {isMe ? "You" : msg.sender}
                  </span>
                </div>
                
                {/* Bubble Wrapper */}
                <div className="relative flex items-center w-full gap-2">
                  
                  {/* Message Bubble Container */}
                  <div
                    className={`flex flex-col w-full relative ${
                      isMe ? "items-end" : "items-start"
                    }`}
                  >
                    {isEditing ? (
                      // Inline edit form
                      <div className="w-full flex flex-col gap-1.5 p-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl min-w-[200px] sm:min-w-[280px]">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          maxLength={2000}
                          rows={2}
                          className="w-full text-sm bg-transparent outline-none resize-none border-none p-1.5 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 font-sans"
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setEditingMessageId(null)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-zinc-650 dark:text-zinc-400 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(msg.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Standard message bubble rendering
                      <div
                        className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm break-words max-w-full ${
                          isMe
                            ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-none"
                            : "bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 text-zinc-900 dark:text-zinc-100 rounded-tl-none"
                        }`}
                      >
                        {/* Actions overlay pill (React, Edit, and Delete) */}
                        <div
                          className={`flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-0.5 px-1 rounded-xl shadow-md z-25 absolute -top-3.5 transition-opacity duration-200 opacity-100 md:opacity-0 md:group-hover:opacity-100 ${
                            isMe ? "-left-3" : "-right-3"
                          }`}
                        >
                          {/* React Emoji Button */}
                          <button
                            onClick={() => setActivePickerId(activePickerId === msg.id ? null : msg.id)}
                            className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition cursor-pointer picker-trigger text-xs"
                            title="React"
                          >
                            😀
                          </button>
                          
                          {/* Edit Button */}
                          <button
                            onClick={() => handleStartEdit(msg.id, msg.text)}
                            className="p-1 text-zinc-500 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition cursor-pointer"
                            title="Edit Message"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                          
                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-1 text-zinc-500 hover:text-red-650 hover:bg-red-100 dark:hover:bg-red-950/30 rounded transition cursor-pointer"
                            title="Delete Message"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 9m-4.78 0L9 9m4.78-3L12 2.5 9.22 6M3.75 6.125h16.5M4.5 6.125l1 13.5a2.25 2.25 0 0 0 2.25 2.25h8.5a2.25 2.25 0 0 0 2.25-2.25l1-13.5" />
                            </svg>
                          </button>

                          {/* Small Reaction Box overlay */}
                          {activePickerId === msg.id && (
                            <div
                              className={`picker-box absolute top-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1 rounded-full shadow-lg flex gap-1 z-30 ${
                                isMe ? "left-0" : "right-0"
                              }`}
                            >
                              {["👍", "❤️", "😂", "🔥"].map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction(msg.id, emoji)}
                                  className="w-6 h-6 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition text-sm cursor-pointer select-none"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <p
                          className="break-words max-w-full font-sans"
                          dangerouslySetInnerHTML={formatMessageText(msg.text)}
                        />
                        
                        {/* Display reaction badges */}
                        {msg.reactions && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(msg.reactions).map(([emoji, users]) => {
                              const reactionUsers = Object.values(users);
                              const count = reactionUsers.length;
                              if (count === 0) return null;
                              
                              const hasReacted = !!users[myUserId];
                              const reactorNames = reactionUsers.join(", ");
                              
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction(msg.id, emoji)}
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border cursor-pointer select-none transition ${
                                    hasReacted
                                      ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-850 text-indigo-700 dark:text-indigo-300"
                                      : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-850 dark:border-zinc-800/50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                                  }`}
                                  title={reactorNames}
                                >
                                  <span>{emoji}</span>
                                  <span className="text-[10px]">{count}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer metadata timestamp */}
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 select-none">
                  <span>{formatTime(msg.timestamp)}</span>
                  {msg.edited && <span className="italic">(edited)</span>}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Typing Indicator Bar */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1.5 bg-zinc-50 dark:bg-zinc-950 flex items-center gap-2">
          <div className="flex gap-1 items-center py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce"></span>
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
            {typingUsers.join(", ")} {typingUsers.length > 1 ? "are" : "is"} typing...
          </span>
        </div>
      )}

      {/* Input panel */}
      <footer className="bg-white dark:bg-zinc-900 border-t border-zinc-200/50 dark:border-zinc-800/50 p-4">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-3 items-end">
          <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl relative px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition flex flex-col">
            <textarea
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Enter to send)"
              maxLength={2000}
              rows={1}
              className="resize-none bg-transparent outline-none border-none py-1.5 pr-2 w-full text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-600 font-sans leading-relaxed min-h-[36px] max-h-[120px]"
              style={{ height: "auto" }}
            />
            <div className="flex items-center justify-end text-[10px] text-zinc-400 mt-1 font-mono">
              <span className={inputText.length > 1900 ? "text-amber-500 font-bold" : ""}>
                {inputText.length}
              </span>
              /2000
            </div>
          </div>
          <button
            type="submit"
            disabled={!inputText.trim() || inputText.length > 2000}
            className="flex items-center justify-center p-3 bg-indigo-600 disabled:bg-zinc-200 disabled:dark:bg-zinc-800 disabled:text-zinc-400 text-white rounded-xl hover:bg-indigo-500 active:scale-[0.98] transition cursor-pointer self-end min-w-[46px] min-h-[46px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </footer>

      {/* Name Input Modal popup */}
      <DisplayNameModal 
        isOpen={showNameModal} 
        onSave={handleSaveName} 
        onClose={handleCloseNameModal} 
      />
    </div>
  );
}
