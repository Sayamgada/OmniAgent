from datetime import timedelta
from urllib.parse import urlencode

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from starlette.requests import Request
from starlette.responses import RedirectResponse

from app.core.auth import (
    MAX_PASSWORD_BYTES,
    MIN_PASSWORD_LENGTH,
    authenticate_user,
    create_access_token,
    settings,
)
from app.database import get_postgres_db
from app.schemas.user import Token, UserCreate, UserOut, UserSignup
from app.services.auth import create_user, get_user_by_email

router = APIRouter(prefix="/auth", tags=["auth"])

oauth = OAuth()
oauth.register(
    name="google",
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    client_kwargs={"scope": "openid email profile"},
)


def _frontend() -> str:
    return settings.FRONTEND_BASE_URL.rstrip("/")


def _login_error(msg: str) -> RedirectResponse:
    # Errors go back to the UI sign-in page instead of showing raw JSON on :8000
    return RedirectResponse(f"{_frontend()}/sign-in?{urlencode({'error': msg})}")


def _issue_token(user) -> str:
    return create_access_token(
        data={"sub": user.email, "full_name": user.full_name},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


@router.get("/google/login")
async def google_login(request: Request):
    # url_for builds the callback URL from how the server is being accessed
    # (localhost vs 127.0.0.1).
    redirect_uri = str(request.url_for("google_callback"))
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_postgres_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception:
        return _login_error("Google sign-in failed. Please try again.")

    userinfo = token.get("userinfo")
    if not userinfo:
        return _login_error("Could not fetch your details from Google.")

    email = userinfo.get("email")
    google_sub = userinfo.get("sub")
    if not email or not google_sub:
        return _login_error("Google did not return an email address.")
    # An email Google has not verified proves nothing about who owns it.
    if userinfo.get("email_verified") not in (True, "true"):
        return _login_error("Your Google email address is not verified.")

    db_user = get_user_by_email(db, email)

    if not db_user:
        # No account yet -> sign up via Google
        db_user = create_user(
            db,
            UserCreate(
                email=email,
                full_name=userinfo.get("name"),
                provider="google",
                provider_id=google_sub,
                password=None,
            ),
        )
    else:
        # Account exists -> sign in via Google
        if not db_user.is_active:
            return _login_error("This account has been deactivated.")

        if not db_user.provider_id:
            # Existing email/password account, first Google login: link Google
            # to it. Password and provider are left untouched so both sign-in
            # methods keep working.
            # NOTE: signup does not verify email ownership, so someone could
            # have pre-registered this email with their own password. Accepted
            # trade-off for the project; fix by adding email verification at signup.
            db_user.provider_id = google_sub
            if not db_user.full_name:
                db_user.full_name = userinfo.get("name")
            db.commit()
        elif db_user.provider_id != google_sub:
            return _login_error(
                "This email is already linked to a different Google account."
            )

    return RedirectResponse(
        f"{_frontend()}/oauth/callback?token={_issue_token(db_user)}"
    )


@router.post("/signin", response_model=Token)
def signin(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_postgres_db),
):
    user = get_user_by_email(db, form_data.username)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="No account found with this email. Please sign up first.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=403, detail="This account has been deactivated."
        )
    if not user.password:
        # Google-only account (created via Google, never had a password)
        raise HTTPException(
            status_code=400,
            detail="This account uses Google sign-in. Please continue with Google.",
        )
    if not authenticate_user(db, form_data.username, form_data.password):
        raise HTTPException(status_code=401, detail="Incorrect password.")

    return {"access_token": _issue_token(user), "token_type": "bearer"}


@router.post("/signup", response_model=UserOut)
def signup(user: UserSignup, db: Session = Depends(get_postgres_db)):
    if not user.password or len(user.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters",
        )
    if len(user.password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Password must be at most {MAX_PASSWORD_BYTES} bytes",
        )
    db_user = get_user_by_email(db, user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    # Build the internal model ourselves: provider is always "local" here.
    return create_user(
        db,
        UserCreate(
            email=user.email,
            full_name=user.full_name,
            password=user.password,
            provider="local",
            provider_id=None,
        ),
    )
