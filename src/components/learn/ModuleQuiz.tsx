/**
 * End-of-module quiz.
 *
 * Answering reveals the reason whether the answer was right or wrong — the
 * `because` line is the actual teaching, and hiding it from people who guessed
 * correctly would waste it. Completing the quiz records module progress.
 */

'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { QuizQuestion } from '@/lib/content/modules';
import { useCurriculumProgress } from '@/lib/content/progress';
import { cn } from '@/lib/utils';

export function ModuleQuiz({ moduleId, quiz }: { moduleId: string; quiz: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const markComplete = useCurriculumProgress((s) => s.markComplete);

  const answered = Object.keys(answers).length;
  const correct = quiz.filter((q, i) => answers[i] === q.answerIndex).length;
  const finished = answered === quiz.length;

  function choose(questionIndex: number, optionIndex: number) {
    if (answers[questionIndex] !== undefined) return; // one shot per question
    const next = { ...answers, [questionIndex]: optionIndex };
    setAnswers(next);
    if (Object.keys(next).length === quiz.length) {
      const score = quiz.filter((q, i) => next[i] === q.answerIndex).length;
      markComplete(moduleId, { correct: score, total: quiz.length });
    }
  }

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">Check yourself</h2>
        <span className="text-xs text-fg-muted">
          {answered}/{quiz.length} answered
        </span>
      </div>

      <ol className="mt-4 space-y-4">
        {quiz.map((q, qi) => {
          const chosen = answers[qi];
          const isAnswered = chosen !== undefined;
          return (
            <li key={qi} className="panel p-5">
              <p className="font-medium">
                {qi + 1}. {q.question}
              </p>
              <ul className="mt-3 space-y-2">
                {q.options.map((option, oi) => {
                  const isCorrect = oi === q.answerIndex;
                  const isChosen = chosen === oi;
                  return (
                    <li key={oi}>
                      <button
                        type="button"
                        onClick={() => choose(qi, oi)}
                        disabled={isAnswered}
                        aria-pressed={isChosen}
                        className={cn(
                          'flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                          !isAnswered && 'border-border hover:border-primary/50',
                          isAnswered && isCorrect && 'border-success/50 bg-success/10',
                          isAnswered && isChosen && !isCorrect && 'border-danger/50 bg-danger/10',
                          isAnswered && !isCorrect && !isChosen && 'border-border opacity-60',
                        )}
                      >
                        {isAnswered && isCorrect && (
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        )}
                        {isAnswered && isChosen && !isCorrect && (
                          <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                        )}
                        <span>{option}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {isAnswered && <p className="mt-3 text-sm text-fg-muted">{q.because}</p>}
            </li>
          );
        })}
      </ol>

      {finished && (
        <p className="mt-4 text-sm">
          <strong>
            {correct}/{quiz.length} correct.
          </strong>{' '}
          <span className="text-fg-muted">Module marked complete on this device.</span>
        </p>
      )}
    </section>
  );
}
