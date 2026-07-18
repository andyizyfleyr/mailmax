"use client";

import { useState, useEffect, useCallback } from "react";
import type { ContactList } from "@/types";
import { ComposeView } from "@/components/views/ComposeView";

export default function ComposePage() {
  const [lists, setLists] = useState<ContactList[]>([]);

  const fetchLists = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts");
      const data = await res.json();
      if (Array.isArray(data?.lists)) setLists(data.lists);
    } catch {}
  }, []);

  useEffect(() => { fetchLists(); }, []);

  return <ComposeView lists={lists} onSent={fetchLists} />;
}
