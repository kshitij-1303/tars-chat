import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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

export const createGroup = mutation({
  args: {
    groupName: v.string(),
    groupImage: v.optional(v.string()),
    memberIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUserId = identity.subject;
    const allParticipants = Array.from(new Set([currentUserId, ...args.memberIds]));

    return await ctx.db.insert("conversations", {
      participantIds: allParticipants,
      lastMessageTime: Date.now(),
      isGroup: true,
      groupName: args.groupName,
      groupImage: args.groupImage,
      adminIds: [currentUserId],
    });
  },
});

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
        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", conversation._id)
          )
          .order("desc")
          .first();

        if (conversation.isGroup) {
          return { ...conversation, otherUser: null, isGroup: true, lastMessage };
        }

        const otherUserId = conversation.participantIds.find((id) => id !== currentUserId);
        const otherUser = await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", otherUserId!))
          .unique();

        return { ...conversation, otherUser, isGroup: false, lastMessage };
      })
    );

    return conversationsWithDetails.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
  },
});

export const deleteGroup = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (!conversation.adminIds?.includes(identity.subject))
      throw new Error("Only admins can delete the group");

    // Delete all messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    await Promise.all(messages.map((m) => ctx.db.delete(m._id)));

    // Delete typing indicators
    const typing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    await Promise.all(typing.map((t) => ctx.db.delete(t._id)));

    // Delete read receipts
    const receipts = await ctx.db
      .query("readReceipts")
      .withIndex("by_conversation_user", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    await Promise.all(receipts.map((r) => ctx.db.delete(r._id)));

    await ctx.db.delete(args.conversationId);
  },
});

export const kickMember = mutation({
  args: {
    conversationId: v.id("conversations"),
    memberId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (!conversation.adminIds?.includes(identity.subject))
      throw new Error("Only admins can kick members");

    await ctx.db.patch(args.conversationId, {
      participantIds: conversation.participantIds.filter((id) => id !== args.memberId),
    });
  },
});

export const addMembers = mutation({
  args: {
    conversationId: v.id("conversations"),
    memberIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (!conversation.adminIds?.includes(identity.subject))
      throw new Error("Only admins can add members");

    const updated = Array.from(new Set([...conversation.participantIds, ...args.memberIds]));
    await ctx.db.patch(args.conversationId, { participantIds: updated });
  },
});

export const getGroupMembers = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return [];

    const members = await Promise.all(
      conversation.participantIds.map((id) =>
        ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", id))
          .unique()
      )
    );

    return members.filter(Boolean).map((m) => ({
      ...m,
      isAdmin: conversation.adminIds?.includes(m!.clerkId),
    }));
  },
});