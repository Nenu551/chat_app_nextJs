"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
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

const ChatContext = createContext(null);

export function ChatProvider({ roomId, children }) {
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

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

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
  }, [roomId, myUserId]);

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
  }, [roomId, displayName, myUserId]);

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
    setConfirmModal({
      isOpen: true,
      title: "Delete Message",
      message: "Are you sure you want to permanently delete this message?",
      onConfirm: () => {
        if (db && roomId) {
          remove(ref(db, `rooms/${roomId}/messages/${msgId}`));
        }
        closeConfirmModal();
      },
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: null,
    });
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
    
    // Clear any other reactions from this user on this message
    if (message?.reactions) {
      Object.keys(message.reactions).forEach((exEmoji) => {
        if (exEmoji !== emoji && message.reactions[exEmoji]?.[myUserId]) {
          remove(ref(db, `rooms/${roomId}/messages/${msgId}/reactions/${exEmoji}/${myUserId}`));
        }
      });
    }

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
    setConfirmModal({
      isOpen: true,
      title: "Wipe Chat History",
      message: "WARNING: This will permanently wipe all message logs in this room for everyone. This action cannot be undone. Proceed?",
      onConfirm: () => {
        if (db && roomId) {
          remove(ref(db, `rooms/${roomId}/messages`));
        }
        setShowSettings(false);
        closeConfirmModal();
      },
    });
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

    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    escaped = escaped.replace(/\*\*(.*?)\*\"/g, "<strong>$1</strong>");
    escaped = escaped.replace(/\*(.*?)\*/g, "<em>$1</em>");
    
    let rawCodeRegex = /`([^`]+)`/g;
    escaped = escaped.replace(
      rawCodeRegex,
      '<code class="px-1.5 py-0.5 font-mono text-xs rounded bg-zinc-100 dark:bg-zinc-800 text-rose-600 dark:text-rose-400 font-semibold">$1</code>'
    );

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

  const value = {
    db,
    roomId,
    myUserId,
    messages,
    inputText,
    setInputText,
    displayName,
    setDisplayName,
    showNameModal,
    setShowNameModal,
    isConnected,
    isCopied,
    isMounted,
    theme,
    soundEnabled,
    showSettings,
    setShowSettings,
    activePickerId,
    setActivePickerId,
    editingMessageId,
    setEditingMessageId,
    editText,
    setEditText,
    presenceCount,
    typingUsers,
    isTyping,
    confirmModal,
    setConfirmModal,
    messagesEndRef,
    settingsRef,
    toggleTheme,
    toggleSound,
    handleSaveName,
    handleCloseNameModal,
    handleInputChange,
    handleSend,
    handleKeyDown,
    handleDeleteMessage,
    closeConfirmModal,
    handleStartEdit,
    handleSaveEdit,
    toggleReaction,
    handleClearHistory,
    copyRoomLink,
    formatMessageText,
    formatTime,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
