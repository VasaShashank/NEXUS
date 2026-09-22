"""
Authentication API routes (email/password + optional Google OAuth).
"""
import secrets
from datetime import timedelta
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from jose import jwt
from sqlalchemy.orm import Session
import httpx
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="An account with this email address already exists."
        )
    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        virtual_balance=1000000.0,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(user.id, expires_delta=access_token_expires)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(user: User = Depends(get_current_user)):
    return user


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


def _oauth_configured() -> bool:
    return bool(settings.GOOGLE_OAUTH_CLIENT_ID and settings.GOOGLE_OAUTH_CLIENT_SECRET)


def _oauth_redirect_uri() -> str:
    if settings.GOOGLE_OAUTH_REDIRECT_URI:
        return settings.GOOGLE_OAUTH_REDIRECT_URI
    return "http://localhost:8000/api/v1/auth/oauth/google/callback"


@router.get("/oauth/status")
def oauth_status():
    """Report whether Google OAuth login is configured (public)."""
    return {"provider": "google", "configured": _oauth_configured()}


@router.get("/oauth/google/login")
def oauth_google_login():
    """Start the Google OAuth flow. Returns 503 until OAuth credentials are configured."""
    if not _oauth_configured():
        raise HTTPException(
            status_code=503,
            detail="Google OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET first.",
        )
    state = create_access_token(
        f"oauth-state:{secrets.token_urlsafe(24)}",
        expires_delta=timedelta(minutes=10),
    )
    params = urlencode({
        "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
        "redirect_uri": _oauth_redirect_uri(),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    })
    return RedirectResponse(url=f"{GOOGLE_AUTH_URL}?{params}", status_code=302)


@router.get("/oauth/google/callback")
def oauth_google_callback(code: str = "", state: str = "", db: Session = Depends(get_db)):
    """Exchange the Google authorization code, provision the user, and hand a NEXUS JWT back to the frontend."""
    if not _oauth_configured():
        raise HTTPException(status_code=503, detail="Google OAuth is not configured.")
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing OAuth code or state.")
    try:
        payload = jwt.decode(state, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if not str(payload.get("sub", "")).startswith("oauth-state:"):
            raise ValueError("bad state")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state.")

    try:
        with httpx.Client(timeout=10.0) as client:
            token_resp = client.post(GOOGLE_TOKEN_URL, data={
                "code": code,
                "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                "redirect_uri": _oauth_redirect_uri(),
                "grant_type": "authorization_code",
            })
            token_resp.raise_for_status()
            access_token = token_resp.json().get("access_token")
            if not access_token:
                raise ValueError("no access token")
            userinfo_resp = client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            userinfo_resp.raise_for_status()
            userinfo = userinfo_resp.json()
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=502, detail="Google OAuth exchange failed.")

    subject = str(userinfo.get("sub", ""))
    email = str(userinfo.get("email", "")).lower().strip()
    if not subject or not email:
        raise HTTPException(status_code=502, detail="Google did not return a usable identity.")

    user = db.query(User).filter(
        User.oauth_provider == "google",
        User.oauth_subject == subject,
    ).first()
    if not user:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.oauth_provider = "google"
            user.oauth_subject = subject
            if not user.full_name:
                user.full_name = userinfo.get("name")
        else:
            user = User(
                email=email,
                hashed_password=get_password_hash(secrets.token_urlsafe(32)),
                full_name=userinfo.get("name"),
                is_active=True,
                virtual_balance=1000000.0,
                oauth_provider="google",
                oauth_subject=subject,
            )
            db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account.")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(user.id, expires_delta=access_token_expires)
    # Token travels in the URL fragment (never sent to any server, never logged);
    # the frontend strips it from the address bar immediately after storing it.
    return RedirectResponse(url=f"{settings.FRONTEND_URL}#auth_token={token}", status_code=302)
