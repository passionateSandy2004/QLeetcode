"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

interface Submission {
  id: number;
  problem_id: number;
  code: string;
  status: string;
  created_at: string;
  problem_title?: string;
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get user_id from cookie
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/user_id=([^;]+)/);
      setUserId(match ? match[1] : null);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    async function fetchSubmissions() {
      setLoading(true);
      setError(null);
      // Fetch submissions for this user, join with problems for title
      const { data, error } = await supabase
        .from("user_submissions")
        .select("id, problem_id, code, status, created_at, problems(title)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setSubmissions(
        (data || []).map((s: any) => ({
          ...s,
          problem_title: s.problems?.title || "",
        }))
      );
      setLoading(false);
    }
    fetchSubmissions();
  }, [userId]);

  return (
    <div className="min-h-screen bg-[#18181a] text-white p-8">
      <h1 className="text-3xl font-bold mb-6 text-cyan-300">My Submissions</h1>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : submissions.length === 0 ? (
        <div>No submissions yet.</div>
      ) : (
        <div className="space-y-6">
          {submissions.map((sub) => (
            <div key={sub.id} className="bg-[#23232b] rounded-xl p-6 border border-[#23232b] shadow">
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
              {/* Optionally, you can add output console or more details here if you store them */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 