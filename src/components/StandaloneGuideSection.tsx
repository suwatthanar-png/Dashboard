import { useEffect, useState } from 'react';
import { Check, Copy, Download, ExternalLink } from 'lucide-react';

type FileTab = 'survey' | 'dashboard' | 'rules' | 'guide';

const RTDB_RULES_JSON = `{
  "rules": {
    "responses": {
      ".read": true,
      "$deviceId": {
        ".write": "!data.exists() && newData.exists()",
        ".validate": "newData.hasChildren(['q1', 'q2', 'q3', 'q4', 'q5', 'createdAt']) && newData.child('q1').isNumber() && newData.child('q1').val() >= 1 && newData.child('q1').val() <= 5 && newData.child('q2').isNumber() && newData.child('q2').val() >= 1 && newData.child('q2').val() <= 5 && newData.child('q3').isNumber() && newData.child('q3').val() >= 1 && newData.child('q3').val() <= 5 && newData.child('q4').isNumber() && newData.child('q4').val() >= 1 && newData.child('q4').val() <= 5 && newData.child('q5').isNumber() && newData.child('q5').val() >= 1 && newData.child('q5').val() <= 5 && (!newData.child('comment').exists() || (newData.child('comment').isString() && newData.child('comment').val().length <= 500))"
      }
    }
  }
}`;

export function StandaloneGuideSection() {
  const [activeTab, setActiveTab] = useState<FileTab>('survey');
  const [surveyHtml, setSurveyHtml] = useState<string>('');
  const [dashboardHtml, setDashboardHtml] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch('/survey.html').then((r) => (r.ok ? r.text() : '')),
      fetch('/dashboard.html').then((r) => (r.ok ? r.text() : '')),
    ])
      .then(([s, d]) => {
        if (mounted) {
          setSurveyHtml(s);
          setDashboardHtml(d);
        }
      })
      .catch(() => {
        // Ignore preview fetch errors
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleCopy = async (key: string, content: string) => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const currentCode =
    activeTab === 'survey'
      ? surveyHtml
      : activeTab === 'dashboard'
        ? dashboardHtml
        : activeTab === 'rules'
          ? RTDB_RULES_JSON
          : '';

  return (
    <section
      id="standalone-files"
      className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800 lg:flex-row lg:items-center">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            HTML + JavaScript + Firebase Realtime Database (แพ็กเกจฟรี Spark Plan)
          </p>
          <h2 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            โค้ดแยก 2 ไฟล์ (survey.html &amp; dashboard.html) และคู่มือ Deploy
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/survey.html"
            download="survey.html"
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>ดาวน์โหลด survey.html</span>
          </a>
          <a
            href="/dashboard.html"
            download="dashboard.html"
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>ดาวน์โหลด dashboard.html</span>
          </a>
        </div>
      </div>

      {/* Segmented Tabs */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="เลือกดูโค้ดและขั้นตอนการตั้งค่า"
          className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
        >
          {(
            [
              { id: 'survey', label: '1. survey.html' },
              { id: 'dashboard', label: '2. dashboard.html' },
              { id: 'rules', label: '3. Realtime DB Rules' },
              { id: 'guide', label: '4. วิธีตั้งค่า & Deploy ทีละขั้น' },
            ] as Array<{ id: FileTab; label: string }>
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[38px] rounded-lg px-3.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab !== 'guide' ? (
          <div className="flex items-center gap-2">
            {(activeTab === 'survey' || activeTab === 'dashboard') && (
              <a
                href={activeTab === 'survey' ? '/survey.html' : '/dashboard.html'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <span>เปิดไฟล์ตัวอย่าง</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
            <button
              type="button"
              onClick={() => handleCopy(activeTab, currentCode)}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-teal-700 dark:hover:bg-teal-600 whitespace-nowrap"
            >
              {copiedKey === activeTab ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>คัดลอกโค้ดแล้ว</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>คัดลอกโค้ด</span>
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>

      {activeTab === 'guide' ? (
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                ขั้นตอนที่ 1: สร้างโปรเจกต์ Firebase (ฟรี)
              </h3>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                เข้าไปที่ console.firebase.google.com แล้วกด Add project เลือกแพ็กเกจฟรี (Spark Plan) และปิด Google Analytics เพื่อความรวดเร็ว
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                ขั้นตอนที่ 2: เปิดใช้งาน Realtime Database
              </h3>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                ไปที่เมนู Build &rarr; Realtime Database &rarr; Create Database เลือกโซน <strong>asia-southeast1 (Singapore)</strong> แล้วเลือก Start in locked mode จากนั้นนำ Rules ในแท็บที่ 3 ไปวางในเมนู Rules แล้วกด Publish
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                ขั้นตอนที่ 3: นำค่า firebaseConfig มาวางใน 2 ไฟล์
              </h3>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                ไปที่ Project Settings &rarr; Add app (เลือกไอคอน Web <code>&lt;/&gt;</code>) คัดลอกออบเจ็กต์ <code>firebaseConfig</code> (ที่มี <code>databaseURL</code>) มาวางแทนที่ในทั้งไฟล์ <code>survey.html</code> และ <code>dashboard.html</code>
              </p>
            </div>
          </div>

          <div className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                ขั้นตอนที่ 4: จัดโครงสร้างโฟลเดอร์สำหรับ Deploy
              </h3>
              <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-900 p-3.5 font-mono text-xs text-slate-100">
{`training-eval/
└── public/
    ├── survey.html
    └── dashboard.html`}
              </pre>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                ขั้นตอนที่ 5: Deploy ขึ้น Firebase Hosting ฟรี
              </h3>
              <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-900 p-3.5 font-mono text-xs text-slate-100">
{`npm install -g firebase-tools
firebase login
firebase init hosting
# เลือกโฟลเดอร์ public เป็น public directory
# เลือก No สำหรับ single-page app rewrite
firebase deploy --only hosting`}
              </pre>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                หลัง Deploy เสร็จ เปิด <code>https://your-project.web.app/dashboard.html</code> บนโปรเจกเตอร์ ระบบจะสร้าง QR Code ลิงก์ไปยัง <code>survey.html</code> ให้สแกนตอบทันที
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-950 dark:border-slate-700">
          <pre className="max-h-[420px] overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-100">
            <code>{currentCode || 'กำลังโหลดไฟล์...'}</code>
          </pre>
        </div>
      )}
    </section>
  );
}
