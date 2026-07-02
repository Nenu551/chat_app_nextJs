"use client";

import React from "react";
import { useChat } from "@/context/ChatContext";

export default function MessageInput() {
  const {
    inputText,
    typingUsers,
    handleSend,
    handleInputChange,
    handleKeyDown,
  } = useChat();

  return (
    <>
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
    </>
  );
}
