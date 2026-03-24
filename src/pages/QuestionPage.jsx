import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import MixedLatex from '../components/MixedLatex';

export default function QuestionPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [showSolution, setShowSolution] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [prevAnswer, setPrevAnswer] = useState(null);
  const [adjacentIds, setAdjacentIds] = useState({ prev: null, next: null });
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    const controller = new AbortController();
    const signal = controller.signal;

    async function load() {
      setLoading(true);
      setError(null);
      setSubmitted(false);
      setSelected(null);
      setIsCorrect(null);
      setShowSolution(false);
      setPrevAnswer(null);

      try {
        // Run all 4 queries in parallel with shared AbortController
        const [questionResult, answersResult, prevQResult, nextQResult] = await Promise.all([
          supabase.from('questions').select('*').eq('id', id).single().abortSignal(signal),
          supabase.from('user_answers')
            .select('answer, is_correct')
            .eq('user_id', user.id)
            .eq('question_id', id)
            .order('created_at', { ascending: false })
            .limit(1)
            .abortSignal(signal),
          supabase.from('questions').select('id').lt('id', id).order('id', { ascending: false }).limit(1).abortSignal(signal),
          supabase.from('questions').select('id').gt('id', id).order('id', { ascending: true }).limit(1).abortSignal(signal),
        ]);

        if (signal.aborted) return;
        if (questionResult.error) throw questionResult.error;

        setQuestion(questionResult.data);
        if (answersResult.data?.length > 0) setPrevAnswer(answersResult.data[0]);
        setAdjacentIds({
          prev: prevQResult.data?.[0]?.id ?? null,
          next: nextQResult.data?.[0]?.id ?? null,
        });
      } catch (err) {
        if (!signal.aborted) setError(err.message || 'Failed to load question.');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }
    load();

    return () => controller.abort();
  }, [id, user?.id, retryCount]);

  const choices = question ? [
    { label: 'A', text: question.choices_a },
    { label: 'B', text: question.choices_b },
    { label: 'C', text: question.choices_c },
    { label: 'D', text: question.choices_d },
    { label: 'E', text: question.choices_e },
    { label: 'F', text: question.choices_f },
  ].filter(c => c.text) : [];

  const handleSubmit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    const correct = selected === question.answer;
    setIsCorrect(correct);
    setSubmitted(true);

    try {
      await supabase.from('user_answers').insert({
        user_id: user.id,
        question_id: question.id,
        answer: selected,
        is_correct: correct,
      });
    } catch (err) {
      console.error('Failed to save answer:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-slate-400 mt-8">Loading...</div>;
  if (error) return (
    <div className="mt-8 text-center">
      <p className="text-red-400 mb-4">{error}</p>
      <button onClick={() => setRetryCount(c => c + 1)} className="btn-primary">Retry</button>
    </div>
  );
  if (!question) return <div className="text-red-400 mt-8">Question not found.</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/questions" className="text-slate-400 hover:text-indigo-400 text-sm mb-4 inline-block">&larr; Back to questions</Link>

      <div className="section-card mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm font-medium text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">{question.code}</span>
          <span className="text-amber-400 text-sm">{'★'.repeat(question.difficulty)}{'☆'.repeat(5 - question.difficulty)}</span>
        </div>

        {question.problem_images?.some(img => img.startsWith('[IMAGE_MISSING')) && (
          <div className="text-amber-400 text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 mb-4">
            Note: Some images for this question are not yet available.
          </div>
        )}

        <div className="text-lg leading-relaxed mb-6">
          <MixedLatex text={question.problem} />
        </div>

        {prevAnswer && !submitted && (
          <div className={`text-sm px-3 py-2 rounded-lg mb-4 ${
            prevAnswer.is_correct ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
          }`}>
            You previously answered {prevAnswer.answer} ({prevAnswer.is_correct ? 'correct' : 'incorrect'}). You can try again.
          </div>
        )}

        <div className="space-y-3 mb-6">
          {choices.map(({ label, text }) => {
            let borderColor = 'border-slate-700';
            if (submitted) {
              if (label === question.answer) borderColor = 'border-emerald-500 bg-emerald-500/10';
              else if (label === selected && !isCorrect) borderColor = 'border-red-500 bg-red-500/10';
            } else if (label === selected) {
              borderColor = 'border-indigo-500 bg-indigo-500/10';
            }

            return (
              <label
                key={label}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:border-slate-600 ${borderColor} ${submitted ? 'pointer-events-none' : ''}`}
              >
                <input
                  type="radio"
                  name="choice"
                  value={label}
                  checked={selected === label}
                  onChange={() => setSelected(label)}
                  disabled={submitted}
                  className="mt-1 accent-indigo-500"
                />
                <span className="font-medium text-slate-300 mr-2">{label}.</span>
                <span className="flex-1"><MixedLatex text={text} /></span>
              </label>
            );
          })}
        </div>

        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={!selected || submitting}
            className="btn-primary"
          >
            {submitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        ) : (
          <div className={`rounded-xl p-4 mb-4 ${isCorrect ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
            <div className="text-lg font-bold mb-1">
              {isCorrect ? '✓ Correct!' : `✗ Incorrect. The answer is ${question.answer}.`}
            </div>
          </div>
        )}

        {submitted && question.solutions && (
          <div className="mt-4">
            <button
              onClick={() => setShowSolution(!showSolution)}
              className="btn-secondary text-sm"
            >
              {showSolution ? 'Hide Solution' : 'Show Solution'}
            </button>
            {showSolution && (
              <div className="mt-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                <MixedLatex text={question.solutions} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        {adjacentIds.prev && (
          <Link to={`/question/${adjacentIds.prev}`} className="text-slate-400 hover:text-indigo-400">&larr; Previous</Link>
        )}
        {adjacentIds.next && (
          <Link to={`/question/${adjacentIds.next}`} className="text-slate-400 hover:text-indigo-400 ml-auto">Next &rarr;</Link>
        )}
      </div>
    </div>
  );
}
