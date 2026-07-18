"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginGate } from "@/components/auth/LoginGate";

export default function LoginPage() {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (localStorage.getItem("mailmax_auth") === "true") {
      router.replace("/dashboard");
    } else {
      setChecking(false);
    }
  }, []);

  if (checking || done) return null;

  return (
    <LoginGate onAuthorize={() => {
      setDone(true);
      router.push("/dashboard");
    }} />
  );
}
