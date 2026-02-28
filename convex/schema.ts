import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.string(),
    isOnline: v.boolean(),
  }).index("by_clerkId", ["clerkId"]),

  conversations: defineTable({
    participantIds: v.array(v.string()),
    lastMessageTime: v.number(),
    isGroup: v.optional(v.boolean()),
    groupName: v.optional(v.string()),
    groupImage: v.optional(v.string()),
    adminIds: v.optional(v.array(v.string())),
  }),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.string(),
    content: v.string(),
    isDeleted: v.optional(v.boolean()),
  }).index("by_conversation", ["conversationId"]),

  typingIndicators: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(),
    timestamp: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user_conversation", ["conversationId", "userId"]),

  readReceipts: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(),
    lastReadTime: v.number(),
  }).index("by_conversation_user", ["conversationId", "userId"]),
});