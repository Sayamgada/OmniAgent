from sqlalchemy.orm import Session
from app.models.user import User
from app.core.auth import get_password_hash
from app.schemas.user import UserCreate


def create_user(db: Session, user: UserCreate) -> User:
    # Social-login users (e.g. Google) arrive with password=None and keep None.
    db_user = User(
        email=user.email,
        password=get_password_hash(user.password) if user.password else None,
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
