"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [roomInput, setRoomInput] = useState("");
  const router = useRouter();

  const sanitizeRoomName = (name) => {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "") // Keep only alphanumeric, spaces, and hyphens
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-"); // Prevent double hyphens
  };

  const handleJoin = (e) => {
    e.preventDefault();
    const sanitized = sanitizeRoomName(roomInput);
    if (sanitized) {
      router.push(`/${sanitized}`);
    }
  };

  const handleGenerateRandom = () => {
    // Generate a random 6-character alphanumeric room name
    const randomId = Math.random().toString(36).substring(2, 8);
    router.push(`/${randomId}`);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 min-h-screen text-zinc-900 dark:text-zinc-50 transition-colors duration-300">
      <main className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-2xl shadow-xl flex flex-col gap-6">
        
        {/* App Logo & Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="w-8 h-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
            AnonChat
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
            Disposable, anonymous, real-time chat rooms.
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-[280px] mx-auto leading-relaxed">
            The URL itself is the chat room. Share it to invite others instantly with no login or setup.
          </p>
        </div>

        {/* Custom Room Entry Form */}
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="room-name"
              className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2"
            >
              Custom Room Name
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-zinc-400 dark:text-zinc-600 font-mono text-sm pointer-events-none select-none">
                /
              </span>
              <input
                id="room-name"
                type="text"
                placeholder="room-name (e.g. team-standup)"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                className="w-full pl-7 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-950 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
                required
                suppressHydrationWarning={true}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!roomInput.trim()}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-zinc-200 disabled:to-zinc-200 disabled:dark:from-zinc-800 disabled:dark:to-zinc-800 disabled:text-zinc-400 disabled:dark:text-zinc-600 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/10 active:scale-[0.98] transition cursor-pointer text-sm"
          >
            Join / Create Room
          </button>
        </form>

        {/* Separator */}
        <div className="relative flex items-center justify-center py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
          </div>
          <span className="relative px-3 bg-white dark:bg-zinc-900 text-xs text-zinc-400 dark:text-zinc-600 font-medium">
            OR
          </span>
        </div>

        {/* Random Generator */}
        <button
          onClick={handleGenerateRandom}
          className="w-full py-3 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-800 dark:text-zinc-200 font-medium rounded-xl transition cursor-pointer text-sm flex items-center justify-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.656 48.656 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7C4.75 9.547 4.704 10.768 4.704 12s.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.092-1.209.138-2.43.138-3.662Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 10.5h.008v.008H9V10.5Zm0 3h.008v.008H9V13.5Zm3-3h.008v.008H12V10.5ZM12 13.5h.008v.008H12V13.5Zm3-3h.008v.008H15V10.5Zm0 3h.008v.008H15V13.5Z"
            />
          </svg>
          Generate Random Room
        </button>

      </main>
    </div>
  );
}
