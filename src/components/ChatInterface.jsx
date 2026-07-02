"use client";

import React, { useState, useEffect, useRef } from "react";
import { ref, push, query, limitToLast, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import DisplayNameModal from "./DisplayNameModal";

export default function ChatInterface({ roomId }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const messagesEndRef = useRef(null);
  const isInitialScrollRef = useRef(true);

  // Set mounted status to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
    // Load display name from localStorage
    const savedName = localStorage.getItem("anon_chat_display_name");
    if (savedName) {
      setDisplayName(savedName);
    } else {
      setShowNameModal(true);
    }
  }, []);

  // Firebase Realtime DB subscriptions
  useEffect(() => {
    if (!db || !roomId) return;

    // 1. Connection status listener (.info/connected)
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

    return () => {
      unsubscribeConnected();
      unsubscribeMessages();
    };
  }, [roomId]);

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

  // Check if Firebase is configured
  const isFirebaseConfigured = !!db;

  const handleSaveName = (name) => {
    localStorage.setItem("anon_chat_display_name", name);
    setDisplayName(name);
    setShowNameModal(false);
  };

  const handleSend = (e) => {
    if (e) e.preventDefault();
    const trimmedText = inputText.trim();

    if (!trimmedText || trimmedText.length > 2000 || !isFirebaseConfigured) return;

    const messagesRef = ref(db, `rooms/${roomId}/messages`);
    push(messagesRef, {
      sender: displayName || "Anonymous",
      text: trimmedText,
      timestamp: Date.now(),
    });

    setInputText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyRoomLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Human readable time formatter
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!isMounted) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600"></div>
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
            Firebase Database credentials are not configured. To enable chat features, please add the required credentials to your <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-red-600 font-mono text-xs">.env.local</code> file and restart the development server.
          </p>
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 text-left font-mono text-xs text-zinc-500 space-y-1">
            <div>NEXT_PUBLIC_FIREBASE_API_KEY</div>
            <div>NEXT_PUBLIC_FIREBASE_DATABASE_URL</div>
            <div>NEXT_PUBLIC_FIREBASE_PROJECT_ID</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden font-sans">
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
              <h1 className="font-bold text-zinc-900 dark:text-zinc-50 tracking-tight max-w-[120px] sm:max-w-[200px] truncate">
                #{roomId}
              </h1>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
                title={isConnected ? "Connected to database" : "Connecting..."}
              />
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[150px] sm:max-w-none">
              Role: <span className="font-medium text-indigo-600 dark:text-indigo-400">{displayName || "Connecting..."}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Change Display Name button */}
          <button
            onClick={() => setShowNameModal(true)}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer"
          >
            Edit Name
          </button>
          {/* Share room button */}
          <button
            onClick={copyRoomLink}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              isCopied
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                : "bg-indigo-600 text-white hover:bg-indigo-500"
            }`}
          >
            {isCopied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                </svg>
                Copy Link
              </>
            )}
          </button>
        </div>
      </header>

      {/* Messages area */}
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
            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[80%] sm:max-w-[70%] ${
                  isMe ? "ml-auto items-end" : "mr-auto items-start"
                }`}
              >
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {isMe ? "You" : msg.sender}
                  </span>
                </div>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm break-words whitespace-pre-wrap ${
                    isMe
                      ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-none"
                      : "bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 text-zinc-900 dark:text-zinc-100 rounded-tl-none"
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input panel */}
      <footer className="bg-white dark:bg-zinc-900 border-t border-zinc-200/50 dark:border-zinc-800/50 p-4">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-3 items-end">
          <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl relative px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition flex flex-col">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
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
      />
    </div>
  );
}
