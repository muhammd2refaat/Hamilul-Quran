const fs = require('fs');

const targetFile = 'full_seed.py';
let content = fs.readFileSync(targetFile, 'utf8');

// Replace the old Complaint mock data
content = content.replace(/from app\.features\.complaints\.models import Complaint, ComplaintStatus/g, 'from app.features.complaints.models import Complaint, ComplaintStatus, ComplaintFrom, ComplaintCategory');

const oldComplaintData = `    # Complaints
    complaints = [
        Complaint(
            user_id=student.id,
            teacher_id=teacher.id,
            subject="Teacher was late",
            description="The teacher was 15 minutes late to the session without prior notice.",
            status=ComplaintStatus.OPEN
        ),
        Complaint(
            user_id=student.id,
            teacher_id=teacher.id,
            subject="Audio issues",
            description="Could not hear the teacher clearly during the recitation.",
            status=ComplaintStatus.RESOLVED,
            resolved_at=datetime.utcnow()
        )
    ]`;

const newComplaintData = `    # Complaints
    complaints = [
        Complaint(
            user_id=student.id,
            about_id=teacher.id,
            complaint_from=ComplaintFrom.STUDENT,
            category=ComplaintCategory.LATE_SESSION,
            subject="Teacher was late",
            description="The teacher was 15 minutes late to the session without prior notice.",
            status=ComplaintStatus.OPEN
        ),
        Complaint(
            user_id=student.id,
            about_id=teacher.id,
            complaint_from=ComplaintFrom.STUDENT,
            category=ComplaintCategory.TECHNICAL,
            subject="Audio issues",
            description="Could not hear the teacher clearly during the recitation.",
            status=ComplaintStatus.RESOLVED,
            admin_note="We tested the server and it seems fine now.",
            resolved_at=datetime.utcnow()
        ),
        Complaint(
            user_id=teacher.id,
            about_id=student.id,
            complaint_from=ComplaintFrom.TEACHER,
            category=ComplaintCategory.BEHAVIOUR,
            subject="Student was not paying attention",
            description="Student was distracted and playing games during the session.",
            status=ComplaintStatus.IN_REVIEW
        )
    ]`;

content = content.replace(oldComplaintData, newComplaintData);
fs.writeFileSync(targetFile, content);
