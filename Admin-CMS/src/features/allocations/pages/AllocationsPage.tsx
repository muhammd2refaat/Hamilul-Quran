/**
 * Allocations Page — manage teacher/student session allocations
 */

import { useState, useMemo } from 'react';
import {
  PieChart,
  Plus,
  ChevronRight,
  ChevronLeft,
  User,
  GraduationCap,
  Clock,
  CalendarDays,
  CheckCircle2,
  Calendar as CalendarIcon,
  Pencil,
  Trash2,
  Users,
  Lock,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Button, Modal, ConfirmDialog } from '@/shared/components';
import { useAllocationsStore, type Allocation } from '../store/allocationsStore';
import { useUsersStore } from '@/features/users/store/usersStore';
import { useEffect } from 'react';

const DAYS_OF_WEEK = [
  { id: 'sun', label: 'Sunday' },
  { id: 'mon', label: 'Monday' },
  { id: 'tue', label: 'Tuesday' },
  { id: 'wed', label: 'Wednesday' },
  { id: 'thu', label: 'Thursday' },
  { id: 'fri', label: 'Friday' },
  { id: 'sat', label: 'Saturday' },
];

// Full 24-hour range, hourly slots — "12:00 AM" .. "11:00 PM" — same
// "HH:MM AM/PM" string format the backend expects (parse_time_str,
// google_calendar_client.py). Generated rather than hardcoded so it can't
// drift out of a partial range again.
const TIME_SLOTS = Array.from({ length: 24 }, (_, hour) => {
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(displayHour).padStart(2, '0')}:00 ${period}`;
});

const slotKey = (day: string, time: string) => `${day}|${time}`;

interface AllocationState {
  teacherId: string;
  studentId: string;
  sessionsPerWeek: number;
  duration: 30 | 45 | 60;
  schedule: Array<{ day: string; time: string }>;
}

export function AllocationsPage() {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingAlloc, setDeletingAlloc] = useState<Allocation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { allocations, fetchAllocations, createAllocation, updateAllocation, deleteAllocation } =
    useAllocationsStore();
  const { users, fetchUsers } = useUsersStore();

  useEffect(() => {
    fetchAllocations();
    fetchUsers();
  }, [fetchAllocations, fetchUsers]);

  const teachers = users.filter(u => u.role === 'TEACHER');
  const students = users.filter(u => u.role === 'STUDENT');
  
  const [state, setState] = useState<AllocationState>({
    teacherId: '',
    studentId: '',
    sessionsPerWeek: 2,
    duration: 30,
    schedule: []
  });

  const resetModal = () => {
    setIsModalOpen(false);
    setStep(1);
    setEditingId(null);
    setIsSubmitting(false);
    setState({ teacherId: '', studentId: '', sessionsPerWeek: 2, duration: 30, schedule: [] });
  };

  // Only intercepts the user closing the modal themselves (backdrop/X/Esc) —
  // resetModal() itself still runs unguarded after a successful submit.
  const handleModalClose = () => {
    if (isSubmitting) return; // don't let the modal close while a save is in flight
    resetModal();
  };

  const handleNext = () => {
    if (step < 3) {
      setStep((s) => (s + 1) as 1 | 2 | 3);
      return;
    }
    if (isSubmitting) return; // already in flight — ignore a double-click
    const payload = {
      teacher_id: state.teacherId,
      student_id: state.studentId,
      sessions_per_week: state.sessionsPerWeek,
      duration: state.duration,
      schedule: state.schedule,
    };
    // The backend synchronously syncs each schedule slot to Google Calendar
    // before responding (AllocationService._try_create_calendar_events) —
    // this can take a few seconds, so surface that as a real loading state
    // rather than leaving the button looking frozen/clickable.
    setIsSubmitting(true);
    const submit = editingId
      ? updateAllocation(editingId, payload)
      : createAllocation(payload);
    submit
      .then(() => {
        toast.success(editingId ? 'Allocation updated' : 'Allocation created');
        resetModal();
      })
      .catch((error: any) => {
        toast.error(error?.response?.data?.detail || 'Failed to save allocation');
      })
      .finally(() => setIsSubmitting(false));
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3);
  };

  const openEditModal = (alloc: Allocation) => {
    setEditingId(alloc.id);
    setState({
      teacherId: alloc.teacher_id,
      studentId: alloc.student_id,
      sessionsPerWeek: alloc.sessions_per_week,
      duration: alloc.duration as 30 | 45 | 60,
      schedule: alloc.schedule.map((s) => ({ day: s.day, time: s.time })),
    });
    setStep(1);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingAlloc) return;
    setIsDeleting(true);
    try {
      await deleteAllocation(deletingAlloc.id);
      toast.success('Allocation deleted');
      setDeletingAlloc(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to delete allocation');
    } finally {
      setIsDeleting(false);
    }
  };

  const step3ButtonLabel = editingId ? t('common.save') : t('allocations.confirm');

  const isStep1Valid = state.teacherId && state.studentId;
  const isStep2Valid = state.sessionsPerWeek > 0;
  const isStep3Valid = state.schedule.length === state.sessionsPerWeek;

  // Every day+time slot already booked for the currently selected teacher,
  // across their OTHER allocations (any student) — a teacher can't be in two
  // places at once. Excludes the allocation being edited itself, so editing
  // an allocation doesn't lock out its own already-selected slots.
  const teacherBookedSlots = useMemo(() => {
    const booked = new Set<string>();
    if (!state.teacherId) return booked;
    for (const alloc of allocations) {
      if (alloc.teacher_id !== state.teacherId) continue;
      if (alloc.id === editingId) continue;
      for (const s of alloc.schedule) booked.add(slotKey(s.day, s.time));
    }
    return booked;
  }, [allocations, state.teacherId, editingId]);

  const getDaySchedules = (dayId: string) => state.schedule.filter(s => s.day === dayId);

  const toggleSchedule = (dayId: string, time: string) => {
    const existingIdx = state.schedule.findIndex(s => s.day === dayId && s.time === time);
    if (existingIdx >= 0) {
      // Remove
      setState(prev => ({
        ...prev,
        schedule: prev.schedule.filter((_, i) => i !== existingIdx)
      }));
    } else {
      // Add if we haven't reached max sessions per week
      if (state.schedule.length < state.sessionsPerWeek) {
        setState(prev => ({
          ...prev,
          schedule: [...prev.schedule, { day: dayId, time }]
        }));
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('allocations.title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('allocations.subtitle')}
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 me-2" /> {t('allocations.addAllocation')}
        </Button>
      </div>
      
      {allocations.length === 0 ? (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
          <PieChart className="w-8 h-8 text-primary-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">{t('allocations.noneTitle')}</h3>
        <p className="text-gray-500 mt-2 max-w-sm">
          {t('allocations.noneDesc')}
        </p>
        <Button className="mt-6" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 me-2" /> {t('allocations.addAllocation')}
        </Button>
      </div>
) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allocations.map(alloc => {
           const teacher = users.find(u => u.id === alloc.teacher_id);
           const student = users.find(u => u.id === alloc.student_id);
           return (
             <div key={alloc.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
               <div className="flex justify-between items-start mb-4">
                 <div>
                   <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2"><GraduationCap className="h-4 w-4" /> {student?.firstName} {student?.lastName}</h3>
                   <p className="text-sm text-gray-500 flex items-center gap-2 mt-1"><User className="h-4 w-4" /> {teacher?.firstName} {teacher?.lastName}</p>
                 </div>
                 <span className="bg-primary-50 text-primary-700 text-xs font-bold px-2 py-1 rounded-full">
                   {t('allocations.perWeek', { count: alloc.sessions_per_week })}
                 </span>
               </div>
               <div className="border-t border-gray-100 pt-4 mt-4 space-y-2">
                 <p className="text-sm text-gray-600 flex items-center gap-2"><Clock className="h-4 w-4" /> {t('allocations.minutes', { count: alloc.duration })}</p>
                 <div className="flex flex-wrap gap-2 mt-2">
                   {alloc.schedule.map((s, idx) => (
                     <span key={idx} className="bg-gray-100 text-gray-700 text-[10px] font-semibold px-2 py-1 rounded border border-gray-200">
                       {s.day.toUpperCase()} {s.time}
                     </span>
                   ))}
                 </div>
               </div>
               <div className="border-t border-gray-100 pt-3 mt-3 flex items-center gap-2">
                 <button
                   onClick={() => openEditModal(alloc)}
                   className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors"
                 >
                   <Pencil className="h-3.5 w-3.5" /> {t('common.edit')}
                 </button>
                 <button
                   onClick={() => setDeletingAlloc(alloc)}
                   className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                 >
                   <Trash2 className="h-3.5 w-3.5" /> {t('common.delete')}
                 </button>
               </div>
             </div>
           );
        })}
      </div>
)}

      <Modal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={editingId ? t('allocations.editTitle') : t('allocations.createTitle')}
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-sm font-medium text-gray-500">
              {isSubmitting
                ? t('allocations.syncingCalendar')
                : t('allocations.stepOf', { step })}
            </div>
            <div className="flex gap-3">
              {step > 1 && (
                <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
                  <ChevronLeft className="h-4 w-4 me-2" /> {t('common.back')}
                </Button>
              )}
              <Button
                onClick={handleNext}
                isLoading={step === 3 && isSubmitting}
                disabled={
                  (step === 1 && !isStep1Valid) ||
                  (step === 2 && !isStep2Valid) ||
                  (step === 3 && !isStep3Valid)
                }
              >
                {step === 3
                  ? (isSubmitting ? t('allocations.saving') : step3ButtonLabel)
                  : t('allocations.nextStep')}
                {step < 3 && <ChevronRight className="h-4 w-4 ms-2" />}
              </Button>
            </div>
          </div>
        }
      >
        {/* Progress Bar */}
        <div className="flex items-center mb-8 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 rounded-full" />
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary-600 rounded-full transition-all duration-300"
            style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
          />
          <div className="flex justify-between w-full relative z-10">
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                  step >= s ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-[400px]">
          {/* STEP 1: Select Users */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-primary-600" /> {t('allocations.selectTeacher')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[180px] overflow-y-auto pr-2">
                  {teachers.map((t) => (
                    <div 
                      key={t.id}
                      onClick={() => setState({ ...state, teacherId: t.id })}
                      className={`p-4 border rounded-xl cursor-pointer transition-all ${
                        state.teacherId === t.id 
                          ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600' 
                          : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-bold text-gray-900">{t.firstName} {t.lastName}</p>
                      <p className="text-xs text-gray-500 mt-1">{t.email}</p>
                    </div>
                  ))}
                </div>

                {/* Enrolled students for the selected teacher */}
                {state.teacherId && (() => {
                  const enrolled = allocations
                    .filter((a) => a.teacher_id === state.teacherId)
                    .map((a) => {
                      const stu = users.find((u) => u.id === a.student_id);
                      return stu ? { id: a.id, name: `${stu.firstName} ${stu.lastName}`, sessions: a.sessions_per_week, duration: a.duration } : null;
                    })
                    .filter(Boolean) as { id: string; name: string; sessions: number; duration: number }[];

                  return (
                    <div className="mt-3 border border-primary-200 bg-primary-50/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-primary-600" />
                        <span className="text-sm font-semibold text-primary-800">
                          {t('allocations.enrolledStudents', { count: enrolled.length })}
                        </span>
                      </div>
                      {enrolled.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">{t('allocations.noEnrolledStudents')}</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {enrolled.map((e) => (
                            <span
                              key={e.id}
                              className="inline-flex items-center gap-1.5 bg-white border border-primary-200 text-gray-800 text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-sm"
                            >
                              <GraduationCap className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                              {e.name}
                              <span className="text-[10px] text-gray-400 ms-1">{e.sessions}×/{e.duration}m</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-emerald-600" /> {t('allocations.selectStudent')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[180px] overflow-y-auto pr-2">
                  {students.map((s) => (
                    <div 
                      key={s.id}
                      onClick={() => setState({ ...state, studentId: s.id })}
                      className={`p-4 border rounded-xl cursor-pointer transition-all ${
                        state.studentId === s.id 
                          ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600' 
                          : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-gray-900">{s.firstName} {s.lastName}</p>
                          <p className="text-xs text-gray-500 mt-1">{s.email}</p>
                        </div>
                        
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Configuration */}
          {step === 2 && (
            <div className="space-y-8 animate-fade-in max-w-xl mx-auto pt-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-indigo-600" /> {t('allocations.sessionsPerWeek')}
                </h3>
                <p className="text-sm text-gray-500 mb-4">{t('allocations.sessionsPerWeekDesc')}</p>
                <div className="flex items-center gap-4">
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                    <button
                      key={num}
                      onClick={() => setState({ ...state, sessionsPerWeek: num, schedule: [] })}
                      className={`w-12 h-12 rounded-xl text-lg font-bold transition-all ${
                        state.sessionsPerWeek === num
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" /> {t('allocations.sessionDuration')}
                </h3>
                <p className="text-sm text-gray-500 mb-4">{t('allocations.sessionDurationDesc')}</p>
                <div className="flex items-center gap-4">
                  {[30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setState({ ...state, duration: mins as 30 | 45 | 60 })}
                      className={`px-6 py-3 rounded-xl font-bold transition-all ${
                        state.duration === mins
                          ? 'bg-amber-500 text-white shadow-md'
                          : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50'
                      }`}
                    >
                      {mins} minutes
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Schedule */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary-600" /> {t('allocations.selectSchedule')}
                </h3>
                <div className="text-sm font-medium">
                  {t('allocations.selectedSlots', { selected: state.schedule.length, total: state.sessionsPerWeek })}
                </div>
              </div>

              {/* 7 columns don't fit a narrow screen — scroll horizontally
                  instead of squeezing each day/time-slot button unreadably. */}
              <div className="overflow-x-auto -mx-1 px-1">
              <div className="grid grid-cols-7 gap-3 min-w-[640px]">
                {DAYS_OF_WEEK.map((day) => {
                  const daySchedules = getDaySchedules(day.id);
                  const isSelected = daySchedules.length > 0;
                  
                  return (
                    <div key={day.id} className="space-y-3">
                      {/* Day Header */}
                      <div className={`p-3 text-center rounded-xl border-2 transition-colors ${
                        isSelected 
                          ? 'border-primary-500 bg-primary-50 text-primary-900' 
                          : 'border-gray-100 bg-gray-50 text-gray-500'
                      }`}>
                        <p className="font-bold text-sm">{day.label.slice(0, 3)}</p>
                        {isSelected && (
                          <span className="inline-block mt-1 text-[10px] font-bold bg-primary-200 text-primary-800 px-1.5 py-0.5 rounded">
                            {daySchedules.length}
                          </span>
                        )}
                      </div>

                      {/* Time Slots */}
                      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                        {TIME_SLOTS.map((time) => {
                          const isSlotSelected = state.schedule.some(s => s.day === day.id && s.time === time);
                          const isLocked = teacherBookedSlots.has(slotKey(day.id, time));
                          const isLimitReached = !isSlotSelected && state.schedule.length >= state.sessionsPerWeek;
                          const isDisabled = isLocked || isLimitReached;

                          return (
                            <button
                              key={time}
                              disabled={isDisabled}
                              onClick={() => toggleSchedule(day.id, time)}
                              title={isLocked ? t('allocations.slotLocked') : undefined}
                              className={`flex items-center justify-center gap-1 text-xs py-2 px-1 rounded-lg border font-medium transition-all ${
                                isSlotSelected
                                  ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                                  : isLocked
                                    ? 'bg-red-50 border-red-100 text-red-300 cursor-not-allowed'
                                    : isLimitReached
                                      ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed opacity-50'
                                      : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300 hover:bg-primary-50'
                              }`}
                            >
                              {isLocked && <Lock className="h-3 w-3 flex-shrink-0" />}
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingAlloc}
        onClose={() => setDeletingAlloc(null)}
        onCancel={() => setDeletingAlloc(null)}
        onConfirm={confirmDelete}
        title={t('allocations.deleteTitle')}
        message={t('allocations.deleteMessage')}
        confirmText={t('common.delete')}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}

export default AllocationsPage;
