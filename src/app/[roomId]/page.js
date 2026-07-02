import React from "react";
import ChatInterface from "@/components/ChatInterface";

export default async function RoomPage({ params }) {
  const { roomId } = await params;

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col">
      <ChatInterface roomId={roomId} />
    </div>
  );
}
