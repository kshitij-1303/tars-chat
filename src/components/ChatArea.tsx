"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import EmojiPicker from "emoji-picker-react";
import { formatMessageTime } from "@/utils/formatMessageTime";
import GroupSettingsModal from "./GroupSettingsModal";

interface ChatAreaProps {
  conversationId: Id<"conversations"> | null;
  onBack: () => void;
}

export default function ChatArea({ conversationId, onBack }: ChatAreaProps) {
  const [messageText, setMessageText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);

  const deleteMessage = useMutation(api.messages.deleteMessage);
  const setTyping = useMutation(api.messages.setTyping);
  const clearTyping = useMutation(api.messages.clearTyping);

  const messages = useQuery(
    api.messages.getMessages,
    conversationId ? { conversationId } : "skip"
  );

  const currentUser = useQuery(api.users.getCurrentUser);
  const sendMessage = useMutation(api.messages.sendMessage);
  const conversations = useQuery(api.conversations.getMyConversations);
  const activeConversation = conversations?.find((c) => c._id === conversationId);

  const typingIndicator = useQuery(
    api.messages.getTypingIndicator,
    conversationId ? { conversationId } : "skip"
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!messageText.trim() || !conversationId) return;
    await sendMessage({ conversationId, content: messageText.trim() });
    setMessageText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const isGroup = activeConversation?.isGroup;
  const displayName = isGroup ? activeConversation?.groupName : activeConversation?.otherUser?.name;
  const displayImage = isGroup
    ? (activeConversation?.groupImage || `https://api.dicebear.com/7.x/initials/svg?seed=${activeConversation?.groupName}`)
    : activeConversation?.otherUser?.imageUrl;
  const isOnline = !isGroup && activeConversation?.otherUser?.isOnline;

  if (!conversationId) {
    return (
      <div className="bg-[#e6e9ff] w-full h-full flex items-center justify-center text-gray-500 text-sm bg-no-repeat bg-fixed bg-cover">
        Select a conversation to start chatting
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[url('/images/chatarea-bg-mobile.png')] md:bg-[url('/images/chatarea-bg.png')] bg-contain bg-repeat">

      {/* Header */}
      <div
        className={`flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shadow-sm ${isGroup ? "cursor-pointer hover:bg-[#f9f9ff] transition" : ""}`}
        onClick={() => isGroup && setShowGroupSettings(true)}
      >
        <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="md:hidden text-[#7b7ec4] text-lg font-bold mr-1">
          ←
        </button>
        <div className="relative">
          <img
            src={displayImage}
            alt={displayName}
            style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover" }}
          />
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
          )}
        </div>
        <div className="flex flex-col">
          <p className="text-sm font-semibold text-[#1a1a2e]">{displayName}</p>
          {!isGroup && (
            <p className="text-xs text-gray-400">{isOnline ? "Online" : "Offline"}</p>
          )}
          {isGroup && (
            <p className="text-xs text-gray-400">{activeConversation?.participantIds?.length} members · tap to manage</p>
          )}
        </div>
      </div>

      {/* Group Settings Modal */}
      {showGroupSettings && conversationId && isGroup && (
        <GroupSettingsModal
          conversationId={conversationId}
          groupName={activeConversation?.groupName ?? ""}
          groupImage={activeConversation?.groupImage}
          onClose={() => setShowGroupSettings(false)}
          onDeleted={() => {
            setShowGroupSettings(false);
            onBack();
          }}
        />
      )}

      {/* Messages Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto flex flex-col scrollbar-hover"
      >
        <div className="flex flex-col gap-3 mt-auto px-4 py-4">
          {messages?.length === 0 && (
            <div className="text-center text-gray-500 text-sm">No messages yet 👋</div>
          )}
          {messages?.map((message) => {
            const isOwn = message.senderId === currentUser?.clerkId;
            return (
              <div
                key={message._id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                onMouseEnter={() => setHoveredMessageId(message._id)}
                onMouseLeave={() => setHoveredMessageId(null)}
              >
                <div className="flex items-end gap-2" style={{ maxWidth: "70%" }}>
                  {isOwn && hoveredMessageId === message._id && (
                    <button
                      onClick={() => deleteMessage({ messageId: message._id })}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      🗑️
                    </button>
                  )}
                  <div
                    className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
                    style={{ width: "fit-content" }}
                  >
                    <div
                      className="text-sm break-words"
                      style={{
                        padding: "10px 14px",
                        borderRadius: "16px",
                        background: isOwn ? "#7b7ec4" : "#ffffff",
                        color: isOwn ? "#ffffff" : "#1a1a2e",
                      }}
                    >
                      {message.isDeleted ? (
                        <span className="italic opacity-60">This message was deleted</span>
                      ) : (
                        message.content
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400 mt-1 px-1">
                      {formatMessageTime(message._creationTime)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="flex justify-center pb-1">
          <button
            onClick={scrollToBottom}
            className="bg-[#7b7ec4] text-white text-xs px-3 py-1.5 rounded-full shadow-md hover:bg-[#5b5ea6] transition"
          >
            ↓ Latest
          </button>
        </div>
      )}

      {/* Typing indicator */}
      {typingIndicator && (
        <div className="px-4 py-1 flex items-center gap-2">
          <div className="flex gap-1 items-center">
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-xs text-gray-400">{typingIndicator.name} is typing...</p>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 flex items-center gap-2 px-3 py-2 relative">
        {showEmojiPicker && (
          <div style={{ position: "absolute", bottom: "70px", left: "50%", transform: "translateX(-50%)", zIndex: 50 }}>
            <EmojiPicker onEmojiClick={(emoji) => setMessageText(prev => prev + emoji.emoji)} />
          </div>
        )}
        <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-xl">😊</button>
        <input
          value={messageText}
          onChange={(e) => {
            setMessageText(e.target.value);
            if (!conversationId) return;
            setTyping({ conversationId });
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
              clearTyping({ conversationId });
            }, 2000);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Write a message..."
          className="flex-1 bg-[#f0f2ff] text-[#1a1a2e] outline-none"
          style={{ padding: "10px 14px", borderRadius: "20px" }}
        />
        <button
          onClick={handleSend}
          disabled={!messageText.trim()}
          className="bg-[#7b7ec4] text-white hover:bg-[#5b5ea6] disabled:opacity-40"
          style={{ padding: "10px 14px", borderRadius: "50%" }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}