"use client";

import React from "react";
import { useChat } from "@/context/ChatContext";

export default function MessageList() {
  const {
    messages,
    displayName,
    myUserId,
    editingMessageId,
    setEditingMessageId,
    editText,
    setEditText,
    activePickerId,
    setActivePickerId,
    messagesEndRef,
    handleDeleteMessage,
    handleStartEdit,
    handleSaveEdit,
    toggleReaction,
    formatMessageText,
    formatTime,
  } = useChat();

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
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
              className={`group relative flex flex-col max-w-[85%] sm:max-w-[70%] p-0.5 ${isMe ? "ml-auto items-end" : "mr-auto items-start"
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
                  className={`flex flex-col w-full relative ${isMe ? "items-end" : "items-start"
                    }`}
                >
                  {/* Standard message bubble rendering */}
                  <div
                    className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm break-words max-w-full ${isMe
                      ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-none"
                      : "bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 text-zinc-900 dark:text-zinc-100 rounded-tl-none"
                      }`}
                  >
                    {/* Actions overlay pill (React and Delete) */}
                    <div
                      className={`flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-0.5 px-1 rounded-xl shadow-md z-25 absolute -top-3.5 transition-opacity duration-200 opacity-100 md:opacity-0 md:group-hover:opacity-100 ${isMe ? "-left-3" : "-right-3"
                        }`}
                    >
                      {/* React Emoji Button */}
                      <button
                        type="button"
                        onClick={() => setActivePickerId(activePickerId === msg.id ? null : msg.id)}
                        className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition cursor-pointer picker-trigger text-xs"
                        title="React"
                      >
                        😀
                      </button>

                      {/* Small Reaction Box overlay */}
                      {activePickerId === msg.id && (
                        <div
                          className={`picker-box absolute top-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1 rounded-full shadow-lg flex gap-1 z-30 ${isMe ? "left-0" : "right-0"
                            }`}
                        >
                          {["👍", "❤️", "😂", "🔥"].map((emoji) => (
                            <button
                              type="button"
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
                              type="button"
                              key={emoji}
                              onClick={() => toggleReaction(msg.id, emoji)}
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border cursor-pointer select-none transition ${hasReacted
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
  );
}
