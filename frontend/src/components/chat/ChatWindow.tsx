"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useChatStore } from "@/lib/store";
import { getSocket } from "@/lib/socket";
import { getMessages } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

export default function ChatWindow() {
  const activeChat = useChatStore((s) => s.activeChat);
  const messages = useChatStore((s) => s.messages);
  const currentUser = useChatStore((s) => s.currentUser);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const chatIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (activeChat?.id !== chatIdRef.current) {
      chatIdRef.current = activeChat?.id;
      setHasMore(true);
    }
  }, [activeChat?.id]);

  const getChatTitle = () => {
    if (!activeChat) return "";
    if (activeChat.title) return activeChat.title;
    if (activeChat.type === "DIRECT") {
      const other = activeChat.participants.find(
        (p) => p.id !== currentUser?.id,
      );
      return other?.displayName || other?.username || "Chat";
    }
    return "Group Chat";
  };

  const getOnlineStatus = () => {
    if (!activeChat || activeChat.type !== "DIRECT") return null;
    const other = activeChat.participants.find((p) => p.id !== currentUser?.id);
    if (!other) return null;
    return onlineUsers.has(other.id) ? "online" : "offline";
  };

  const scrollToBottom = (behavior: ScrollBehavior) => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior });
    });
  };

  const prevMsgCount = useRef(0);

  useEffect(() => {
    if (messages.length === 0) return;

    if (prevMsgCount.current === 0) {
      scrollToBottom("instant");
    } else if (messages.length > prevMsgCount.current) {
      const isNearBottom =
        scrollAreaRef.current &&
        scrollAreaRef.current.scrollHeight -
          scrollAreaRef.current.scrollTop -
          scrollAreaRef.current.clientHeight <
          200;
      if (isNearBottom || messages[messages.length - 1]?.senderId === currentUser?.id) {
        scrollToBottom("smooth");
      }
    }
    prevMsgCount.current = messages.length;
  }, [messages.length, currentUser?.id]);

  const handleSend = async () => {
    if (!text.trim() || !activeChat) return;
    setSending(true);
    const socket = getSocket();
    const messageContent = text.trim();
    setText("");

    if (socket) {
      socket.emit(
        "send_message",
        {
          chatId: activeChat.id,
          content: messageContent,
          type: "TEXT",
        },
        (response: unknown) => {
          if (!response) {
            console.error("Failed to send message");
          }
        },
      );
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const loadMore = async () => {
    if (!activeChat || !hasMore || loadingMore) return;
    const firstMsg = messages[0];
    if (!firstMsg) return;

    setLoadingMore(true);
    try {
      const { data } = await getMessages(activeChat.id, firstMsg.id);
      if (data.messages.length === 0) {
        setHasMore(false);
      } else {
        useChatStore.getState().prependMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to load more messages:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop < 50) {
      loadMore();
    }
  };

  const renderMessages = () => {
    const elements: React.ReactNode[] = [];
    let lastDate = "";

    messages.forEach((msg, i) => {
      const msgDate = format(new Date(msg.createdAt), "yyyy-MM-dd");
      if (msgDate !== lastDate) {
        lastDate = msgDate;
        elements.push(
          <div
            key={`date-${msgDate}`}
            className="flex items-center justify-center py-3"
          >
            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
              {format(new Date(msg.createdAt), "MMMM d, yyyy")}
            </span>
          </div>,
        );
      }

      const isOwn = msg.senderId === currentUser?.id;
      const prevMsg = messages[i - 1];
      const showAvatar =
        !prevMsg || prevMsg.senderId !== msg.senderId || msgDate !== lastDate;

      elements.push(
        <div
          key={msg.id}
          className={`flex gap-2 px-4 py-0.5 ${isOwn ? "flex-row-reverse" : ""} ${
            showAvatar ? "mt-3" : ""
          }`}
        >
          {showAvatar ? (
            <Avatar className="size-8 shrink-0 mt-0.5">
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {msg.sender?.displayName?.charAt(0).toUpperCase() ||
                  msg.sender?.username?.charAt(0).toUpperCase() ||
                  "?"}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="size-8 shrink-0" />
          )}
          <div
            className={`max-w-[70%] ${
              isOwn ? "items-end" : "items-start"
            } flex flex-col`}
          >
            {showAvatar && !isOwn && (
              <span className="text-xs text-muted-foreground mb-1 ml-1">
                {msg.sender?.displayName || msg.sender?.username}
              </span>
            )}
            <div
              className={`rounded-2xl px-3.5 py-2 text-sm break-words ${
                isOwn
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-secondary text-secondary-foreground rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
              {format(new Date(msg.createdAt), "HH:mm")}
            </span>
          </div>
        </div>,
      );
    });

    return elements;
  };

  const onlineStatus = getOnlineStatus();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <Avatar className="size-9">
          <AvatarFallback className="bg-primary/20 text-primary text-sm">
            {activeChat?.type === "DIRECT"
              ? getChatTitle().charAt(0).toUpperCase()
              : "👥"}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold text-sm">{getChatTitle()}</h3>
          {onlineStatus && (
            <p
              className={`text-xs ${
                onlineStatus === "online"
                  ? "text-green-400"
                  : "text-muted-foreground"
              }`}
            >
              {onlineStatus}
            </p>
          )}
          {activeChat?.type !== "DIRECT" && (
            <p className="text-xs text-muted-foreground">
              {activeChat?.participants.length} members
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto py-2"
        onScroll={handleScroll}
      >
        {loadingMore && (
          <div className="text-center py-3">
            <span className="text-xs text-muted-foreground animate-pulse">
              Loading more...
            </span>
          </div>
        )}
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">
              No messages yet. Say hello!
            </p>
          </div>
        )}
        {renderMessages()}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            size="icon"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
