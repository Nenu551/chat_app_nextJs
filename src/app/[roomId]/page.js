import React from "react";
import ChatInterface from "@/components/ChatInterface";

export default async function RoomPage({ params }) {
  const { roomId } = await params;
  
  return (
    <div className="flex flex-col min-h-screen">
      <ChatInterface roomId={roomId} />
    </div>
  );
}
