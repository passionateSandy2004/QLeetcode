"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import CodeEditor from "../../components/CodeEditor";
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

export default function AddProblemPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [topics, setTopics] = useState("");
  const [examples, setExamples] = useState([
    { input: "", output: "", explanation: "" }
  ]);
  const [inputs, setInputs] = useState([""]);
  const [outputs, setOutputs] = useState([""]);
  const [template, setTemplate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user_id from cookie
  function getUserIdFromCookie() {
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/user_id=([^;]+)/);
      return match ? match[1] : null;
    }
    return null;
  }

  const handleExampleChange = (idx: number, field: string, value: string) => {
    setExamples(exs => exs.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex));
  };
  const addExample = () => setExamples(exs => [...exs, { input: "", output: "", explanation: "" }]);
  const removeExample = (idx: number) => setExamples(exs => exs.length > 1 ? exs.filter((_, i) => i !== idx) : exs);

  const handleInputChange = (idx: number, value: string) => setInputs(arr => arr.map((v, i) => i === idx ? value : v));
  const handleOutputChange = (idx: number, value: string) => setOutputs(arr => arr.map((v, i) => i === idx ? value : v));
  const addTestCase = () => {
    setInputs(arr => [...arr, ""]);
    setOutputs(arr => [...arr, ""]);
  };
  const removeTestCase = (idx: number) => {
    if (inputs.length > 1) {
      setInputs(arr => arr.filter((_, i) => i !== idx));
      setOutputs(arr => arr.filter((_, i) => i !== idx));
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const user_id = getUserIdFromCookie();
    if (!user_id) {
      setError("User not authenticated.");
      setSubmitting(false);
      return;
    }
    // Insert problem
    const { data: problemData, error: problemError } = await supabase
      .from("problems")
      .insert([{
        title,
        description,
        difficulty,
        template,
        inputs,
        outputs,
        user_id,
      }])
      .select("id")
      .single();
    if (problemError || !problemData) {
      setError(problemError?.message || "Failed to insert problem.");
      setSubmitting(false);
      return;
    }
    const problem_id = problemData.id;
    // Insert topics
    const topicArr = topics.split(',').map(t => t.trim()).filter(Boolean);
    if (topicArr.length > 0) {
      const topicRows = topicArr.map(topic => ({ problem_id, topic }));
      const { error: topicError } = await supabase.from("problem_topics").insert(topicRows);
      if (topicError) {
        setError(topicError.message);
        setSubmitting(false);
        return;
      }
    }
    // Insert examples
    for (const ex of examples) {
      if (ex.input && ex.output) {
        const { error: exampleError } = await supabase.from("problem_examples").insert([
          { problem_id, input: ex.input, output: ex.output, explanation: ex.explanation }
        ]);
        if (exampleError) {
          setError(exampleError.message);
          setSubmitting(false);
          return;
        }
      }
    }
    router.push(`/problems/${problem_id}`);
  }

  return (
    <div className="min-h-screen bg-[#18181a] text-white flex justify-center items-start py-12">
      <form onSubmit={handleSubmit} className="bg-[#23232b] p-8 rounded-xl shadow-lg w-full max-w-3xl flex flex-col gap-6 border border-cyan-900">
        <h1 className="text-3xl font-bold text-cyan-300 mb-2">Add New Problem</h1>
        {error && <div className="text-red-400">{error}</div>}
        <div>
          <label className="block text-cyan-200 font-semibold mb-1">Title</label>
          <input className="w-full p-2 rounded bg-[#18181a] border border-[#333] text-white" value={title} onChange={e => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="block text-cyan-200 font-semibold mb-1">Description (Markdown + LaTeX supported)</label>
          <textarea className="w-full p-2 rounded bg-[#18181a] border border-[#333] text-white min-h-[120px]" value={description} onChange={e => setDescription(e.target.value)} required />
          <div className="mt-2 text-sm text-gray-400">Preview:</div>
          <div className="prose prose-invert bg-[#18181a] rounded p-2 border border-[#23232b]">
            <ReactMarkdown rehypePlugins={[rehypeKatex]} remarkPlugins={[remarkMath]}>{description}</ReactMarkdown>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-cyan-200 font-semibold mb-1">Difficulty</label>
            <select className="w-full p-2 rounded bg-[#18181a] border border-[#333] text-white" value={difficulty} onChange={e => setDifficulty(e.target.value)} required>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-cyan-200 font-semibold mb-1">Topics (comma separated)</label>
            <input className="w-full p-2 rounded bg-[#18181a] border border-[#333] text-white" value={topics} onChange={e => setTopics(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="block text-cyan-200 font-semibold mb-1">Examples</label>
          {examples.map((ex, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input className="flex-1 p-2 rounded bg-[#18181a] border border-[#333] text-white" placeholder="Input" value={ex.input} onChange={e => handleExampleChange(idx, "input", e.target.value)} required />
              <input className="flex-1 p-2 rounded bg-[#18181a] border border-[#333] text-white" placeholder="Output" value={ex.output} onChange={e => handleExampleChange(idx, "output", e.target.value)} required />
              <input className="flex-1 p-2 rounded bg-[#18181a] border border-[#333] text-white" placeholder="Explanation (optional)" value={ex.explanation} onChange={e => handleExampleChange(idx, "explanation", e.target.value)} />
              <button type="button" className="text-red-400 font-bold px-2" onClick={() => removeExample(idx)} disabled={examples.length === 1}>×</button>
            </div>
          ))}
          <button type="button" className="text-cyan-400 font-semibold mt-1" onClick={addExample}>+ Add Example</button>
        </div>
        <div>
          <label className="block text-cyan-200 font-semibold mb-1">Test Cases</label>
          {inputs.map((input, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input className="flex-1 p-2 rounded bg-[#18181a] border border-[#333] text-white" placeholder="Input" value={input} onChange={e => handleInputChange(idx, e.target.value)} required />
              <input className="flex-1 p-2 rounded bg-[#18181a] border border-[#333] text-white" placeholder="Expected Output" value={outputs[idx]} onChange={e => handleOutputChange(idx, e.target.value)} required />
              <button type="button" className="text-red-400 font-bold px-2" onClick={() => removeTestCase(idx)} disabled={inputs.length === 1}>×</button>
            </div>
          ))}
          <button type="button" className="text-cyan-400 font-semibold mt-1" onClick={addTestCase}>+ Add Test Case</button>
        </div>
        <div>
          <label className="block text-cyan-200 font-semibold mb-1">Code Template</label>
          <div className="w-full h-[400px] bg-[#18181a] rounded-xl border border-[#23232b] shadow overflow-hidden flex flex-col mb-4">
            <div className="px-4 py-2 border-b border-[#23232b] bg-[#23232b] flex items-center justify-between">
              <span className="font-semibold text-cyan-300">Code Template</span>
            </div>
            <div className="flex-1">
              <CodeEditor initialCode={template} onChange={setTemplate} />
            </div>
          </div>
        </div>
        <div className="flex gap-4 mt-4">
          <button type="submit" className="bg-cyan-400 hover:bg-cyan-500 text-black px-6 py-2 rounded font-semibold" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Problem"}
          </button>
          <button type="button" className="bg-gray-600 text-white px-6 py-2 rounded" onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
} 