"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { useChatStore } from "@/lib/store";
import { getChats, getMe } from "@/lib/api";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import { Message } from "@/lib/store";

export default function ChatPage() {
  const router = useRouter();
  const activeChat = useChatStore((s) => s.activeChat);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/login");
          return;
        }

        const socket = connectSocket(token);

        socket.on("new_message", (msg: Message) => {
          const s = useChatStore.getState();
          s.addMessage(msg);
          s.updateChatLastMessage(msg.chatId, msg);
        });

        socket.on("user_online", ({ userId }: { userId: string }) => {
          useChatStore.getState().setUserOnline(userId);
        });

        socket.on(
          "user_offline",
          ({ userId }: { userId: string; lastSeenAt: string }) => {
            useChatStore.getState().setUserOffline(userId);
          }
        );

        const [meRes, chatsRes] = await Promise.all([getMe(), getChats()]);
        const store = useChatStore.getState();
        store.setCurrentUser(meRes.data);
        store.setChats(chatsRes.data);

        setLoading(false);
      } catch (err) {
        console.error("Init error:", err);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        router.push("/login");
      }
    };

    init();

    return () => {
      disconnectSocket();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary text-lg animate-pulse">Connecting...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <ChatSidebar />
      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <ChatWindow />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="text-5xl">💬</div>
              <h2 className="text-xl font-semibold text-foreground">
                Welcome to MoChat
              </h2>
              <p className="text-muted-foreground">
                Select a conversation or start a new one
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
