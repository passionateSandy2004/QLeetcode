"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ProfileLink() {
  const [username, setUsername] = useState<string | null>(null);
  useEffect(() => {
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/user_id=([^;]+)/);
      const userId = match ? match[1] : null;
      if (userId) {
        supabase
          .from("users")
          .select("username")
          .eq("id", userId)
          .single()
          .then(({ data }) => {
            if (data?.username) setUsername(data.username);
          });
      }
    }
  }, []);
  if (!username) return null;
  return (
    <a
      href={`/profile/${username}`}
      className="inline-block px-4 py-2 bg-cyan-700 text-white rounded hover:bg-cyan-800 font-semibold"
    >
      My Public Profile
    </a>
  );
} 