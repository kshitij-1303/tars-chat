import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get conversation ID and content as argument and insert a new message in the message table


export const sendMessage = mutation({
    args: {
        conversationId: v.id("conversations"),
        content: v.string(),
    },

    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        await ctx.db.insert("messages", {
            conversationId: args.conversationId,
            senderId: identity.subject,
            content: args.content,
            isDeleted: false,
        });

        // Update the last message time to sort by recent activity in the sidebar.        

        await ctx.db
            .query("conversations")
            .filter((q) => q.eq(q.field("_id"), args.conversationId))
            .unique()
            .then((conversation) => {
                if (conversation) {
                    ctx.db.patch(conversation._id, {
                        lastMessageTime: Date.now(),
                    });
                }
            });
    }
})

// Get all the messages based on conversation ID in ascending order.
// Will populate the screen when chat is opened.

export const getMessages = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();

    return messages;
  },
});

export const deleteMessage = mutation({
    args: {
        messageId: v.id("messages"),
    },

    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        // Can only delete messages sent by current user

        const message = await ctx.db.get(args.messageId);

        if (message?.senderId !== identity.subject) {
            throw new Error("Can only delete your own messages");
        }

         await ctx.db.patch(args.messageId, { isDeleted: true });
    }
})

// Whenever a user presses a key, update the timestamp, if it doesn't exist create a new one
// There will be a single timestamp for each user

export const setTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { timestamp: Date.now() });
    } else {
      await ctx.db.insert("typingIndicators", {
        conversationId: args.conversationId,
        userId: identity.subject,
        timestamp: Date.now(),
      });
    }
  },
});

// If the timestamp set by setTyping is within 2 seconds, it shows as typing
// If its more than 2 seconds we retun null

export const getTypingIndicator = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const indicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const otherPersonTyping = indicators.find(
      (i) =>
        i.userId !== identity.subject &&
        Date.now() - i.timestamp < 2000
    );

    if (!otherPersonTyping) return null;

    const typingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) =>
        q.eq("clerkId", otherPersonTyping.userId)
      )
      .unique();

    return typingUser ? { name: typingUser.name } : null;
  },
});

// Is called whenever user opens a conversation
// If a record exists, will update last read time
// if not, creates readReciept record for the particular conversation

export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const existing = await ctx.db
      .query("readReceipts")
      .withIndex("by_conversation_user", (q) =>
        q
          .eq("conversationId", args.conversationId)
          .eq("userId", identity.subject)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { lastReadTime: Date.now() });
    } else {
      await ctx.db.insert("readReceipts", {
        conversationId: args.conversationId,
        userId: identity.subject,
        lastReadTime: Date.now(),
      });
    }
  },
});

// Find last read time for the current user, if doesn't exist assume 0
// Get all messages then filter messages after last read time, ignore messages sent by current user
// Show count on sidebar 

export const getUnreadCount = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const readReceipt = await ctx.db
      .query("readReceipts")
      .withIndex("by_conversation_user", (q) =>
        q
          .eq("conversationId", args.conversationId)
          .eq("userId", identity.subject)
      )
      .unique();

    const lastReadTime = readReceipt ? readReceipt.lastReadTime : 0;

    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    return allMessages.filter(
      (m) => m._creationTime > lastReadTime && m.senderId !== identity.subject
    ).length;
  },
});