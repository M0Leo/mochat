"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useChatStore, Chat } from "@/lib/store";
import { getPublicGroups, joinChat } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";

export default function GroupsPage() {
  const router = useRouter();
  const currentUser = useChatStore((s) => s.currentUser);
  const addChat = useChatStore((s) => s.addChat);
  const [groups, setGroups] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }

    getPublicGroups()
      .then((res) => setGroups(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  const handleJoin = async (chatId: string) => {
    setJoining(chatId);
    try {
      const { data } = await joinChat(chatId);
      addChat(data);
      setGroups((g) => g.filter((x) => x.id !== chatId));
      router.push("/chat");
    } catch (err) {
      console.error("Failed to join:", err);
    } finally {
      setJoining(null);
    }
  };

  console.log(groups)

  if (!currentUser) return null;  

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/chat">
            <Button variant="ghost" size="sm">
              Back
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Public Groups</h1>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loading && (
          <div className="flex items-center justify-center p-8">
            <span className="text-muted-foreground">Loading...</span>
          </div>
        )}

        {!loading && groups.length === 0 && (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">No public groups available</p>
          </div>
        )}

        <div className="p-4 space-y-2">
          {groups.map((group) => (
            <div
              key={group.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border"
            >
              <Avatar className="size-10">
                <AvatarFallback className="bg-primary/20 text-primary">
                  👥
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{group.title}</p>
                <p className="text-xs text-muted-foreground">
                  {group.participants.length} members
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleJoin(group.id)}
                disabled={joining === group.id}
              >
                {joining === group.id ? "..." : "Join"}
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}