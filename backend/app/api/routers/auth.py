"""
api/routers/auth.py
===================
Authentication endpoints for user login/logout.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models import User

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# =============================================================================
# SCHEMAS
# =============================================================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    success: bool
    message: str
    user_id: Optional[int] = None
    email: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    is_active: bool

    class Config:
        from_attributes = True


# =============================================================================
# PASSWORD UTILITIES (simple bcrypt alternative for demo)
# =============================================================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.
    For demo: using simple comparison. In production, use passlib/bcrypt.
    """
    # In production, use: return pwd_context.verify(plain_password, hashed_password)
    # For this demo, we'll do a simple hash comparison
    import hashlib
    hashed_input = hashlib.sha256(plain_password.encode()).hexdigest()
    return hashed_input == hashed_password


def get_password_hash(password: str) -> str:
    """Hash a password."""
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()


# =============================================================================
# LOGIN ENDPOINT
# =============================================================================

@router.post("/login", response_model=LoginResponse)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
) -> LoginResponse:
    """
    Authenticate a user with email and password.
    
    Returns:
        - 200: Login successful
        - 401: Invalid credentials
        - 422: Invalid email format
    """
    try:
        # Fetch user by email
        user = db.query(User).filter(User.email == request.email).first()
        
        # User not found
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Check if user has password set
        if not user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User account is incomplete"
            )
        
        # Verify password
        if not verify_password(request.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is disabled"
            )
        
        return LoginResponse(
            success=True,
            message="Login successful",
            user_id=user.id,
            email=user.email
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # Log the error for debugging
        import logging
        logging.error(f"LOGIN ERROR: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during login"
        )


# =============================================================================
# SEED DEFAULT USER (for demo purposes)
# =============================================================================

@router.post("/seed", include_in_schema=False)
def seed_default_user(db: Session = Depends(get_db)) -> dict:
    """
    Create a default admin user for testing.
    Only creates if no users exist.
    """
    try:
        # Check if any users exist
        existing = db.query(User).first()
        if existing:
            return {"message": "Users already exist, skipping seed"}
        
        # Create default user
        default_user = User(
            email="admin@atlasuniversity.edu.in",
            hashed_password=get_password_hash("password"),
            is_active=True
        )
        db.add(default_user)
        db.commit()
        
        return {
            "message": "Default user created",
            "email": default_user.email,
            "password": "password"
        }
    except Exception as e:
        db.rollback()
        return {"error": str(e)}


# =============================================================================
# GET CURRENT USER (for testing)
# =============================================================================

@router.get("/me", response_model=UserResponse)
def get_me(db: Session = Depends(get_db)) -> UserResponse:
    """Get first user (for testing)."""
    user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=404, detail="No users found")
    return user
