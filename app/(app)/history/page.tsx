"use client";

import { useState, useEffect, useCallback } from "react";
import type { EmailRecord } from "@/types";
import { HistoryView } from "@/components/views/HistoryView";

export default function HistoryPage() {
  const [records, setRecords] = useState<EmailRecord[]>([]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/send-email");
      const data = await res.json();
      if (Array.isArray(data)) setRecords(data);
    } catch {}
  }, []);

  useEffect(() => { fetchHistory(); }, []);

  return <HistoryView records={records} onRefresh={fetchHistory} />;
}
