"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

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

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [clerkId, setClerkId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/user_id=([^;]+)/);
      setUserId(match ? match[1] : null);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    async function fetchUser() {
      const { data, error } = await supabase
        .from("users")
        .select("username, clerk_id")
        .eq("id", userId)
        .single();
      if (data) {
        setUsername(data.username);
        setClerkId(data.clerk_id);
        if (!data.username) setShowUsernameModal(true);
      }
    }
    fetchUser();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    async function fetchData() {
      setLoading(true);
      setError(null);
      // Fetch progress with problem details
      const { data: progressData, error: progressError } = await supabase
        .from("user_progress")
        .select("problem_id, status, last_submission_id, problems(title, difficulty)")
        .eq("user_id", userId);
      // Fetch all submissions with problem title
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("user_submissions")
        .select("id, problem_id, code, status, created_at, problems(title)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (progressError || submissionsError) {
        setError(progressError?.message || submissionsError?.message || "Failed to fetch data");
        setLoading(false);
        return;
      }
      setProgress(progressData || []);
      setSubmissions(
        (submissionsData || []).map((s: any) => ({
          ...s,
          problem_title: s.problems?.title || "",
        }))
      );
      setLoading(false);
    }
    fetchData();
  }, [userId]);

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError(null);
    if (!usernameInput || !clerkId) {
      setUsernameError("Username is required.");
      return;
    }
    const uniqueUsername = `${usernameInput}_${clerkId}`;
    const { error } = await supabase
      .from("users")
      .update({ username: uniqueUsername })
      .eq("id", userId);
    if (error) {
      setUsernameError(error.message);
    } else {
      setShowUsernameModal(false);
      window.location.reload();
    }
  };

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

  return (
    <div className="min-h-screen bg-[#18181a] text-white p-8">
      <h1 className="text-3xl font-bold mb-6 text-cyan-300">My Profile</h1>
      {showUsernameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <form onSubmit={handleUsernameSubmit} className="bg-[#23232b] p-8 rounded-lg shadow-lg w-full max-w-md flex flex-col gap-4">
            <h2 className="text-xl font-bold mb-2">Choose a Username</h2>
            <input
              className="p-2 rounded bg-[#18181a] border border-[#333] text-white"
              placeholder="Enter username"
              value={usernameInput}
              onChange={e => setUsernameInput(e.target.value)}
              required
            />
            {usernameError && <div className="text-red-400">{usernameError}</div>}
            <button type="submit" className="bg-cyan-400 hover:bg-cyan-500 text-black px-4 py-2 rounded font-semibold">
              Save Username
            </button>
          </form>
        </div>
      )}
      {username && (
        <a
          href={`/profile/${username}`}
          className="inline-block mb-4 px-4 py-2 bg-cyan-700 text-white rounded hover:bg-cyan-800 font-semibold"
        >
          View Public Profile
        </a>
      )}
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : (
        <>
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
                  <div key={p.problem_id} className="bg-[#23232b] rounded-xl p-4 border border-[#23232b] shadow flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-cyan-200">{p.problems?.title || `Problem #${p.problem_id}`}</span>
                      <span className="ml-4 text-xs text-gray-400">{p.problems?.difficulty}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      p.status === "Solved"
                        ? "bg-green-900 text-green-300 border-green-400"
                        : "bg-gray-700 text-gray-300 border-gray-400"
                    }`}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Submissions List */}
          <div>
            <h2 className="text-2xl font-bold mb-4 text-cyan-300">All Submissions</h2>
            {submissions.length === 0 ? (
              <div>No submissions yet.</div>
            ) : (
              <div className="space-y-6">
                {submissions.map((sub) => (
                  <div key={sub.id} className="bg-[#23232b] rounded-xl p-4 border border-[#23232b] shadow">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-lg font-semibold text-cyan-200">
                        {sub.problem_title ? sub.problem_title : `Problem #${sub.problem_id}`}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          sub.status === "Accepted"
                            ? "bg-green-900 text-green-300 border-green-400"
                            : sub.status === "Wrong Answer"
                            ? "bg-red-900 text-red-300 border-red-400"
                            : "bg-yellow-900 text-yellow-300 border-yellow-400"
                        }`}
                      >
                        {sub.status}
                      </span>
                      <span className="text-xs text-gray-400 ml-4">
                        {new Date(sub.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="mb-2">
                      <span className="font-semibold text-cyan-300">Code:</span>
                      <pre className="bg-[#18181a] rounded p-2 mt-1 text-sm overflow-x-auto border border-[#23232b]">
                        {sub.code}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}