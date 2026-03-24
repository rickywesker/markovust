import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const CATEGORIES = [
  { value: 0, label: 'All' },
  { value: 1, label: 'Example' },
  { value: 2, label: 'Exercise' },
  { value: 3, label: 'Problem' },
  { value: 4, label: 'DIY' },
  { value: 5, label: 'Quiz' },
];

const CATEGORY_LABELS = { 1: 'Expl', 2: 'Exer', 3: 'Prob', 4: 'DIY', 5: 'Quiz' };

function getChapter(code) {
  if (!code) return '?';
  return code.split('.')[0];
}

// Simple in-memory cache for questions (static data)
let questionsCache = null;

export default function QuestionListPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState(questionsCache || []);
  const [answered, setAnswered] = useState({});
  const [loading, setLoading] = useState(!questionsCache);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [category, setCategory] = useState(0);
  const [chapter, setChapter] = useState('all');

  useEffect(() => {
    if (!user?.id) return;
    const controller = new AbortController();
    const signal = controller.signal;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        let questionsQuery = supabase.from('questions').select('id, code, category, difficulty');
        if (category > 0) questionsQuery = questionsQuery.eq('category', category);
        questionsQuery = questionsQuery.order('code').abortSignal(signal);

        const answersQuery = supabase
          .from('user_answers')
          .select('question_id, is_correct')
          .eq('user_id', user.id)
          .abortSignal(signal);

        // Run both queries in parallel
        const [questionsResult, answersResult] = await Promise.all([questionsQuery, answersQuery]);

        if (signal.aborted) return;
        if (questionsResult.error) throw questionsResult.error;

        const data = questionsResult.data || [];
        setQuestions(data);
        if (category === 0) questionsCache = data;

        const map = {};
        for (const a of (answersResult.data || [])) {
          if (!map[a.question_id] || a.is_correct) {
            map[a.question_id] = a.is_correct;
          }
        }
        setAnswered(map);
      } catch (err) {
        if (!signal.aborted) setError(err.message || 'Failed to load questions.');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }
    load();

    return () => controller.abort();
  }, [category, user?.id, retryCount]);

  const chapters = [...new Set(questions.map(q => getChapter(q.code)))].sort();
  const filtered = chapter === 'all' ? questions : questions.filter(q => getChapter(q.code) === chapter);

  if (loading) return <div className="text-slate-400 mt-8">Loading questions...</div>;

  if (error) return (
    <div className="mt-8 text-center">
      <p className="text-red-400 mb-4">{error}</p>
      <button onClick={() => { questionsCache = null; setRetryCount(c => c + 1); }} className="btn-primary">
        Retry
      </button>
    </div>
  );

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Practice Questions</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex flex-wrap gap-1 bg-slate-900 rounded-lg p-1">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer ${
                category === c.value ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 bg-slate-900 rounded-lg p-1">
          <button
            onClick={() => setChapter('all')}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer ${
              chapter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Ch.
          </button>
          {chapters.map(ch => (
            <button
              key={ch}
              onClick={() => setChapter(ch)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer ${
                chapter === ch ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ch.{ch}
            </button>
          ))}
        </div>
      </div>

      <div className="section-card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="text-left px-4 py-3">Code</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Difficulty</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(q => (
              <tr key={q.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3">
                  <Link to={`/question/${q.id}`} className="text-indigo-400 hover:underline">{q.code}</Link>
                </td>
                <td className="px-4 py-3 text-slate-400">{CATEGORY_LABELS[q.category] || q.category}</td>
                <td className="px-4 py-3 text-amber-400">{'★'.repeat(q.difficulty)}{'☆'.repeat(5 - q.difficulty)}</td>
                <td className="px-4 py-3">
                  {answered[q.id] === true && <span className="text-emerald-400">✓ Correct</span>}
                  {answered[q.id] === false && <span className="text-red-400">✗ Wrong</span>}
                  {answered[q.id] === undefined && <span className="text-slate-500">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-slate-400 text-center py-8">No questions found.</p>
        )}
      </div>
    </div>
  );
}
