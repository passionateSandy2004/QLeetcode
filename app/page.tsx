"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "./lib/supabaseClient";

type Problem = {
  id: number;
  title: string;
  difficulty: string;
  topics: string[];
  status: string;
};

const allTopics = [
  "Array",
  "String",
  "Hash Table",
  "Linked List",
  "Math",
  "Sliding Window",
  "Binary Search",
  "Divide and Conquer",
];

const navLinks = [
  { name: "Quantum Challenges", href: "/" },
  { name: "Leaderboard", href: "/leadboard" },
  { name: "Quantum Path", href: "/path" },
  { name: "Discuss", href: "/discuss" },
  { name: "Quantum Library", href: "/library" },
];

const trendingCompanies = [
  { name: "Meta", count: 1196 },
  { name: "Google", count: 1992 },
  { name: "Uber", count: 551 },
  { name: "Amazon", count: 1844 },
  { name: "Apple", count: 619 },
  { name: "Bloomberg", count: 1029 },
  { name: "Oracle", count: 312 },
  { name: "Microsoft", count: 1180 },
  { name: "TikTok", count: 443 },
  { name: "Goldman Sachs", count: 254 },
  { name: "Salesforce", count: 202 },
  { name: "Adobe", count: 585 },
  { name: "LinkedIn", count: 172 },
  { name: "Atlassian", count: 74 },
  { name: "Airbnb", count: 58 },
  { name: "DoorDash", count: 89 },
  { name: "PayPal", count: 111 },
  { name: "Snowflake", count: 88 },
  { name: "Pinterest", count: 49 },
  { name: "Citadel", count: 105 },
];

export default function Home() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [companySearch, setCompanySearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    difficulty: 'Easy',
    topics: '', // comma separated
    exampleInput: '',
    exampleOutput: '',
    exampleExplanation: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [clerkId, setClerkId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProblems() {
      setLoading(true);
      // Get user_id from cookie
      let user_id = null;
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(/user_id=([^;]+)/);
        user_id = match ? match[1] : null;
      }
      // Fetch problems
      const { data: problemsData, error: problemsError } = await supabase
        .from('problems')
        .select('id, title, difficulty');
      const { data: topicsData, error: topicsError } = await supabase
        .from('problem_topics')
        .select('problem_id, topic');
      // Fetch user progress
      let progressData: any[] = [];
      if (user_id) {
        const { data: userProgressData } = await supabase
          .from('user_progress')
          .select('problem_id, status')
          .eq('user_id', user_id);
        progressData = userProgressData || [];
      }
      if (problemsError || topicsError) {
        setProblems([]);
        setLoading(false);
        return;
      }
      // Merge progress into problems
      const problemsWithTopics = (problemsData || []).map((problem) => {
        const progress = progressData.find((p) => p.problem_id === problem.id);
        return {
          ...problem,
          topics: (topicsData || [])
            .filter((t) => t.problem_id === problem.id)
            .map((t) => t.topic),
          status: progress && progress.status === 'Solved' ? 'Solved' : 'Unsolved',
        };
      });
      // Sort by id ascending
      problemsWithTopics.sort((a, b) => a.id - b.id);
      setProblems(problemsWithTopics);
      setLoading(false);
    }
    fetchProblems();
  }, []);

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

  const filteredProblems = problems.filter((problem: Problem) => {
    const matchesSearch = problem.title.toLowerCase().includes(search.toLowerCase());
    const matchesTopic = selectedTopic ? problem.topics.includes(selectedTopic) : true;
    const matchesDifficulty = selectedDifficulty ? problem.difficulty === selectedDifficulty : true;
    return matchesSearch && matchesTopic && matchesDifficulty;
  });

  const filteredCompanies = trendingCompanies.filter((company) =>
    company.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  // Helper to get user_id from cookie
  function getUserIdFromCookie() {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/user_id=([^;]+)/);
    return match ? match[1] : null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const user_id = getUserIdFromCookie();
    if (!user_id) {
      alert('User not authenticated.');
      setSubmitting(false);
      return;
    }
    // Insert problem
    const res = await fetch('/api/add-problem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        user_id,
      }),
    });
    if (res.ok) {
      setShowModal(false);
      setForm({ title: '', description: '', difficulty: 'Easy', topics: '', exampleInput: '', exampleOutput: '', exampleExplanation: '' });
      // Optionally refresh problems list here
      window.location.reload();
    } else {
      alert('Failed to add problem.');
    }
    setSubmitting(false);
  }

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

  return (
    <div className="relative">
      <div className="min-h-screen bg-[#18181a] text-white flex flex-col">
        {/* Top Navigation Bar */}
        <header className="flex items-center justify-between px-8 py-4 bg-[#18181a] border-b border-[#23232b]">
          <div className="flex items-center gap-8">
            <span className="text-2xl font-bold text-cyan-300">QubitQuest</span>
            <div className="flex gap-6 text-sm font-medium">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`hover:text-cyan-300 cursor-pointer ${link.name === "Quantum Challenges" ? "border-b-2 border-cyan-300" : ""}`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Quantum Pro button */}
            <button className="bg-cyan-300 text-black px-4 py-2 rounded-lg font-semibold shadow hover:bg-cyan-400 transition">Quantum Pro</button>
            {/* Public Profile button, only if username exists */}
            {username && (
              <a
                href={`/profile/${username}`}
                className="border border-cyan-400 text-cyan-700 bg-white/80 hover:bg-cyan-50 transition px-4 py-2 rounded-lg font-semibold ml-2"
                style={{ boxShadow: '0 2px 8px 0 rgba(6,182,212,0.08)' }}
              >
                My Public Profile
              </a>
            )}
          </div>
        </header>
        <div className="flex flex-1">
          {/* Sidebar */}
          <aside className="w-64 bg-[#23232b] p-6 flex flex-col gap-8 border-r border-[#2c2c36] min-h-full">
            <div className="font-bold text-lg mb-2">Quantum Library</div>
            <div className="font-semibold">Quantum Path</div>
            <div className="mt-8">
              <div className="font-semibold mb-2">My Quantum Lists</div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>★</span> Quantum Favorites
              </div>
            </div>
          </aside>
          {/* Main Content */}
          <main className="flex-1 p-8 bg-[#18181a] min-h-screen">
            {/* Banner Cards */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="flex-1 bg-gradient-to-r from-cyan-500 to-cyan-700 rounded-xl p-6 flex flex-col justify-between shadow-lg">
                <div className="font-bold text-lg mb-2">Quantum Computing Crash Course:</div>
                <div className="mb-4 text-sm">Quantum Circuits & Algorithms for the Next Era</div>
                <button className="bg-white text-cyan-700 font-semibold px-4 py-2 rounded shadow hover:bg-cyan-100 w-max">Start Learning</button>
              </div>
              <div className="flex-1 bg-gradient-to-r from-purple-500 to-purple-700 rounded-xl p-6 flex flex-col justify-between shadow-lg">
                <div className="font-bold text-lg mb-2">Quantum Logic Mastery:</div>
                <div className="mb-4 text-sm">Entanglement, Superposition, and More</div>
                <button className="bg-white text-purple-700 font-semibold px-4 py-2 rounded shadow hover:bg-purple-100 w-max">Explore Topics</button>
              </div>
              <div className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl p-6 flex flex-col justify-between shadow-lg">
                <div className="font-bold text-lg mb-2">Quantum Industry Trends</div>
                <div className="mb-4 text-sm">Latest Quantum Tech & Companies</div>
                <button className="bg-white text-yellow-700 font-semibold px-4 py-2 rounded shadow hover:bg-yellow-100 w-max">See Insights</button>
              </div>
            </div>
            {/* Filters and Search */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="font-semibold text-gray-300">Quantum Topic:</span>
                <button
                  className={`px-4 py-1 rounded-full text-sm font-medium ${selectedTopic === null ? "bg-cyan-300 text-black" : "bg-[#23232b] text-gray-200 border border-[#333]"}`}
                  onClick={() => setSelectedTopic(null)}
                >
                  All
                </button>
                {allTopics.map((topic) => (
                  <button
                    key={topic}
                    className={`px-4 py-1 rounded-full text-sm font-medium ${selectedTopic === topic ? "bg-cyan-300 text-black" : "bg-[#23232b] text-gray-200 border border-[#333]"}`}
                    onClick={() => setSelectedTopic(topic)}
                  >
                    {topic}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Search quantum challenges..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-[#333] bg-[#23232b] text-white rounded px-4 py-2 w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-cyan-300"
              />
            </div>
            <div className="flex gap-4 mb-6">
              <span className="font-semibold text-gray-300">Quantum Difficulty:</span>
              {['Easy', 'Medium', 'Hard'].map((level) => (
                <button
                  key={level}
                  className={`px-4 py-1 rounded-full text-sm font-medium ${selectedDifficulty === level ? "bg-cyan-500 text-white" : "bg-[#23232b] text-gray-200 border border-[#333]"}`}
                  onClick={() => setSelectedDifficulty(selectedDifficulty === level ? null : level)}
                >
                  {level}
                </button>
              ))}
            </div>
            {/* Problems List */}
            <div className="bg-[#23232b] rounded-xl shadow-lg p-0 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#23232b] border-b border-[#333]">
                  <tr>
                    <th className="py-3 px-4 text-gray-400 font-semibold">#</th>
                    <th className="text-gray-400 font-semibold">Quantum Challenge</th>
                    <th className="text-gray-400 font-semibold">Difficulty</th>
                    <th className="text-gray-400 font-semibold">Topics</th>
                    <th className="text-gray-400 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">
                        Loading quantum challenges...
                      </td>
                    </tr>
                  ) : filteredProblems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">
                        No quantum challenges found.
                      </td>
                    </tr>
                  ) : (
                    filteredProblems.map((problem) => (
                      <tr key={problem.id} className="border-b border-[#333] hover:bg-[#28282f] transition">
                        <td className="py-3 px-4">{problem.id}</td>
                        <td className="font-medium">
                          <Link href={`/problems/${problem.id}`} className="hover:underline text-cyan-300">
                            {problem.title}
                          </Link>
                        </td>
                        <td>
                          <span
                            className={
                              problem.difficulty === "Easy"
                                ? "text-cyan-300"
                                : problem.difficulty === "Medium"
                                ? "text-purple-300"
                                : "text-yellow-300"
                            }
                          >
                            {problem.difficulty}
                          </span>
                        </td>
                        <td className="text-gray-300">{problem.topics.join(", ")}</td>
                        <td>
                          {problem.status === "Solved" ? (
                            <span className="text-cyan-300 font-semibold">✔ Solved</span>
                          ) : (
                            <span className="text-gray-500">Unsolved</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </main>
          {/* Right Sidebar: Quantum Companies */}
          <aside className="w-80 bg-[#23232b] p-6 border-l border-[#2c2c36] min-h-full hidden lg:block">
            <div className="bg-[#23232b] rounded-xl shadow-lg p-4 border border-[#292933]">
              <div className="font-bold text-lg mb-4 text-white tracking-tight">Quantum Industry Leaders</div>
              <input
                type="text"
                placeholder="Search for a quantum company..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="w-full mb-4 px-3 py-1.5 rounded bg-[#18181a] text-white border border-[#333] focus:outline-none focus:ring-2 focus:ring-cyan-300 text-sm placeholder-gray-400 transition"
              />
              <div className="flex flex-wrap gap-2">
                {filteredCompanies.map((company) => (
                  <span key={company.name} className="bg-[#18181a] px-3 py-1 rounded text-cyan-300 border border-[#333] text-xs font-semibold">
                    {company.name} <span className="text-gray-400">({company.count})</span>
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
        {/* Floating Plus Button */}
        <button
          className="fixed bottom-8 right-8 bg-cyan-400 hover:bg-cyan-500 text-black rounded-full w-14 h-14 flex items-center justify-center text-4xl shadow-lg z-50"
          onClick={() => window.location.href = '/problems/add'}
          aria-label="Add Problem"
        >
          +
        </button>
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
      </div>
    </div>
  );
}
