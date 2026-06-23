"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  Download,
  Upload,
  Link2,
  X,
  Menu,
  User,
  Shield,
  Lock,
  Users,
  AlertCircle,
  Database,
  Cloud,
  Check,
  FolderOpen,
  Keyboard,
  Info,
  Calendar,
  Layers,
  Sparkles,
  DatabaseZap,
  CheckCircle,
  CheckCircle2,
  Edit,
  Sliders,
  Settings,
  Link
} from "lucide-react";

// Types
interface VideoCard {
  id: string;
  title: string;
  description: string;
  video_url: string;
  image_url: string;
  group_name: string;
  tags: string[];
  created_at: string;
  completed?: boolean;
}

// Helper to extract YouTube video ID
function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  // Match standard watch URLs: watch?v=ID or &v=ID
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2] && match[2].length === 11) {
    return match[2];
  }
  // Match shorts
  const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch && shortsMatch[1]) {
    return shortsMatch[1];
  }
  // Match direct embed with tailing ID
  const embedMatch = url.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1];
  }
  return null;
}

// Helper to extract YouTube video ID and assemble the thumbnail cover URL
function getYouTubeThumbnail(url: string): string {
  const videoId = getYouTubeVideoId(url);
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  // Fallback on deterministic picsum seed to show unique cover images
  return `https://picsum.photos/seed/${encodeURIComponent(url.slice(-8) || "vault")}/400/225`;
}

// Custom Slider Adjustments Icon matching the user's uploaded attachment exactly
const SliderCustomIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    stroke="currentColor"
    strokeWidth="4.2"
    strokeLinecap="round"
    className={className}
  >
    {/* First row: slider handle on the right */}
    <line x1="4" y1="13" x2="36" y2="13" />
    <circle cx="26" cy="13" r="5" fill="#090b11" stroke="currentColor" strokeWidth="4.2" />
    
    {/* Second row: slider handle on the left */}
    <line x1="4" y1="27" x2="36" y2="27" />
    <circle cx="14" cy="27" r="5" fill="#090b11" stroke="currentColor" strokeWidth="4.2" />
  </svg>
);

// Helper to get clean domain name
function getCleanDomain(url: string): string {
  try {
    let cleanUrl = url;
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
    }
    const parsed = new URL(cleanUrl);
    return parsed.hostname.replace(/^www\./, "");
  } catch (e) {
    return url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] || "View Link";
  }
}

// Initial default starter data to populate on first-time use
const DEFAULT_GROUPS = ["Shorts", "Tutorial Videos", "Raw Footage", "Sound Effects"];

const DEFAULT_CARDS: VideoCard[] = [
  {
    id: "card-1",
    title: "Cinematic Color Grading Tutorial",
    description: "Great techniques for matching video colors in DaVinci Resolve. View ready-made presets at @https://google.com.",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    image_url: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    group_name: "Tutorial Videos",
    tags: ["Color_Grading", "DaVinci", "Premiere"],
    created_at: new Date().toISOString(),
    completed: true,
  },
  {
    id: "card-2",
    title: "YouTube Fast Cut Transitions",
    description: "A few motion transition effects to make your YouTube edits more engaging. Download palette from @https://soundbible.com",
    video_url: "https://www.youtube.com/watch?v=F3qO-E2zX3k",
    image_url: "https://img.youtube.com/vi/F3qO-E2zX3k/hqdefault.jpg",
    group_name: "Shorts",
    tags: ["Transition", "YouTube", "Fast_Cut"],
    created_at: new Date(Date.now() - 3600000).toISOString(),
    completed: false,
  }
];

function generateRandomId() {
  return "user-" + Math.random().toString(36).substring(2, 11);
}

export default function Home() {
  // Sync state
  const [syncStatus, setSyncStatus] = useState<"synced" | "local" | "syncing" | "error">("local");
  const [syncErrorMessage, setSyncErrorMessage] = useState("");

  const getAuthHeaders = () => {
    let username = currentUser?.username || "";
    if (!username && typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("vault_user");
        if (cached) {
          username = JSON.parse(cached).username || "";
        }
      } catch (e) {}
    }
    return {
      "Content-Type": "application/json",
      "x-user-username": username,
    };
  };

  // States variables initialized unconditionally to prevent Hydration Mismatches (SSR vs Client state)
  const [groups, setGroups] = useState<string[]>(DEFAULT_GROUPS);
  const [cards, setCards] = useState<VideoCard[]>(DEFAULT_CARDS);

  const [selectedGroup, setSelectedGroup] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  
  // Modals status state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteGroupConfirmOpen, setIsDeleteGroupConfirmOpen] = useState(false);
  const [isDeleteCardConfirmOpen, setIsDeleteCardConfirmOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  
  // Active editing card states
  const [editingCard, setEditingCard] = useState<VideoCard | null>(null);
  const [editCardUrl, setEditCardUrl] = useState("");
  const [editCardTitle, setEditCardTitle] = useState("");
  const [editCardDesc, setEditCardDesc] = useState("");
  const [editCardGroup, setEditCardGroup] = useState("");
  const [editCardTagsString, setEditCardTagsString] = useState("");
  const [editCardCompleted, setEditCardCompleted] = useState(false);

  // Custom form state for adding cards
  const [newCardUrl, setNewCardUrl] = useState("");
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDesc, setNewCardDesc] = useState("");
  const [newCardGroup, setNewCardGroup] = useState<string>(() => {
    return groups && groups.length > 0 ? groups[0] : "";
  });
  const [newCardTagsString, setNewCardTagsString] = useState("");

  // Active player card visual popup
  const [activePlayerCard, setActivePlayerCard] = useState<VideoCard | null>(null);

  // Quick link @ popup states
  const [isMentionPopupOpen, setIsMentionPopupOpen] = useState(false);
  const [mentionPopupType, setMentionPopupType] = useState<"add" | "edit" | null>(null);
  const [mentionUrlInput, setMentionUrlInput] = useState("");

  // Account system and user administration state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountActiveTab, setAccountActiveTab] = useState<"profile" | "admin">("profile");
  const [userList, setUserList] = useState<any[]>([]);

  // Own Profile change states
  const [profileNewName, setProfileNewName] = useState("");
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profileNewImage, setProfileNewImage] = useState("");

  // Admin user list creation state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [newRole, setNewRole] = useState("editor");

  // New user creation options
  const [newProfileImage, setNewProfileImage] = useState("");
  const [newAccessLimit, setNewAccessLimit] = useState("all_time");

  // System User Edit Popup states
  const [editingSystemUser, setEditingSystemUser] = useState<any | null>(null);
  const [editSystemName, setEditSystemName] = useState("");
  const [editSystemPassword, setEditSystemPassword] = useState("");
  const [editSystemProfileImage, setEditSystemProfileImage] = useState("");
  const [editSystemRole, setEditSystemRole] = useState("editor");
  const [editSystemAccessLimit, setEditSystemAccessLimit] = useState("all_time");
  const [editSystemParentId, setEditSystemParentId] = useState<string>("");

  // Category context menu and editing states
  const [contextMenuCategory, setContextMenuCategory] = useState<string | null>(null);
  const [categoryMenuPos, setCategoryMenuPos] = useState<{ x: number, y: number } | null>(null);
  const [isRenameCategoryModalOpen, setIsRenameCategoryModalOpen] = useState(false);
  const [renamingCategoryOldName, setRenamingCategoryOldName] = useState("");
  const [renamingCategoryNewName, setRenamingCategoryNewName] = useState("");
  const [hiddenGroups, setHiddenGroups] = useState<string[]>([]);

  // Context Menu & Mobile long-press states
  const [contextMenuUser, setContextMenuUser] = useState<any | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number, y: number } | null>(null);
  const [showMobileEditPencilId, setShowMobileEditPencilId] = useState<string | null>(null);
  const touchTimeoutRef = useRef<any>(null);

  // Responsive mobile menu slider (state open/closed to allow 10% narrow view)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Filter for completed items status
  const [filterCompletedOnly, setFilterCompletedOnly] = useState(false);

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
  };

  const handleConfirmMentionLink = () => {
    let rawUrl = mentionUrlInput.trim();
    if (!rawUrl) return;

    if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
      rawUrl = "https://" + rawUrl;
    }

    if (mentionPopupType === "add") {
      setNewCardDesc(prev => prev + rawUrl + " ");
    } else if (mentionPopupType === "edit") {
      setEditCardDesc(prev => prev + rawUrl + " ");
    }

    setIsMentionPopupOpen(false);
    setMentionPopupType(null);
    setMentionUrlInput("");
  };
  
  // File input ref for importing backup
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image size must be less than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Close context menu on global click
  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenuUser(null);
      setContextMenuPos(null);
      setContextMenuCategory(null);
      setCategoryMenuPos(null);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  // Shortcut key event listener (Alt + N, Alt + A, Alt + Space) - layout independent
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.hasAttribute("contenteditable")
      ) {
        return;
      }
      
      const isAlt = e.altKey;
      const key = e.key.toLowerCase();
      
      // Checking key === "د" (Persian layout for N) or key === "n" or e.codeKeyN ensures shortcut works perfectly!
      if (isAlt && (key === "n" || key === "د" || e.code === "KeyN")) {
        e.preventDefault();
        handleOpenAddModal();
        if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.readText) {
          navigator.clipboard.readText()
            .then(text => {
              const trimmed = text.trim();
              const isPossibleVideoUrl = trimmed.toLowerCase().includes("youtu.be") || 
                                        trimmed.toLowerCase().includes("youtube.com") || 
                                        trimmed.toLowerCase().includes("vimeo.com") ||
                                        trimmed.toLowerCase().startsWith("http://") ||
                                        trimmed.toLowerCase().startsWith("https://");
              const isLenientUrl = trimmed.length > 3 && !trimmed.includes(" ") && (trimmed.includes(".") || trimmed.startsWith("http"));
              if (isPossibleVideoUrl || isLenientUrl || getYouTubeVideoId(trimmed)) {
                setNewCardUrl(trimmed);
              }
            })
            .catch(err => {
              console.warn("Clipboard read blocked or empty:", err);
            });
        }
      } else if (isAlt && (key === "a" || key === "ش" || e.code === "KeyA" || key === "space" || e.code === "Space")) {
        e.preventDefault();
        setIsAddModalOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-focus input when Add Modal is opened
  useEffect(() => {
    if (isAddModalOpen) {
      setTimeout(() => {
        const input = document.getElementById("input-card-url") as HTMLInputElement;
        if (input) {
          input.focus();
          input.select();
        }
      }, 100);
    }
  }, [isAddModalOpen]);

  // Close Settings Dropdown click outside listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Show inline helper tooltips reactively
  const showAddLinkHelper = newCardDesc.includes("@") && !newCardDesc.slice(newCardDesc.lastIndexOf("@")).includes(" ");
  const showEditLinkHelper = editCardDesc.includes("@") && !editCardDesc.slice(editCardDesc.lastIndexOf("@")).includes(" ");

  // Derive thumbnail preview reactively from input
  const thumbnailPreview = newCardUrl ? getYouTubeThumbnail(newCardUrl) : "";
  const editThumbnailPreview = editCardUrl ? getYouTubeThumbnail(editCardUrl) : "";

  // Local storage management helper
  const saveLocalData = (updatedGroups: string[], updatedCards: VideoCard[]) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("editor_vault_groups", JSON.stringify(updatedGroups));
      localStorage.setItem("editor_vault_cards", JSON.stringify(updatedCards));
    }
  };

  // Sync helper to fetch from remote Supabase
  const fetchFromSupabase = async () => {
    setSyncStatus("syncing");
    try {
      const res = await fetch("/api/supabase", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "fetch" }),
      });
      const result = await res.json();
      
      if (result.success) {
        if (result.data && result.data.length > 0) {
          const parsedCards: VideoCard[] = result.data.map((item: any) => {
            let itemTags: string[] = [];
            try {
              if (typeof item.tags === "string") {
                itemTags = item.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
              } else if (Array.isArray(item.tags)) {
                itemTags = item.tags;
              }
            } catch (e) {
              itemTags = [];
            }

            return {
              id: item.id || `card-${Math.random()}`,
              title: item.title || "Untitled",
              description: item.description || "",
              video_url: item.video_url || item.url || "",
              image_url: item.image_url || getYouTubeThumbnail(item.video_url || item.url || ""),
              group_name: item.group_name || "General",
              tags: itemTags,
              created_at: item.created_at || new Date().toISOString(),
              completed: !!item.completed,
            };
          });

          const remoteGroups = Array.from(new Set(parsedCards.map(c => c.group_name))).filter(Boolean);
          
          setCards(parsedCards);
          if (remoteGroups.length > 0) {
            setGroups(prev => {
              const combined = Array.from(new Set([...prev, ...remoteGroups]));
              localStorage.setItem("editor_vault_groups", JSON.stringify(combined));
              return combined;
            });
          }
          localStorage.setItem("editor_vault_cards", JSON.stringify(parsedCards));
        }
        setSyncStatus("synced");
        setSyncErrorMessage("");
      } else {
        if (result.error === "SUPABASE_KEY_MISSING") {
          setSyncStatus("local");
          setSyncErrorMessage("Supabase key is not configured. Running in offline/local mode.");
        } else {
          setSyncStatus("error");
          setSyncErrorMessage(result.details || "Error communicating with Supabase database.");
        }
      }
    } catch (e: any) {
      setSyncStatus("error");
      setSyncErrorMessage("Failed to establish server connection.");
    }
  };

  // Sync users list from remote Supabase (hossien_users)
  const fetchUsersFromSupabase = async () => {
    try {
      const res = await fetch("/api/supabase", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "fetch", table: "hossien_users" }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setUserList(data.data);
        localStorage.setItem("vault_all_users_cache", JSON.stringify(data.data));
      } else {
        const cached = localStorage.getItem("vault_all_users_cache");
        if (cached) {
          setUserList(JSON.parse(cached));
        }
      }
    } catch (e) {
      console.error("Failed to load users from remote db, loading from cache", e);
      const cached = localStorage.getItem("vault_all_users_cache");
      if (cached) {
        setUserList(JSON.parse(cached));
      }
    }
  };

  const syncUpsertUserToSupabase = async (user: any) => {
    try {
      const res = await fetch("/api/supabase", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "upsert", table: "hossien_users", payload: user }),
      });
      const data = await res.json();
      return data;
    } catch (e) {
      console.error("Failed to upsert user to remote DB", e);
      return { success: false, error_fa: "Network connection to status server failed." };
    }
  };

  const syncDeleteUserFromSupabase = async (userId: string) => {
    try {
      const res = await fetch("/api/supabase", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "delete", table: "hossien_users", payload: { id: userId } }),
      });
      const data = await res.json();
      return data;
    } catch (e) {
      console.error("Failed to delete user from remote DB", e);
      return { success: false, error_fa: "Network connection to status server failed." };
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("vault_user");
      window.location.href = "/login";
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim() || !newName.trim()) {
      alert("Please fill in all inputs.");
      return;
    }

    if (userList.some(u => u.username.toLowerCase() === newUsername.trim().toLowerCase())) {
      alert("A user with this username already exists.");
      return;
    }

    // Role mapping and checking permissions
    const creatorRole = currentUser?.role || "super_admin";
    let assignedRole = newRole;
    
    // Safety check: Brand Owner cannot create admins or super_admins
    if (creatorRole === "admin" && (assignedRole === "super_admin" || assignedRole === "admin")) {
      assignedRole = "editor"; // Demote if they try to bypass frontend
    }

    // Calculate validity period
    let computedValidUntil: string | null = null;
    if (newAccessLimit !== "all_time") {
      const months = parseInt(newAccessLimit);
      if (!isNaN(months)) {
        const d = new Date();
        d.setMonth(d.getMonth() + months);
        computedValidUntil = d.toISOString();
      }
    }

    const newUser = {
      id: generateRandomId(),
      username: newUsername.trim(),
      password: newPassword.trim(),
      name: newName.trim(),
      is_admin: assignedRole === "super_admin",
      role: assignedRole,
      parent_id: creatorRole === "admin" ? currentUser?.id : null,
      is_suspended: false,
      profile_image: newProfileImage.trim() || null,
      access_limit: newAccessLimit,
      valid_until: computedValidUntil,
      created_at: new Date().toISOString()
    };

    let savedUser = {
      ...newUser,
      is_admin: newUser.is_admin,
      role: newUser.role,
      parent_id: newUser.parent_id ? newUser.parent_id.toString() : null,
      profile_image: newUser.profile_image,
      access_limit: newUser.access_limit,
      valid_until: newUser.valid_until
    };

    if (currentUser?.role !== "guest") {
      const result = await syncUpsertUserToSupabase(newUser);
      if (result && !result.success) {
        alert("⚠️ Error saving user in Supabase database!\n\nError:\n" + (result.error_fa || result.message || "Database configurations are incorrect."));
        return;
      }
      if (result && result.success && result.data) {
        savedUser = result.data;
      }
    }

    const updatedUsers = [...userList.filter(u => u.username !== savedUser.username), savedUser];
    setUserList(updatedUsers);
    localStorage.setItem("vault_all_users_cache", JSON.stringify(updatedUsers));
    
    setNewUsername("");
    setNewPassword("");
    setNewName("");
    setNewIsAdmin(false);
    setNewRole("editor");
    setNewProfileImage("");
    setNewAccessLimit("all_time");

    if (currentUser?.role !== "guest") {
      fetchUsersFromSupabase();
    }
    
    alert("New user created and saved search directory successfully! 🎉");
  };

  const handleOpenEditSystemUser = (usr: any) => {
    setEditingSystemUser(usr);
    setEditSystemName(usr.name || "");
    setEditSystemPassword("");
    setEditSystemProfileImage(usr.profile_image || "");
    setEditSystemRole(usr.role || "editor");
    setEditSystemAccessLimit(usr.access_limit || "all_time");
    setEditSystemParentId(usr.parent_id || "");
  };

  const handleSaveSystemUserEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSystemUser) return;
    if (!editSystemName.trim()) {
      alert("Display name cannot be empty.");
      return;
    }

    const creatorRole = currentUser?.role || "super_admin";
    let assignedRole = editSystemRole;
    if (creatorRole === "admin" && (assignedRole === "super_admin" || assignedRole === "admin")) {
      assignedRole = "editor";
    }

    // Calculate validity period
    let computedValidUntil: string | null = null;
    if (editSystemAccessLimit !== "all_time") {
      const months = parseInt(editSystemAccessLimit);
      if (!isNaN(months)) {
        const d = new Date();
        d.setMonth(d.getMonth() + months);
        computedValidUntil = d.toISOString();
      }
    }

    const updatedUser = {
      ...editingSystemUser,
      name: editSystemName.trim(),
      password: editSystemPassword.trim() ? editSystemPassword.trim() : editingSystemUser.password,
      role: assignedRole,
      is_admin: assignedRole === "super_admin",
      profile_image: editSystemProfileImage.trim() || null,
      parent_id: (currentUser?.role === "super_admin" || currentUser?.username === "admin") ? (editSystemParentId || null) : editingSystemUser.parent_id,
      access_limit: editSystemAccessLimit,
      valid_until: computedValidUntil,
    };

    if (currentUser?.role !== "guest") {
      const result = await syncUpsertUserToSupabase(updatedUser);
      if (result && !result.success) {
        alert("⚠️ Error saving user modifications in Supabase database!\n\nError:\n" + (result.error_fa || result.message));
        return;
      }
    }

    const updatedUsers = userList.map(u => u.id === editingSystemUser.id ? updatedUser : u);
    setUserList(updatedUsers);
    localStorage.setItem("vault_all_users_cache", JSON.stringify(updatedUsers));
    
    setEditingSystemUser(null);
    setShowMobileEditPencilId(null);

    if (currentUser?.role !== "guest") {
      fetchUsersFromSupabase();
    }
    alert("System user specifications updated successfully! 🎉");
  };

  const renderUserAvatar = (usr: any) => {
    const hasImage = !!(usr.profile_image && usr.profile_image.trim());
    return (
      <div className="w-8 h-8 rounded-full bg-indigo-600/10 text-indigo-400 border border-indigo-500/25 relative overflow-hidden flex items-center justify-center font-sans font-bold">
        {hasImage && (
          <img
            src={usr.profile_image}
            alt={usr.name || "User"}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover rounded-full z-10"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <svg className="w-4 h-4 text-indigo-400 p-0.5" viewBox="0 0 24 24" fill="currentColor">
          <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
        </svg>
      </div>
    );
  };

  const handleToggleUserSuspend = async (user: any) => {
    if (user.username === "admin") {
      alert("Cannot suspend the primary system administrator account.");
      return;
    }

    const confirmation = window.confirm(
      user.is_suspended 
        ? `Are you sure you want to unsuspend user "${user.name}"?`
        : `Are you sure you want to suspend user "${user.name}"?`
    );
    if (!confirmation) return;

    if (currentUser?.role !== "guest") {
      const result = await syncUpsertUserToSupabase({ ...user, is_suspended: !user.is_suspended });
      if (result && !result.success) {
        alert("⚠️ Error altering user state in database!\n\nDetails:\n" + (result.error_fa || result.message));
        return;
      }
    }

    const updatedUsers = userList.map(u => {
      if (u.id === user.id) {
        return { ...u, is_suspended: !u.is_suspended };
      }
      return u;
    });

    setUserList(updatedUsers);
    localStorage.setItem("vault_all_users_cache", JSON.stringify(updatedUsers));

    if (currentUser?.role !== "guest") {
      fetchUsersFromSupabase();
    }
    alert("User status updated successfully! 🎉");
  };

  const handleDeleteUser = async (userId: string, userName: string, userUsername: string) => {
    if (userUsername === "admin") {
      alert("Cannot delete the system administrator account.");
      return;
    }

    const confirmation = window.confirm(`Are you sure you want to completely delete user "${userName}"?`);
    if (!confirmation) return;

    if (currentUser?.role !== "guest") {
      const result = await syncDeleteUserFromSupabase(userId);
      if (result && !result.success) {
        alert("⚠️ Error deleting user from remote database!\n\nDetails:\n" + (result.error_fa || result.message));
        return;
      }
    }

    const updatedUsers = userList.filter(u => u.id !== userId);
    setUserList(updatedUsers);
    localStorage.setItem("vault_all_users_cache", JSON.stringify(updatedUsers));

    if (currentUser?.role !== "guest") {
      fetchUsersFromSupabase();
    }
    alert("User deleted from remote database successfully! 🎉");
  };

  const handleUpdateOwnProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileNewName.trim()) {
      alert("نام نمایشی نمی‌تواند خالی باشد.");
      return;
    }

    const updatedSelf = {
      ...currentUser,
      name: profileNewName.trim(),
      profile_image: profileNewImage.trim() || null,
    };

    const targetInList = userList.find(u => u.username === currentUser.username);
    if (targetInList) {
      const fullUserUpdate = {
        ...targetInList,
        name: profileNewName.trim(),
        password: profileNewPassword.trim() ? profileNewPassword.trim() : targetInList.password,
        profile_image: profileNewImage.trim() || null
      };
      
      const nextList = userList.map(u => u.id === fullUserUpdate.id ? fullUserUpdate : u);
      setUserList(nextList);
      localStorage.setItem("vault_all_users_cache", JSON.stringify(nextList));
      
      if (currentUser?.role !== "guest") {
        await syncUpsertUserToSupabase(fullUserUpdate);
      }
    }

    localStorage.setItem("vault_user", JSON.stringify(updatedSelf));
    setCurrentUser(updatedSelf);
    
    setProfileNewPassword("");
    alert("Your account profile has been updated successfully!");
    setIsAccountModalOpen(false);
  };

  // Initialize on component mount safely
  useEffect(() => {
    // Load local storage data safely on the client side once mounted inside a deferred block to prevent cascading render warnings
    const loadTimer = setTimeout(() => {
      // 1. Guard check for unauthorized users
      if (typeof window !== "undefined") {
        const activeUserStr = localStorage.getItem("vault_user");
        if (!activeUserStr) {
          window.location.href = "/login";
          return;
        }
        try {
          const parsed = JSON.parse(activeUserStr);
          setCurrentUser(parsed);
          setProfileNewName(parsed.name || "");
          setProfileNewImage(parsed.profile_image || "");
        } catch (err) {
          window.location.href = "/login";
          return;
        }
      }

      let isGuestUser = false;
      if (typeof window !== "undefined") {
        const cachedGroups = localStorage.getItem("editor_vault_groups");
        const cachedCards = localStorage.getItem("editor_vault_cards");
        
        let loadedGroups = DEFAULT_GROUPS;
        if (cachedGroups) {
          try {
            loadedGroups = JSON.parse(cachedGroups);
            setGroups(loadedGroups);
          } catch (e) {
            console.error("Failed to parse cached groups", e);
          }
        }
        
        if (cachedCards) {
          try {
            setCards(JSON.parse(cachedCards));
          } catch (e) {
            console.error("Failed to parse cached cards", e);
          }
        }

        const cachedHiddenGroups = localStorage.getItem("editor_vault_hidden_groups");
        if (cachedHiddenGroups) {
          try {
            setHiddenGroups(JSON.parse(cachedHiddenGroups));
          } catch(e) {}
        }

        if (loadedGroups.length > 0) {
          setNewCardGroup(loadedGroups[0]);
        }

        // Check if role is guest
        const activeUserStr = localStorage.getItem("vault_user");
        if (activeUserStr) {
          try {
            const parsed = JSON.parse(activeUserStr);
            isGuestUser = parsed.role === "guest";
          } catch (e) {}
        }
      }

      // Proactively trigger database sync and user loading only if NOT guest
      if (!isGuestUser) {
        fetchFromSupabase();
        fetchUsersFromSupabase();
      } else {
        setSyncStatus("local");
        setSyncErrorMessage("");
      }
    }, 0);

    return () => clearTimeout(loadTimer);
  }, []);

  // Helper to check user roles and permissions on the client-side
  const isActionAllowed = (action: "create" | "edit" | "delete" | "toggle_complete") => {
    // Treat system admin username as absolute bypass
    if (currentUser?.username === "admin") return true; 

    const role = currentUser?.role || "editor";
    
    if (role === "super_admin" || role === "admin") return true;
    
    if (role === "viewer") {
      return false; // Viewers can only view, no modifications whatsoever
    }
    
    if (role === "editor") {
      if (action === "create") return true; // Editor can only upload/create videos
      return false; // Editor cannot edit, delete, or mark completed
    }
    
    return false;
  };

  // Push single change to Supabase (upsert)
  const syncUpsertToSupabase = async (card: VideoCard) => {
    try {
      const res = await fetch("/api/supabase", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "upsert",
          payload: {
            id: card.id,
            title: card.title,
            description: card.description,
            video_url: card.video_url,
            image_url: card.image_url,
            group_name: card.group_name,
            tags: card.tags.join(","), // Store as comma-separated string
            completed: !!card.completed,
            created_at: card.created_at,
          }
        }),
      });
      const result = await res.json();
      if (result.success) {
        setSyncStatus("synced");
      } else {
        if (result.error !== "SUPABASE_KEY_MISSING") {
          setSyncStatus("error");
          if (result.error_fa) {
            alert(result.error_fa);
          }
        }
      }
    } catch (e) {
      setSyncStatus("error");
    }
  };

  // Delete card from Supabase
  const syncDeleteFromSupabase = async (id: string) => {
    try {
      const res = await fetch("/api/supabase", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "delete",
          payload: { id }
        }),
      });
      const result = await res.json();
      if (result.success) {
        setSyncStatus("synced");
      }
    } catch (e) {
      setSyncStatus("error");
    }
  };

  // Toggle completed status directly from card view
  const handleToggleCardCompletedDirect = (e: React.MouseEvent, card: VideoCard) => {
    e.stopPropagation();
    if (!isActionAllowed("toggle_complete")) {
      alert("خطای دسترسی: کاربران با نقش ادیتور یا بیننده امکان اتمام کار یا تغییر وضعیت ویدیوها را ندارند.");
      return;
    }
    const updated = { ...card, completed: !card.completed };
    const nextCards = cards.map(c => c.id === card.id ? updated : c);
    setCards(nextCards);
    saveLocalData(groups, nextCards);
    syncUpsertToSupabase(updated);
  };

  // Open Player Modal
  const handleOpenPlayerModal = (card: VideoCard) => {
    setActivePlayerCard(card);
  };

  // Open Edit Card Modal
  const handleOpenEditModal = (card: VideoCard) => {
    if (!isActionAllowed("edit")) {
      alert("خطای دسترسی: شما اجازه ویرایش اطلاعات ویدیو را ندارید. فقط مدیران قادر به تغییر اطلاعات هستند.");
      return;
    }
    setEditingCard(card);
    setEditCardUrl(card.video_url || "");
    setEditCardTitle(card.title || "");
    setEditCardDesc(card.description || "");
    setEditCardGroup(card.group_name || groups[0] || "عمومی");
    setEditCardTagsString(card.tags ? card.tags.map(t => `#${t}`).join(" ") : "");
    setEditCardCompleted(!!card.completed);
  };

  // Save Card edits from modal
  const handleSaveCardEdits = () => {
    if (!isActionAllowed("edit")) {
      alert("خطای دسترسی: شما اجازه ثبت تغییرات ویدیو را ندارید.");
      return;
    }
    if (!editingCard || !editCardUrl.trim() || !editCardTitle.trim()) return;

    const tags = editCardTagsString
      .split(/[\s,،]+/)
      .map(t => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    const updated: VideoCard = {
      ...editingCard,
      title: editCardTitle.trim(),
      description: editCardDesc.trim(),
      video_url: editCardUrl.trim(),
      image_url: editCardUrl.trim() !== editingCard.video_url ? getYouTubeThumbnail(editCardUrl.trim()) : editingCard.image_url,
      group_name: editCardGroup || groups[0] || "عمومی",
      tags: tags,
      completed: editCardCompleted,
    };

    const nextCards = cards.map(c => c.id === editingCard.id ? updated : c);
    setCards(nextCards);
    saveLocalData(groups, nextCards);
    syncUpsertToSupabase(updated);

    // Close Modal
    setEditingCard(null);
  };

  // Group Management Actions
  const handleAddGroup = () => {
    if (!isActionAllowed("create")) {
      alert("خطای دسترسی: حساب شما اجازه ساخت گروه‌های جدید را ندارد.");
      return;
    }
    if (!groupSearchQuery.trim()) return;
    
    const formatted = groupSearchQuery.trim();
    if (groups.includes(formatted)) {
      setSelectedGroup(formatted);
      setGroupSearchQuery("");
      return;
    }

    const nextGroups = [...groups, formatted];
    setGroups(nextGroups);
    saveLocalData(nextGroups, cards);
    setSelectedGroup(formatted);
    setGroupSearchQuery("");
  };

  const handleTriggerGroupDelete = () => {
    if (selectedGroup === "همه" || !selectedGroup) return;
    if (!isActionAllowed("delete")) {
      alert("خطای دسترسی: فقط مدیران سیستم امکان حذف گروه‌ها را دارند.");
      return;
    }
    setGroupToDelete(selectedGroup);
    setIsDeleteGroupConfirmOpen(true);
  };

  const execDeleteGroup = async () => {
    if (!isActionAllowed("delete")) {
      alert("خطای دسترسی: شما اجازه حذف گروه‌ها را ندارید.");
      return;
    }
    if (!groupToDelete) return;
    const nextGroups = groups.filter(g => g !== groupToDelete);
    const nextCards = cards.filter(c => c.group_name !== groupToDelete);
    
    const deletedCards = cards.filter(c => c.group_name === groupToDelete);
    for (const dc of deletedCards) {
      syncDeleteFromSupabase(dc.id);
    }
    
    setGroups(nextGroups);
    setCards(nextCards);
    saveLocalData(nextGroups, nextCards);
    
    setSelectedGroup("همه");
    setIsDeleteGroupConfirmOpen(false);
    setGroupToDelete(null);
  };

  // Card Management Actions
  const handleAddNewCard = async () => {
    if (!isActionAllowed("create")) {
      alert("خطای دسترسی: کاربران با نقش بیننده امکان بارگذاری ویدیو ندارند.");
      return;
    }
    if (!newCardUrl.trim() || !newCardTitle.trim()) return;

    const tags = newCardTagsString
      .split(/[\s,،]+/)
      .map(t => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    const newCard: VideoCard = {
      id: `card-${Date.now()}`,
      title: newCardTitle.trim(),
      description: newCardDesc.trim(),
      video_url: newCardUrl.trim(),
      image_url: thumbnailPreview || getYouTubeThumbnail(newCardUrl.trim()),
      group_name: newCardGroup || (groups[0] || "عمومی"),
      tags: tags,
      created_at: new Date().toISOString(),
      completed: false,
    };

    const nextCards = [newCard, ...cards];
    setCards(nextCards);
    saveLocalData(groups, nextCards);

    syncUpsertToSupabase(newCard);

    // Reset Form
    setNewCardUrl("");
    setNewCardTitle("");
    setNewCardDesc("");
    setNewCardTagsString("");
    setIsAddModalOpen(false);
  };

  const handleTriggerCardDelete = (id: string) => {
    if (!isActionAllowed("delete")) {
      alert("خطای دسترسی: شما اجازه حذف ویدیوها را ندارید.");
      return;
    }
    setCardToDelete(id);
    setIsDeleteCardConfirmOpen(true);
  };

  const execDeleteCard = async () => {
    if (!isActionAllowed("delete")) {
      alert("خطای دسترسی: شما اجازه حذف ویدیوها را ندارید.");
      return;
    }
    if (!cardToDelete) return;
    const nextCards = cards.filter(c => c.id !== cardToDelete);
    setCards(nextCards);
    saveLocalData(groups, nextCards);

    syncDeleteFromSupabase(cardToDelete);

    if (editingCard?.id === cardToDelete) {
      setEditingCard(null);
    }

    setIsDeleteCardConfirmOpen(false);
    setCardToDelete(null);
  };

  // Parse @mentions and #hashtags in card description
  const renderParsedText = (text: string) => {
    if (!text) return null;
    const words = text.split(/(\s+)/);
    return words.map((word, idx) => {
      if (word.startsWith("@")) {
        const cleanVal = word.slice(1);
        let href = cleanVal;
        if (!href.startsWith("http://") && !href.startsWith("https://")) {
          href = `https://${href}`;
        }
        return (
          <a
            key={idx}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            id={`mention-link-${idx}`}
            className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-mono text-[11px] border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)] transition-all mx-0.5"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            🔗 {getCleanDomain(cleanVal)}
          </a>
        );
      }
      
      if (word.startsWith("#")) {
        return (
          <span
            key={idx}
            className="text-amber-400 font-medium whitespace-nowrap mx-0.5 text-[11px]"
          >
            {word}
          </span>
        );
      }
      
      return <span key={idx} className="text-gray-300">{word}</span>;
    });
  };

  // Export Data to local file JSON
  const handleExportData = () => {
    const backup = {
      version: "1.0",
      groups: groups,
      cards: cards,
      exportedAt: new Date().toISOString()
    };
    
    const dataStrStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStrStr);
    downloadAnchor.setAttribute("download", `editor-vault-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setIsSettingsOpen(false);
  };

  // Import Data from selected backup JSON
  const handleImportDataTrigger = () => {
    fileInputRef.current?.click();
    setIsSettingsOpen(false);
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && Array.isArray(json.groups) && Array.isArray(json.cards)) {
          const mergedGroups = Array.from(new Set([...groups, ...json.groups]));
          const importedCardsMap = new Map(json.cards.map((c: VideoCard) => [c.id, c]));
          const existingCardsFiltered = cards.filter(c => !importedCardsMap.has(c.id));
          const mergedCards = [...json.cards, ...existingCardsFiltered];

          setGroups(mergedGroups);
          setCards(mergedCards);
          saveLocalData(mergedGroups, mergedCards);

          for (const card of json.cards) {
            await syncUpsertToSupabase(card);
          }

          alert("Your backup data has been successfully restored and synchronized with the database!");
        } else {
          alert("Invalid backup file format.");
        }
      } catch (err) {
        alert("Error reading backup file. Please make sure it is a valid JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset
  };

  const isManager = currentUser?.role === "super_admin" || currentUser?.role === "admin" || currentUser?.is_admin || currentUser?.username === "admin";

  const handleToggleHideCategory = (categoryName: string) => {
    let nextHidden;
    if (hiddenGroups.includes(categoryName)) {
      nextHidden = hiddenGroups.filter(g => g !== categoryName);
    } else {
      nextHidden = [...hiddenGroups, categoryName];
    }
    setHiddenGroups(nextHidden);
    localStorage.setItem("editor_vault_hidden_groups", JSON.stringify(nextHidden));
  };

  const handleRenameCategory = async (oldName: string, newName: string) => {
    if (!oldName || !newName || oldName === newName) return;
    
    const nextGroups = groups.map(g => g === oldName ? newName : g);
    setGroups(nextGroups);
    
    const nextCards = cards.map(c => c.group_name === oldName ? { ...c, group_name: newName } : c);
    setCards(nextCards);
    
    saveLocalData(nextGroups, nextCards);
    
    if (hiddenGroups.includes(oldName)) {
      const nextHidden = hiddenGroups.map(g => g === oldName ? newName : g);
      setHiddenGroups(nextHidden);
      localStorage.setItem("editor_vault_hidden_groups", JSON.stringify(nextHidden));
    }
    
    if (selectedGroup === oldName) {
      setSelectedGroup(newName);
    }
    
    const changedCards = nextCards.filter(c => c.group_name === newName);
    for (const card of changedCards) {
      await syncUpsertToSupabase(card);
    }
    
    alert("Category renamed successfully. 🎉");
  };

  // Filter groups matches search and visibility constraints
  const filteredGroupsList = groups.filter(g => 
    g.toLowerCase().includes(groupSearchQuery.toLowerCase()) &&
    (isManager || !hiddenGroups.includes(g))
  );

  // Filter cards based on selected group & global search query
  const filteredCards = cards.filter(card => {
    if (!isManager && hiddenGroups.includes(card.group_name)) {
      return false;
    }
    const matchGroup = selectedGroup === "All" || card.group_name === selectedGroup;
    const matchSearch = 
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.video_url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchCompleted = !filterCompletedOnly || card.completed === true;
    
    return matchGroup && matchSearch && matchCompleted;
  });

  // Filter user list based on active user role to prevent business overlap
  const visibleUsers = userList.filter(usr => {
    if (currentUser?.role === "super_admin" || currentUser?.username === "admin") {
      return true;
    }
    if (currentUser?.role === "admin") {
      return usr.parent_id === currentUser?.id || usr.id === currentUser?.id;
    }
    return usr.id === currentUser?.id;
  });

  return (
    <main className="h-screen flex flex-col bg-[#050508] text-[#E4E4E7] overflow-hidden font-vazir relative">
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-indigo-950/15 via-[#050508]/2 to-transparent pointer-events-none z-0"></div>

      {/* 1. STYLISH HEADER */}
      <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-white/[0.08] bg-[#1a1b24]/95 backdrop-blur-md z-20 select-none relative">
        {/* RIGHT SIDE of screen in RTL (First Child): Logo on desktop, Search + Hamburger on mobile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile view: Search bar + Hamburger menu placed on the right */}
          <div className="flex md:hidden items-center gap-2">
            {/* Global Search with compact width */}
            <div className="relative flex items-center">
              <Search className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                id="mob-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-28 sm:w-36 bg-white/[0.04] hover:bg-white/[0.07] focus:bg-[#0E0E12] border border-white/[0.08] focus:border-indigo-500/60 rounded-full py-1.5 pr-8 pl-3 text-xs text-gray-100 placeholder-gray-500 transition-all duration-300 ease-out focus:outline-none focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] font-vazir"
              />
            </div>

            {/* Filter Toggle Button on Mobile */}
            <button
              onClick={() => setFilterCompletedOnly(!filterCompletedOnly)}
              className={`w-8 h-8 flex items-center justify-center rounded-full border transition-all cursor-pointer relative shrink-0 ${
                filterCompletedOnly
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                  : "bg-white/[0.04] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.08]"
              }`}
              title={filterCompletedOnly ? "Filter: Show Completed Only" : "Filter: Show All Videos"}
            >
              <SliderCustomIcon className="w-3.5 h-3.5" />
              {filterCompletedOnly && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 border border-black rounded-full animate-pulse" />
              )}
            </button>

            {/* Hamburger button immediately after Search Bar */}
            <button
              id="btn-sidebar-hamburger"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-xl flex items-center justify-center text-gray-300 hover:text-white transition-all cursor-pointer shrink-0"
              title={isMobileMenuOpen ? "Close menu" : "Open sidebar"}
            >
              {isMobileMenuOpen ? (
                <X className="w-4 h-4 text-indigo-400 animate-pulse" />
              ) : (
                <Menu className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>

          {/* Desktop view only: Logo Icon and Wording branding */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-950/60 relative group overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white transform group-hover:rotate-6 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-black tracking-widest text-white font-space leading-tight">
                EDITOR<span className="text-indigo-400">VAULT</span>
              </h1>
              <div className="flex items-center gap-1 leading-none">
                <span className="inline-block w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[8px] sm:text-[9px] text-gray-400 font-bold tracking-tight">Video Coordination Panel</p>
              </div>
            </div>
          </div>
        </div>

        {/* LEFT SIDE of screen in RTL (Second Child): Search + Settings + Add on desktop, Settings + Add on mobile */}
        {(() => {
          const isBackupAllowed = !!(currentUser && (currentUser.username === "admin" || currentUser.role === "super_admin" || currentUser.role === "admin"));
          return (
            <div className="flex items-center gap-2 md:gap-3">
              {/* Mobile view only: Settings combined with Add Video button on the left edge */}
              <div className="flex md:hidden items-center gap-2">
                <div className="relative">
                  <button
                    id="btn-backup-settings-toggle-mobile"
                    onClick={() => {
                      if (isBackupAllowed) {
                        setIsSettingsOpen(!isSettingsOpen);
                      } else {
                        alert("Access Denied: Backup tools are restricted to Super Admin and Brand Admin users.");
                      }
                    }}
                    className={`w-9 h-9 flex items-center justify-center rounded-full border border-white/[0.06] transition-all cursor-pointer ${
                      isBackupAllowed
                        ? "bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white active:scale-95"
                        : "bg-white/[0.01] text-gray-650 cursor-not-allowed opacity-35"
                    }`}
                    title={isBackupAllowed ? "Database & Backup Settings" : "Backup Settings (Restricted to Administrators)"}
                  >
                    {isBackupAllowed ? (
                      <Settings className={`w-4 h-4 ${isSettingsOpen ? "rotate-95 text-indigo-400" : ""} transition-transform duration-300`} />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-gray-600" />
                    )}
                  </button>
                </div>

                <button
                  id="btn-open-add-dialog-mobile"
                  onClick={() => handleOpenAddModal()}
                  className="w-9 h-9 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-full transition-all cursor-pointer shadow-lg shadow-indigo-950/50 hover:scale-105 shrink-0"
                  title="Add New Video Card (Alt + N)"
                >
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* Desktop view only: Search + Settings Popover & Create button */}
              <div className="hidden md:flex items-center gap-2 md:gap-3">
                {/* Global Search with expanding animation on focus */}
                <div className="relative flex items-center">
                  <Search className="absolute right-3.5 top-2.5 w-4 h-4 text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    id="global-search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-28 sm:w-48 md:w-64 focus:w-36 sm:focus:w-56 md:focus:w-80 bg-white/[0.04] hover:bg-white/[0.07] focus:bg-[#0E0E12] border border-white/[0.08] focus:border-indigo-500/60 rounded-full py-1.5 pr-9 pl-4 text-xs text-gray-100 placeholder-gray-500 transition-all duration-300 ease-out focus:outline-none focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] font-vazir"
                  />
                </div>

                {/* Filter Toggle Button to the left of the search bar */}
                <button
                  onClick={() => setFilterCompletedOnly(!filterCompletedOnly)}
                  className={`w-9 h-9 flex items-center justify-center rounded-full border transition-all cursor-pointer relative shrink-0 ${
                    filterCompletedOnly
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                      : "bg-white/[0.04] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.08]"
                  }`}
                  title={filterCompletedOnly ? "Filter: Show Completed Only (Active)" : "Filter by Completed Status"}
                >
                  <SliderCustomIcon className="w-4 h-4" />
                  {filterCompletedOnly && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border border-black rounded-full animate-pulse" />
                  )}
                </button>

                <div className="relative" ref={settingsDropdownRef}>
                  <button
                    id="btn-backup-settings-toggle"
                    onClick={() => {
                      if (isBackupAllowed) {
                        setIsSettingsOpen(!isSettingsOpen);
                      } else {
                        alert("Access Denied: Backup tools are restricted to Super Admin and Brand Admin users.");
                      }
                    }}
                    className={`w-9 h-9 flex items-center justify-center rounded-full border border-white/[0.06] transition-all cursor-pointer ${
                      isBackupAllowed
                        ? "bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white active:scale-95"
                        : "bg-white/[0.01] text-gray-650 cursor-not-allowed opacity-35"
                    }`}
                    title={isBackupAllowed ? "Database & Backup Settings" : "Backup Settings (Restricted to Administrators)"}
                  >
                    {isBackupAllowed ? (
                      <Settings className={`w-4 h-4 ${isSettingsOpen ? "rotate-95 text-indigo-400" : ""} transition-transform duration-300`} />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-gray-600" />
                    )}
                  </button>
                </div>

                <button
                  id="btn-open-add-dialog"
                  onClick={() => handleOpenAddModal()}
                  className="w-9 h-9 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-full transition-all cursor-pointer shadow-lg shadow-indigo-950/50 hover:scale-105 shrink-0"
                  title="Add Video Card (Alt + N)"
                >
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          );
        })()}

        {/* Global Floating Settings Dropdown Menu */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute left-4 md:left-24 top-16 w-56 bg-[#0E0E14] border border-white/[0.08] rounded-xl shadow-2xl p-2 z-50 text-right backdrop-blur-xl"
            >
              <p className="text-[10px] text-gray-500 px-3 py-1.5 font-bold border-b border-white/[0.04] mb-1 font-mono uppercase tracking-wider">Database & Backup Settings</p>
              
              <button
                onClick={handleExportData}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors text-right cursor-pointer"
              >
                <span>Download Backup</span>
                <Download className="w-3.5 h-3.5 text-indigo-400" />
              </button>

              <button
                onClick={handleImportDataTrigger}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors text-right cursor-pointer"
              >
                <span>Import Backup</span>
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
              </button>

              <div className="border-t border-white/[0.04] my-1 pt-1.5 px-3">
                <p className="text-[9px] text-gray-500 leading-relaxed font-vazir">Sync Status:</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {syncStatus === "synced" && (
                    <span className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold">
                      <Cloud className="w-3 h-3" /> Cloud Sync Active
                    </span>
                  )}
                  {syncStatus === "syncing" && (
                    <span className="flex items-center gap-1.5 text-indigo-400 text-[10px]">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Connecting...
                    </span>
                  )}
                  {syncStatus === "local" && (
                    <span className="flex items-center gap-1.5 text-zinc-400 text-[10px]">
                      <Database className="w-3 h-3" /> Offline Mode (Local)
                    </span>
                  )}
                  {syncStatus === "error" && (
                    <span className="flex items-center gap-1.5 text-rose-400 text-[10px]">
                      <AlertCircle className="w-3 h-3" /> Cloud Connection Error
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportFileChange}
          accept=".json"
          className="hidden"
        />
      </header>

      {/* 2. LAYOUT: SIDEBAR (DESKTOP + RESPONSIVE MOBILE DRAWER) + CARD CONTAINER */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Mobile-only menu backdrop blur / dismiss panel - strictly covers workspace below the Header */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[4px] z-30 md:hidden pointer-events-auto transition-all duration-300"
            />
          )}
        </AnimatePresence>
        
        {/* Responsive Dual-Mode Sidebar (Hidden on mobile by default, slides on top when open; standard 240px static sidebar on desktop) */}
        <aside
          className={`flex flex-col border-l border-white/[0.08] bg-[#15161f]/95 overflow-hidden transition-all duration-300 select-none gap-4 shrink-0 pt-4 px-4 pb-0 md:pt-5 md:px-5 md:pb-0 h-full z-20
            ${isMobileMenuOpen 
              ? "absolute md:relative top-0 md:top-auto right-0 bottom-0 h-full md:h-full w-[280px] md:w-[240px] shadow-2xl z-40 bg-[#15161f] flex animate-in slide-in-from-right duration-200" 
              : "hidden md:flex md:relative w-[240px]"
            }
          `}
        >
          {/* Mobile menu close button + branding on top of sidebar */}
          <div className="flex md:hidden items-center justify-between pb-3.5 border-b border-white/[0.06] shrink-0 mb-1">
            <span className="text-xs font-black tracking-widest text-white font-space leading-none">
              EDITOR<span className="text-indigo-400">VAULT</span>
            </span>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
              title="Close menu"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {("All" as string) !== "همه" && <div id="group-locale-en" className="hidden" />}

          {/* Label Group segment */}
          <div className="flex items-center justify-between text-gray-400 font-bold text-xs pb-1 border-b border-white/[0.04] shrink-0">
            <span className="text-[10px] uppercase tracking-widest font-mono text-gray-500">Categories</span>
            <span className="text-[10px] bg-white/[0.04] text-gray-400 px-2 py-0.5 rounded font-space">
              {groups.length}
            </span>
          </div>

          {/* Single-line Group Action input */}
          <div className="flex items-center gap-1 bg-white/[0.02] p-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.12] transition-colors shrink-0">
            <input
              type="text"
              id="group-inline-action-input"
              value={groupSearchQuery}
              onChange={(e) => setGroupSearchQuery(e.target.value)}
              placeholder="New Category..."
              className="w-full bg-transparent text-xs text-gray-200 placeholder-gray-600 border-none focus:outline-none pr-1 focus:ring-0"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddGroup();
              }}
            />
            
            <button
              id="btn-group-inline-add"
              onClick={handleAddGroup}
              title="Create new category"
              className="p-1 rounded hover:bg-indigo-600/20 hover:text-indigo-400 text-gray-500 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            <button
              id="btn-group-inline-delete"
              onClick={handleTriggerGroupDelete}
              disabled={selectedGroup === "All" || !selectedGroup}
              title="Delete active category"
              className="p-1 rounded hover:bg-rose-950/40 hover:text-rose-400 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-500 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Group scroll menu selection - middle flex-1 keeps it dynamic */}
          <div className="flex-1 flex flex-col gap-1 mt-1 overflow-hidden">
            {/* All Videos trigger */}
            <button
              id="group-all-select"
              onClick={() => setSelectedGroup("All")}
              className={`flex items-center justify-between rounded-lg transition-all text-right cursor-pointer shrink-0 px-3 py-2.5 text-xs font-semibold
                ${selectedGroup === "All"
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                  : "hover:bg-white/[0.03] text-gray-400 hover:text-gray-200 border border-transparent"
                }
              `}
              title="All Videos"
            >
              <span>All Videos</span>
              <span className="font-space text-[10px] opacity-70 bg-black/40 px-2 py-0.5 rounded">
                {cards.length}
              </span>
            </button>

            {/* Individual categories row - scrollable container */}
            <div className="flex-1 flex flex-col gap-1 overflow-y-auto mt-1 pr-0.5">
              {filteredGroupsList.map((g, i) => {
                const countOfCardsInGroup = cards.filter(c => c.group_name === g).length;
                const matchesActive = selectedGroup === g;
                const isCatHidden = hiddenGroups.includes(g);
                return (
                  <button
                    key={`${g}-${i}`}
                    id={`group-select-${g}`}
                    onClick={() => setSelectedGroup(g)}
                    onContextMenu={(e) => {
                      if (isManager && window.innerWidth >= 768) {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenuCategory(g);
                        setCategoryMenuPos({ x: e.clientX, y: e.clientY });
                      }
                    }}
                    className={`flex items-center justify-between rounded-lg transition-all text-right cursor-pointer px-3 py-2 text-xs font-medium group
                      ${matchesActive
                        ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                        : "hover:bg-white/[0.03] text-gray-400 hover:text-gray-200 border border-transparent"
                      }
                      ${isCatHidden ? "border border-dashed border-amber-500/30 text-amber-500/80 hover:text-amber-400" : ""}
                    `}
                    title={g}
                  >
                    <span className="truncate pr-1 flex items-center gap-1.5">
                      {isCatHidden && (
                        <img 
                          src="/hide.png" 
                          alt="Hidden" 
                          className="w-3.5 h-3.5 text-amber-500 inline-block shrink-0" 
                          title="Hidden from Editors"
                        />
                      )}
                      <span className="truncate">{g}</span>
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCatHidden && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleHideCategory(g);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/10 rounded cursor-pointer flex items-center justify-center"
                          title="Unhide and make visible to everyone"
                        >
                          <img 
                            src="/visible.png" 
                            className="w-3.5 h-3.5 text-emerald-400" 
                            alt="visible"
                          />
                        </span>
                      )}
                      <span className="font-space text-[10px] opacity-70 bg-black/40 px-1.5 py-0.5 rounded">
                        {countOfCardsInGroup}
                      </span>
                    </div>
                  </button>
                );
              })}
              
              {filteredGroupsList.length === 0 && (
                <div className="text-center text-[10px] text-gray-500 mt-4 py-3 border border-white/[0.05] border-dashed rounded-lg">
                  No categories found
                </div>
              )}
            </div>
          </div>

          {/* Account Profile Setup + Instructions Footer Block - pinned/stuck permanently at the bottom on all devices with bottom padding for perfect alignment */}
          <div className="mt-auto flex flex-col gap-2.5 pt-3 pb-4 md:pb-5 border-t border-white/[0.04] bg-[#15161f] shrink-0">
            {/* Beautiful Profile Widget Container */}
            <div
              id="sidebar-account-panel-btn"
              onClick={() => setIsAccountModalOpen(true)}
              className="bg-indigo-500/5 hover:bg-indigo-500/10 rounded-xl border border-indigo-500/10 hover:border-indigo-500/30 flex items-center justify-between p-3 transition-all cursor-pointer group"
              title="View & Manage Account Profile"
            >
              <div className="flex items-center gap-2.5 w-full">
                <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/20 shadow-inner shrink-0 group-hover:scale-105 transition-transform relative overflow-hidden">
                  {currentUser?.profile_image ? (
                    <img
                      src={currentUser.profile_image}
                      alt={currentUser.name}
                      className="absolute inset-0 w-full h-full object-cover rounded-full z-10"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                  <span className="z-0">{currentUser?.name ? currentUser.name[0] : "U"}</span>
                </div>
                <div className="text-right flex-1 truncate">
                  <p className="text-[11px] font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                    {currentUser?.name || "System User"}
                  </p>
                  <p className="text-[9px] text-gray-400 font-medium">
                    {currentUser?.is_admin ? "System Admin (Admin)" : currentUser?.role === "guest" ? "Guest Account" : "Editor User"}
                  </p>
                </div>
                <span className="text-[9.5px] text-gray-500 group-hover:text-indigo-400 transition-colors pl-1 shrink-0">◀</span>
              </div>
            </div>

            {/* Sidebar keyboard manual instructions */}
            <div className="hidden md:flex bg-white/[0.02] p-3 rounded-lg border border-white/[0.04] flex-col gap-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-mono flex items-center gap-1">
                <Keyboard className="w-3 h-3 text-indigo-400" /> Keyboard Shortcuts
              </p>
              <p className="text-[10px] text-gray-400 leading-relaxed font-vazir">
                Press <kbd className="px-1 bg-white/[0.08] text-white rounded font-mono text-[9px]">Alt + N</kbd> to open the new card dialog.
              </p>
            </div>
          </div>
        </aside>

        {/* 3. MAIN WORKSPACE PANEL */}
        <section
          className="flex-1 bg-[#090b11] p-4 sm:p-6 md:p-8 overflow-y-auto flex flex-col select-none gap-4 md:gap-6 text-[#E4E4E7] relative"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cg fill='%235b5e82' fill-opacity='0.08'%3E%3Cpath d='M10 10h2v2H10zm30 15h3v3h-3zm10 50h1v1h-1zm15-40h2v2h-2zm-5 80h1v1h-1zm40-20h2v2h-2zm25-30h3v3h-3zm5-30h1v1h-1zm-15 80h2v2h-2zm-25 20h1v1h-1zM5 85h2v2H5zm35 45h3v3h-3zm55 15h1v1h-1zm15-40h2v2h-2zm-5 40h1v1h-1zm30-90h2v2h-2zm25 30h3v3h-3zm-10 5h1v1h-1zM110 5h2v2h-2z'/%3E%3Ccircle cx='15' cy='135' r='1.5'/%3E%3Ccircle cx='85' cy='15' r='2'/%3E%3Ccircle cx='105' cy='115' r='1'/%3E%3Ccircle cx='145' cy='65' r='2.5'/%3E%3Cpath d='M25 80c-5 0-10 3-10 8s5 8 10 8 10-3 10-8-5-8-10-8zm0 14c-3 0-6-2-6-6s3-6 6-6 6 2 6 6-3 6-6 6zm75-50h6v4h-6zm15 3c2-2 4-5 1-8s-8 1-9 4l8 4zm16 47h2v5h-2zm-35 25h12v1H96zm5 12h2v4h-2zm-41-9c-2 4-5 6-7 4s-1-6 2-8 5 4 5 4zM24 35c3-3 8-1 8 4s-4 8-8 4-3-8 0-8zm96 45c0-10 8-18 18-18s18 8 18 18-8 18-18 18-18-8-18-18zm2 0c0 9 7 16 16 16s16-7 16-16-7-16-16-16-16 7-16 16z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
          }}
        >
          
          {/* Section title header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
            <div>
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                <span>Category:</span>
                <span className="text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-md border border-indigo-500/20 text-xs md:text-sm font-semibold">
                  {selectedGroup}
                </span>
              </h2>
            </div>
            
            <div className="text-xs">
              <span className="bg-indigo-950/40 text-indigo-400 px-3 py-1 rounded-full border border-indigo-900/40 text-[11px] font-medium animate-pulse">
                {filteredCards.length} {filteredCards.length === 1 ? "video" : "videos"}
              </span>
            </div>
          </div>

          {/* Card workspace layout */}
          <div className="flex-1">
            <AnimatePresence>
              {filteredCards.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                  {filteredCards.map((card) => (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => handleOpenPlayerModal(card)}
                      className="bg-[#10111a] rounded-xl overflow-hidden border border-white/[0.06] hover:border-indigo-500/40 transition-all duration-300 group flex flex-col h-full flex-shrink-0 cursor-pointer hover:shadow-[0_0_25px_rgba(99,102,241,0.18)] hover:-translate-y-1 relative"
                    >
                      {/* Thumbnail frame view */}
                      <div className="relative aspect-video bg-black overflow-hidden border-b border-white/[0.04]">
                        <img
                          src={card.image_url}
                          alt={card.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                        
                        {/* Circle Direct External Play Link Overlay */}
                        <div className="absolute inset-0 bg-transparent group-hover:bg-black/60 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300">
                          <div
                            className="p-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-transform hover:scale-110 shadow-lg flex items-center justify-center"
                            title="Play & View Video"
                          >
                            <svg className="w-6 h-6 fill-current text-white ml-0.5" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" stroke="none" />
                            </svg>
                          </div>
                        </div>

                        {/* Top Group pill overlay */}
                        <div className="absolute top-2.5 right-2.5 left-2.5 flex items-center justify-between pointer-events-none">
                          <span className="text-[9px] bg-black/85 backdrop-blur-md text-gray-300 border border-white/[0.08] px-2 py-0.5 rounded">
                            {card.group_name}
                          </span>

                          <div className="flex items-center gap-1.5 pointer-events-auto">
                            {/* Direct Card delete */}
                            <button
                              id={`btn-card-delete-${card.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTriggerCardDelete(card.id);
                              }}
                              className="p-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 bg-black/90 hover:bg-rose-950 hover:text-rose-400 border border-white/[0.08] rounded-md transition-all cursor-pointer text-gray-400"
                              title="Delete Video"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Done Indicator overlay (Visible if active) */}
                        {card.completed && (
                          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-emerald-500/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-emerald-400">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                            <span>Done</span>
                          </div>
                        )}
                      </div>

                      {/* Content details block */}
                      <div className="flex-1 p-3 md:p-4 flex flex-col gap-1.5 md:gap-2">
                        
                        {/* Header title */}
                        <h3 className="font-bold text-xs md:text-sm text-white group-hover:text-indigo-300 transition-colors truncate">
                          {card.title}
                        </h3>

                        {/* Parsed short URL domain with icon */}
                        <div className="flex items-center gap-1 text-[9px] md:text-[10px] text-gray-500 font-mono">
                          <Link2 className="w-3 h-3 mr-0.5 shrink-0 text-gray-600" />
                          <span className="truncate hover:text-gray-400">{getCleanDomain(card.video_url)}</span>
                        </div>

                        {/* Description block with domains with clean line clamps */}
                        <p className="text-[10px] md:text-[11px] text-gray-400 leading-relaxed font-normal flex-1 line-clamp-2 md:line-clamp-3 mt-0.5">
                          {renderParsedText(card.description)}
                        </p>

                        {/* Tag lists */}
                        {card.tags && card.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-auto pt-2 border-t border-white/[0.04]">
                            {card.tags.slice(0, 3).map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                className="text-[8px] md:text-[9px] bg-white/[0.04] text-gray-400 px-1 md:px-1.5 py-0.5 rounded border border-transparent truncate max-w-[60px]"
                              >
                                #{tag}
                              </span>
                            ))}
                            {card.tags.length > 3 && (
                              <span className="text-[8px] text-gray-500 font-bold">+{card.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {/* Aesthetic Dotted Ghost Card Add Placeholder */}
                  <div
                    onClick={() => handleOpenAddModal()}
                    className="border border-dashed border-white/[0.08] hover:border-indigo-500/40 rounded-xl flex flex-col items-center justify-center min-h-[220px] gap-2.5 group cursor-pointer bg-white/[0.01] hover:bg-white/[0.02] transition-all"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/[0.03] group-hover:bg-indigo-600/10 flex items-center justify-center text-gray-500 group-hover:text-indigo-400 transition-colors border border-white/[0.04]">
                      <Plus className="w-5 h-5 pointer-events-none stroke-[2.5]" />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-500 group-hover:text-gray-300 transition-colors">Add New Video Card</span>
                  </div>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 bg-white/[0.01] border border-white/[0.05] border-dashed rounded-xl"
                >
                  <div className="p-4 bg-white/[0.03] rounded-full border border-white/[0.04] mb-4 text-gray-500">
                    <FolderOpen className="w-10 h-10 text-indigo-500" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-300 font-mono text-center">No videos found</h3>
                  <p className="text-xs text-gray-400 max-w-sm text-center mt-1 px-4 leading-relaxed font-vazir">
                    No video cards matching the selected filters are found in this category. Let&apos;s add one to get started.
                  </p>
                  <button
                    id="btn-empty-add-card"
                    onClick={() => handleOpenAddModal()}
                    className="flex items-center gap-2 mt-5 px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg text-xs font-semibold border border-indigo-500/20 transition-all cursor-pointer animate-bounce"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add First Card</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>

      {/* 4. MODAL: ADD NEW CARD */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="bg-[#0F0F14] border border-white/[0.08] w-full max-w-xl rounded-xl shadow-2xl p-6 text-right overflow-hidden text-[#E4E4E7]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
                <div className="flex items-center gap-2">
                  <span className="p-1 px-1.5 bg-indigo-950/40 rounded text-[10px] font-mono text-indigo-400 border border-indigo-900/40 font-semibold">Alt + N</span>
                  <p className="text-sm font-black text-white">Add New Video Card</p>
                </div>
                <button
                  id="btn-add-modal-close"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded hover:bg-white/[0.04] text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Input elements */}
              <div className="space-y-4">
                
                {/* 1. Youtube URL */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 font-vazir">Video or Footage URL (Preferred Youtube)</label>
                  <input
                    type="url"
                    id="input-card-url"
                    value={newCardUrl}
                    onChange={(e) => setNewCardUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-[#07070a] border border-white/[0.06] focus:border-indigo-500/60 rounded p-2.5 text-xs text-left direction-ltr text-white font-mono focus:outline-none focus:shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                  />
                </div>

                {/* Live Thumbnail Preview container */}
                {thumbnailPreview && (
                  <div className="relative aspect-video rounded-lg border border-white/[0.08] overflow-hidden bg-black max-w-[200px] mx-auto animate-fade-in shadow-md">
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail Preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[8px] text-gray-400 font-mono">
                      Thumbnail loaded
                    </div>
                  </div>
                )}

                {/* 2. Title */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 font-vazir">Video Name or Project</label>
                  <input
                    type="text"
                    id="input-card-title"
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    placeholder="e.g. Matrix motion transition..."
                    className="w-full bg-[#07070a] border border-white/[0.06] focus:border-indigo-500/60 rounded p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                  />
                </div>

                {/* 3. Description + @ helper */}
                <div>
                  <div className="flex justify-between items-center mb-1.5 font-vazir">
                    <label className="block text-xs font-semibold text-gray-400">Description & Notes</label>
                    <span className="text-[10px] text-gray-500">Speed link with <code className="text-indigo-400 font-mono bg-indigo-950 px-1 rounded">@link</code></span>
                  </div>
                  <textarea
                    id="input-card-desc"
                    value={newCardDesc}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewCardDesc(val);
                      if (val.endsWith("@")) {
                        setMentionUrlInput("");
                        setMentionPopupType("add");
                        setIsMentionPopupOpen(true);
                      }
                    }}
                    rows={3}
                    placeholder="Additional details... speed link as @https://soundbible.com"
                    className="w-full bg-[#07070a] border border-white/[0.06] focus:border-indigo-500/60 rounded p-2.5 text-xs text-white placeholder-gray-600 leading-relaxed focus:outline-none focus:shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                  />

                  {/* Animated Helper popover tooltip for typing @ link */}
                  <AnimatePresence>
                    {showAddLinkHelper && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -5 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -5 }}
                        className="bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 px-3 py-2 rounded mt-2 text-[10px] leading-relaxed flex items-center gap-1.5"
                      >
                        <span className="text-emerald-400 font-bold shrink-0">🔗</span>
                        <span>
                          Type website URL immediately after &apos;@&apos; without any spaces (e.g. <code className="text-emerald-400 bg-black px-1.5 py-0.5 rounded">@https://google.com</code>).
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Dropdown groups selection & tags */}
                <div className="grid grid-cols-2 gap-4 font-vazir">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Category (Group)</label>
                    <select
                      id="select-card-group"
                      value={newCardGroup}
                      onChange={(e) => setNewCardGroup(e.target.value)}
                      className="w-full bg-[#07070a] border border-white/[0.06] focus:border-indigo-500/60 rounded p-2.5 text-xs text-gray-300 focus:outline-none"
                    >
                      {groups.map((g, gi) => (
                        <option key={gi} value={g} className="bg-[#151515]">{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Tags</label>
                    <input
                      type="text"
                      id="input-card-tags"
                      value={newCardTagsString}
                      onChange={(e) => setNewCardTagsString(e.target.value)}
                      placeholder="#premiere #sound_effect"
                      className="w-full bg-[#07070a] border border-white/[0.06] focus:border-indigo-500/60 rounded p-2.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                    />
                  </div>
                </div>

              </div>

              {/* Modal controls actions footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06] mt-6 font-vazir">
                <button
                  id="btn-add-modal-cancel"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 hover:bg-white/[0.04] text-gray-400 hover:text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-add-modal-submit"
                  onClick={handleAddNewCard}
                  disabled={!newCardUrl.trim() || !newCardTitle.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors shadow-lg cursor-pointer"
                >
                  Add Card
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. MODAL: EDIT CARD DETAILS (Includes Mark as Done toggle) */}
      <AnimatePresence>
        {editingCard && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="bg-[#0F0F14] border border-white/[0.08] w-full max-w-xl rounded-xl shadow-2xl p-6 text-right overflow-hidden text-[#E4E4E7]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
                <div className="flex items-center gap-2">
                  <Edit className="w-4 h-4 text-indigo-400" />
                  <p className="text-sm font-black">Edit Video Card Details</p>
                </div>
                <button
                  onClick={() => setEditingCard(null)}
                  className="p-1 rounded hover:bg-white/[0.04] text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Input elements for editing */}
              <div className="space-y-4">
                
                {/* Done status Toggle Switch button */}
                <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl flex items-center justify-between font-vazir">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-5 h-5 ${editCardCompleted ? "text-emerald-500" : "text-gray-600"}`} />
                    <div>
                      <span className="text-xs font-bold block text-white">Status: Completed</span>
                      <span className="text-[10px] text-gray-500 block">This video is marked as completed.</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setEditCardCompleted(!editCardCompleted)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      editCardCompleted ? "bg-emerald-500" : "bg-white/[0.08]"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        editCardCompleted ? "-translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* 1. Video URL */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 font-vazir">Video or Footage Link</label>
                  <input
                    type="url"
                    value={editCardUrl}
                    onChange={(e) => setEditCardUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-[#07070a] border border-white/[0.06] focus:border-indigo-500/60 rounded p-2.5 text-xs text-left direction-ltr text-white font-mono focus:outline-none focus:shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                  />
                </div>

                {/* Edit Live Thumbnail Preview */}
                {editThumbnailPreview && (
                  <div className="relative aspect-video rounded-lg border border-white/[0.08] overflow-hidden bg-black max-w-[200px] mx-auto animate-fade-in shadow-md">
                    <img
                      src={editThumbnailPreview}
                      alt="Edit Thumbnail Preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[8px] text-gray-400 font-mono">
                      Video Thumbnail
                    </div>
                  </div>
                )}

                {/* 2. Title */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 font-vazir">Video Title</label>
                  <input
                    type="text"
                    value={editCardTitle}
                    onChange={(e) => setEditCardTitle(e.target.value)}
                    placeholder="Project Title..."
                    className="w-full bg-[#07070a] border border-white/[0.06] focus:border-indigo-500/60 rounded p-2.5 text-xs text-white focus:outline-none focus:shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                  />
                </div>

                {/* 3. Description + @ helper */}
                <div>
                  <div className="flex justify-between items-center mb-1.5 font-vazir">
                    <label className="block text-xs font-semibold text-gray-400">Description & Notes</label>
                    <span className="text-[10px] text-gray-500">Speed link with <code className="text-indigo-400 font-mono bg-indigo-950 px-1 rounded">@link</code></span>
                  </div>
                  <textarea
                    value={editCardDesc}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditCardDesc(val);
                      if (val.endsWith("@")) {
                        setMentionUrlInput("");
                        setMentionPopupType("edit");
                        setIsMentionPopupOpen(true);
                      }
                    }}
                    rows={3}
                    placeholder="Additional info..."
                    className="w-full bg-[#07070a] border border-white/[0.06] focus:border-indigo-500/60 rounded p-2.5 text-xs text-white leading-relaxed focus:outline-none focus:shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                  />

                  {/* Animated Helper popover tooltip for typing @ link */}
                  <AnimatePresence>
                    {showEditLinkHelper && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -5 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -5 }}
                        className="bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 px-3 py-2 rounded mt-2 text-[10px] leading-relaxed flex items-center gap-1.5"
                      >
                        <span className="text-emerald-400 font-bold shrink-0">🔗</span>
                        <span>
                          Type website URL immediately after &apos;@&apos; without any spaces (e.g. <code className="text-emerald-400 bg-black px-1.5 py-0.5 rounded font-mono">@https://google.com</code>).
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Selection & tags */}
                <div className="grid grid-cols-2 gap-4 font-vazir">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Category (Group)</label>
                    <select
                      value={editCardGroup}
                      onChange={(e) => setEditCardGroup(e.target.value)}
                      className="w-full bg-[#07070a] border border-white/[0.06] focus:border-indigo-500/60 rounded p-2.5 text-xs text-gray-300 focus:outline-none"
                    >
                      {groups.map((g, gi) => (
                        <option key={gi} value={g} className="bg-[#151515]">{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Tags</label>
                    <input
                      type="text"
                      value={editCardTagsString}
                      onChange={(e) => setEditCardTagsString(e.target.value)}
                      placeholder="#premiere #effect"
                      className="w-full bg-[#07070a] border border-white/[0.06] focus:border-indigo-500/60 rounded p-2.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                    />
                  </div>
                </div>

              </div>

              {/* Modal controls actions footer */}
              <div className="flex items-center justify-between pt-4 border-t border-white/[0.06] mt-6 font-vazir">
                <button
                  onClick={() => handleTriggerCardDelete(editingCard.id)}
                  className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900 border border-rose-900/30 text-rose-300 hover:text-white rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Card</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingCard(null)}
                    className="px-4 py-2 hover:bg-white/[0.04] text-gray-400 hover:text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCardEdits}
                    disabled={!editCardUrl.trim() || !editCardTitle.trim()}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors shadow-lg cursor-pointer"
                  >
                    Apply Changes
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. MODAL: DELETE GROUP CONFIRMATION */}
      <AnimatePresence>
        {isDeleteGroupConfirmOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="bg-[#0F0F14] border border-white/[0.08] w-full max-w-md rounded-xl shadow-2xl p-6 text-right"
            >
              <div className="flex items-center gap-3 text-rose-500 mb-3">
                <Trash2 className="w-5 h-5 shrink-0" />
                <h3 className="font-bold text-base text-white">Delete Category Request</h3>
              </div>
              
              <p className="text-xs text-gray-400 leading-relaxed py-2 font-vazir">
                Are you sure you want to delete category <strong className="text-rose-400 font-bold">&quot;{groupToDelete}&quot;</strong>? 
                This action will permanently delete all video cards registered within this category.
              </p>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06] mt-5 font-vazir">
                <button
                  id="btn-confirm-delete-group-cancel"
                  onClick={() => {
                    setIsDeleteGroupConfirmOpen(false);
                    setGroupToDelete(null);
                  }}
                  className="px-4 py-2 hover:bg-white/[0.04] text-gray-400 rounded text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-delete-group-exec"
                  onClick={execDeleteGroup}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold cursor-pointer transition-colors"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. MODAL: DELETE CARD CONFIRMATION */}
      <AnimatePresence>
        {isDeleteCardConfirmOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="bg-[#0F0F14] border border-white/[0.08] w-full max-w-md rounded-xl shadow-2xl p-6 text-right"
            >
              <div className="flex items-center gap-3 text-rose-500 mb-3">
                <Trash2 className="w-5 h-5 shrink-0" />
                <h3 className="font-bold text-base text-white">Delete Video Card Request</h3>
              </div>
              
              <p className="text-xs text-gray-400 leading-relaxed py-2 font-vazir">
                Are you sure you want to delete this video card? This action is irreversible.
              </p>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06] mt-5 font-vazir">
                <button
                  id="btn-confirm-delete-card-cancel"
                  onClick={() => {
                    setIsDeleteCardConfirmOpen(false);
                    setCardToDelete(null);
                  }}
                  className="px-4 py-2 hover:bg-white/[0.04] text-gray-400 rounded text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-delete-card-exec"
                  onClick={execDeleteCard}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold cursor-pointer transition-colors"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. QUICK @ LINK POPUP */}
      <AnimatePresence>
        {isMentionPopupOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[60] p-4 text-right">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: 10 }}
              className="bg-[#11121d] border border-emerald-500/30 w-full max-w-md rounded-xl shadow-2xl p-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 left-0 h-[3px] bg-gradient-to-r from-emerald-500 to-indigo-600"></div>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🔗</span>
                <h3 className="font-bold text-base text-emerald-400 font-vazir">Insert Fast Link</h3>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed font-vazir mb-4">
                Enter your URL link here to automatically insert it with a specialized @ prefix so it is cleanly highlighted inside notes.
              </p>

              <div className="space-y-3 font-vazir">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Link URL</label>
                  <input
                    type="text"
                    value={mentionUrlInput}
                    onChange={(e) => setMentionUrlInput(e.target.value)}
                    placeholder="https://example.com"
                    autoFocus
                    className="w-full bg-black/80 border border-emerald-500/20 focus:border-emerald-500 rounded p-2.5 text-xs text-left direction-ltr text-emerald-400 font-mono focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleConfirmMentionLink();
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06] mt-5 font-vazir">
                <button
                  onClick={() => {
                    setIsMentionPopupOpen(false);
                    setMentionPopupType(null);
                    setMentionUrlInput("");
                  }}
                  className="px-4 py-2 hover:bg-white/[0.04] text-gray-400 rounded text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmMentionLink}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold cursor-pointer transition-colors"
                >
                  Add Link
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. MODAL: INTERACTIVE VIDEO PLAYER POPUP */}
      <AnimatePresence>
        {activePlayerCard && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-4 text-right">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="bg-[#12131e] border border-white/[0.08] w-full max-w-3xl rounded-2xl shadow-3xl overflow-hidden text-right text-[#E4E4E7] flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/[0.06] bg-[#1a1b24]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  <p className="text-sm font-black truncate max-w-[400px]">{activePlayerCard.title}</p>
                </div>
                <button
                  onClick={() => setActivePlayerCard(null)}
                  className="p-1 px-2 rounded bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1 font-vazir"
                >
                  <X className="w-4 h-4" />
                  <span>Close Player</span>
                </button>
              </div>

              {/* Player Stage / Embed Iframe or high-contrast placeholder */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {(() => {
                  const videoId = getYouTubeVideoId(activePlayerCard.video_url);
                  if (videoId) {
                    return (
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/[0.06] shadow-2xl">
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                          title={activePlayerCard.title}
                          className="absolute inset-0 w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        ></iframe>
                      </div>
                    );
                  }
                  
                  // Standard local fallback image display for other sources
                  return (
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-gradient-to-br from-indigo-950/40 to-black border border-white/[0.06] shadow-2xl flex flex-col items-center justify-center p-6 gap-3">
                      <img
                        src={activePlayerCard.image_url}
                        alt={activePlayerCard.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none blur-sm"
                        referrerPolicy="no-referrer"
                      />
                      <svg className="w-16 h-16 text-indigo-400 stroke-1 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs text-gray-300 font-vazir font-semibold relative z-10 text-center">This format or link is not directly playable inside the framing preview. You can load it directly via browser.</span>
                      <a
                        href={activePlayerCard.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg relative z-10"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Link in New Tab</span>
                      </a>
                    </div>
                  );
                })()}

                {/* Video Info Panel cards list details */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-3 font-vazir">
                  <div className="flex items-center justify-between text-xs border-b border-white/[0.04] pb-2.5 text-gray-400">
                    <span className="bg-white/[0.05] border border-white/[0.08] px-2.5 py-0.5 rounded text-gray-300 font-bold">{activePlayerCard.group_name}</span>
                    <span className="font-sans text-[10px] text-gray-500">{activePlayerCard.created_at ? new Date(activePlayerCard.created_at).toLocaleDateString("en-US") : ""}</span>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed font-normal py-1">
                    {renderParsedText(activePlayerCard.description || "No description provided")}
                  </p>

                  {/* Complete tags listing */}
                  {activePlayerCard.tags && activePlayerCard.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.04]">
                      {activePlayerCard.tags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-mono"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Open direct editor trigger control */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1.5">
                    {activePlayerCard.completed && (
                      <span className="flex items-center gap-1 bg-emerald-500/15 text-emerald-400 text-[10px] border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Completed</span>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      const currentCard = activePlayerCard;
                      setActivePlayerCard(null);
                      handleOpenEditModal(currentCard);
                    }}
                    className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-200 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 font-vazir"
                  >
                    <Edit className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Edit Video Info & Status</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. MODAL: USER ACCOUNT MANAGEMENT */}
      <AnimatePresence>
        {isAccountModalOpen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 font-vazir text-right text-[#E4E4E7]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="bg-[#0F0F14] border border-white/[0.08] w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Header block */}
              <div className="p-4 md:p-6 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm md:text-base font-black text-white">Profile & User Management</h3>
                </div>
                <button
                  id="btn-account-modal-close"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="p-1 rounded hover:bg-white/[0.04] text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab selector switcher (Show only if currentUser is admin) */}
              {currentUser?.is_admin && (
                <div className="flex border-b border-[#1A1A24] px-4 md:px-6 bg-[#09090d] shrink-0">
                  <button
                    onClick={() => setAccountActiveTab("profile")}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                      accountActiveTab === "profile"
                        ? "border-indigo-500 text-indigo-400 font-bold"
                        : "border-transparent text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setAccountActiveTab("admin");
                      fetchUsersFromSupabase();
                    }}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                      accountActiveTab === "admin"
                        ? "border-indigo-500 text-indigo-400 font-bold"
                        : "border-transparent text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Manage Directory Users ({userList.length})</span>
                  </button>
                </div>
              )}

              {/* Main content viewport */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                {(!currentUser?.is_admin || accountActiveTab === "profile") ? (
                  /* TAB 1: OWN PROFILE SETTINGS */
                  <form onSubmit={handleUpdateOwnProfile} className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1.5">Username (Read-Only)</label>
                        <input
                          type="text"
                          disabled
                          value={currentUser?.username || ""}
                          className="w-full bg-white/[0.02] border border-white/[0.05] rounded p-2.5 text-xs text-left text-gray-500 font-mono focus:outline-none cursor-not-allowed opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1.5">New Display Name</label>
                        <input
                          type="text"
                          required
                          value={profileNewName}
                          onChange={(e) => setProfileNewName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className="w-full bg-[#07070a] border border-white/[0.06] focus:border-indigo-500/60 rounded p-2.5 text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1.5">New Password (Optional)</label>
                        <input
                          type="password"
                          value={profileNewPassword}
                          onChange={(e) => setProfileNewPassword(e.target.value)}
                          placeholder="Enter your new password"
                          className="w-full bg-[#07070a] border border-white/[0.06] focus:border-indigo-500/60 rounded p-2.5 text-xs text-white focus:outline-none text-left direction-ltr font-mono"
                        />
                        <span className="text-[10px] text-gray-500 mt-1 block font-mono">Leave blank to keep your current password.</span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1.5">Profile Photo (Upload)</label>
                        <div className="flex items-center gap-3">
                          {profileNewImage ? (
                            <div className="w-10 h-10 rounded-full border border-indigo-500/40 overflow-hidden relative shrink-0 shadow">
                              <img src={profileNewImage} className="w-full h-full object-cover" alt="Preview" />
                              <button
                                type="button"
                                onClick={() => setProfileNewImage("")}
                                className="absolute inset-0 bg-black/60 flex items-center justify-center text-rose-400 text-[10px] font-bold opacity-0 hover:opacity-100 transition-opacity"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full border border-white/[0.06] bg-black/20 flex items-center justify-center text-gray-500 shrink-0 text-xs font-mono">
                              No Pic
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, setProfileNewImage)}
                            className="hidden"
                            id="btn-upload-own-profile"
                          />
                          <label
                            htmlFor="btn-upload-own-profile"
                            className="flex-1 bg-[#07070a] border border-white/[0.06] hover:border-indigo-500/40 rounded p-2.5 text-xs text-center text-gray-300 cursor-pointer transition-colors"
                          >
                            Choose Profile Photo
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/[0.06] mt-6">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="px-4 py-2 bg-transparent hover:bg-rose-950/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:border-rose-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5 text-rose-500" />
                        <span>Log Out</span>
                      </button>

                      <button
                        type="submit"
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg cursor-pointer font-vazir"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Update Profile</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  /* TAB 2: SYSTEM USER DIRECTORY (ADMIN ONLY) */
                  <div className="space-y-6">
                    {/* Add new user segment */}
                    <form onSubmit={handleCreateUser} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-4">
                      <p className="text-xs font-bold text-gray-300 border-b border-white/[0.04] pb-2">Create New System User</p>
                      
                      <div className="flex flex-col sm:flex-row gap-3 items-end">
                        {/* Circle Profile Photo Uploader */}
                        <div className="flex flex-col items-center shrink-0">
                          <label className="block text-[10px] text-gray-400 mb-1">Photo</label>
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, setNewProfileImage)}
                              className="hidden"
                              id="btn-upload-new-profile-unified"
                            />
                            <label
                              htmlFor="btn-upload-new-profile-unified"
                              className="w-9 h-9 rounded-full border border-dashed border-white/[0.15] bg-black/40 hover:border-indigo-500/50 hover:bg-indigo-950/20 flex items-center justify-center cursor-pointer transition-all relative overflow-hidden group shadow"
                              title="Choose Profile Photo"
                            >
                              {newProfileImage ? (
                                <img src={newProfileImage} className="w-full h-full object-cover rounded-full" alt="Uploaded" />
                              ) : (
                                <span className="text-gray-500 group-hover:text-indigo-400 font-bold text-xs select-none">+</span>
                              )}
                            </label>
                            {newProfileImage && (
                              <button
                                type="button"
                                onClick={() => setNewProfileImage("")}
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-[10px] font-sans font-bold shadow-md cursor-pointer z-10"
                                title="Delete Photo"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Username */}
                        <div className="flex-1 min-w-0 w-full">
                          <label className="block text-[10px] text-gray-400 mb-1">Username (En)</label>
                          <input
                            type="text"
                            required
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            placeholder="username"
                            className="w-full bg-[#07070a] border border-white/[0.06] rounded p-2 text-xs text-white text-left direction-ltr font-mono focus:outline-none focus:border-indigo-500/50"
                          />
                        </div>

                        {/* Display Name */}
                        <div className="flex-1 min-w-0 w-full">
                          <label className="block text-[10px] text-gray-400 mb-1">Display Name</label>
                          <input
                            type="text"
                            required
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full bg-[#07070a] border border-white/[0.06] rounded p-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                          />
                        </div>

                        {/* Password */}
                        <div className="flex-1 min-w-0 w-full">
                          <label className="block text-[10px] text-gray-400 mb-1">Password</label>
                          <input
                            type="text"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••"
                            className="w-full bg-[#07070a] border border-white/[0.06] rounded p-2 text-xs text-white text-left direction-ltr font-mono focus:outline-none focus:border-indigo-500/50"
                          />
                        </div>
                      </div>

                      {/* Row 2: Settings & Action button */}
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                        <div>
                          <label className="block text-[10px] text-gray-400 mb-1">Access Time Limit</label>
                          <select
                            value={newAccessLimit}
                            onChange={(e) => setNewAccessLimit(e.target.value)}
                            className="w-full bg-[#07070a] border border-[#23232f] rounded p-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                          >
                            <option value="all_time">All Time (No Expiration)</option>
                            <option value="1">1 Month</option>
                            <option value="2">2 Months</option>
                            <option value="3">3 Months</option>
                            <option value="6">6 Months</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-gray-400 mb-1">Access Role</label>
                          <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="w-full bg-[#07070a] border border-white/[0.06] rounded p-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                          >
                            {(currentUser?.role === "super_admin" || currentUser?.username === "admin") && (
                              <>
                                <option value="super_admin">Super Admin</option>
                                <option value="admin">Brand Admin</option>
                              </>
                            )}
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </div>

                        <button
                          type="submit"
                          className="h-[34px] px-6 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded text-xs font-bold transition-all shadow cursor-pointer flex items-center justify-center font-vazir"
                        >
                          Create User
                        </button>
                      </div>
                    </form>

                    {/* Users list directory with status toggles */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-400 px-1">System Users Directory ({visibleUsers.length} total):</p>
                      
                      <div className="bleed-scrollbar overflow-y-auto max-h-[220px] space-y-2 pr-1.5">
                        {visibleUsers.map((usr, index) => {
                          const isSelf = usr.username === currentUser?.username;
                          const userManager = userList.find(u => u.id?.toString() === usr.parent_id?.toString());

                          // Access Expiration checker
                          let isExpired = false;
                          let remainingTimeStr = "";
                          if (usr.valid_until) {
                            const expiresAt = new Date(usr.valid_until);
                            const now = new Date();
                            if (now > expiresAt) {
                              isExpired = true;
                            } else {
                              const diffMs = expiresAt.getTime() - now.getTime();
                              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                              remainingTimeStr = `${diffDays} days left`;
                            }
                          }

                          return (
                            <div
                              key={usr.id || index}
                              onContextMenu={(e) => {
                                if (window.innerWidth >= 768) {
                                  e.preventDefault();
                                  setContextMenuUser(usr);
                                  setContextMenuPos({ x: e.clientX, y: e.clientY });
                                }
                              }}
                              onTouchStart={() => {
                                if (window.innerWidth < 768) {
                                  if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
                                  touchTimeoutRef.current = setTimeout(() => {
                                    setShowMobileEditPencilId(usr.id);
                                  }, 2000);
                                }
                              }}
                              onTouchEnd={() => {
                                if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
                              }}
                              className="bg-[#12131e] border border-white/[0.04] p-3 rounded-xl flex items-center justify-between text-xs transition-colors hover:bg-[#151624] select-none"
                            >
                              <div className="flex items-center gap-3">
                                {renderUserAvatar(usr)}
                                <div className="space-y-0.5 text-right">
                                  <p className="font-bold text-white flex items-center gap-1.5">
                                    <span>{usr.name}</span>
                                    {isSelf && (
                                      <span className="text-[9px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.2 rounded-full">You</span>
                                    )}
                                  </p>
                                  <p className="text-[10px] text-gray-500 font-mono flex items-center gap-2">
                                    <span>{usr.username}</span>
                                    {remainingTimeStr && (
                                      <span className="text-indigo-400 text-[9px] bg-indigo-500/10 px-1 rounded">{remainingTimeStr}</span>
                                    )}
                                    {isExpired && (
                                      <span className="text-rose-400 text-[9px] bg-rose-500/10 px-1 rounded font-bold">Expired</span>
                                    )}
                                  </p>
                                  {/* Brand Business Tag */}
                                  {(usr.role === "editor" || usr.role === "viewer") && userManager && (
                                    <p className="text-[10px] text-indigo-400 font-semibold bg-indigo-500/5 px-1.5 py-0.5 rounded border border-indigo-500/10 inline-block w-max mt-1">
                                      Brand: {userManager.name}
                                    </p>
                                  )}
                                  {usr.role === "admin" && (
                                    <p className="text-[10px] text-purple-400 font-semibold bg-purple-500/5 px-1.5 py-0.5 rounded border border-purple-500/10 inline-block w-max mt-1">
                                      Exclusive Brand: {usr.name}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`text-[10px] px-2 py-0.5 rounded border hidden sm:inline-block ${
                                  (usr.role === "super_admin" || (usr.is_admin && !usr.role))
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : usr.role === "admin"
                                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                    : usr.role === "viewer"
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                    : "bg-purple-500/10 text-purple-400 border-purple-500/25"
                                }`}>
                                  {usr.role === "super_admin"
                                    ? "Super Admin"
                                    : usr.role === "admin"
                                    ? "Brand Admin"
                                    : usr.role === "viewer"
                                    ? "Viewer"
                                    : "Editor"}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleToggleUserSuspend(usr)}
                                  disabled={usr.username === "admin"}
                                  className={`px-2 py-1 rounded text-[10px] border transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed ${
                                    usr.is_suspended || isExpired
                                      ? "bg-[#251010] text-[#ff4b4b] border-rose-500/30 hover:bg-[#351010]"
                                      : "bg-[#102518] text-[#4bff4b] border-emerald-500/20 hover:bg-[#103518]"
                                  }`}
                                >
                                  {usr.is_suspended ? "Suspended 🔒" : isExpired ? "Expired ⏳" : "Active"}
                                </button>

                                {showMobileEditPencilId === usr.id && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditSystemUser(usr)}
                                    className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded transition-colors cursor-pointer"
                                    title="Edit User"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(usr.id, usr.name, usr.username)}
                                  disabled={usr.username === "admin" || isSelf}
                                  className="p-1.5 bg-white/[0.02] hover:bg-rose-950 hover:text-rose-400 border border-white/[0.04] text-gray-500 rounded transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT SYSTEM USER MODAL (Premium Green-Themed Modal) */}
      <AnimatePresence>
        {editingSystemUser && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[110] p-4 font-vazir text-right text-[#E4E4E7]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="bg-[#0A0D14] border border-emerald-500/30 w-full max-w-md rounded-xl shadow-[0_0_50px_rgba(16,185,129,0.15)] flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 md:p-5 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm md:text-base font-black text-white px-2">Edit User: {editingSystemUser.username}</h3>
                </div>
                <button
                  onClick={() => {
                    setEditingSystemUser(null);
                    setShowMobileEditPencilId(null);
                  }}
                  className="p-1 rounded hover:bg-white/[0.04] text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form body */}
              <form onSubmit={handleSaveSystemUserEdits} className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 text-left">Display Name</label>
                  <input
                    type="text"
                    required
                    value={editSystemName}
                    onChange={(e) => setEditSystemName(e.target.value)}
                    placeholder="e.g. Aly"
                    className="w-full bg-[#07070a] border border-white/[0.06] focus:border-emerald-500/60 rounded p-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 text-left">New Password (Leave blank to keep current)</label>
                  <input
                    type="text"
                    value={editSystemPassword}
                    onChange={(e) => setEditSystemPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-[#07070a] border border-white/[0.06] focus:border-emerald-500/60 rounded p-2.5 text-xs text-white focus:outline-none text-left direction-ltr font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 text-left">Profile Image (Upload)</label>
                  <div className="flex items-center gap-3">
                    {editSystemProfileImage ? (
                      <div className="w-10 h-10 rounded-full border border-emerald-500/40 overflow-hidden relative shrink-0 shadow">
                        <img src={editSystemProfileImage} className="w-full h-full object-cover" alt="Preview" />
                        <button
                          type="button"
                          onClick={() => setEditSystemProfileImage("")}
                          className="absolute inset-0 bg-black/60 flex items-center justify-center text-rose-400 text-[10px] font-bold opacity-0 hover:opacity-100 transition-opacity"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full border border-white/[0.06] bg-black/20 flex items-center justify-center text-gray-500 shrink-0 text-xs font-mono">
                        No Pic
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, setEditSystemProfileImage)}
                      className="hidden"
                      id="btn-upload-edit-profile"
                    />
                    <label
                      htmlFor="btn-upload-edit-profile"
                      className="flex-1 bg-[#07070a] border border-white/[0.06] hover:border-emerald-500/40 rounded p-2.5 text-xs text-center text-gray-300 cursor-pointer transition-colors"
                    >
                      Choose Profile Photo
                    </label>
                  </div>
                </div>

                {(currentUser?.role === "super_admin" || currentUser?.username === "admin") && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 text-left font-sans">Admin Tag (Assign to Brand / Business)</label>
                    <select
                      value={editSystemParentId}
                      onChange={(e) => setEditSystemParentId(e.target.value)}
                      className="w-full bg-[#07070a] border border-white/[0.06] focus:border-emerald-500/60 rounded p-2.5 text-xs text-white focus:outline-none font-sans"
                    >
                      <option value="">No Admin Tag (Independent / Super Admin)</option>
                      {userList
                        .filter(u => u.role === "admin" && u.id?.toString() !== editingSystemUser.id?.toString())
                        .map((u, ui) => (
                          <option key={ui} value={u.id}>{u.name} ({u.username})</option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-left">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1.5">Access Role</label>
                    <select
                      value={editSystemRole}
                      onChange={(e) => setEditSystemRole(e.target.value)}
                      className="w-full bg-[#07070a] border border-white/[0.06] rounded p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                    >
                      {(currentUser?.role === "super_admin" || currentUser?.username === "admin") && (
                        <>
                          <option value="super_admin">Super Admin</option>
                          <option value="admin">Brand Admin</option>
                        </>
                      )}
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1.5">Access Time Limit</label>
                    <select
                      value={editSystemAccessLimit}
                      onChange={(e) => setEditSystemAccessLimit(e.target.value)}
                      className="w-full bg-[#07070a] border border-white/[0.06] rounded p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                    >
                      <option value="all_time">All Time (No Expiration)</option>
                      <option value="1">1 Month</option>
                      <option value="2">2 Months</option>
                      <option value="3">3 Months</option>
                      <option value="6">6 Months</option>
                    </select>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06] mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSystemUser(null);
                      setShowMobileEditPencilId(null);
                    }}
                    className="px-4 py-2 hover:bg-white/[0.04] text-gray-400 rounded text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded text-xs font-bold cursor-pointer transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DESKTOP FLOATING CONTEXT MENU */}
      <AnimatePresence>
        {contextMenuUser && contextMenuPos && (
          <div
            className="fixed z-[120] w-48 bg-[#0B0F19] border border-emerald-500/30 rounded-lg shadow-[0_4px_20px_rgba(16,185,129,0.2)] p-1.5 divide-y divide-white/[0.04]"
            style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-1">
              <button
                onClick={() => {
                  handleOpenEditSystemUser(contextMenuUser);
                  setContextMenuUser(null);
                  setContextMenuPos(null);
                }}
                className="w-full text-right px-3 py-2 text-xs font-medium text-gray-200 hover:text-white hover:bg-emerald-500/10 rounded transition-all cursor-pointer flex items-center justify-between"
              >
                <span>Edit User Info</span>
                <Edit className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            </div>
            <div className="py-1">
              <button
                onClick={() => {
                  handleToggleUserSuspend(contextMenuUser);
                  setContextMenuUser(null);
                  setContextMenuPos(null);
                }}
                className="w-full text-right px-3 py-2 text-xs font-medium text-gray-200 hover:text-white hover:bg-emerald-500/10 rounded transition-all cursor-pointer flex items-center justify-between"
              >
                <span>{contextMenuUser.is_suspended ? "Unsuspend User" : "Suspend User"}</span>
                <Lock className="w-3.5 h-3.5 text-amber-500" />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* DESKTOP CATEGORY CONTEXT MENU */}
      <AnimatePresence>
        {contextMenuCategory && categoryMenuPos && (() => {
          const menuWidth = 192; // w-48 is 192px
          const menuHeight = 100; // estimated menu height
          const computedX = typeof window !== "undefined" ? Math.min(categoryMenuPos.x, window.innerWidth - menuWidth - 16) : categoryMenuPos.x;
          const computedY = typeof window !== "undefined" ? Math.min(categoryMenuPos.y, window.innerHeight - menuHeight - 16) : categoryMenuPos.y;
          return (
            <div
              className="fixed z-[120] w-48 bg-[#0B0F19] border border-indigo-500/30 rounded-lg shadow-[0_4px_20px_rgba(99,102,241,0.2)] p-1.5 divide-y divide-white/[0.04] text-left font-sans"
              style={{ top: computedY, left: computedX }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="py-1">
                <button
                  onClick={() => {
                    setRenamingCategoryOldName(contextMenuCategory);
                    setRenamingCategoryNewName(contextMenuCategory);
                    setIsRenameCategoryModalOpen(true);
                    setContextMenuCategory(null);
                    setCategoryMenuPos(null);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-gray-200 hover:text-white hover:bg-indigo-500/10 rounded transition-all cursor-pointer flex items-center justify-between"
                >
                  <span>Rename Category</span>
                  <Edit className="w-3.5 h-3.5 text-indigo-400" />
                </button>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    handleToggleHideCategory(contextMenuCategory);
                    setContextMenuCategory(null);
                    setCategoryMenuPos(null);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-gray-200 hover:text-white hover:bg-indigo-500/10 rounded transition-all cursor-pointer flex items-center justify-between"
                >
                  <span>{hiddenGroups.includes(contextMenuCategory) ? "Show Category" : "Hide Category"}</span>
                  {hiddenGroups.includes(contextMenuCategory) ? (
                    <img src="/visible.png" className="w-3.5 h-3.5" alt="Show" />
                  ) : (
                    <img src="/hide.png" className="w-3.5 h-3.5" alt="Hide" />
                  )}
                </button>
              </div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* RENAME CATEGORY MODAL */}
      <AnimatePresence>
        {isRenameCategoryModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans text-left text-[#E4E4E7]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="bg-[#0F0F14] border border-white/[0.08] w-full max-w-sm rounded-xl shadow-2xl p-6 text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
                <p className="text-sm font-black text-white">Rename Category</p>
                <button
                  onClick={() => setIsRenameCategoryModalOpen(false)}
                  className="p-1 rounded hover:bg-white/[0.04] text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">New Category Name</label>
                  <input
                    type="text"
                    value={renamingCategoryNewName}
                    onChange={(e) => setRenamingCategoryNewName(e.target.value)}
                    className="w-full bg-[#07070a] border border-white/[0.06] focus:border-indigo-500/60 rounded p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:shadow-[0_0_10px_rgba(99,102,241,0.15)] text-left"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06] mt-6">
                <button
                  onClick={() => setIsRenameCategoryModalOpen(false)}
                  className="px-4 py-2 hover:bg-white/[0.04] text-gray-400 hover:text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleRenameCategory(renamingCategoryOldName, renamingCategoryNewName);
                    setIsRenameCategoryModalOpen(false);
                  }}
                  disabled={!renamingCategoryNewName.trim() || renamingCategoryNewName.trim() === renamingCategoryOldName}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors shadow-lg cursor-pointer"
                >
                  Rename
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </main>
  );
}
