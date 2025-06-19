import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '../../lib/supabaseClient';

const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || 'aab534825amsh940f9cb13cfaf23p1aa15bjsne736af2cdbf3';

function generateJudge0Script(userCode: string, testInputs: any[], expectedOutputs: any[]): string {
  const testCases = testInputs.map((input, i) => ({ input, expected: expectedOutputs[i] }));
  return `
import json
import sys

${userCode}

def run_tests():
    test_cases = ${JSON.stringify(testCases)}
    results = []
    for case in test_cases:
        try:
            output = solution(*case["input"]) if isinstance(case["input"], (list, tuple)) else solution(case["input"])
            is_correct = output == case["expected"]
            results.append({"input": case["input"], "user_out": output, "ref_out": case["expected"], "is_correct": is_correct})
        except Exception as e:
            results.append({"input": case["input"], "error": str(e), "is_correct": False})
    print(json.dumps(results))



if __name__ == "__main__":
    run_tests()
`;
}

async function submitToJudge0(sourceCode: string, langId = 71) {
  const payload = {
    language_id: langId,
    source_code: Buffer.from(sourceCode).toString('base64'),
    stdin: Buffer.from('').toString('base64'),
  };
  const res = await fetch(`${JUDGE0_API_URL}/submissions?base64_encoded=true&wait=false&fields=token`, {
    method: 'POST',
    headers: {
      'X-RapidAPI-Key': JUDGE0_API_KEY,
      'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to submit code to Judge0');
  const data = await res.json();
  return data.token;
}

async function fetchJudge0Result(token: string) {
  const headers = {
    'X-RapidAPI-Key': JUDGE0_API_KEY,
    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
  };
  while (true) {
    const res = await fetch(`${JUDGE0_API_URL}/submissions/${token}?base64_encoded=true&fields=stdout,stderr,compile_output,status`, { headers });
    const data = await res.json();
    if (data.status && data.status.id > 2) {
      const stdout = Buffer.from(data.stdout || '', 'base64').toString();
      const stderr = Buffer.from(data.stderr || '', 'base64').toString();
      const compile_output = Buffer.from(data.compile_output || '', 'base64').toString();
      return { status: data.status.description, stdout, stderr, compile_output };
    }
    await new Promise(r => setTimeout(r, 500));
  }
}

export async function POST(request: Request) {
    try {
    const { code, testInputs, expectedOutputs, problemId } = await request.json();
    const script = generateJudge0Script(code, testInputs, expectedOutputs);
    const token = await submitToJudge0(script, 71);
    const result = await fetchJudge0Result(token);
    // Parse the JSON output from stdout
    let results = [];
    if (result.stdout) {
      try {
        results = JSON.parse(result.stdout);
      } catch {
        results = [{ error: 'Failed to parse output', raw: result.stdout }];
      }
    } else if (result.stderr || result.compile_output) {
      results = [{ error: result.stderr || result.compile_output }];
    } else {
      results = [{ error: 'No output from Judge0' }];
    }

    // Determine status
    const allPassed = Array.isArray(results) && results.length > 0 && results.every((r: any) => r.is_correct);
    let submissionStatus = 'Wrong Answer';
    if (allPassed) submissionStatus = 'Accepted';
    else if (results.some((r: any) => r.error)) submissionStatus = 'Runtime Error';

    // Get user_id from cookies
    let user_id = null;
    try {
      const cookieHeader = await cookies();
      const match = cookieHeader.get('user_id');
      if (match) user_id = match.value;
    } catch {}

    // Insert submission if user_id and problemId are available
    let submissionId = null;
    if (user_id && problemId) {
      const { data: submissionData } = await supabase.from('user_submissions').insert([
        {
          user_id,
          problem_id: problemId,
          code,
          status: submissionStatus,
        },
      ]).select('id').single();
      submissionId = submissionData?.id;
      // If accepted, upsert user_progress
      if (submissionStatus === 'Accepted' && submissionId) {
        await supabase.from('user_progress').upsert([
          {
            user_id,
            problem_id: problemId,
            status: 'Solved',
            last_submission_id: submissionId,
          },
        ], { onConflict: 'user_id,problem_id' });
      }
    }

    return NextResponse.json({ results, submissionStatus });
    } catch (error) {
        console.error('Error executing code:', error);
        return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
