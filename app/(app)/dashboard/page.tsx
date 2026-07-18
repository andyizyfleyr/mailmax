"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import type { DashboardStats } from "@/types";
import { DashboardView } from "@/components/views/DashboardView";

export default function DashboardPage() {
  const pathname = usePathname();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then(r => r.json())
      .then(d => setStats(d?.error ? null : d))
      .catch(() => setStats(null));
  }, [pathname]);

  return <DashboardView stats={stats} />;
}
