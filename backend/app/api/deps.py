"""
API dependencies: Authentication, User extraction, and Database session injection.
"""
from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database.session import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)


def get_current_user_optional(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> User:
    """
    Returns authenticated user if JWT token is present,
    or transparently supplies the primary demo user so research & paper trading
    work seamlessly right away without requiring an account creation step first.
    """
    if token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("sub")
            if user_id is not None:
                user = db.query(User).filter(User.id == int(user_id)).first()
                if user and user.is_active:
                    return user
        except jwt.PyJWTError:
            pass

    # Default institutional demo user
    demo_user = db.query(User).filter(User.email == "demo@nexusfin.ai").first()
    if not demo_user:
        from app.core.security import get_password_hash
        demo_user = User(
            email="demo@nexusfin.ai",
            hashed_password=get_password_hash("NexusDemo123!"),
            full_name="Institutional Trader",
            is_active=True,
            is_admin=True,
            virtual_balance=1000000.0
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)
    return demo_user


def get_current_user(
    current_user: User = Depends(get_current_user_optional)
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account.")
    return current_user
