import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// --- Config ---
const SQL_PATH = process.argv[2];
if (!SQL_PATH) {
  console.error('Usage: node scripts/migrate-questions.mjs <path-to-sql-file>');
  process.exit(1);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Parse MySQL dump ---
function parseMySQLDump(sql) {
  const match = sql.match(/INSERT INTO `mathematics_question` VALUES\s*(.+);$/ms);
  if (!match) throw new Error('No INSERT statement found');

  const valuesStr = match[1];
  const rows = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < valuesStr.length; i++) {
    const ch = valuesStr[i];
    if (escape) { current += ch; escape = false; continue; }
    if (ch === '\\') { current += ch; escape = true; continue; }
    if (ch === "'" && !escape) { inString = !inString; current += ch; continue; }
    if (inString) { current += ch; continue; }
    if (ch === '(') { depth++; if (depth === 1) { current = ''; continue; } }
    if (ch === ')') {
      depth--;
      if (depth === 0) { rows.push(current); current = ''; continue; }
    }
    current += ch;
  }

  return rows.map(parseRow);
}

function parseRow(rowStr) {
  const fields = [];
  let current = '';
  let inString = false;
  let escape = false;

  for (let i = 0; i < rowStr.length; i++) {
    const ch = rowStr[i];
    if (escape) { current += ch; escape = false; continue; }
    if (ch === '\\') { escape = true; current += ch; continue; }
    if (ch === "'") {
      if (!inString) { inString = true; continue; }
      else { inString = false; continue; }
    }
    if (inString) { current += ch; continue; }
    if (ch === ',') { fields.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  fields.push(current.trim());

  const val = (i) => {
    const v = fields[i];
    if (v === 'NULL' || v === '' || v === undefined) return null;
    return v.replace(/\\'/g, "'").replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\\\/g, '\\');
  };
  const intVal = (i) => { const v = fields[i]; return (v === 'NULL' || v === undefined) ? null : parseInt(v); };

  // Field order from CREATE TABLE:
  // 0: id, 1: code, 2: category, 3: problem,
  // 4-9: problempicture1-6,
  // 10-15: choicesa-f,
  // 16-21: choicepicturea-f,
  // 22: answer,
  // 23-25: solutionspicture1-3,
  // 26: solutions,
  // 27-32: linkability1-6,
  // 33: linkpersonaility,
  // 34: errors, 35: alternativesolutions,
  // 36: messagefailure, 37: messagesuccess,
  // 38: sensitivity, 39: gussingparameter,
  // 40: difficulty, 41: calculateddifficulty

  const problemImages = [val(4), val(5), val(6), val(7), val(8), val(9)].filter(Boolean);
  const solutionImages = [val(23), val(24), val(25)].filter(Boolean);
  const markImage = (img) => `[IMAGE_MISSING: ${img}]`;

  return {
    id: intVal(0),
    code: val(1),
    category: intVal(2),
    problem: val(3),
    choices_a: val(10),
    choices_b: val(11),
    choices_c: val(12),
    choices_d: val(13),
    choices_e: val(14),
    choices_f: val(15),
    answer: val(22),
    solutions: val(26),
    difficulty: intVal(40) || 1,
    problem_images: problemImages.map(markImage),
    solution_images: solutionImages.map(markImage),
  };
}

// --- Insert into Supabase ---
async function migrate() {
  // Try UTF-8 first; if we see Ã (sign of double-encoded UTF-8), fall back to
  // reading as latin1 and re-decoding the bytes as UTF-8.
  let sql = readFileSync(SQL_PATH, 'utf8');
  if (sql.includes('\u00C3')) {
    // Double-encoded: file was UTF-8 content saved with latin1 charset declaration.
    // Read raw bytes via latin1, then re-decode as UTF-8.
    const buf = readFileSync(SQL_PATH);
    sql = new TextDecoder('utf-8').decode(buf);
    // If still garbled, the straight utf8 read is our best bet (already in `sql` above).
    if (sql.includes('\u00C3')) {
      sql = readFileSync(SQL_PATH, 'utf8');
    }
  }
  const questions = parseMySQLDump(sql);
  console.log(`Parsed ${questions.length} questions`);

  // Show sample
  console.log('\nSample question:');
  console.log(`  Code: ${questions[0].code}`);
  console.log(`  Category: ${questions[0].category}`);
  console.log(`  Problem: ${questions[0].problem?.substring(0, 80)}...`);
  console.log(`  Answer: ${questions[0].answer}`);
  console.log(`  Difficulty: ${questions[0].difficulty}`);
  console.log();

  const batchSize = 50;
  let inserted = 0;
  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize);
    const { error } = await supabase.from('questions').insert(batch);
    if (error) {
      console.error(`Error inserting batch at ${i}:`, error.message);
      for (const q of batch) {
        const { error: singleError } = await supabase.from('questions').insert(q);
        if (singleError) console.error(`  Failed question ${q.code}:`, singleError.message);
        else inserted++;
      }
    } else {
      inserted += batch.length;
    }
    console.log(`  Inserted ${inserted}/${questions.length}`);
  }
  console.log(`\nMigration complete: ${inserted} questions inserted`);
}

migrate().catch(console.error);
