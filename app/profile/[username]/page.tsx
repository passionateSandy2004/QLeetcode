"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

interface Progress {
  problem_id: number;
  status: string;
  last_submission_id: number;
  problem?: { title: string; difficulty: string };
}

interface Submission {
  id: number;
  problem_id: number;
  code: string;
  status: string;
  created_at: string;
  problem_title?: string;
}

export default function UserProfilePage() {
  const params = useParams();
  const username = params?.username as string;
  const [user, setUser] = useState<any>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    async function fetchUserProfile() {
      setLoading(true);
      setError(null);
      // Fetch user by username
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, username")
        .eq("username", username)
        .single();
      if (userError || !userData) {
        setError("User not found");
        setLoading(false);
        return;
      }
      setUser(userData);
      // Fetch progress
      const { data: progressData } = await supabase
        .from("user_progress")
        .select("problem_id, status, last_submission_id, problems(title, difficulty)")
        .eq("user_id", userData.id);
      setProgress(progressData || []);
      // Fetch submissions
      const { data: submissionsData } = await supabase
        .from("user_submissions")
        .select("id, problem_id, code, status, created_at, problems(title)")
        .eq("user_id", userData.id)
        .order("created_at", { ascending: false });
      setSubmissions(
        (submissionsData || []).map((s: any) => ({
          ...s,
          problem_title: s.problems?.title || "",
        }))
      );
      setLoading(false);
    }
    fetchUserProfile();
  }, [username]);

  // Stats
  const solved = progress.filter((p) => p.status === "Solved");
  const solvedCount = solved.length;
  const easyCount = solved.filter((p) => p.problems?.difficulty === "Easy").length;
  const mediumCount = solved.filter((p) => p.problems?.difficulty === "Medium").length;
  const hardCount = solved.filter((p) => p.problems?.difficulty === "Hard").length;

  // Speedometer values
  const total = solvedCount || 1;
  const easyPercent = (easyCount / total) * 100;
  const mediumPercent = (mediumCount / total) * 100;
  const hardPercent = (hardCount / total) * 100;

  // Helper to get display name
  function getDisplayName(username: string) {
    const idx = username.indexOf('_user');
    return idx !== -1 ? username.slice(0, idx) : username;
  }

  if (loading) {
    return <div className="text-white p-8">Loading profile...</div>;
  }
  if (error) {
    return <div className="text-white p-8">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-[#18181a] text-white p-8">
      <h1 className="text-3xl font-bold mb-6 text-cyan-300">{user ? `${getDisplayName(user.username)}'s Profile` : "Profile"}</h1>
      {/* Speedometer */}
      <div className="flex flex-col md:flex-row gap-8 mb-8 items-center">
        <div className="relative w-64 h-32">
          <svg viewBox="0 0 200 100" className="w-full h-full">
            {/* Easy */}
            <path
              d="M 20 100 A 80 80 0 0 1 80 20"
              fill="none"
              stroke="#06b6d4"
              strokeWidth={easyPercent > 0 ? 16 : 0}
              strokeDasharray={easyPercent > 0 ? `${(easyPercent / 100) * 251} 251` : "0 251"}
            />
            {/* Medium */}
            <path
              d="M 80 20 A 80 80 0 0 1 120 20"
              fill="none"
              stroke="#a78bfa"
              strokeWidth={mediumPercent > 0 ? 16 : 0}
              strokeDasharray={mediumPercent > 0 ? `${(mediumPercent / 100) * 251} 251` : "0 251"}
            />
            {/* Hard */}
            <path
              d="M 120 20 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="#fde047"
              strokeWidth={hardPercent > 0 ? 16 : 0}
              strokeDasharray={hardPercent > 0 ? `${(hardPercent / 100) * 251} 251` : "0 251"}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-cyan-300">{solvedCount}</span>
            <span className="text-lg text-gray-400">Solved</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-cyan-400 inline-block"></span>
            <span className="text-cyan-200 font-semibold">Easy:</span> {easyCount}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-purple-400 inline-block"></span>
            <span className="text-purple-200 font-semibold">Medium:</span> {mediumCount}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-yellow-300 inline-block"></span>
            <span className="text-yellow-200 font-semibold">Hard:</span> {hardCount}
          </div>
        </div>
      </div>
      {/* Progress List */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold mb-4 text-cyan-300">Progress</h2>
        {progress.length === 0 ? (
          <div>No progress yet.</div>
        ) : (
          <div className="space-y-4">
            {progress.map((p) => (
              <div key={p.problem_id} className="bg-[#23232b] p-4 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <span className="font-semibold text-cyan-200">{p.problems?.title}</span>
                  <span className="ml-2 text-sm text-gray-400">({p.problems?.difficulty})</span>
                </div>
                <div className="mt-2 md:mt-0">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${p.status === "Solved" ? "bg-green-500 text-white" : "bg-gray-600 text-gray-200"}`}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Submissions List */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-cyan-300">Submissions</h2>
        {submissions.length === 0 ? (
          <div>No submissions yet.</div>
        ) : (
          <div className="space-y-4">
            {submissions.map((s) => (
              <div key={s.id} className="bg-[#23232b] p-4 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <span className="font-semibold text-cyan-200">{s.problem_title}</span>
                  <span className="ml-2 text-sm text-gray-400">({s.status})</span>
                </div>
                <div className="mt-2 md:mt-0 text-sm text-gray-400">
                  {new Date(s.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
