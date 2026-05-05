import { useCallback, useEffect, useState, useRef } from "react";
import type { ChatMessage } from "@/hooks/useAssistant";

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

const STORAGE_KEY = "lumiere.conversations.v1";
const ACTIVE_KEY = "lumiere.conversations.active";

function load(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(list: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

function useRefSync<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const activeIdRef = useRefSync(activeId);

  useEffect(() => {
    const list = load();
    setConversations(list);
    try {
      const a = localStorage.getItem(ACTIVE_KEY);
      if (a && list.some((c) => c.id === a)) setActiveIdState(a);
    } catch {}
  }, []);

  const setActiveId = useCallback((id: string | null) => {
    setActiveIdState(id);
    try {
      if (id) localStorage.setItem(ACTIVE_KEY, id);
      else localStorage.removeItem(ACTIVE_KEY);
    } catch {}
  }, []);

  const upsert = useCallback((messages: ChatMessage[]) => {
    if (messages.length === 0) return;
    setConversations((prev) => {
      const id = activeIdRef.current ?? crypto.randomUUID();
      const firstUser = messages.find((m) => m.role === "user")?.content ?? "New chat";
      const title = firstUser.slice(0, 60);
      const existing = prev.find((c) => c.id === id);
      const conv: Conversation = {
        id,
        title: existing?.title ?? title,
        messages,
        updatedAt: Date.now(),
      };
      const next = [conv, ...prev.filter((c) => c.id !== id)];
      persist(next);
      if (!activeIdRef.current) {
        activeIdRef.current = id;
        try { localStorage.setItem(ACTIVE_KEY, id); } catch { }
        setActiveIdState(id);
      }
      return next;
    });
  }, [activeIdRef]);

  const newChat = useCallback(() => {
    setActiveId(null);
  }, [setActiveId]);

  const remove = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        persist(next);
        return next;
      });
      if (activeIdRef.current === id) setActiveId(null);
    },
    [activeIdRef, setActiveId],
  );

  const rename = useCallback((id: string, title: string) => {
    setConversations((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, title } : c));
      persist(next);
      return next;
    });
  }, []);

  return {
    conversations,
    activeId,
    setActiveId,
    upsert,
    newChat,
    remove,
    rename,
  };
}
