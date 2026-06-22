import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.security import hash_password
from app.features.users.models import User, UserRole, UserStatus
from app.features.users.schemas import UserCreate, UserUpdate


class UserService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all(
        self, limit: int = 20, offset: int = 0, search: Optional[str] = None
    ) -> tuple[list[User], int]:
        query = select(User)
        count_query = select(func.count()).select_from(User)

        if search:
            like = f"%{search}%"
            query = query.where(
                (User.email.ilike(like)) |
                (User.first_name.ilike(like)) |
                (User.last_name.ilike(like))
            )
            count_query = count_query.where(
                (User.email.ilike(like)) |
                (User.first_name.ilike(like)) |
                (User.last_name.ilike(like))
            )

        total_result = await self.session.exec(count_query)
        total = total_result.one()

        query = query.order_by(User.created_at.desc()).limit(limit).offset(offset)
        result = await self.session.exec(query)
        return result.all(), total

    async def get_by_id(self, user_id: uuid.UUID) -> User:
        result = await self.session.exec(select(User).where(User.id == user_id))
        user = result.first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user

    async def create(self, data: UserCreate) -> User:
        # Check uniqueness
        existing = await self.session.exec(
            select(User).where(User.email == data.email)
        )
        if existing.first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Email '{data.email}' is already registered",
            )
            
        # If teacher_id is provided, verify the teacher exists and has TEACHER role
        if data.teacher_id:
            teacher = await self.session.get(User, data.teacher_id)
            if not teacher or teacher.role != UserRole.TEACHER:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid teacher_id or the referenced user is not a teacher",
                )

        user = User(
            email=data.email,
            username=data.username,
            first_name=data.first_name,
            last_name=data.last_name,
            password_hash=hash_password(data.password),
            role=data.role,
            phone_number=data.phone_number,
            country=data.country,
            city=data.city,
            gender=data.gender,
            date_of_birth=data.date_of_birth,
            teacher_id=data.teacher_id,
        )
        self.session.add(user)
        await self.session.flush()

        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def update(self, user_id: uuid.UUID, data: UserUpdate) -> User:
        user = await self.get_by_id(user_id)
        update_data = data.model_dump(exclude_unset=True)
        
        if "teacher_id" in update_data and update_data["teacher_id"] is not None:
            teacher = await self.session.get(User, update_data["teacher_id"])
            if not teacher or teacher.role != UserRole.TEACHER:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid teacher_id or the referenced user is not a teacher",
                )
        
        for field, value in update_data.items():
            setattr(user, field, value)
        self.session.add(user)

        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def delete(self, user_id: uuid.UUID) -> None:
        user = await self.get_by_id(user_id)
        # Soft-delete: suspend instead of hard delete
        user.status = UserStatus.SUSPENDED
        self.session.add(user)
        await self.session.commit()
