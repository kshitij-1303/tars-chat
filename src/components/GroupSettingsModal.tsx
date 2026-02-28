"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface GroupSettingsModalProps {
  conversationId: Id<"conversations">;
  groupName: string;
  groupImage?: string;
  onClose: () => void;
  onDeleted: () => void;
}

export default function GroupSettingsModal({
  conversationId,
  groupName,
  groupImage,
  onClose,
  onDeleted,
}: GroupSettingsModalProps) {
  const [tab, setTab] = useState<"members" | "add">("members");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const currentUser = useQuery(api.users.getCurrentUser);
  const members = useQuery(api.conversations.getGroupMembers, { conversationId });
  const allUsers = useQuery(api.users.getAllUsers);

  const kickMember = useMutation(api.conversations.kickMember);
  const addMembers = useMutation(api.conversations.addMembers);
  const deleteGroup = useMutation(api.conversations.deleteGroup);

  const isAdmin = currentUser
    ? members?.find((m) => m?.clerkId === currentUser.clerkId)?.isAdmin
    : false;

  const nonMembers = allUsers?.filter(
    (u) =>
      !members?.find((m) => m?.clerkId === u.clerkId) &&
      u.name.toLowerCase().includes(search.toLowerCase())
  );

 const handleKick = async (memberId: string | undefined) => {
  if (!memberId) return;
  await kickMember({ conversationId, memberId });
};

  const handleAdd = async () => {
    if (selectedIds.length === 0) return;
    await addMembers({ conversationId, memberIds: selectedIds });
    setSelectedIds([]);
    setTab("members");
  };

  const handleDelete = async () => {
    await deleteGroup({ conversationId });
    onDeleted();
    onClose();
  };

  const toggleSelect = (clerkId: string) => {
    setSelectedIds((prev) =>
      prev.includes(clerkId) ? prev.filter((id) => id !== clerkId) : [...prev, clerkId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <img
            src={groupImage || `https://api.dicebear.com/7.x/initials/svg?seed=${groupName}`}
            alt={groupName}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1">
            <p className="font-bold text-[#1a1a2e]">{groupName}</p>
            <p className="text-xs text-gray-400">{members?.length} members</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* Tabs — only show Add tab to admins */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTab("members")}
            className="flex-1 py-2.5 text-sm font-semibold transition"
            style={{ color: tab === "members" ? "#7b7ec4" : "#9ca3af", borderBottom: tab === "members" ? "2px solid #7b7ec4" : "2px solid transparent" }}
          >
            Members
          </button>
          {isAdmin && (
            <button
              onClick={() => setTab("add")}
              className="flex-1 py-2.5 text-sm font-semibold transition"
              style={{ color: tab === "add" ? "#7b7ec4" : "#9ca3af", borderBottom: tab === "add" ? "2px solid #7b7ec4" : "2px solid transparent" }}
            >
              Add Members
            </button>
          )}
        </div>

        {/* Members Tab */}
        {tab === "members" && (
          <div className="flex flex-col max-h-72 overflow-y-auto px-4 py-2 gap-1">
            {members?.map((member) => {
              if (!member) return null;
              const isYou = member.clerkId === currentUser?.clerkId;
              return (
                <div key={member._id} className="flex items-center gap-3 py-2">
                  <img
                    src={member.imageUrl}
                    alt={member.name}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1a1a2e]">
                      {member.name} {isYou && <span className="text-gray-400 font-normal">(you)</span>}
                    </p>
                    {member.isAdmin && (
                      <p className="text-[10px] text-[#7b7ec4] font-semibold">Admin</p>
                    )}
                  </div>
                  {isAdmin && !isYou && !member.isAdmin && (
                    <button
                      onClick={() => handleKick(member.clerkId)}
                      className="text-xs text-red-400 hover:text-red-600 transition"
                    >
                      Kick
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add Members Tab */}
        {tab === "add" && isAdmin && (
          <div className="flex flex-col px-4 py-3 gap-3">
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#f0f2ff] rounded-full px-4 py-2 text-sm text-gray-700 outline-none"
            />
            <div className="flex flex-col max-h-48 overflow-y-auto gap-1">
              {nonMembers?.map((u) => {
                const isSelected = selectedIds.includes(u.clerkId);
                return (
                  <div
                    key={u._id}
                    onClick={() => toggleSelect(u.clerkId)}
                    className="flex items-center gap-3 px-2 py-2 rounded-xl cursor-pointer transition"
                    style={{ background: isSelected ? "#f0f2ff" : "transparent" }}
                  >
                    <img src={u.imageUrl} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                    <p className="text-sm text-gray-800 flex-1">{u.name}</p>
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                      style={{
                        borderColor: isSelected ? "#7b7ec4" : "#d1d5db",
                        background: isSelected ? "#7b7ec4" : "transparent",
                      }}
                    >
                      {isSelected && <span className="text-white text-[10px]">✓</span>}
                    </div>
                  </div>
                );
              })}
              {nonMembers?.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No users to add</p>
              )}
            </div>
            <button
              onClick={handleAdd}
              disabled={selectedIds.length === 0}
              className="bg-[#7b7ec4] text-white rounded-full py-2 text-sm font-semibold hover:bg-[#5b5ea6] disabled:opacity-40 transition"
            >
              Add {selectedIds.length > 0 ? `${selectedIds.length} member${selectedIds.length > 1 ? "s" : ""}` : "Members"}
            </button>
          </div>
        )}

        {/* Delete Group — admin only */}
        {isAdmin && (
          <div className="px-4 py-3 border-t border-gray-100">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full py-2 text-sm text-red-400 hover:text-red-600 font-semibold transition"
              >
                Delete Group
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-center text-gray-600">Are you sure? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2 rounded-full text-sm border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 py-2 rounded-full text-sm bg-red-500 text-white hover:bg-red-600 transition"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}