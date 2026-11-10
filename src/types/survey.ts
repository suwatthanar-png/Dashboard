export type ScoreValue = 1 | 2 | 3 | 4 | 5;

export type QuestionKey = 'q1' | 'q2' | 'q3' | 'q4' | 'q5';

export interface SurveyQuestion {
  key: QuestionKey;
  index: number;
  title: string;
  subtitle: string;
}

export interface SurveyResponseRecord {
  id: string;
  deviceId: string;
  surveyKey: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: number;
  comment: string;
  createdAtMs: number;
}

export interface RatingLevelInfo {
  label: string;
  range: string;
  textColorClass: string;
  barColorClass: string;
}

export const SURVEY_KEY = 'default-training';

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    key: 'q1',
    index: 1,
    title: 'ความรู้ความเข้าใจที่ได้รับจากการอบรม',
    subtitle: 'เนื้อหามีความชัดเจน ทันสมัย และตรงกับวัตถุประสงค์',
  },
  {
    key: 'q2',
    index: 2,
    title: 'ความสามารถในการนำความรู้ไปประยุกต์ใช้',
    subtitle: 'สามารถนำไปปรับใช้ในการทำงานจริงได้ทันที',
  },
  {
    key: 'q3',
    index: 3,
    title: 'ความเหมาะสมของสื่อและเอกสารประกอบ',
    subtitle: 'สไลด์ คู่มือ หรือตัวอย่างประกอบเข้าใจง่ายและครบถ้วน',
  },
  {
    key: 'q4',
    index: 4,
    title: 'ความชัดเจนในการถ่ายทอดของวิทยากร',
    subtitle: 'การอธิบาย การตอบคำถาม และการกระตุ้นการมีส่วนร่วม',
  },
  {
    key: 'q5',
    index: 5,
    title: 'ความพึงพอใจโดยรวมต่อการจัดอบรม',
    subtitle: 'ภาพรวมของการจัดกิจกรรม เวลา และประสบการณ์ตลอดการอบรม',
  },
];

export const SCORE_LABELS: Record<ScoreValue, string> = {
  1: 'น้อยที่สุด',
  2: 'น้อย',
  3: 'ปานกลาง',
  4: 'มาก',
  5: 'มากที่สุด',
};

export const INTERPRETATION_CRITERIA: Array<{
  min: number;
  max: number;
  rangeLabel: string;
  label: string;
  textColorClass: string;
  barColorClass: string;
}> = [
  {
    min: 4.51,
    max: 5.0,
    rangeLabel: '4.51 – 5.00',
    label: 'มากที่สุด',
    textColorClass: 'text-emerald-700 dark:text-emerald-400',
    barColorClass: 'bg-emerald-600 dark:bg-emerald-500',
  },
  {
    min: 3.51,
    max: 4.5,
    rangeLabel: '3.51 – 4.50',
    label: 'มาก',
    textColorClass: 'text-teal-700 dark:text-teal-400',
    barColorClass: 'bg-teal-600 dark:bg-teal-500',
  },
  {
    min: 2.51,
    max: 3.5,
    rangeLabel: '2.51 – 3.50',
    label: 'ปานกลาง',
    textColorClass: 'text-amber-700 dark:text-amber-400',
    barColorClass: 'bg-amber-500',
  },
  {
    min: 1.51,
    max: 2.5,
    rangeLabel: '1.51 – 2.50',
    label: 'น้อย',
    textColorClass: 'text-orange-700 dark:text-orange-400',
    barColorClass: 'bg-orange-500',
  },
  {
    min: 1.0,
    max: 1.5,
    rangeLabel: '1.00 – 1.50',
    label: 'น้อยที่สุด',
    textColorClass: 'text-rose-700 dark:text-rose-400',
    barColorClass: 'bg-rose-600',
  },
];

export function interpretScore(score: number): RatingLevelInfo {
  if (!Number.isFinite(score) || score <= 0) {
    return {
      label: 'ยังไม่มีข้อมูล',
      range: '—',
      textColorClass: 'text-slate-500 dark:text-slate-400',
      barColorClass: 'bg-slate-400',
    };
  }
  const rounded = Number(score.toFixed(2));
  const matched =
    INTERPRETATION_CRITERIA.find((item) => rounded >= item.min && rounded <= item.max) ??
    INTERPRETATION_CRITERIA[INTERPRETATION_CRITERIA.length - 1];
  return {
    label: matched.label,
    range: matched.rangeLabel,
    textColorClass: matched.textColorClass,
    barColorClass: matched.barColorClass,
  };
}
