'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'ar';

const LANG_KEY = 'elhafazah_lang';

export interface DashboardStrings {
  logout: string;
  loading: string;
  save: string;
  cancel: string;
  close: string;
  submit: string;
  back: string;
  langToggle: string;
  brand: string;
  brandAr: string;

  navOverview: string;
  navSchedule: string;
  navStudents: string;
  navProgress: string;
  navPlan: string;
  navWebinar: string;
  navCalendar: string;
  navTeacherChange: string;
  navAbout: string;
  navContact: string;
  navReceipts: string;

  calendarTitle: string;
  calendarDesc: string;
  noUpcoming: string;

  welcomeBack: string;
  teacherWelcomeDesc: string;
  studentWelcomeDesc: string;
  todaySessions: string;
  noSessionsToday: string;
  quickStats: string;
  statStudents: string;
  statSessionsWeek: string;
  statAvgScore: string;
  statLastSession: string;
  statSessionsAttended: string;
  sessionsWithLabel: string;
  newStudentTitle: string;
  newStudentDesc: string;
  requestTrialBtn: string;
  trialRequested: string;
  currentPlanSnapshot: string;
  nextSession: string;

  scheduleTitle: string;
  scheduleDesc: string;
  joinBtn: string;
  joinComingSoon: string;
  joinOpensSoon: string;
  joinEnded: string;
  noSchedule: string;

  studentsTitle: string;
  studentsDesc: string;
  noStudents: string;
  viewStudent: string;
  lastScore: string;
  noScoreYet: string;

  sessionHistory: string;
  noSessionHistory: string;
  recordSession: string;
  fieldScore: string;
  fieldMaxScore: string;
  fieldSurah: string;
  fieldRecitationType: string;
  fieldComment: string;
  fieldNotes: string;
  recordSaved: string;
  recordFailed: string;

  progressTitle: string;
  progressDesc: string;
  scoreTrend: string;
  teacherHistory: string;
  current: string;
  noProgress: string;

  planTitle: string;
  planDesc: string;
  planComingSoon: string;
  planStatusActive: string;
  planStatusPaused: string;
  planStatusWithdrawn: string;
  planStatusPending: string;
  changePlanBtn: string;
  changePlanDesc: string;
  fieldPlan: string;
  planStartDateLabel: string;
  planNotesLabel: string;
  planSessionsRemainingLabel: string;
  planPausedSince: string;
  planPriceLabel: string;
  sessionsPerWeekLabel: string;
  sessionsPerWeekDesc: string;
  durationLabel: string;
  durationDesc: string;
  timeSlotsLabel: string;
  slotsSelectedSuffix: string;
  planRequestFailed: string;
  additionalNotesLabel: string;
  editBtn: string;
  saveChangesBtn: string;
  editPlanRequestTitle: string;
  editPlanRequestDesc: string;

  receiptsTitle: string;
  receiptsDesc: string;
  uploadReceipt: string;
  chooseFile: string;
  receiptAmountLabel: string;
  receiptNoteLabel: string;
  receiptUploaded: string;
  receiptUploadFailed: string;
  receiptExpiresLabel: string;
  noReceipts: string;
  uploading: string;

  webinarTitle: string;
  webinarDesc: string;
  webinarNote: string;

  teacherChangeTitle: string;
  teacherChangeDesc: string;
  teacherChangeReason: string;
  requestedTeacher: string;
  noPreference: string;
  loadingTeachers: string;
  myRequests: string;
  noRequests: string;
  requestSent: string;

  aboutTitle: string;
  aboutBody: string;
  contactTitle: string;
  contactDesc: string;
  contactSent: string;

  statusPending: string;
  statusInReview: string;
  statusApproved: string;
  statusRejected: string;

  days: Record<string, string>;
}

const DICT: Record<Lang, DashboardStrings> = {
  en: {
    // shared shell
    logout: 'Logout',
    loading: 'Loading…',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    submit: 'Submit',
    back: 'Back',
    langToggle: 'العربية',
    brand: 'ELHAFAZAH',
    brandAr: 'أكاديمية الحفظة',

    // nav
    navOverview: 'Overview',
    navSchedule: 'Schedule',
    navStudents: 'My Students',
    navProgress: 'My Progress',
    navPlan: 'My Plan',
    navWebinar: 'Live Sessions',
    navCalendar: 'Calendar',
    navTeacherChange: 'Change Teacher',
    navAbout: 'About Us',
    navContact: 'Contact Us',
    navReceipts: 'Payment Receipts',

    calendarTitle: 'Calendar',
    calendarDesc: 'Your upcoming sessions, with real Google Meet links where available.',
    noUpcoming: 'No upcoming sessions in this window.',

    // overview
    welcomeBack: 'Welcome back',
    teacherWelcomeDesc: 'Manage your schedule, students and session records.',
    studentWelcomeDesc: 'Track your journey through the Qur’an, session by session.',
    todaySessions: 'Today’s sessions',
    noSessionsToday: 'No sessions scheduled for today.',
    quickStats: 'At a glance',
    statStudents: 'Students',
    statSessionsWeek: 'Sessions / week',
    statAvgScore: 'Average score',
    statLastSession: 'Last session',
    statSessionsAttended: 'Sessions attended',
    sessionsWithLabel: 'Sessions with',
    newStudentTitle: 'Start your journey',
    newStudentDesc: 'You don’t have an active plan yet. Book a free trial session and we’ll match you with a certified teacher.',
    requestTrialBtn: 'Request a free trial',
    trialRequested: 'Trial requested — we’ll confirm your teacher and schedule soon.',
    currentPlanSnapshot: 'Current plan',
    nextSession: 'Next session',

    // schedule
    scheduleTitle: 'Weekly Schedule',
    scheduleDesc: 'Your recurring session times across the week.',
    joinBtn: 'Join session',
    joinComingSoon: 'The Google Meet link opens here once your session is due.',
    joinOpensSoon: 'Join opens 15 minutes before your session starts.',
    joinEnded: 'This session has ended.',
    noSchedule: 'No sessions scheduled yet.',

    // students
    studentsTitle: 'My Students',
    studentsDesc: 'Everyone currently allocated to you.',
    noStudents: 'No students assigned yet.',
    viewStudent: 'View details',
    lastScore: 'Last score',
    noScoreYet: 'No sessions recorded yet',

    // student detail / record session
    sessionHistory: 'Session history',
    noSessionHistory: 'No sessions recorded for this student yet.',
    recordSession: 'Record a session',
    fieldScore: 'Score',
    fieldMaxScore: 'Out of',
    fieldSurah: 'Surah / portion',
    fieldRecitationType: 'Recitation type',
    fieldComment: 'Comment for student',
    fieldNotes: 'Private notes',
    recordSaved: 'Session recorded.',
    recordFailed: 'Could not record the session. Please try again.',

    // progress
    progressTitle: 'My Progress',
    progressDesc: 'Your session scores and teacher history.',
    scoreTrend: 'Score history',
    teacherHistory: 'Teacher history',
    current: 'Current',
    noProgress: 'No sessions recorded yet — your progress will appear here after your first session.',

    // plan
    planTitle: 'My Plan',
    planDesc: 'Your current subscription and enrollment status.',
    planComingSoon: 'Plan management is coming soon. In the meantime, requests below are reviewed by our team.',
    planStatusActive: 'Active',
    planStatusPaused: 'Paused',
    planStatusWithdrawn: 'Withdrawn',
    planStatusPending: 'Pending admin activation',
    changePlanBtn: 'Request plan change',
    changePlanDesc: 'Tell us what you’d like to change and an admin will follow up.',
    fieldPlan: 'Requested plan',
    planStartDateLabel: 'Start date',
    planNotesLabel: 'Notes',
    planSessionsRemainingLabel: 'Sessions remaining',
    planPausedSince: 'Paused since {date}',
    planPriceLabel: 'Price',
    sessionsPerWeekLabel: 'Sessions per week',
    sessionsPerWeekDesc: 'How many lessons would you like each week?',
    durationLabel: 'Session length',
    durationDesc: 'How long should each session be?',
    timeSlotsLabel: 'Choose your time slots',
    slotsSelectedSuffix: 'time slots selected',
    planRequestFailed: 'Could not send your request. Please try again.',
    additionalNotesLabel: 'Additional notes (optional)',
    editBtn: 'Edit',
    saveChangesBtn: 'Save changes',
    editPlanRequestTitle: 'Edit your plan request',
    editPlanRequestDesc: 'You can change any of this until an admin reviews it.',

    // receipts
    receiptsTitle: 'Payment Receipts',
    receiptsDesc: 'Upload a screenshot of your payment and track your submissions.',
    uploadReceipt: 'Upload receipt',
    chooseFile: 'Choose file',
    receiptAmountLabel: 'Amount (optional)',
    receiptNoteLabel: 'Note (optional)',
    receiptUploaded: 'Receipt uploaded',
    receiptUploadFailed: 'Failed to upload receipt',
    receiptExpiresLabel: 'Visible to admins until',
    noReceipts: 'No receipts uploaded yet.',
    uploading: 'Uploading…',

    // webinar
    webinarTitle: 'Live Sessions',
    webinarDesc: 'Your upcoming sessions, held over Google Meet.',
    webinarNote: 'A Meet link will appear here shortly before each scheduled session.',

    // teacher change
    teacherChangeTitle: 'Change Teacher',
    teacherChangeDesc: 'Request a different teacher — our team will review and follow up.',
    teacherChangeReason: 'Reason (optional)',
    requestedTeacher: 'Preferred teacher (optional)',
    noPreference: 'No preference',
    loadingTeachers: 'Loading teachers…',
    myRequests: 'My requests',
    noRequests: 'You haven’t submitted any requests yet.',
    requestSent: 'Request sent.',

    // about/contact
    aboutTitle: 'About Elhafazah',
    aboutBody: 'Elhafazah Academy pairs students with certified, one-on-one Qur’an teachers for live online classes in Hifz, Tajweed, and Noorani Qaida — nurturing a love for the Qur’an, one āyah at a time.',
    contactTitle: 'Contact Us',
    contactDesc: 'Have a question? Send us a message and our team will respond soon.',
    contactSent: 'Message sent — we’ll be in touch soon.',

    // status
    statusPending: 'Pending',
    statusInReview: 'In review',
    statusApproved: 'Approved',
    statusRejected: 'Rejected',

    // days
    days: {
      sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
      thu: 'Thursday', fri: 'Friday', sat: 'Saturday',
    } as Record<string, string>,
  },
  ar: {
    logout: 'تسجيل الخروج',
    loading: 'جارٍ التحميل…',
    save: 'حفظ',
    cancel: 'إلغاء',
    close: 'إغلاق',
    submit: 'إرسال',
    back: 'رجوع',
    langToggle: 'English',
    brand: 'الحفظة',
    brandAr: 'أكاديمية الحفظة',

    navOverview: 'نظرة عامة',
    navSchedule: 'الجدول',
    navStudents: 'طلابي',
    navProgress: 'تقدّمي',
    navPlan: 'خطتي',
    navWebinar: 'الحصص المباشرة',
    navCalendar: 'التقويم',
    navTeacherChange: 'تغيير المعلّم',
    navAbout: 'من نحن',
    navContact: 'تواصل معنا',
    navReceipts: 'إيصالات الدفع',

    calendarTitle: 'التقويم',
    calendarDesc: 'حصصك القادمة، مع روابط جوجل ميت الحقيقية حيثما توفرت.',
    noUpcoming: 'لا توجد حصص قادمة في هذه الفترة.',

    welcomeBack: 'مرحبًا بعودتك',
    teacherWelcomeDesc: 'إدارة جدولك وطلابك وسجلات الحصص.',
    studentWelcomeDesc: 'تابع رحلتك مع القرآن، حصة بعد حصة.',
    todaySessions: 'حصص اليوم',
    noSessionsToday: 'لا توجد حصص مجدولة اليوم.',
    quickStats: 'نظرة سريعة',
    statStudents: 'الطلاب',
    statSessionsWeek: 'حصص / أسبوعياً',
    statAvgScore: 'متوسط الدرجات',
    statLastSession: 'آخر حصة',
    statSessionsAttended: 'الحصص الملتحق بها',
    sessionsWithLabel: 'الحصص مع',
    newStudentTitle: 'ابدأ رحلتك',
    newStudentDesc: 'ليس لديك خطة نشطة بعد. احجز حصة تجريبية مجانية وسنطابقك مع معلّم مجاز.',
    requestTrialBtn: 'اطلب حصة تجريبية مجانية',
    trialRequested: 'تم طلب الحصة التجريبية — سنؤكد معلّمك وموعدك قريبًا.',
    currentPlanSnapshot: 'الخطة الحالية',
    nextSession: 'الحصة القادمة',

    scheduleTitle: 'الجدول الأسبوعي',
    scheduleDesc: 'مواعيد حصصك المتكررة خلال الأسبوع.',
    joinBtn: 'انضم للحصة',
    joinComingSoon: 'سيظهر رابط جوجل ميت هنا عند حلول موعد حصتك.',
    joinOpensSoon: 'يفتح رابط الانضمام قبل 15 دقيقة من بدء حصتك.',
    joinEnded: 'انتهت هذه الحصة.',
    noSchedule: 'لا توجد حصص مجدولة بعد.',

    studentsTitle: 'طلابي',
    studentsDesc: 'كل من تم تخصيصه لك حاليًا.',
    noStudents: 'لا يوجد طلاب معينون بعد.',
    viewStudent: 'عرض التفاصيل',
    lastScore: 'آخر درجة',
    noScoreYet: 'لم تُسجَّل أي حصص بعد',

    sessionHistory: 'سجل الحصص',
    noSessionHistory: 'لم تُسجَّل أي حصص لهذا الطالب بعد.',
    recordSession: 'تسجيل حصة',
    fieldScore: 'الدرجة',
    fieldMaxScore: 'من',
    fieldSurah: 'السورة / الجزء',
    fieldRecitationType: 'نوع التلاوة',
    fieldComment: 'تعليق للطالب',
    fieldNotes: 'ملاحظات خاصة',
    recordSaved: 'تم تسجيل الحصة.',
    recordFailed: 'تعذّر تسجيل الحصة. حاول مرة أخرى.',

    progressTitle: 'تقدّمي',
    progressDesc: 'درجات حصصك وسجل معلّميك.',
    scoreTrend: 'سجل الدرجات',
    teacherHistory: 'سجل المعلّمين',
    current: 'الحالي',
    noProgress: 'لم تُسجَّل أي حصص بعد — سيظهر تقدّمك هنا بعد أول حصة لك.',

    planTitle: 'خطتي',
    planDesc: 'حالة اشتراكك وتسجيلك الحالية.',
    planComingSoon: 'إدارة الخطط قريبًا. في هذه الأثناء، يراجع فريقنا الطلبات أدناه.',
    planStatusActive: 'نشطة',
    planStatusPaused: 'موقوفة',
    planStatusWithdrawn: 'منسحب',
    planStatusPending: 'بانتظار تفعيل المشرف',
    changePlanBtn: 'طلب تغيير الخطة',
    changePlanDesc: 'أخبرنا بما تريد تغييره وسيتابع معك أحد المشرفين.',
    fieldPlan: 'الخطة المطلوبة',
    planStartDateLabel: 'تاريخ البدء',
    planNotesLabel: 'ملاحظات',
    planSessionsRemainingLabel: 'الجلسات المتبقية',
    planPausedSince: 'متوقف منذ {date}',
    planPriceLabel: 'السعر',
    sessionsPerWeekLabel: 'عدد الحصص أسبوعيًا',
    sessionsPerWeekDesc: 'كم عدد الحصص التي ترغب بها كل أسبوع؟',
    durationLabel: 'مدة الحصة',
    durationDesc: 'كم تستغرق كل حصة؟',
    timeSlotsLabel: 'اختر أوقات حصصك',
    slotsSelectedSuffix: 'فترة مختارة',
    planRequestFailed: 'تعذّر إرسال طلبك. حاول مرة أخرى.',
    additionalNotesLabel: 'ملاحظات إضافية (اختياري)',
    editBtn: 'تعديل',
    saveChangesBtn: 'حفظ التغييرات',
    editPlanRequestTitle: 'تعديل طلب الخطة',
    editPlanRequestDesc: 'يمكنك تغيير أي شيء هنا حتى يراجعه المشرف.',

    // receipts
    receiptsTitle: 'إيصالات الدفع',
    receiptsDesc: 'ارفع لقطة شاشة لعملية الدفع وتابع طلباتك المرسلة.',
    uploadReceipt: 'رفع إيصال',
    chooseFile: 'اختر ملفاً',
    receiptAmountLabel: 'المبلغ (اختياري)',
    receiptNoteLabel: 'ملاحظة (اختياري)',
    receiptUploaded: 'تم رفع الإيصال',
    receiptUploadFailed: 'فشل رفع الإيصال',
    receiptExpiresLabel: 'مرئي للمشرفين حتى',
    noReceipts: 'لم يتم رفع أي إيصالات بعد.',
    uploading: 'جارٍ الرفع…',

    webinarTitle: 'الحصص المباشرة',
    webinarDesc: 'حصصك القادمة، تُعقد عبر جوجل ميت.',
    webinarNote: 'سيظهر رابط جوجل ميت هنا قبل موعد كل حصة بوقت قصير.',

    teacherChangeTitle: 'تغيير المعلّم',
    teacherChangeDesc: 'اطلب معلّمًا آخر — سيراجع فريقنا طلبك ويتابع معك.',
    teacherChangeReason: 'السبب (اختياري)',
    requestedTeacher: 'المعلّم المفضّل (اختياري)',
    noPreference: 'بدون تفضيل',
    loadingTeachers: 'جارٍ تحميل المعلّمين…',
    myRequests: 'طلباتي',
    noRequests: 'لم تُقدّم أي طلبات بعد.',
    requestSent: 'تم إرسال الطلب.',

    aboutTitle: 'عن الحفظة',
    aboutBody: 'تربط أكاديمية الحفظة الطلاب بمعلّمين مجازين لحصص فردية مباشرة في الحفظ والتجويد والقاعدة النورانية — نغرس حبّ القرآن، آيةً بعد آية.',
    contactTitle: 'تواصل معنا',
    contactDesc: 'لديك سؤال؟ أرسل لنا رسالة وسيردّ فريقنا قريبًا.',
    contactSent: 'تم إرسال الرسالة — سنتواصل معك قريبًا.',

    statusPending: 'قيد الانتظار',
    statusInReview: 'قيد المراجعة',
    statusApproved: 'مقبول',
    statusRejected: 'مرفوض',

    days: {
      sun: 'الأحد', mon: 'الاثنين', tue: 'الثلاثاء', wed: 'الأربعاء',
      thu: 'الخميس', fri: 'الجمعة', sat: 'السبت',
    } as Record<string, string>,
  },
};

interface LangContextValue {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  t: DashboardStrings;
  toggle: () => void;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANG_KEY);
      if (stored === 'ar' || stored === 'en') setLang(stored);
    } catch {
      // localStorage unavailable — fall back to default 'en'
    }
  }, []);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const toggle = () => {
    const next: Lang = lang === 'ar' ? 'en' : 'ar';
    setLang(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      // ignore
    }
  };

  const value: LangContextValue = {
    lang,
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    t: DICT[lang],
    toggle,
  };

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within a LangProvider');
  return ctx;
}
