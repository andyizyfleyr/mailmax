"use client";

import { useState, useEffect, useCallback } from "react";
import type { InboundEmail } from "@/types";
import { InboxView } from "@/components/views/InboxView";

export default function InboxPage() {
  const [emails, setEmails] = useState<InboundEmail[]>([]);

  const fetchInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/inbound");
      const data = await res.json();
      if (Array.isArray(data)) setEmails(data);
    } catch {}
  }, []);

  useEffect(() => { fetchInbox(); }, []);

  return <InboxView emails={emails} onRefresh={fetchInbox} />;
}
