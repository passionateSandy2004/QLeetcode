"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

interface UserRow {
  username: string;
  points: number;
  easy: number;
  medium: number;
  hard: number;
}

export default function LeadboardPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      // Fetch all users with their progress and problem difficulties
      const { data: progressData, error } = await supabase
        .from("user_progress")
        .select("user_id, status, problems(difficulty), users(username)")
        .eq("status", "Solved");
      if (error) {
        setUsers([]);
        setLoading(false);
        return;
      }
      // Aggregate points per user
      const userMap: Record<string, UserRow> = {};
      for (const row of progressData || []) {
        const username = row.users?.username || "(unknown)";
        const difficulty = row.problems?.difficulty;
        if (!username || !difficulty) continue;
        if (!userMap[username]) {
          userMap[username] = { username, points: 0, easy: 0, medium: 0, hard: 0 };
        }
        if (difficulty === "Easy") {
          userMap[username].points += 1;
          userMap[username].easy += 1;
        } else if (difficulty === "Medium") {
          userMap[username].points += 2;
          userMap[username].medium += 1;
        } else if (difficulty === "Hard") {
          userMap[username].points += 3;
          userMap[username].hard += 1;
        }
      }
      // Convert to array and sort by points desc
      const userRows = Object.values(userMap).sort((a, b) => b.points - a.points);
      setUsers(userRows);
      setLoading(false);
    }
    fetchLeaderboard();
  }, []);

  // Helper to get display name
  function getDisplayName(username: string) {
    const idx = username.indexOf('_user');
    return idx !== -1 ? username.slice(0, idx) : username;
  }

  return (
    <div className="min-h-screen bg-[#18181a] text-white p-8">
      <h1 className="text-3xl font-bold mb-8 text-cyan-300">Leaderboard</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left rounded-xl overflow-hidden">
            <thead className="bg-[#23232b] border-b border-[#333]">
              <tr>
                <th className="py-3 px-4 text-cyan-300 font-semibold">Rank</th>
                <th className="py-3 px-4 text-cyan-300 font-semibold">User</th>
                <th className="py-3 px-4 text-cyan-300 font-semibold">Points</th>
                <th className="py-3 px-4 text-cyan-300 font-semibold">Hard</th>
                <th className="py-3 px-4 text-cyan-300 font-semibold">Medium</th>
                <th className="py-3 px-4 text-cyan-300 font-semibold">Easy</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">No users found.</td>
                </tr>
              ) : (
                users.map((user, idx) => (
                  <tr key={user.username} className="border-b border-[#333] hover:bg-[#23232b] transition">
                    <td className="py-3 px-4 font-bold text-cyan-200">{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-cyan-100">{getDisplayName(user.username)}</td>
                    <td className="py-3 px-4 font-bold text-yellow-300">{user.points}</td>
                    <td className="py-3 px-4 text-purple-200">{user.hard}</td>
                    <td className="py-3 px-4 text-blue-200">{user.medium}</td>
                    <td className="py-3 px-4 text-cyan-200">{user.easy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 