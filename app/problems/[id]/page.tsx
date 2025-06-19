"use client";

import { useParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import CodeEditor from "../../components/CodeEditor";

const difficultyColors = {
  Easy: "bg-cyan-700 text-cyan-300 border-cyan-400",
  Medium: "bg-purple-700 text-purple-300 border-purple-400",
  Hard: "bg-yellow-700 text-yellow-300 border-yellow-400",
} as const;

interface Example {
  input: string;
  output: string;
  explanation?: string;
}

interface ProblemDetail {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  template: string;
  topics: string[];
  examples: Example[];
  inputs?: any[];
  outputs?: any[];
}

interface TestResult {
  input: any;
  user_out: any;
  ref_out: any;
  is_correct: boolean;
  error?: string;
}

// Utility to fix escaped newlines and backslashes if the DB stores as a literal string
function fixEscapes(str: string) {
  // Replace literal \\n (two backslashes and n) with newline
  let result = str.replace(/\\n/g, "\n");
  // Replace literal \\ (two backslashes) with one backslash
  result = result.replace(/\\/g, "\\");
  return result;
}

export default function ProblemDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<string>("");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProblemDetail() {
      setLoading(true);
      // Fetch problem
      const { data: problemData, error: problemError } = await supabase
        .from('problems')
        .select('id, title, description, difficulty, template, inputs, outputs')
        .eq('id', id)
        .single();
      if (problemError || !problemData) {
        setProblem(null);
        setLoading(false);
        return;
      }
      // Fetch topics
      const { data: topicsData } = await supabase
        .from('problem_topics')
        .select('topic')
        .eq('problem_id', id);
      // Fetch examples
      const { data: examplesData } = await supabase
        .from('problem_examples')
        .select('input, output, explanation')
        .eq('problem_id', id);
      const detail: ProblemDetail = {
        ...problemData,
        topics: (topicsData || []).map((t) => t.topic),
        examples: examplesData || [],
      };
      setProblem(detail);
      setCode(fixEscapes(problemData.template || ""));
      setLoading(false);
    }
    fetchProblemDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/user_id=([^;]+)/);
      setUserId(match ? match[1] : null);
    }
  }, []);

  // Debugging logs: run after problem is loaded
  useEffect(() => {
    if (!loading && problem) {
      console.log('RAW DESC:', problem.description);
      console.log('FIXED DESC:', fixEscapes(problem.description));
      console.log('TYPE RAW:', typeof problem.description);
      console.log('TYPE FIXED:', typeof fixEscapes(problem.description));
    }
  }, [loading, problem]);

  const fetchSubmissions = async () => {
    if (!userId || !problem?.id) return;
    setSubmissionsLoading(true);
    setSubmissionsError(null);
    const { data, error } = await supabase
      .from('user_submissions')
      .select('id, code, status, created_at')
      .eq('user_id', userId)
      .eq('problem_id', problem.id)
      .order('created_at', { ascending: false });
    if (error) {
      setSubmissionsError(error.message);
      setSubmissionsLoading(false);
      return;
    }
    setSubmissions(data || []);
    setSubmissionsLoading(false);
  };

  if (loading) {
    return <div className="text-white p-8">Loading problem...</div>;
  }
  if (!problem) {
    return <div className="text-white p-8">Problem not found.</div>;
  }

  const handleRunCode = async () => {
    setIsRunning(true);
    setError(null);
    setTestResults([]);
    try {
      // Use test inputs and expected outputs from the problems table (production-grade)
      const testInputs = problem.inputs || [];
      const expectedOutputs = problem.outputs || [];
      if (!testInputs.length || !expectedOutputs.length) {
        setError('Test cases are not available for this problem. Please contact the admin.');
        setIsRunning(false);
        return;
      }
      console.log('RUN CODE: testInputs', testInputs);
      console.log('RUN CODE: expectedOutputs', expectedOutputs);
      const response = await fetch('/api/run-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          testInputs,
          expectedOutputs,
          problemId: problem.id,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to run code');
      }
      setTestResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCodeChange = (value: string | undefined) => {
    setCode(value || "");
  };

  const getStatusColor = (isCorrect: boolean) => {
    return isCorrect ? "text-green-400" : "text-red-400";
  };

  const formatValue = (value: any): string => {
    if (Array.isArray(value)) {
      return JSON.stringify(value);
    }
    return String(value);
  };

  return (
    <div className="min-h-screen bg-[#18181a] text-white flex">
      {/* Left: Problem Description */}
      <div className="flex-1 p-10 overflow-y-auto border-r border-[#23232b] bg-[#18181a]">
        <div className="mb-6 flex items-center gap-3">
          <span className="text-3xl font-bold text-cyan-300">{problem.id}. {problem.title}</span>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${difficultyColors[problem.difficulty as keyof typeof difficultyColors]}`}>{problem.difficulty}</span>
        </div>
        <div className="mb-6 whitespace-pre-line text-gray-200 text-lg leading-relaxed bg-[#23232b] rounded-xl p-6 border border-[#23232b] shadow">
          <ReactMarkdown rehypePlugins={[rehypeKatex]} remarkPlugins={[remarkMath]}>
            {fixEscapes(problem.description)}
          </ReactMarkdown>
        </div>
        <div className="mb-6">
          <span className="font-semibold text-cyan-300">Topics:</span>
          {problem.topics.map((topic) => (
            <span key={topic} className="ml-2 px-3 py-1 bg-[#18181a] rounded-full text-xs text-cyan-200 border border-cyan-700 font-semibold shadow-sm">{topic}</span>
          ))}
        </div>
        <div className="mb-6">
          <span className="font-semibold text-cyan-300">Examples:</span>
          {problem.examples.map((ex: any, idx: number) => (
            <div
              key={idx}
              className="bg-[#23232b] rounded-xl p-4 my-3 border border-[#23232b] shadow font-mono text-sm text-white"
              style={{ fontFamily: 'Fira Mono, Menlo, Monaco, Consolas, monospace' }}
            >
              <div className="mb-1">
                <span className="text-yellow-300 font-bold">Input:</span>
                <pre className="inline whitespace-pre-wrap select-text ml-2 text-cyan-200">{ex.input}</pre>
              </div>
              <div className="mb-1">
                <span className="text-cyan-300 font-bold">Output:</span>
                <pre className="inline whitespace-pre-wrap select-text ml-2 text-green-300">{ex.output}</pre>
              </div>
              {ex.explanation && (
                <div>
                  <span className="text-purple-300 font-bold">Explanation:</span>
                  <pre className="inline whitespace-pre-wrap select-text ml-2 text-purple-200">{ex.explanation}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mb-6">
          <button
            className="px-4 py-2 bg-cyan-700 text-cyan-200 rounded font-semibold hover:bg-cyan-800 border border-cyan-400 mb-2"
            onClick={() => {
              setShowSubmissions(true);
              fetchSubmissions();
            }}
          >
            View My Submissions for this Problem
          </button>
        </div>
      </div>
      {/* Right: Code Editor and Output */}
      <div className="w-1/2 p-10 bg-[#23232b] min-h-screen flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div className="text-xl font-bold text-cyan-300">Code</div>
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              isRunning
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-cyan-500 hover:bg-cyan-600"
            }`}
          >
            {isRunning ? "Running..." : "Run Code"}
          </button>
        </div>
        <div className="flex-1 bg-[#18181a] rounded-xl border border-[#23232b] shadow overflow-hidden mb-4">
          <CodeEditor
            initialCode={code}
            onChange={handleCodeChange}
          />
        </div>
        {/* Output Panel */}
        <div className="bg-[#18181a] rounded-xl border border-[#23232b] shadow overflow-hidden">
          <div className="px-4 py-2 border-b border-[#23232b] bg-[#23232b] flex items-center justify-between">
            <span className="font-semibold text-cyan-300">Test Results</span>
            {testResults.length > 0 && (
              <button
                onClick={() => setTestResults([])}
                className="text-gray-400 hover:text-white text-sm"
              >
                Clear
              </button>
            )}
          </div>
          <div className="p-4 font-mono text-sm min-h-[100px] max-h-[300px] overflow-y-auto">
            {error ? (
              <div className="text-red-400 mb-2">{error}</div>
            ) : testResults.length === 0 ? (
              <div className="text-gray-500">No test results yet. Run your code to see results.</div>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="mb-4 last:mb-0">
                  <div className="mb-2">
                    <span className="text-yellow-300">Test Case {index + 1}:</span>
                    <div className="text-gray-400 ml-4">Input: {formatValue(result.input)}</div>
                    {result.error ? (
                      <div className="text-red-400 ml-4">Error: {result.error}</div>
                    ) : (
                      <>
                        <div className="text-gray-400 ml-4">Your Output: {formatValue(result.user_out)}</div>
                        <div className="text-gray-400 ml-4">Expected: {formatValue(result.ref_out)}</div>
                      </>
                    )}
                  </div>
                  {!result.error && (
                    <div className={`font-semibold ${getStatusColor(result.is_correct)}`}>
                      {result.is_correct ? "✓ Passed" : "✗ Failed"}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* Submissions Modal */}
      {showSubmissions && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-[#23232b] rounded-xl p-8 w-full max-w-2xl border border-cyan-900 shadow-xl relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-white text-xl"
              onClick={() => setShowSubmissions(false)}
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4 text-cyan-300">My Submissions for this Problem</h2>
            {submissionsLoading ? (
              <div>Loading...</div>
            ) : submissionsError ? (
              <div className="text-red-400">{submissionsError}</div>
            ) : submissions.length === 0 ? (
              <div>No submissions yet for this problem.</div>
            ) : (
              <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                {submissions.map((sub) => (
                  <div key={sub.id} className="bg-[#18181a] rounded-xl p-4 border border-[#23232b] shadow">
                    <div className="mb-2 flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        sub.status === "Accepted"
                          ? "bg-green-900 text-green-300 border-green-400"
                          : sub.status === "Wrong Answer"
                          ? "bg-red-900 text-red-300 border-red-400"
                          : "bg-yellow-900 text-yellow-300 border-yellow-400"
                      }`}>
                        {sub.status}
                      </span>
                      <span className="text-xs text-gray-400 ml-4">
                        {new Date(sub.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="mb-2">
                      <span className="font-semibold text-cyan-300">Code:</span>
                      <pre className="bg-[#23232b] rounded p-2 mt-1 text-sm overflow-x-auto border border-[#23232b]">
                        {sub.code}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 