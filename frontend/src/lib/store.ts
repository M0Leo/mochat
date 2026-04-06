import { create } from "zustand";

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeenAt: string;
  bio: string | null;
}

export interface Participant {
  user: User;
  userId: string;
  chatId: string;
  joinedAt: string;
}

export interface Message {
  id: string;
  content: string | null;
  msgType: "TEXT" | "IMAGE" | "VIDEO" | "FILE";
  mediaUrl: string | null;
  createdAt: string;
  senderId: string;
  chatId: string;
  sender?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

type ChatParticipant = {
  id: string;
  displayName: string;
  isOnline: boolean;
  username?: string;
  avatarUrl?: string | null;
};

export interface Chat {
  id: string;
  type: "DIRECT" | "PRIVATE_GROUP" | "PUBLIC_GROUP";
  title: string | null;
  participants: ChatParticipant[];
  messages?: Message[];
  lastMessageAt: string | null;
  createdAt: string;
}

interface ChatState {
  currentUser: User | null;
  chats: Chat[];
  activeChat: Chat | null;
  messages: Message[];
  onlineUsers: Set<string>;

  setCurrentUser: (user: User | null) => void;
  setChats: (chats: Chat[]) => void;
  setActiveChat: (chat: Chat | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  prependMessages: (messages: Message[]) => void;
  addChat: (chat: Chat) => void;
  setUserOnline: (userId: string) => void;
  setUserOffline: (userId: string) => void;
  updateChatLastMessage: (chatId: string, message: Message) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  currentUser: null,
  chats: [],
  activeChat: null,
  messages: [],
  onlineUsers: new Set(),

  setCurrentUser: (user) => set({ currentUser: user }),
  setChats: (chats) => set({ chats }),
  setActiveChat: (chat) => set({ activeChat: chat, messages: [] }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => {
      if (state.messages.some((m) => m.id === message.id)) return state;
      return { messages: [...state.messages, message] };
    }),
  prependMessages: (newMessages) =>
    set((state) => {
      const existingIds = new Set(state.messages.map((m) => m.id));
      const unique = newMessages.filter((m) => !existingIds.has(m.id));
      if (unique.length === 0) return state;
      return { messages: [...unique, ...state.messages] };
    }),
  addChat: (chat) =>
    set((state) => ({
      chats: [chat, ...state.chats.filter((c) => c.id !== chat.id)],
    })),
  setUserOnline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUsers);
      next.add(userId);
      return { onlineUsers: next };
    }),
  setUserOffline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUsers);
      next.delete(userId);
      return { onlineUsers: next };
    }),
  updateChatLastMessage: (chatId, message) =>
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId ? { ...c, lastMessageAt: message.createdAt } : c,
      ),
    })),
}));
