"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface CreateGroupModalProps {
  onClose: () => void;
  onCreated: (id: any) => void;
}

export default function CreateGroupModal({ onClose, onCreated }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [groupImage, setGroupImage] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const allUsers = useQuery(api.users.getAllUsers);
  const createGroup = useMutation(api.conversations.createGroup);
  const currentUser = useQuery(api.users.getCurrentUser);

  const filtered = allUsers?.filter(
    (u) =>
      u.clerkId !== currentUser?.clerkId &&
      u.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUser = (clerkId: string) => {
    setSelectedIds((prev) =>
      prev.includes(clerkId) ? prev.filter((id) => id !== clerkId) : [...prev, clerkId]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedIds.length < 1) return;
    setLoading(true);
    const id = await createGroup({
      groupName: groupName.trim(),
      groupImage: groupImage.trim() || undefined,
      memberIds: selectedIds,
    });
    setLoading(false);
    onCreated(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1a1a2e]">Create Group</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* Group Name */}
        <input
          type="text"
          placeholder="Group name *"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="bg-[#f0f2ff] rounded-full px-4 py-2 text-sm text-gray-700 outline-none"
        />

        {/* Group Image URL */}
        <input
          type="text"
          placeholder="Group image URL (optional)"
          value={groupImage}
          onChange={(e) => setGroupImage(e.target.value)}
          className="bg-[#f0f2ff] rounded-full px-4 py-2 text-sm text-gray-700 outline-none"
        />

        {/* Member Search */}
        <input
          type="text"
          placeholder="Search users to add..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#f0f2ff] rounded-full px-4 py-2 text-sm text-gray-700 outline-none"
        />

        {/* User List */}
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
          {filtered?.map((u) => {
            const isSelected = selectedIds.includes(u.clerkId);
            return (
              <div
                key={u._id}
                onClick={() => toggleUser(u.clerkId)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition"
                style={{ background: isSelected ? "#f0f2ff" : "transparent" }}
              >
                <img
                  src={u.imageUrl}
                  alt={u.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
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
        </div>

        {/* Selected count */}
        {selectedIds.length > 0 && (
          <p className="text-xs text-gray-400">{selectedIds.length} member{selectedIds.length > 1 ? "s" : ""} selected</p>
        )}

        {/* Create Button */}
        <button
          onClick={handleCreate}
          disabled={!groupName.trim() || selectedIds.length < 1 || loading}
          className="bg-[#7b7ec4] text-white rounded-full py-2 text-sm font-semibold hover:bg-[#5b5ea6] disabled:opacity-40 transition"
        >
          {loading ? "Creating..." : "Create Group"}
        </button>

      </div>
    </div>
  );
}