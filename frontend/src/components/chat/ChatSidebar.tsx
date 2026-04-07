"use client";

import { useRef, useState } from "react";
import { useChatStore } from "@/lib/store";
import { getMessages, searchUsers, createChat } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isYesterday } from "date-fns";
import { Chat } from "@/lib/store";
import Link from "next/link";
import { useThemeStore } from "@/lib/theme";

interface SearchUser {
  id: string;
  username: string;
  displayName: string;
}

export default function ChatSidebar() {
  const {
    chats,
    currentUser,
    activeChat,
    setActiveChat,
    onlineUsers,
    addChat,
  } = useChatStore();
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);

  const sortedChats = [...chats].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });

  const getChatDisplay = (chat: (typeof chats)[0]) => {
    if (chat.title) return chat.title;
    if (chat.type === "DIRECT") {
      const other = chat.participants.find((p) => p.id !== currentUser?.id);
      return other?.displayName || "Uknown";
    }
    return "Group Chat";
  };

  const getChatAvatar = (chat: (typeof chats)[0]) => {
    if (chat.type !== "DIRECT") return null;
    const other = chat.participants.find((p) => p.id !== currentUser?.id);
    return other;
  };

  const isUserOnline = (chat: (typeof chats)[0]) => {
    if (chat.type !== "DIRECT") return false;
    const other = chat.participants.find((p) => p.id !== currentUser?.id);
    return other ? onlineUsers.has(other.id) : false;
  };

  const getLastMessageTime = (chat: (typeof chats)[0]) => {
    if (!chat.lastMessageAt) return "";
    const date = new Date(chat.lastMessageAt);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d");
  };

  return (
    <div className="w-80 border-r border-border flex flex-col h-full bg-sidebar">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">MoChat</h2>
        <div className="flex gap-1">
          <Link href="/groups">
            <Button variant="ghost" size="icon-sm" title="Public groups">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            title="New conversation"
            onClick={() => setShowNewChat(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="10" y1="10" x2="14" y2="10" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="New group chat"
            onClick={() => setShowNewGroup(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="px-2 pb-2 space-y-0.5">
          {sortedChats.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No conversations yet
            </div>
          )}
          {sortedChats.map((chat) => {
            const isActive = activeChat?.id === chat.id;
            const user = getChatAvatar(chat);
            return (
              <button
                key={chat.id}
                onClick={async () => {
                  if (activeChat?.id === chat.id) return;
                  const socket = getSocket();
                  if (socket) {
                    socket.emit("join_chat", { chatId: chat.id });
                  }
                  setActiveChat(chat);
                  await new Promise((r) => setTimeout(r, 100));
                  try {
                    const { data } = await getMessages(chat.id);
                    useChatStore.getState().setMessages(data.messages);
                  } catch (err) {
                    console.error("Failed to load messages:", err);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  isActive
                    ? "bg-primary/15 text-foreground"
                    : "hover:bg-sidebar-accent text-sidebar-foreground"
                }`}
              >
                <div className="relative">
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {chat.type === "DIRECT"
                        ? (user?.displayName || user?.username || "?")
                            .slice(0, 2)
                            .toUpperCase()
                        : "👥"}
                    </AvatarFallback>
                  </Avatar>
                  {isUserOnline(chat) && (
                    <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full border-2 border-sidebar" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate text-sm">
                      {getChatDisplay(chat)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2 shrink-0">
                      {getLastMessageTime(chat)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {chat.type !== "DIRECT" && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {chat.participants.length}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      {/* User info */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {currentUser?.displayName?.slice(0, 2).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <Link href="/profile">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {currentUser?.displayName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                @{currentUser?.username}
              </p>
            </div>
          </Link>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => useThemeStore.getState().toggleTheme()}
              className="text-muted-foreground"
              title="Toggle theme"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("user");
                window.location.href = "/login";
              }}
              className="text-muted-foreground hover:text-destructive"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* New Direct Chat Dialog */}
      <NewDirectChat
        open={showNewChat}
        onOpenChange={setShowNewChat}
        onChatCreated={async (raw) => {
          const chat = {
            ...raw,
            lastMessageAt: raw.lastMessageAt ?? new Date().toISOString(),
            participants: raw.participants.map((p: any) => p.user ?? p),
          };
          addChat(chat);
          const socket = getSocket();
          if (socket) {
            socket.emit("join_chat", { chatId: chat.id });
          }
          setActiveChat(chat);
          await new Promise((r) => setTimeout(r, 100));
          try {
            const { data } = await getMessages(chat.id);
            useChatStore.getState().setMessages(data.messages);
          } catch (err) {
            console.error("Failed to load messages:", err);
          }
          setShowNewChat(false);
        }}
        currentUserId={currentUser?.id || ""}
      />

      {/* New Group Chat Dialog */}
      <NewGroupChat
        open={showNewGroup}
        onOpenChange={setShowNewGroup}
        onChatCreated={async (raw) => {
          const chat = {
            ...raw,
            lastMessageAt: raw.lastMessageAt ?? new Date().toISOString(),
            participants: raw.participants.map((p: any) => p.user ?? p),
          };
          addChat(chat);
          const socket = getSocket();
          if (socket) {
            socket.emit("join_chat", { chatId: chat.id });
          }
          setActiveChat(chat);
          await new Promise((r) => setTimeout(r, 100));
          try {
            const { data } = await getMessages(chat.id);
            useChatStore.getState().setMessages(data.messages);
          } catch (err) {
            console.error("Failed to load messages:", err);
          }
          setShowNewGroup(false);
        }}
        currentUserId={currentUser?.id || ""}
      />
    </div>
  );
}

function NewDirectChat({
  open,
  onOpenChange,
  onChatCreated,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated: (chat: Chat) => void;
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearch = (q: string) => {
    setQuery(q);
    clearTimeout(timer.current);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await searchUsers(q);
        setResults(data.filter((u: SearchUser) => u.id !== currentUserId));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const startChat = async (userId: string) => {
    try {
      const { data } = await createChat({
        type: "DIRECT",
        participants: [userId],
      });
      onChatCreated(data);
    } catch (err) {
      console.error("Failed to create chat:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Search by username..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <ScrollArea className="max-h-60">
            {searching && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Searching...
              </p>
            )}
            {!searching && results.length === 0 && query.length >= 2 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users found
              </p>
            )}
            <div className="space-y-1">
              {results.map((user) => (
                <button
                  key={user.id}
                  onClick={() => startChat(user.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-left"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {user.displayName?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      @{user.username}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewGroupChat({
  open,
  onOpenChange,
  onChatCreated,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated: (chat: Chat) => void;
  currentUserId: string;
}) {
  const [title, setTitle] = useState("");
  const [groupType, setGroupType] = useState<"PRIVATE_GROUP" | "PUBLIC_GROUP">(
    "PRIVATE_GROUP",
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [selected, setSelected] = useState<SearchUser[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearch = (q: string) => {
    setQuery(q);
    clearTimeout(timer.current);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const { data } = await searchUsers(q);
        setResults(
          data.filter(
            (u: SearchUser) =>
              u.id !== currentUserId && !selected.some((s) => s.id === u.id),
          ),
        );
      } catch {
        setResults([]);
      }
    }, 300);
  };

  const handleCreate = async () => {
    if (!title.trim() || selected.length === 0) return;
    try {
      const { data } = await createChat({
        type: groupType,
        title: title.trim(),
        participants: selected.map((u) => u.id),
      });
      onChatCreated(data);
      setTitle("");
      setGroupType("PRIVATE_GROUP");
      setSelected([]);
      setQuery("");
    } catch (err) {
      console.error("Failed to create group:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Group Chat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Group name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setGroupType("PRIVATE_GROUP")}
              className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${
                groupType === "PRIVATE_GROUP"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Private
            </button>
            <button
              onClick={() => setGroupType("PUBLIC_GROUP")}
              className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${
                groupType === "PUBLIC_GROUP"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Public
            </button>
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((user) => (
                <Badge key={user.id} variant="secondary" className="gap-1 pr-1">
                  {user.displayName}
                  <button
                    onClick={() =>
                      setSelected((s) => s.filter((u) => u.id !== user.id))
                    }
                    className="ml-0.5 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <Input
            placeholder="Add members..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
          />

          <ScrollArea className="max-h-40">
            <div className="space-y-1">
              {results.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    setSelected((s) => [...s, user]);
                    setResults((r) => r.filter((u) => u.id !== user.id));
                    setQuery("");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-left"
                >
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {user.displayName?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      @{user.username}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>

          <Button
            onClick={handleCreate}
            className="w-full"
            disabled={!title.trim() || selected.length === 0}
          >
            Create Group
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
