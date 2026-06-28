const fs = require('fs');
const targetFile = 'src/features/allocations/pages/AllocationsPage.tsx';
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Fix createAllocation payload
content = content.replace(
  "createAllocation(state).then",
  "createAllocation({ teacher_id: state.teacherId, student_id: state.studentId, sessions_per_week: state.sessionsPerWeek, duration: state.duration, schedule: state.schedule }).then"
);

// 2. Fix first_name -> firstName, last_name -> lastName
content = content.replace(/t\.first_name/g, "t.firstName");
content = content.replace(/t\.last_name/g, "t.lastName");
content = content.replace(/s\.first_name/g, "s.firstName");
content = content.replace(/s\.last_name/g, "s.lastName");
content = content.replace(/teacher\?\.first_name/g, "teacher?.firstName");
content = content.replace(/teacher\?\.last_name/g, "teacher?.lastName");
content = content.replace(/student\?\.first_name/g, "student?.firstName");
content = content.replace(/student\?\.last_name/g, "student?.lastName");

fs.writeFileSync(targetFile, content);
