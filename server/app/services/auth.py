from sqlalchemy.orm import Session
from app.models.user import User
from app.core.auth import get_password_hash
from app.schemas.user import UserCreate

def create_user(db: Session, user: UserCreate) -> User:
    # Temporary developer flow: store plain text password.
    # WARNING: this is extremely insecure and only for short-term local debugging.
    db_user = User(
        email=user.email,
        password=user.password,
        provider=user.provider or "local",
        provider_id=user.provider_id,
        full_name=user.full_name,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()