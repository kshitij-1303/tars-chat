import { mutation, query } from "./_generated/server";

// mutation = writes data into db
// query = reads data from db

// Runs everytime user opens the app, creates or updates user in db

export const upsertUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        name: identity.name ?? "Anonymous",
        email: identity.email ?? "",
        imageUrl: identity.pictureUrl ?? "",
        isOnline: true,
      });
      return existingUser._id;
    }

    // First time user logs in, create a new record in db

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: identity.name ?? "Anonymous",
      email: identity.email ?? "",
      imageUrl: identity.pictureUrl ?? "",
      isOnline: true,
    });
  },
});

// Runs everytime the app is closed.

export const setOffline = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (user) {
      await ctx.db.patch(user._id, { isOnline: false });
    }
  },
});


// Will return a list of all users except the current user to  start a new conversation

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const users = await ctx.db.query("users").collect();
    return users.filter((user) => user.clerkId !== identity.subject);
  },
});

// Current user's details for avatar and profile on sidebar.

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});