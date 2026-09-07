from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.session import get_db
from models.master_user import CellmesMasterUser
from models.user_group import CellmesMasterUserGroup
from core.security import verify_password, create_access_token
from schemas.auth import LoginPayload, LoginResponse, UserTokenData

router = APIRouter(prefix="/auth", tags=["Authentication & Station Login"])

# Maximum allowed failed attempts before locking account
MAX_FAILED_ATTEMPTS = 5

@router.post("/login", response_model=LoginResponse)
def authenticate_user(payload: LoginPayload, db: Session = Depends(get_db)):
    """
    Authenticates shop floor users via user_id and password.
    Tracks failed login attempts, updates last_login_attemt, and returns a signed JWT.
    """
    clean_user_id = payload.user_id.strip()

    # 1. Fetch user joined with user_group details
    user_record = (
        db.query(CellmesMasterUser)
        .filter(CellmesMasterUser.user_id == clean_user_id)
        .first()
    )

    # 2. Check if user exists
    if not user_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication Failed: Invalid user ID or password."
        )

    # 3. Check if account is active
    if user_record.is_active.upper() != "YES":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: User account is inactive. Please contact system administrator."
        )

    # 4. Check if account is locked due to excessive failed attempts
    if user_record.failed_attempt >= MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account Locked: Exceeded maximum allowed failed attempts ({MAX_FAILED_ATTEMPTS}). Contact administrator."
        )

    # 5. Verify password hash
    is_password_valid = verify_password(payload.password, user_record.password_hash)

    if not is_password_valid:
        # Increment failed attempt counter
        user_record.failed_attempt += 1
        db.commit()

        remaining_attempts = MAX_FAILED_ATTEMPTS - user_record.failed_attempt
        if remaining_attempts <= 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account Locked: Invalid password. Account locked due to {MAX_FAILED_ATTEMPTS} failed attempts."
            )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication Failed: Invalid user ID or password. ({remaining_attempts} attempts remaining before lock)"
        )

    # 6. Fetch user group name
    group_record = (
        db.query(CellmesMasterUserGroup)
        .filter(CellmesMasterUserGroup.id == user_record.user_group)
        .first()
    )
    group_name_str = group_record.group_name if group_record else "UNKNOWN"

    # 7. Reset failed attempts & Update login timestamp
    current_time = datetime.now()
    user_record.failed_attempt = 0
    user_record.last_login_attemt = current_time
    db.commit()

    # 8. Generate JWT Token
    jwt_payload = {
        "sub": user_record.user_id,
        "user_id_num": user_record.id,
        "user_group": user_record.user_group,
        "group_name": group_name_str,
        "user_name": user_record.user_name
    }
    token_str = create_access_token(data=jwt_payload)

    # 9. Return login response payload
    return LoginResponse(
        status="SUCCESS",
        message="Authentication successful. Welcome to BAT-MES Terminal.",
        access_token=token_str,
        token_type="bearer",
        user=UserTokenData(
            id=user_record.id,
            user_id=user_record.user_id,
            user_name=user_record.user_name,
            user_group_id=user_record.user_group,
            group_name=group_name_str
        ),
        processed_at=current_time
    )