"use client";

import React from "react";
import { ChatProvider, useChat } from "@/context/ChatContext";
import ChatHeader from "./chat/ChatHeader";
import MessageList from "./chat/MessageList";
import MessageInput from "./chat/MessageInput";
import DisplayNameModal from "./DisplayNameModal";
import ConfirmModal from "./ConfirmModal";

function ChatInterfaceContent() {
  const {
    isMounted,
    showNameModal,
    handleSaveName,
    handleCloseNameModal,
    confirmModal,
    closeConfirmModal,
    db,
  } = useChat();

  if (!isMounted) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-650"></div>
      </div>
    );
  }

  const isFirebaseConfigured = !!db;

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
      <ChatHeader />
      <MessageList />
      <MessageInput />

      {/* Name Input Modal popup */}
      <DisplayNameModal
        isOpen={showNameModal}
        onSave={handleSaveName}
        onClose={handleCloseNameModal}
      />

      {/* Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
      />
    </div>
  );
}

export default function ChatInterface({ roomId }) {
  return (
    <ChatProvider roomId={roomId}>
      <ChatInterfaceContent />
    </ChatProvider>
  );
}
