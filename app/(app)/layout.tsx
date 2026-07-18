"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar, View } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

const VIEW_MAP: Record<string, View> = {
  dashboard: "dashboard",
  compose: "compose",
  contacts: "contacts",
  campaigns: "campaigns",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("mailmax_auth") !== "true") {
      router.replace("/");
    } else {
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const view = VIEW_MAP[pathname.split("/")[1]] || "dashboard";

  if (!authed) return null;

  return (
    <div className="flex h-screen bg-[hsl(var(--bg))] overflow-hidden">
      <Sidebar view={view} collapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <main className={`flex-1 transition-all duration-200 flex flex-col ml-0 pb-16 md:pb-0 ${isSidebarCollapsed ? "md:ml-[68px]" : "md:ml-60"}`}>
        <Header view={view} scrolled={isScrolled} />
        <div className="px-4 md:px-8 py-4 md:py-6 flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
