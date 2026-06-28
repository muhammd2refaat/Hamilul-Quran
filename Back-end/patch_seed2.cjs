const fs = require('fs');

const targetFile = 'full_seed.py';
let content = fs.readFileSync(targetFile, 'utf8');

const oldC1 = `        # Complaints
        c1 = Complaint(
            user_id=student.id,
            teacher_id=teacher.id,
            subject="Audio quality",
            description="Bad audio",
            status=ComplaintStatus.RESOLVED,
        )
        session.add(c1)`;

const newC1 = `        # Complaints
        c1 = Complaint(
            user_id=student.id,
            about_id=teacher.id,
            complaint_from=ComplaintFrom.STUDENT,
            category=ComplaintCategory.TECHNICAL,
            subject="Audio quality",
            description="Bad audio",
            status=ComplaintStatus.RESOLVED,
        )
        session.add(c1)`;

content = content.replace(oldC1, newC1);
fs.writeFileSync(targetFile, content);
