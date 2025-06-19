import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, difficulty, topics, exampleInput, exampleOutput, exampleExplanation, user_id } = body;

    // Insert into problems
    const { data: problemData, error: problemError } = await supabase
      .from('problems')
      .insert([{ title, description, difficulty, user_id }])
      .select('id')
      .single();

    if (problemError || !problemData) {
      return NextResponse.json({ error: problemError?.message || 'Failed to insert problem.' }, { status: 500 });
    }

    const problem_id = problemData.id;

    // Insert topics
    const topicArr = topics.split(',').map((t: string) => t.trim()).filter(Boolean);
    if (topicArr.length > 0) {
      const topicRows = topicArr.map((topic: string) => ({ problem_id, topic }));
      const { error: topicError } = await supabase.from('problem_topics').insert(topicRows);
      if (topicError) {
        return NextResponse.json({ error: topicError.message }, { status: 500 });
      }
    }

    // Insert example
    if (exampleInput && exampleOutput) {
      const { error: exampleError } = await supabase.from('problem_examples').insert([
        { problem_id, input: exampleInput, output: exampleOutput, explanation: exampleExplanation }
      ]);
      if (exampleError) {
        return NextResponse.json({ error: exampleError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, problem_id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error.' }, { status: 500 });
  }
} 