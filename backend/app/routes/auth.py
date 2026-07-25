from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
import asyncpg
from app.db import get_db
from app.auth import verify_password, create_access_token, Token
from app.dependencies import get_current_user, UserContext

router = APIRouter()

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: asyncpg.Connection = Depends(get_db)):
    user = await db.fetchrow("SELECT id, username, password_hash, role FROM users_roles WHERE username = $1", form_data.username)
    if not user or not verify_password(form_data.password, user['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user['username'], "role": user['role']}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/refresh", response_model=Token)
async def refresh_token(current_user: UserContext = Depends(get_current_user)):
    access_token = create_access_token(
        data={"sub": current_user.username, "role": current_user.role}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
async def read_users_me(current_user: UserContext = Depends(get_current_user)):
    return {"id": current_user.id, "username": current_user.username, "role": current_user.role}
