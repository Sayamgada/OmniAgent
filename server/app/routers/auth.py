from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db  # ABSOLUTE
from app.core.auth import create_access_token, authenticate_user, settings
from app.services.auth import create_user, get_user_by_email
from app.schemas.user import UserCreate, Token, UserOut

from starlette.requests import Request
from starlette.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth

router = APIRouter(prefix="/auth", tags=["auth"])

oauth = OAuth()
oauth.register(
    name='google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    client_kwargs={
        'scope': 'openid email profile'
    }
)

@router.get("/google/login")
async def google_login(request: Request):
    # Using request.url_for dynamically generates the correct callback URL
    # based on how the server is accessed (localhost vs 127.0.0.1).
    redirect_uri = str(request.url_for('google_callback'))
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
        userinfo = token.get('userinfo')
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not userinfo:
        raise HTTPException(status_code=400, detail="Could not fetch user info from Google")
        
    email = userinfo.get("email")
    db_user = get_user_by_email(db, email)
    if not db_user:
        new_user = UserCreate(
            email=email,
            full_name=userinfo.get("name"),
            provider="google",
            provider_id=userinfo.get("sub"),
            password=None
        )
        db_user = create_user(db, new_user)
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": db_user.email}, expires_delta=access_token_expires)
    
    frontend_url = f"http://localhost:5173/oauth/callback?token={access_token}"
    return RedirectResponse(url=frontend_url)

@router.post("/signin", response_model=Token)
def signin(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/signup", response_model=UserOut)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    db_user = get_user_by_email(db, user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return create_user(db, user)

