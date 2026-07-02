"use client";

import React from "react";
import { useChat } from "@/context/ChatContext";

export default function ChatHeader() {
  const {
    roomId,
    displayName,
    presenceCount,
    isConnected,
    isCopied,
    theme,
    soundEnabled,
    showSettings,
    setShowSettings,
    settingsRef,
    toggleTheme,
    toggleSound,
    setShowNameModal,
    handleClearHistory,
    copyRoomLink,
  } = useChat();

  return (
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
  );
}
