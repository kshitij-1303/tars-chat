"use client";

import styles from "./page.module.css"
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Id } from "../../convex/_generated/dataModel";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";
import { generateRandomAvatar } from "@/utils/generateRandomAvatar";

export default function Home() {
  const { user, isLoaded } = useUser();
  const upsertUser = useMutation(api.users.upsertUser);
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null);
  const [showChat, setShowChat] = useState(false);
  const setOffline = useMutation(api.users.setOffline);

useEffect(() => {
  const handleOffline = () => setOffline();
  window.addEventListener("beforeunload", handleOffline);
  return () => window.removeEventListener("beforeunload", handleOffline);
}, [setOffline]);

  useEffect(() => {
    if (isLoaded && user) {
      upsertUser({ imageUrl: generateRandomAvatar() });
    }
  }, [isLoaded, user, upsertUser]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#7b7ec4]">
        <div className="w-8 h-8 rounded-full border-4 border-white border-t-transparent animate-spin" />
      </div>
    );
  }

  const handleSelectConversation = (id: Id<"conversations">) => {
    setSelectedConversationId(id);
    setShowChat(true);
  };

  const handleBack = () => {
    setShowChat(false);
    setSelectedConversationId(null);
  };

  return (
    <div className="flex justify-center items-center w-full h-[100vh] md:h-[90vh]">
      <div
        className="w-full md:w-[85%] h-full md:h-[85vh] overflow-hidden shadow-[0_25px_50px_rgba(0,0,0,0.3)] flex bg-[#7b7ec4]"
        style={{ borderRadius: '10px' }}
      >
        {/* Sidebar — full screen on mobile when chat is closed, 35% on desktop */}
        <div className={`${showChat ? 'hidden' : 'flex'} md:flex w-full md:w-[35%] h-full flex-shrink-0`}>
          <Sidebar
            onSelectConversation={handleSelectConversation}
            selectedConversationId={selectedConversationId}
          />
        </div>

        {/* Chat area — full screen on mobile when chat is open, 65% on desktop */}
        <div className={`${showChat ? 'flex' : 'hidden'} md:flex w-full md:w-[65%] h-full`}>
          <ChatArea
            conversationId={selectedConversationId}
            onBack={handleBack}
          />
        </div>
      </div>
    </div>
  );
}