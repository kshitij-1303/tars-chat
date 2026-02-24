import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// We pass the other user ID to check conversations between current user and the other person 
// If conversation exists return its id, if not create a new conversation

export const getOrCreateConversation = mutation({
  args: {
    otherUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUserId = identity.subject;

    const existingConversation = await ctx.db
      .query("conversations")
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("participantIds"), [currentUserId, args.otherUserId]),
            q.eq(q.field("participantIds"), [args.otherUserId, currentUserId])
          )
        )
      )
      .unique();

    if (existingConversation) return existingConversation._id;

    return await ctx.db.insert("conversations", {
      participantIds: [currentUserId, args.otherUserId],
      lastMessageTime: Date.now(),
    });
  },
});

// Fetches all conversations of the current user
// Find the other person's details and the last message for each convo
// To populate sidebar

export const getMyConversations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUserId = identity.subject;

    const conversations = await ctx.db.query("conversations").collect();

    const myConversations = conversations.filter((c) =>
      c.participantIds.includes(currentUserId)
    );

    const conversationsWithDetails = await Promise.all(
      myConversations.map(async (conversation) => {
        const otherUserId = conversation.participantIds.find(
          (id) => id !== currentUserId
        );

        const otherUser = await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", otherUserId!))
          .unique();

        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", conversation._id)
          )
          .order("desc")
          .first();

        return {
          ...conversation,
          otherUser,
          lastMessage,
        };
      })
    );

    return conversationsWithDetails.sort(
      (a, b) => b.lastMessageTime - a.lastMessageTime
    );
  },
});