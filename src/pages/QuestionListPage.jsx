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

export default function QuestionListPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [answered, setAnswered] = useState({});
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(0);
  const [chapter, setChapter] = useState('all');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        let query = supabase.from('questions').select('id, code, category, difficulty');
        if (category > 0) query = query.eq('category', category);
        const { data } = await query.order('code');
        setQuestions(data || []);

        const { data: answers } = await supabase
          .from('user_answers')
          .select('question_id, is_correct')
          .eq('user_id', user.id);

        const map = {};
        for (const a of (answers || [])) {
          if (!map[a.question_id] || a.is_correct) {
            map[a.question_id] = a.is_correct;
          }
        }
        setAnswered(map);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [category, user.id]);

  const chapters = [...new Set(questions.map(q => getChapter(q.code)))].sort();
  const filtered = chapter === 'all' ? questions : questions.filter(q => getChapter(q.code) === chapter);

  if (loading) return <div className="text-slate-400 mt-8">Loading questions...</div>;

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
