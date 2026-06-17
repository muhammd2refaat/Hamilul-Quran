/**
 * Allocations Page — manage teacher/student session allocations
 */

import { useState } from 'react';
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
  Calendar as CalendarIcon
} from 'lucide-react';
import { Button, Modal } from '@/shared/components';
import { mockTeacherSubscriptions, mockStudentSubscriptions } from '@/mock-data/subscriptions';

const DAYS_OF_WEEK = [
  { id: 'sun', label: 'Sunday' },
  { id: 'mon', label: 'Monday' },
  { id: 'tue', label: 'Tuesday' },
  { id: 'wed', label: 'Wednesday' },
  { id: 'thu', label: 'Thursday' },
  { id: 'fri', label: 'Friday' },
  { id: 'sat', label: 'Saturday' },
];

const TIME_SLOTS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
  '06:00 PM', '07:00 PM', '08:00 PM'
];

interface AllocationState {
  teacherId: string;
  studentId: string;
  sessionsPerWeek: number;
  duration: 30 | 45 | 60;
  schedule: Array<{ day: string; time: string }>;
}

export function AllocationsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  const [state, setState] = useState<AllocationState>({
    teacherId: '',
    studentId: '',
    sessionsPerWeek: 2,
    duration: 30,
    schedule: []
  });

  const handleNext = () => {
    if (step < 3) setStep((s) => (s + 1) as 1 | 2 | 3);
    else {
      // Final submit
      console.log('Submitted Allocation:', state);
      setIsModalOpen(false);
      setStep(1);
      setState({
        teacherId: '',
        studentId: '',
        sessionsPerWeek: 2,
        duration: 30,
        schedule: []
      });
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3);
  };

  const isStep1Valid = state.teacherId && state.studentId;
  const isStep2Valid = state.sessionsPerWeek > 0;
  const isStep3Valid = state.schedule.length === state.sessionsPerWeek;

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
          <h1 className="text-2xl font-bold text-gray-900">Allocations</h1>
          <p className="text-gray-600 mt-1">
            Manage teacher and student session allocations
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Allocation
        </Button>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
          <PieChart className="w-8 h-8 text-primary-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">No Allocations Found</h3>
        <p className="text-gray-500 mt-2 max-w-sm">
          There are currently no allocations to display in this view.
        </p>
        <Button className="mt-6" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Allocation
        </Button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Allocation"
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-sm font-medium text-gray-500">
              Step {step} of 3
            </div>
            <div className="flex gap-3">
              {step > 1 && (
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="h-4 w-4 mr-2" /> Back
                </Button>
              )}
              <Button 
                onClick={handleNext} 
                disabled={
                  (step === 1 && !isStep1Valid) ||
                  (step === 2 && !isStep2Valid) ||
                  (step === 3 && !isStep3Valid)
                }
              >
                {step === 3 ? 'Confirm Allocation' : 'Next Step'}
                {step < 3 && <ChevronRight className="h-4 w-4 ml-2" />}
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
                  <User className="h-5 w-5 text-primary-600" /> Select Teacher
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[180px] overflow-y-auto pr-2">
                  {mockTeacherSubscriptions.map((t) => (
                    <div 
                      key={t.id}
                      onClick={() => setState({ ...state, teacherId: t.id })}
                      className={`p-4 border rounded-xl cursor-pointer transition-all ${
                        state.teacherId === t.id 
                          ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600' 
                          : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-bold text-gray-900">{t.teacherName}</p>
                      <p className="text-xs text-gray-500 mt-1">Age {t.age} · {t.studentCount} students</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-emerald-600" /> Select Student
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[180px] overflow-y-auto pr-2">
                  {mockStudentSubscriptions.map((s) => (
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
                          <p className="font-bold text-gray-900">{s.studentName}</p>
                          <p className="text-xs text-gray-500 mt-1">Age {s.age} · {s.phone}</p>
                        </div>
                        {s.teacherName && (
                          <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            Current: {s.teacherName.split(' ').slice(-1)[0]}
                          </span>
                        )}
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
                  <CalendarDays className="h-5 w-5 text-indigo-600" /> Sessions Per Week
                </h3>
                <p className="text-sm text-gray-500 mb-4">How many times per week will they meet?</p>
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
                  <Clock className="h-5 w-5 text-amber-500" /> Session Duration
                </h3>
                <p className="text-sm text-gray-500 mb-4">How long is each session?</p>
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
                  <CalendarIcon className="h-5 w-5 text-primary-600" /> Select Schedule
                </h3>
                <div className="text-sm font-medium">
                  Selected <span className="text-primary-600 font-bold">{state.schedule.length}</span> of <span className="font-bold">{state.sessionsPerWeek}</span> slots
                </div>
              </div>

              <div className="grid grid-cols-7 gap-3">
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
                          const isDisabled = !isSlotSelected && state.schedule.length >= state.sessionsPerWeek;

                          return (
                            <button
                              key={time}
                              disabled={isDisabled}
                              onClick={() => toggleSchedule(day.id, time)}
                              className={`text-xs py-2 px-1 rounded-lg border font-medium transition-all ${
                                isSlotSelected
                                  ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                                  : isDisabled
                                    ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed opacity-50'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300 hover:bg-primary-50'
                              }`}
                            >
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
          )}
        </div>
      </Modal>
    </div>
  );
}

export default AllocationsPage;
