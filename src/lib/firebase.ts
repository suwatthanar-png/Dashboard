import { initializeApp } from 'firebase/app';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { SURVEY_KEY, SURVEY_QUESTIONS, type ScoreValue, type SurveyResponseRecord } from '../types/survey';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo: Array<{ providerId?: string | null; email?: string | null }>;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: true,
      tenantId: null,
      providerInfo: [],
    },
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'responses', '_healthcheck'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}

const DEVICE_ID_STORAGE_KEY = 'pulse_eval_device_id';
const SUBMITTED_STORAGE_KEY = `pulse_eval_submitted_${SURVEY_KEY}`;
const SUBMITTED_ANSWERS_STORAGE_KEY = `pulse_eval_answers_${SURVEY_KEY}`;

function generateDeviceId(): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  return `dev_${randomPart}`.slice(0, 48);
}

export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) {
      return existing;
    }
    const created = generateDeviceId();
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return generateDeviceId();
  }
}

export interface StoredLocalSubmission {
  q1: ScoreValue;
  q2: ScoreValue;
  q3: ScoreValue;
  q4: ScoreValue;
  q5: ScoreValue;
  comment: string;
  submittedAt: number;
}

export function getLocalSubmissionFlag(): StoredLocalSubmission | null {
  try {
    const flagged = localStorage.getItem(SUBMITTED_STORAGE_KEY);
    if (!flagged) return null;
    const rawAnswers = localStorage.getItem(SUBMITTED_ANSWERS_STORAGE_KEY);
    if (!rawAnswers) {
      return {
        q1: 5,
        q2: 5,
        q3: 5,
        q4: 5,
        q5: 5,
        comment: '',
        submittedAt: Date.now(),
      };
    }
    return JSON.parse(rawAnswers) as StoredLocalSubmission;
  } catch {
    return null;
  }
}

export async function checkDeviceSubmitted(deviceId: string): Promise<boolean> {
  if (getLocalSubmissionFlag()) return true;
  const path = `responses/${deviceId}`;
  try {
    const snap = await getDoc(doc(db, 'responses', deviceId));
    if (snap.exists()) {
      try {
        localStorage.setItem(SUBMITTED_STORAGE_KEY, '1');
      } catch {
        // Ignore storage quota errors
      }
      return true;
    }
    return false;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export interface SubmitSurveyInput {
  q1: ScoreValue;
  q2: ScoreValue;
  q3: ScoreValue;
  q4: ScoreValue;
  q5: ScoreValue;
  comment: string;
}

export async function submitSurveyResponse(
  deviceId: string,
  input: SubmitSurveyInput
): Promise<void> {
  const sanitizedComment = input.comment.trim().slice(0, 500);
  const path = `responses/${deviceId}`;
  try {
    await setDoc(doc(db, 'responses', deviceId), {
      deviceId,
      surveyKey: SURVEY_KEY,
      q1: input.q1,
      q2: input.q2,
      q3: input.q3,
      q4: input.q4,
      q5: input.q5,
      comment: sanitizedComment,
      createdAt: serverTimestamp(),
    });
    try {
      localStorage.setItem(SUBMITTED_STORAGE_KEY, '1');
      localStorage.setItem(
        SUBMITTED_ANSWERS_STORAGE_KEY,
        JSON.stringify({
          ...input,
          comment: sanitizedComment,
          submittedAt: Date.now(),
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToSurveyResponses(
  onData: (responses: SurveyResponseRecord[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'responses';
  const responsesQuery = query(
    collection(db, 'responses'),
    where('surveyKey', '==', SURVEY_KEY),
    limit(1000)
  );

  return onSnapshot(
    responsesQuery,
    (snapshot) => {
      const items: SurveyResponseRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        let createdAtMs = Date.now();
        if (data.createdAt instanceof Timestamp) {
          createdAtMs = data.createdAt.toMillis();
        } else if (typeof data.createdAt === 'number') {
          createdAtMs = data.createdAt;
        }
        return {
          id: d.id,
          deviceId: String(data.deviceId ?? d.id),
          surveyKey: String(data.surveyKey ?? SURVEY_KEY),
          q1: Number(data.q1 ?? 0),
          q2: Number(data.q2 ?? 0),
          q3: Number(data.q3 ?? 0),
          q4: Number(data.q4 ?? 0),
          q5: Number(data.q5 ?? 0),
          comment: typeof data.comment === 'string' ? data.comment : '',
          createdAtMs,
        };
      });

      items.sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadResponsesCsv(responses: SurveyResponseRecord[]): void {
  const headers = [
    'ลำดับ',
    'วันเวลาที่ตอบ',
    ...SURVEY_QUESTIONS.map((q) => `ข้อ ${q.index}: ${q.title}`),
    'ค่าเฉลี่ยรายคน',
    'ข้อเสนอแนะ',
  ];

  const ordered = [...responses].sort((a, b) => a.createdAtMs - b.createdAtMs);
  const rows = ordered.map((r, idx) => {
    const avg = ((r.q1 + r.q2 + r.q3 + r.q4 + r.q5) / 5).toFixed(2);
    const formattedDate = new Date(r.createdAtMs).toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return [
      idx + 1,
      formattedDate,
      r.q1,
      r.q2,
      r.q3,
      r.q4,
      r.q5,
      avg,
      r.comment || '-',
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  // Add UTF-8 BOM (\uFEFF) so Thai text renders properly in Microsoft Excel
  const csvContent = `\uFEFF${[headers.map(escapeCsvCell).join(','), ...rows].join('\r\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `training-satisfaction-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
