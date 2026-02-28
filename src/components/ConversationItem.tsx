"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect } from "react";

interface ConversationItemProps {
  conversation: {
    _id: Id<"conversations">;
    isGroup?: boolean;
    groupName?: string;
    groupImage?: string;
    participantIds?: string[];
    otherUser?: { name: string; imageUrl: string; isOnline: boolean } | null;
  };
  isSelected: boolean;
  onClick: () => void;
}

export default function ConversationItem({ conversation, isSelected, onClick }: ConversationItemProps) {
  const unreadCount = useQuery(api.messages.getUnreadCount, {
    conversationId: conversation._id,
  });

  const markAsRead = useMutation(api.messages.markAsRead);

  useEffect(() => {
    if (isSelected) {
      markAsRead({ conversationId: conversation._id });
    }
  }, [isSelected, conversation._id, markAsRead]);

  const isGroup = conversation.isGroup;
  const displayName = isGroup ? conversation.groupName : conversation.otherUser?.name;
  const displayImage = isGroup
    ? (conversation.groupImage || `https://api.dicebear.com/7.x/initials/svg?seed=${conversation.groupName}`)
    : conversation.otherUser?.imageUrl;
  const isOnline = !isGroup && conversation.otherUser?.isOnline;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-100"
      style={{ background: isSelected ? "#f0f2ff" : "transparent" }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.background = "#f0f2ff";
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Avatar */}
      <div className="relative">
        <img
          src={displayImage}
          alt={displayName}
          style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover" }}
        />
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
        )}
        {isGroup && (
          <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#7b7ec4] border-2 border-white flex items-center justify-center">
            <span className="text-white text-[8px]">G</span>
          </div>
        )}
      </div>

      {/* Name and unread badge */}
      <div className="flex-1 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">{displayName}</p>
        {unreadCount && unreadCount > 0 && !isSelected ? (
          <div className="w-5 h-5 rounded-full bg-[#7b7ec4] flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}