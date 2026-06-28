import asyncio
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import SQLModel
from app.core.config import settings
from app.features.users.models import User, UserRole, UserStatus
from app.features.complaints.models import Complaint, ComplaintStatus, ComplaintFrom, ComplaintCategory
from app.features.sessions.models import TeacherHistory, SessionScore
from app.features.allocations.models import Allocation
import bcrypt
from datetime import datetime, timedelta

async def main():
    engine = create_async_engine(settings.database_url, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        
    async with AsyncSession(engine) as session:
        # Create Admin
        admin = User(
            email="admin@qvhealth.com",
            username="admin",
            password_hash=bcrypt.hashpw("Admin@123456".encode(), bcrypt.gensalt()).decode(),
            first_name="Admin",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        # Create Student
        student = User(
            email="student@example.com",
            username="student1",
            password_hash=bcrypt.hashpw("Student123!".encode(), bcrypt.gensalt()).decode(),
            first_name="Test",
            last_name="Student",
            role=UserRole.STUDENT,
            status=UserStatus.ACTIVE
        )
        # Create Teacher
        teacher = User(
            email="teacher@example.com",
            username="teacher1",
            password_hash=bcrypt.hashpw("Teacher123!".encode(), bcrypt.gensalt()).decode(),
            first_name="Test",
            last_name="Teacher",
            role=UserRole.TEACHER,
            status=UserStatus.ACTIVE
        )
        session.add_all([admin, student, teacher])
        await session.commit()
        await session.refresh(student)
        await session.refresh(teacher)
        
        # Complaints
        c1 = Complaint(
            user_id=student.id,
            about_id=teacher.id,
            complaint_from=ComplaintFrom.STUDENT,
            category=ComplaintCategory.TECHNICAL,
            subject="Audio quality",
            description="Bad audio",
            status=ComplaintStatus.RESOLVED,
        )
        session.add(c1)
        
        # History
        th1 = TeacherHistory(
            student_id=student.id,
            teacher_id=teacher.id,
            assigned_at=datetime.utcnow() - timedelta(days=30),
        )
        session.add(th1)
        
        # Scores
        ss1 = SessionScore(
            student_id=student.id,
            teacher_id=teacher.id,
            date=datetime.utcnow() - timedelta(days=12),
            score=95,
        )
        session.add(ss1)
        await session.commit()
        
    print("Database seeded completely.")

if __name__ == "__main__":
    asyncio.run(main())
