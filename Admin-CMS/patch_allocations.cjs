const fs = require('fs');
const targetFile = 'src/features/allocations/pages/AllocationsPage.tsx';
let content = fs.readFileSync(targetFile, 'utf8');

// Imports
content = content.replace(
  "import { mockTeacherSubscriptions, mockStudentSubscriptions } from '@/mock-data/subscriptions';",
  "import { useAllocationsStore } from '../store/allocationsStore';\nimport { useUsersStore } from '@/features/users/store/usersStore';\nimport { useEffect } from 'react';"
);

// Hooks
content = content.replace(
  "  const [step, setStep] = useState<1 | 2 | 3>(1);",
  `  const [step, setStep] = useState<1 | 2 | 3>(1);
  const { allocations, fetchAllocations, createAllocation } = useAllocationsStore();
  const { users, fetchUsers } = useUsersStore();

  useEffect(() => {
    fetchAllocations();
    fetchUsers();
  }, [fetchAllocations, fetchUsers]);

  const teachers = users.filter(u => u.role === 'TEACHER');
  const students = users.filter(u => u.role === 'STUDENT');`
);

// Submit handler
content = content.replace(
  "      console.log('Submitted Allocation:', state);\n      setIsModalOpen(false);\n      setStep(1);\n      setState({\n        teacherId: '',\n        studentId: '',\n        sessionsPerWeek: 2,\n        duration: 30,\n        schedule: []\n      });",
  `      createAllocation({ teacher_id: state.teacherId, student_id: state.studentId, sessions_per_week: state.sessionsPerWeek, duration: state.duration, schedule: state.schedule }).then(() => {
        setIsModalOpen(false);
        setStep(1);
        setState({ teacherId: '', studentId: '', sessionsPerWeek: 2, duration: 30, schedule: [] });
      });`
);

// Map teachers
content = content.replace("mockTeacherSubscriptions.map((t) => (", "teachers.map((t) => (");
content = content.replace("<p className=\"font-bold text-gray-900\">{t.teacherName}</p>", "<p className=\"font-bold text-gray-900\">{t.firstName} {t.lastName}</p>");
content = content.replace("<p className=\"text-xs text-gray-500 mt-1\">Age {t.age} · {t.studentCount} students</p>", "<p className=\"text-xs text-gray-500 mt-1\">{t.email}</p>");

// Map students
content = content.replace("mockStudentSubscriptions.map((s) => (", "students.map((s) => (");
content = content.replace("<p className=\"font-bold text-gray-900\">{s.studentName}</p>", "<p className=\"font-bold text-gray-900\">{s.firstName} {s.lastName}</p>");
content = content.replace("<p className=\"text-xs text-gray-500 mt-1\">Age {s.age} · {s.phone}</p>", "<p className=\"text-xs text-gray-500 mt-1\">{s.email}</p>");

// Remove teacherName sub-element
content = content.replace("{s.teacherName && (\n                          <span className=\"text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-full\">\n                            Current: {s.teacherName.split(' ').slice(-1)[0]}\n                          </span>\n                        )}", "");

// Replace empty state
const noAllocationsDiv = `<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
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
      </div>`;

const allocationsList = `{allocations.length === 0 ? (
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
                   {alloc.sessions_per_week}x / week
                 </span>
               </div>
               <div className="border-t border-gray-100 pt-4 mt-4 space-y-2">
                 <p className="text-sm text-gray-600 flex items-center gap-2"><Clock className="h-4 w-4" /> {alloc.duration} minutes</p>
                 <div className="flex flex-wrap gap-2 mt-2">
                   {alloc.schedule.map((s, idx) => (
                     <span key={idx} className="bg-gray-100 text-gray-700 text-[10px] font-semibold px-2 py-1 rounded border border-gray-200">
                       {s.day.toUpperCase()} {s.time}
                     </span>
                   ))}
                 </div>
               </div>
             </div>
           );
        })}
      </div>
)}`;

content = content.replace(noAllocationsDiv, allocationsList);
fs.writeFileSync(targetFile, content);
