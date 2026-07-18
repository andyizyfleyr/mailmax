"use client";

import { useState, useEffect } from "react";
import type { DashboardStats } from "@/types";
import { DashboardView } from "@/components/views/DashboardView";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then(r => r.json())
      .then(d => setStats(d?.error ? null : d))
      .catch(() => setStats(null));
  }, []);

  return <DashboardView stats={stats} />;
}
