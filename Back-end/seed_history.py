import asyncio
import uuid
import sys
import os

from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, SQLModel

# Add Back-end to path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.features.users.models import User, UserRole, Complaint, TeacherHistory, SessionScore, ComplaintStatus
from datetime import datetime, timedelta

async def seed_data():
    engine = create_async_engine(settings.database_url)
    
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    async with AsyncSession(engine) as session:
        # Get students
        students_result = await session.exec(select(User).where(User.role == UserRole.STUDENT))
        students = students_result.all()
        
        # Get teachers
        teachers_result = await session.exec(select(User).where(User.role == UserRole.TEACHER))
        teachers = teachers_result.all()
        
        if not students or not teachers:
            print("Need at least 1 student and 1 teacher to seed data")
            return
            
        student = students[0]
        teacher = teachers[0]
        
        # 1. Seed Complaints
        c1 = Complaint(
            user_id=student.id,
            teacher_id=teacher.id,
            subject="Audio quality issues",
            description="The audio was very crackly during the last session.",
            status=ComplaintStatus.RESOLVED,
            created_at=datetime.utcnow() - timedelta(days=5),
            resolved_at=datetime.utcnow() - timedelta(days=4)
        )
        c2 = Complaint(
            user_id=student.id,
            teacher_id=None,
            subject="Cannot access webinar",
            description="The webinar link is broken.",
            status=ComplaintStatus.OPEN,
            created_at=datetime.utcnow() - timedelta(days=1),
        )
        session.add_all([c1, c2])
        
        # 2. Seed Teacher History
        th1 = TeacherHistory(
            student_id=student.id,
            teacher_id=teacher.id,
            assigned_at=datetime.utcnow() - timedelta(days=30),
            unassigned_at=datetime.utcnow() - timedelta(days=10),
            reason="Schedule conflict"
        )
        th2 = TeacherHistory(
            student_id=student.id,
            teacher_id=teachers[min(1, len(teachers)-1)].id,
            assigned_at=datetime.utcnow() - timedelta(days=9),
            unassigned_at=None,
            reason=None
        )
        session.add_all([th1, th2])
        
        # 3. Seed Session Scores
        ss1 = SessionScore(
            student_id=student.id,
            teacher_id=teacher.id,
            date=datetime.utcnow() - timedelta(days=12),
            score=95,
            notes="Excellent pronunciation.",
            recitation_type="Tajweed"
        )
        ss2 = SessionScore(
            student_id=student.id,
            teacher_id=teacher.id,
            date=datetime.utcnow() - timedelta(days=20),
            score=82,
            notes="Needs work on Makharij.",
            recitation_type="Memorization"
        )
        session.add_all([ss1, ss2])
        
        await session.commit()
        print("Successfully seeded complaints, teacher history, and session scores!")

if __name__ == "__main__":
    asyncio.run(seed_data())
