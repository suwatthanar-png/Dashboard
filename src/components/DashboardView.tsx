import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  Moon,
  Sun,
} from 'lucide-react';
import {
  INTERPRETATION_CRITERIA,
  SURVEY_QUESTIONS,
  interpretScore,
  type SurveyResponseRecord,
} from '../types/survey';
import { downloadResponsesCsv, subscribeToSurveyResponses } from '../lib/firebase';
import { StandaloneGuideSection } from './StandaloneGuideSection';

interface DashboardViewProps {
  onOpenSurvey: () => void;
}

export function DashboardView({ onOpenSurvey }: DashboardViewProps) {
  const [responses, setResponses] = useState<SurveyResponseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isDarkProjector, setIsDarkProjector] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement | null>(null);

  const surveyUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/?view=survey';
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'survey');
    url.hash = '';
    return url.toString();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkProjector) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    return () => {
      root.classList.remove('dark');
    };
  }, [isDarkProjector]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToSurveyResponses(
      (items) => {
        setResponses(items);
        setIsLoading(false);
        setStreamError(null);
      },
      (err) => {
        console.error(err);
        setIsLoading(false);
        setStreamError('ไม่สามารถเชื่อมต่อข้อมูลเรียลไทม์ได้ กรุณาตรวจสอบการตั้งค่า Firebase');
      }
    );
    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => {
    const total = responses.length;
    const itemStats = SURVEY_QUESTIONS.map((q) => {
      if (total === 0) {
        return {
          ...q,
          average: 0,
          counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>,
        };
      }
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;
      for (const r of responses) {
        const val = Number(r[q.key] || 0);
        sum += val;
        if (val >= 1 && val <= 5) {
          counts[val] = (counts[val] ?? 0) + 1;
        }
      }
      return {
        ...q,
        average: sum / total,
        counts,
      };
    });

    const overallAverage =
      total === 0
        ? 0
        : itemStats.reduce((acc, item) => acc + item.average, 0) / itemStats.length;

    const comments = responses.filter((r) => r.comment.trim().length > 0);
    return {
      total,
      itemStats,
      overallAverage,
      overallLevel: interpretScore(overallAverage),
      comments,
    };
  }, [responses]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(surveyUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleDownloadQrSvg = () => {
    const svgEl = qrContainerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgEl);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'training-survey-qr.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen may be restricted inside some embedded iframes
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          <a
            href="?view=dashboard"
            className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            PulseEval
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a
              href="#overview"
              className="hover:text-slate-900 hover:underline underline-offset-4 dark:hover:text-white whitespace-nowrap shrink-0"
            >
              ภาพรวม
            </a>
            <a
              href="#item-chart"
              className="hover:text-slate-900 hover:underline underline-offset-4 dark:hover:text-white whitespace-nowrap shrink-0"
            >
              กราฟรายข้อ
            </a>
            <a
              href="#latest-feedback"
              className="hover:text-slate-900 hover:underline underline-offset-4 dark:hover:text-white whitespace-nowrap shrink-0"
            >
              ข้อเสนอแนะ
            </a>
            <a
              href="#standalone-files"
              className="hover:text-slate-900 hover:underline underline-offset-4 dark:hover:text-white whitespace-nowrap shrink-0"
            >
              โค้ด 2 ไฟล์ &amp; Deploy
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenSurvey}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-teal-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-teal-700"
            >
              <span>เปิดหน้าแบบสอบถาม</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6 sm:py-8">
        {/* Workspace Toolbar */}
        <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              หน้าจอผู้จัดอบรม · อัปเดตผลทันทีแบบเรียลไทม์ · ไม่เก็บชื่อผู้ตอบ
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl lg:text-4xl [text-wrap:balance]">
              สรุปผลความพึงพอใจผู้เข้าร่วมอบรม
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsDarkProjector((v) => !v)}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              {isDarkProjector ? (
                <>
                  <Sun className="h-4 w-4" aria-hidden="true" />
                  <span>โหมดสว่าง</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" aria-hidden="true" />
                  <span>โหมดมืดโปรเจกเตอร์</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-4 w-4" aria-hidden="true" />
                  <span>ออกจากเต็มจอ</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4" aria-hidden="true" />
                  <span>เต็มจอโปรเจกเตอร์</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={responses.length === 0}
              onClick={() => downloadResponsesCsv(responses)}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-teal-700 dark:hover:bg-teal-600 whitespace-nowrap"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>ดาวน์โหลด CSV</span>
            </button>
          </div>
        </section>

        {streamError ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-200"
          >
            {streamError}
          </div>
        ) : null}

        {/* 4-Column Full-Width KPI Strip */}
        <section id="overview" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              คะแนนเฉลี่ยรวมทุกด้าน
            </p>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="tabular-nums font-display text-4xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-5xl">
                {stats.overallAverage.toFixed(2)}
              </span>
              <span className="tabular-nums text-base font-medium text-slate-400 dark:text-slate-500">
                / 5.00
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              ระดับความพึงพอใจ
            </p>
            <p
              className={`mt-2.5 font-display text-3xl font-bold lg:text-4xl ${stats.overallLevel.textColorClass}`}
            >
              {stats.overallLevel.label}
            </p>
            <p className="mt-1.5 tabular-nums text-xs text-slate-500 dark:text-slate-400">
              ช่วงเกณฑ์ 5 ระดับ · {stats.overallLevel.range}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              จำนวนผู้ตอบแบบสอบถาม
            </p>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="tabular-nums font-display text-4xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-5xl">
                {stats.total.toLocaleString('th-TH')}
              </span>
              <span className="text-base font-medium text-slate-500 dark:text-slate-400">
                คน
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              ข้อเสนอแนะที่ส่งเข้ามา
            </p>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="tabular-nums font-display text-4xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-5xl">
                {stats.comments.length.toLocaleString('th-TH')}
              </span>
              <span className="text-base font-medium text-slate-500 dark:text-slate-400">
                ข้อความ
              </span>
            </div>
          </div>
        </section>

        {/* Main 12-Column Projector Split */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left 8 Columns: Item Bar Chart + Latest Comments */}
          <div className="space-y-6 lg:col-span-8">
            <section
              id="item-chart"
              className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                    กราฟค่าเฉลี่ยความพึงพอใจรายข้อ
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    คะแนนเต็ม 5.00 ต่อหัวข้อ · แปลผลตามเกณฑ์มาตรฐาน 5 ระดับ
                  </p>
                </div>
                <span className="tabular-nums text-xs font-medium text-slate-500 dark:text-slate-400">
                  ทั้งหมด 5 หัวข้อ
                </span>
              </div>

              {isLoading ? (
                <div className="mt-5 space-y-5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div key={n} className="space-y-2">
                      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="h-4 w-full animate-pulse rounded-full bg-slate-100 dark:bg-slate-800/70" />
                    </div>
                  ))}
                </div>
              ) : stats.total === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                    ยังไม่มีผู้ส่งแบบสอบถามในขณะนี้
                  </p>
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                    แสดง QR Code ด้านขวาบนโปรเจกเตอร์ให้ผู้เข้าอบรมสแกน หรือทดลองส่งคำตอบแรกด้วยตนเอง
                  </p>
                  <button
                    type="button"
                    onClick={onOpenSurvey}
                    className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
                  >
                    <span>ทำแบบสอบถามแรก</span>
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <div className="mt-6 space-y-6">
                  {stats.itemStats.map((item) => {
                    const info = interpretScore(item.average);
                    const widthPct = Math.min(100, Math.max(0, (item.average / 5) * 100));
                    return (
                      <div key={item.key}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 lg:text-lg">
                            {item.index}. {item.title}
                          </h3>
                          <div className="flex items-baseline gap-2.5">
                            <span className={`text-sm font-semibold ${info.textColorClass}`}>
                              {info.label}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                              ·
                            </span>
                            <span className="tabular-nums font-display text-xl font-bold text-slate-900 dark:text-white lg:text-2xl">
                              {item.average.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2.5 h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${info.barColorClass}`}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          <span>5 คะแนน: {item.counts[5]} คน</span>
                          <span>4 คะแนน: {item.counts[4]} คน</span>
                          <span>3 คะแนน: {item.counts[3]} คน</span>
                          <span>2 คะแนน: {item.counts[2]} คน</span>
                          <span>1 คะแนน: {item.counts[1]} คน</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Latest Feedback */}
            <section
              id="latest-feedback"
              className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                    ข้อเสนอแนะล่าสุด
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    แสดงเฉพาะข้อความที่ผู้เข้าอบรมพิมพ์เพิ่มเติม · ไม่ระบุชื่อผู้ส่ง
                  </p>
                </div>
                <span className="tabular-nums text-xs font-medium text-slate-500 dark:text-slate-400">
                  {stats.comments.length} ข้อความ
                </span>
              </div>

              {stats.comments.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  ยังไม่มีข้อเสนอแนะเพิ่มเติมในขณะนี้
                </p>
              ) : (
                <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                  {stats.comments.slice(0, 20).map((item) => {
                    const personAvg = (
                      (item.q1 + item.q2 + item.q3 + item.q4 + item.q5) /
                      5
                    ).toFixed(2);
                    const timeStr = new Date(item.createdAtMs).toLocaleTimeString('th-TH', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <article key={item.id} className="py-4">
                        <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="tabular-nums font-medium">
                            คะแนนเฉลี่ยที่ให้ {personAvg} / 5.00
                          </span>
                          <span className="tabular-nums">{timeStr} น.</span>
                        </div>
                        <p className="mt-1.5 text-base leading-relaxed text-slate-800 dark:text-slate-100">
                          {item.comment}
                        </p>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Right 4 Columns: QR Code + Criteria */}
          <aside className="space-y-6 lg:col-span-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                สแกน QR Code เพื่อตอบแบบสอบถาม
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                ให้ผู้เข้าอบรมเปิดกล้องมือถือสแกนเพื่อกรอกคะแนนได้ทันที
              </p>

              <div className="mt-5 flex justify-center">
                <div
                  ref={qrContainerRef}
                  className="inline-flex rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <QRCodeSVG
                    value={surveyUrl}
                    size={200}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    level="M"
                  />
                </div>
              </div>

              <p className="mt-4 break-all font-mono text-xs text-slate-600 dark:text-slate-300">
                {surveyUrl}
              </p>

              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="h-4 w-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                      <span>คัดลอกลิงก์แล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      <span>คัดลอกลิงก์แบบสอบถาม</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadQrSvg}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span>ดาวน์โหลด QR Code (SVG)</span>
                </button>
              </div>
            </section>

            {/* 5-Level Interpretation Table */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                เกณฑ์การแปลผล 5 ระดับ
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                อ้างอิงช่วงคะแนนเฉลี่ยมาตรฐาน
              </p>

              <div className="mt-4 divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {INTERPRETATION_CRITERIA.map((row) => (
                  <div key={row.rangeLabel} className="flex items-center justify-between py-2.5">
                    <span className="tabular-nums text-slate-600 dark:text-slate-300">
                      {row.rangeLabel}
                    </span>
                    <span className={`font-semibold ${row.textColorClass}`}>
                      {row.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        {/* Standalone 2-file HTML + Firebase RTDB Guide */}
        <StandaloneGuideSection />
      </main>
    </div>
  );
}
