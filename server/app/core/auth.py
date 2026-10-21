from datetime import datetime, timedelta, UTC
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_postgres_db
from app.models.user import User
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# bcrypt only looks at the first 72 BYTES of a password. Newer bcrypt releases
# raise instead of truncating silently, so signup rejects longer passwords up
# front and verify_password() treats them as "cannot match".
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_BYTES = 72

# bcrypt is called directly (not through passlib): passlib 1.7.4 crashes on
# import-time self-checks with bcrypt >= 4.1 / 5.x. Hashes keep the standard
# "$2b$..." format, so they stay readable by passlib if that is ever restored.


def get_password_hash(password: str) -> str:
    data = password.encode("utf-8")
    if len(data) > MAX_PASSWORD_BYTES:
        raise ValueError(f"password cannot be longer than {MAX_PASSWORD_BYTES} bytes")
    return bcrypt.hashpw(data, bcrypt.gensalt()).decode("ascii")


def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    if not plain_password or not hashed_password:
        return False
    data = plain_password.encode("utf-8")
    if len(data) > MAX_PASSWORD_BYTES:
        return False  # can never have been stored, so can never match
    try:
        return bcrypt.checkpw(data, hashed_password.encode("utf-8"))
    except ValueError:
        # Stored value is not a valid bcrypt hash (e.g. a plaintext row that
        # the migration script has not converted yet) -> never a match.
        return False


# Verified against when the account does not exist / has no password, so a
# failed login takes about as long either way (no email-enumeration by timing).
_DUMMY_HASH = bcrypt.hashpw(b"not-a-real-password", bcrypt.gensalt()).decode("ascii")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def authenticate_user(db: Session, email: str, password: str):
    user = db.query(User).filter(User.email == email, User.is_active == True).first()
    if user is None or not user.password:
        # Unknown email, or a social-login account that has no password.
        verify_password(password, _DUMMY_HASH)
        return False
    if not verify_password(password, user.password):
        return False
    return user


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_postgres_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.email == email, User.is_active == True).first()
    if user is None:
        raise credentials_exception
    return user
