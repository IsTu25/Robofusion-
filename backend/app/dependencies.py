from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from app.config import settings
from app.auth import TokenData
from app.db import get_db
import asyncpg
from typing import Optional

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

class UserContext:
    def __init__(self, id: int, username: str, role: str):
        self.id = id
        self.username = username
        self.role = role

async def get_current_user(token: str = Depends(oauth2_scheme), db: asyncpg.Connection = Depends(get_db)) -> UserContext:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = await db.fetchrow("SELECT id, username, role FROM users_roles WHERE username = $1", username)
    if user is None:
        raise credentials_exception
    return UserContext(id=user['id'], username=user['username'], role=user['role'])

async def require_admin(user: UserContext = Depends(get_current_user)) -> UserContext:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return user
