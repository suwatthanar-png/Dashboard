import { useEffect, useState, type FormEvent } from 'react';
import { Check, ArrowRight, AlertCircle } from 'lucide-react';
import {
  SCORE_LABELS,
  SURVEY_QUESTIONS,
  type QuestionKey,
  type ScoreValue,
} from '../types/survey';
import {
  checkDeviceSubmitted,
  getLocalSubmissionFlag,
  getOrCreateDeviceId,
  submitSurveyResponse,
  type StoredLocalSubmission,
} from '../lib/firebase';

interface SurveyViewProps {
  onOpenDashboard: () => void;
}

type AnswersState = Partial<Record<QuestionKey, ScoreValue>>;

export function SurveyView({ onOpenDashboard }: SurveyViewProps) {
  const [deviceId] = useState<string>(() => getOrCreateDeviceId());
  const [answers, setAnswers] = useState<AnswersState>({});
  const [comment, setComment] = useState('');
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState<StoredLocalSubmission | null>(() =>
    getLocalSubmissionFlag()
  );
  const [missingKey, setMissingKey] = useState<QuestionKey | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const submitted = await checkDeviceSubmitted(deviceId);
        if (active && submitted) {
          setAlreadySubmitted(
            getLocalSubmissionFlag() ?? {
              q1: 5,
              q2: 5,
              q3: 5,
              q4: 5,
              q5: 5,
              comment: '',
              submittedAt: Date.now(),
            }
          );
        }
      } catch {
        // If offline or initial check fails, rely on local flag until submit
      } finally {
        if (active) setIsCheckingDuplicate(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [deviceId]);

  const answeredCount = SURVEY_QUESTIONS.filter((q) => Boolean(answers[q.key])).length;

  const handleSelectScore = (key: QuestionKey, score: ScoreValue) => {
    setAnswers((prev) => ({ ...prev, [key]: score }));
    if (missingKey === key) setMissingKey(null);
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const firstMissing = SURVEY_QUESTIONS.find((q) => !answers[q.key]);
    if (firstMissing) {
      setMissingKey(firstMissing.key);
      setErrorMessage(
        `กรุณาเลือกคะแนนในข้อที่ ${firstMissing.index}: ${firstMissing.title}`
      );
      const el = document.getElementById(`question-${firstMissing.key}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    try {
      const existsAlready = await checkDeviceSubmitted(deviceId);
      if (existsAlready) {
        setAlreadySubmitted(getLocalSubmissionFlag());
        return;
      }

      const payload = {
        q1: answers.q1 as ScoreValue,
        q2: answers.q2 as ScoreValue,
        q3: answers.q3 as ScoreValue,
        q4: answers.q4 as ScoreValue,
        q5: answers.q5 as ScoreValue,
        comment: comment.trim(),
      };

      await submitSurveyResponse(deviceId, payload);
      setAlreadySubmitted({
        ...payload,
        submittedAt: Date.now(),
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setErrorMessage('ไม่สามารถส่งคำตอบได้ในขณะนี้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 zones */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-8 px-4 sm:px-6">
          <a
            href="?view=dashboard"
            onClick={(e) => {
              e.preventDefault();
              onOpenDashboard();
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            PulseEval
          </a>

          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-600">
            <span className="tabular-nums whitespace-nowrap shrink-0">
              ความคืบหน้า {answeredCount}/5 ข้อ
            </span>
          </nav>

          <button
            type="button"
            onClick={onOpenDashboard}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-teal-700"
          >
            <span>ดูผล Dashboard</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pb-14 sm:pt-10">
        {isCheckingDuplicate && !alreadySubmitted ? (
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
            <div className="h-36 animate-pulse rounded-2xl bg-slate-200/70" />
            <div className="h-36 animate-pulse rounded-2xl bg-slate-200/70" />
          </div>
        ) : alreadySubmitted ? (
          <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 text-center sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-700">
              <Check className="h-8 w-8" strokeWidth={2.5} aria-hidden="true" />
            </div>
            <p className="mt-5 text-xs font-medium text-slate-500">
              บันทึกข้อมูลสำเร็จ · ไม่ระบุตัวตน · ป้องกันการตอบซ้ำแล้ว
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold text-slate-900 sm:text-3xl [text-wrap:balance]">
              ขอบคุณสำหรับความคิดเห็นของท่าน
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              ระบบได้รับคำตอบจากอุปกรณ์นี้เรียบร้อยแล้ว คะแนนของท่านถูกนำไปคำนวณบนหน้า Dashboard แบบเรียลไทม์ทันที
            </p>

            <div className="mt-6 border-t border-slate-100 pt-5 text-left">
              <p className="text-xs font-semibold text-slate-500">สรุปคะแนนที่ท่านส่ง</p>
              <dl className="mt-3 divide-y divide-slate-100 text-sm">
                {SURVEY_QUESTIONS.map((q) => (
                  <div key={q.key} className="flex items-center justify-between gap-4 py-2">
                    <dt className="text-slate-700">
                      {q.index}. {q.title}
                    </dt>
                    <dd className="tabular-nums font-semibold text-teal-700 whitespace-nowrap">
                      {alreadySubmitted[q.key]} / 5
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={onOpenDashboard}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-teal-700 px-6 text-sm font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-teal-700"
              >
                <span>เปิดดูผลบน Dashboard ทันที</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
            {/* Editorial Left Column on Desktop / Header Intro on Mobile */}
            <aside className="lg:sticky lg:top-20 lg:col-span-4">
              <p className="text-xs font-medium text-slate-500">
                แบบสอบถามออนไลน์ · ไม่ต้องล็อกอิน · ไม่เก็บชื่อผู้ตอบ
              </p>
              <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl [text-wrap:balance]">
                แบบประเมินความพึงพอใจผู้เข้าร่วมอบรม
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                กรุณาเลือกคะแนนความพึงพอใจตั้งแต่ 1 ถึง 5 ในแต่ละหัวข้อ ใช้เวลาไม่เกิน 1 นาที ผลประเมินจะแสดงบนจอหลักทันที
              </p>

              {/* Scale Reference */}
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold text-slate-700">ความหมายของระดับคะแนน</p>
                <div className="mt-3 grid grid-cols-5 gap-2 text-center text-xs text-slate-600 lg:grid-cols-1 lg:text-left">
                  {([5, 4, 3, 2, 1] as ScoreValue[]).map((score) => (
                    <div
                      key={score}
                      className="flex flex-col items-center justify-between gap-0.5 lg:flex-row lg:py-1"
                    >
                      <span className="tabular-nums font-bold text-slate-900">{score}</span>
                      <span className="text-[11px] sm:text-xs">{SCORE_LABELS[score]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* Right Column: Touch-First Rating Cards */}
            <form onSubmit={handleSubmit} className="space-y-4 lg:col-span-8" noValidate>
              {SURVEY_QUESTIONS.map((question) => {
                const selected = answers[question.key];
                const isMissing = missingKey === question.key;

                return (
                  <fieldset
                    key={question.key}
                    id={`question-${question.key}`}
                    className={`rounded-2xl border bg-white p-4 transition-colors sm:p-6 ${
                      isMissing ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-200'
                    }`}
                  >
                    <legend className="sr-only">{question.title}</legend>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="tabular-nums text-xs font-medium text-slate-500">
                          ข้อที่ {question.index} จาก 5
                        </p>
                        <h2 className="mt-1 text-base font-semibold leading-snug text-slate-900 sm:text-lg">
                          {question.title}
                        </h2>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
                          {question.subtitle}
                        </p>
                      </div>
                      {selected ? (
                        <span className="tabular-nums text-xs font-semibold text-teal-700 whitespace-nowrap shrink-0">
                          {selected}/5 · {SCORE_LABELS[selected]}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 grid grid-cols-5 gap-2 sm:gap-3">
                      {([1, 2, 3, 4, 5] as ScoreValue[]).map((score) => {
                        const isActive = selected === score;
                        return (
                          <button
                            key={score}
                            type="button"
                            onClick={() => handleSelectScore(question.key, score)}
                            aria-pressed={isActive}
                            aria-label={`ข้อ ${question.index} ให้ ${score} คะแนน (${SCORE_LABELS[score]})`}
                            className={`flex min-h-[56px] sm:min-h-[64px] flex-col items-center justify-center rounded-xl border px-1 py-2 transition-all duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-teal-700 ${
                              isActive
                                ? 'border-teal-700 bg-teal-700 text-white shadow-sm'
                                : 'border-slate-300 bg-slate-50 text-slate-900 hover:border-teal-600 hover:bg-teal-50/40'
                            }`}
                          >
                            <span className="tabular-nums text-xl font-bold leading-none">
                              {score}
                            </span>
                            <span
                              className={`mt-1.5 text-[11px] leading-none ${
                                isActive ? 'text-teal-50' : 'text-slate-500'
                              }`}
                            >
                              {SCORE_LABELS[score]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                );
              })}

              {/* Optional Suggestion Box */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
                <div className="flex items-baseline justify-between gap-2">
                  <label
                    htmlFor="survey-comment"
                    className="text-base font-semibold text-slate-900"
                  >
                    ข้อเสนอแนะเพิ่มเติม{' '}
                    <span className="text-sm font-normal text-slate-500">(ไม่บังคับ)</span>
                  </label>
                  <span className="tabular-nums text-xs text-slate-500">
                    {comment.length}/500
                  </span>
                </div>
                <textarea
                  id="survey-comment"
                  rows={3}
                  maxLength={500}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="พิมพ์สิ่งที่ประทับใจ หรือข้อเสนอแนะเพื่อพัฒนาการอบรมครั้งต่อไป..."
                  className="mt-3 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:bg-white focus:outline-none sm:text-base"
                />
              </div>

              {errorMessage ? (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{errorMessage}</span>
                </div>
              ) : null}

              {/* Mobile Thumb-Zone Sticky CTA (<= 15% viewport height) / Inline on Desktop */}
              <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:p-0">
                <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
                  <span className="tabular-nums text-xs font-medium text-slate-600 sm:hidden">
                    {answeredCount}/5 ข้อ
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-teal-700 px-6 text-base font-semibold text-white transition-all active:scale-[0.99] hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-teal-700 sm:w-full"
                  >
                    {isSubmitting ? 'กำลังบันทึกคำตอบ...' : 'ส่งแบบประเมินความพึงพอใจ'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
