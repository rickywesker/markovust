import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function ProgressPage() {
  const { user } = useAuth();
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('user_answers')
        .select('id, question_id, answer, is_correct, created_at, questions(code, category)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setAnswers(data || []);
      setLoading(false);
    }
    load();
  }, [user.id]);

  const total = answers.length;
  const correct = answers.filter(a => a.is_correct).length;
  const uniqueQuestions = new Set(answers.map(a => a.question_id)).size;

  if (loading) return <div className="text-slate-400 mt-8">Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">My Progress</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="section-card text-center">
          <div className="text-3xl font-bold text-indigo-400">{uniqueQuestions}</div>
          <div className="text-sm text-slate-400 mt-1">Questions Attempted</div>
        </div>
        <div className="section-card text-center">
          <div className="text-3xl font-bold text-emerald-400">{correct}</div>
          <div className="text-sm text-slate-400 mt-1">Correct Answers</div>
        </div>
        <div className="section-card text-center">
          <div className="text-3xl font-bold text-amber-400">{total > 0 ? Math.round(correct / total * 100) : 0}%</div>
          <div className="text-sm text-slate-400 mt-1">Accuracy</div>
        </div>
      </div>

      <div className="section-card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="text-left px-4 py-3">Question</th>
              <th className="text-left px-4 py-3">Your Answer</th>
              <th className="text-left px-4 py-3">Result</th>
              <th className="text-left px-4 py-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {answers.map(a => (
              <tr key={a.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                <td className="px-4 py-3">
                  <Link to={`/question/${a.question_id}`} className="text-indigo-400 hover:underline">
                    {a.questions?.code || a.question_id}
                  </Link>
                </td>
                <td className="px-4 py-3">{a.answer}</td>
                <td className="px-4 py-3">
                  {a.is_correct
                    ? <span className="text-emerald-400">✓ Correct</span>
                    : <span className="text-red-400">✗ Wrong</span>}
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {new Date(a.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {answers.length === 0 && (
          <p className="text-slate-400 text-center py-8">No answers yet. Start practicing!</p>
        )}
      </div>
    </div>
  );
}
