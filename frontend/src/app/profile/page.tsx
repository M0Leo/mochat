"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/lib/store";
import { updateMe } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const currentUser = useChatStore((s) => s.currentUser);
  const setCurrentUser = useChatStore((s) => s.setCurrentUser);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    displayName: "",
    username: "",
    email: "",
    bio: "",
    avatarUrl: "",
  });

  useEffect(() => {
    if (!currentUser) {
      const token = localStorage.getItem("accessToken");
      if (!token) router.push("/login");
      return;
    }
    setForm({
      displayName: currentUser.displayName ?? "",
      username: currentUser.username ?? "",
      email: currentUser.email ?? "",
      bio: currentUser.bio ?? "",
      avatarUrl: "",
    });
  }, [currentUser, router]);

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    const body: Record<string, string> = {};
    if (form.displayName !== (currentUser?.displayName ?? ""))
      body.displayName = form.displayName;
    if (form.username !== (currentUser?.username ?? ""))
      body.username = form.username;
    if (form.email !== (currentUser?.email ?? "")) body.email = form.email;
    if (form.bio !== (currentUser?.bio ?? "")) body.bio = form.bio;
    if (form.avatarUrl) body.avatarUrl = form.avatarUrl;

    if (Object.keys(body).length === 0) {
      setSaving(false);
      setSuccess("No changes to save");
      return;
    }

    try {
      const { data } = await updateMe(body);
      setCurrentUser(data);
      setSuccess("Profile updated");
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { message?: string | string[] } };
      };
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen flex items-start justify-center p-4 pt-16">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Profile</h1>
          <Link href="/chat">
            <Button variant="ghost" size="sm">
              Back to Chat
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarFallback className="bg-primary/20 text-primary text-xl">
              {currentUser.displayName?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{currentUser.displayName}</p>
            <p className="text-sm text-muted-foreground">
              @{currentUser.username}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm text-green-400 bg-green-400/10 p-3 rounded-lg">
              {success}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={form.displayName}
              onChange={(e) => update("displayName", e.target.value)}
              minLength={1}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              minLength={3}
              maxLength={30}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              maxLength={160}
              rows={3}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
              placeholder="Tell us about yourself..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatarUrl">Avatar URL</Label>
            <Input
              id="avatarUrl"
              type="url"
              placeholder="https://example.com/avatar.png"
              value={form.avatarUrl}
              onChange={(e) => update("avatarUrl", e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </div>
    </div>
  );
}
