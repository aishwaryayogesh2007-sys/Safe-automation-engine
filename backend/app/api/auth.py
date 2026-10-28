import logging
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import verify_password, create_access_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import Token, UserLogin, UserResponse
from app.services.audit_service import audit_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
def login(
    login_data: UserLogin = Body(None),
    form_data: OAuth2PasswordRequestForm = Depends(lambda: None),
    db: Session = Depends(get_db),
):
    """Authenticate a user and return a JWT access token."""
    username = None
    password = None

    if form_data is not None and form_data.username:
        username = form_data.username
        password = form_data.password
    elif login_data is not None:
        username = login_data.username
        password = login_data.password

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password must be provided.",
        )

    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        audit_service.log(
            event_type="auth_login_failed",
            db=db,
            details={"attempted_username": username},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_payload = {
        "sub": user.id,
        "username": user.username,
        "role": user.role,
    }
    access_token = create_access_token(
        data=token_payload,
        expires_delta=access_token_expires,
    )

    audit_service.log(
        event_type="auth_login_success",
        db=db,
        actor_id=user.id,
        details={"username": user.username, "role": user.role},
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )
