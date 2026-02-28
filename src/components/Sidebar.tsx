"use client";

import styles from "../app/page.module.css";
import { generateRandomAvatar } from "@/utils/generateRandomAvatar";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import ConversationItem from "@/components/ConversationItem";

interface SidebarProps {
  onSelectConversation: (id: Id<"conversations">) => void;
  selectedConversationId: Id<"conversations"> | null;
}

export default function Sidebar({ onSelectConversation, selectedConversationId }: SidebarProps) {
  const updateAvatar = useMutation(api.users.updateAvatar);
  const currentUser = useQuery(api.users.getCurrentUser);
  const allUsers = useQuery(api.users.getAllUsers);
  const conversations = useQuery(api.conversations.getMyConversations);
  const getOrCreateConversation = useMutation(api.conversations.getOrCreateConversation);
  const [searchQuery, setSearchQuery] = useState("");

  const handleRegenerateAvatar = async () => {
    const newAvatar = generateRandomAvatar();
    await updateAvatar({ imageUrl: newAvatar });
  };

  const handleUserClick = async (clerkId: string) => {
    const conversationId = await getOrCreateConversation({ otherUserId: clerkId });
    onSelectConversation(conversationId);
    setSearchQuery("");
  };

  return (
    <div className="bg-[#fff] h-full flex flex-col w-full">

      {/* Header */}
      <section className={`${styles.pad} flex justify-between items-center`}>
        <div className={styles.logo}></div>
        <div className="relative">
          <img
            src={currentUser?.imageUrl}
            alt="avatar"
            style={{
              width: "50px",
              height: "50px",
              objectFit: "cover",
              borderRadius: "50%",
            }}
          />
          <button
            onClick={handleRegenerateAvatar}
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs shadow"
            title="Regenerate avatar"
          >
            🔄
          </button>
        </div>
      </section>

      {/* Search bar */}
      <section className="px-4 py-3">
        <div className="flex items-center gap-2 bg-[#f0f2ff] rounded-full" style={{ padding: "0 8px" }}>
          <input
            type="text"
            placeholder="Search for users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent rounded-full text-sm w-full text-gray-600 placeholder-gray-400"
            style={{ padding: "8px", outline: "none", border: "none" }}
          />
        </div>
      </section>

      {/* Users list — only shows when searching */}
      {searchQuery.trim().length > 0 && (
        <div className="px-4">
          {allUsers?.filter((u) =>
            u.name.toLowerCase().includes(searchQuery.toLowerCase())
          ).map((u) => (
            <div
              key={u._id}
              onClick={() => handleUserClick(u.clerkId)}
              className="cursor-pointer hover:bg-[#f0f2ff] transition duration-200 border-b border-[#e5e7eb] flex items-center gap-3 px-2 py-3"
            >
              <div className="relative">
                <img
                  src={u.imageUrl}
                  alt={u.name}
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
                {u.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                )}
              </div>
              <p className="text-sm font-semibold text-gray-800">{u.name}</p>
            </div>
          ))}
        </div>
      )}

      {/* Conversation list — shows when not searching */}
      {searchQuery.trim().length === 0 && (
        <div className="flex-1 overflow-y-auto">
          {conversations?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <p className="text-2xl">💬</p>
              <p className="text-sm text-gray-400">No conversations yet</p>
              <p className="text-xs text-gray-400">Search for someone to start chatting</p>
            </div>
          ) : (
            conversations?.map((conversation) => (
              <ConversationItem
                key={conversation._id}
                conversation={conversation}
                isSelected={selectedConversationId === conversation._id}
                onClick={() => onSelectConversation(conversation._id)}
              />
            ))
          )}
        </div>
      )}

    </div>
  );
}