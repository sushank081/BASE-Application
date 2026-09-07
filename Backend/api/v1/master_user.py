from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.session import get_db
from models.master_user import CellmesMasterUser
from models.user_group import CellmesMasterUserGroup
from core.security import hash_password
from schemas.master_user import (
    MasterUserCreatePayload,
    MasterUserUpdatePayload,
    MasterUserResponse,
    StandardUserActionResponse
)

router = APIRouter(prefix="/master/users", tags=["Master Users Management"])

# =============================================================================
# 1. GET METHOD: RETRIEVE ALL USERS (WITH group_name RESOLVED)
# =============================================================================
@router.get("", response_model=List[MasterUserResponse])
def get_all_master_users(db: Session = Depends(get_db)):
    """
    Retrieves all user records. Replaces the raw user_group ID with group_name 
    from cellmes_master_usergroup table.
    """
    results = (
        db.query(
            CellmesMasterUser,
            CellmesMasterUserGroup.group_name
        )
        .join(CellmesMasterUserGroup, CellmesMasterUser.user_group == CellmesMasterUserGroup.id)
        .order_by(CellmesMasterUser.id.asc())
        .all()
    )

    formatted_users = []
    for user_obj, group_name_str in results:
        formatted_users.append(
            MasterUserResponse(
                id=user_obj.id,
                user_group=user_obj.user_group,
                group_name=group_name_str,
                user_name=user_obj.user_name,
                user_id=user_obj.user_id,
                email=user_obj.email,
                failed_attempt=user_obj.failed_attempt,
                last_login_attemt=user_obj.last_login_attemt,
                is_active=user_obj.is_active
            )
        )

    return formatted_users


# =============================================================================
# 2. POST METHOD: CREATE NEW USER
# =============================================================================
@router.post("", response_model=StandardUserActionResponse, status_code=status.HTTP_201_CREATED)
def create_master_user(payload: MasterUserCreatePayload, db: Session = Depends(get_db)):
    """
    Creates a new user account. Encrypts the raw password into password_hash via bcrypt.
    """
    clean_user_id = payload.user_id.strip()

    # 1. Validate that target user_group exists
    group_exists = db.query(CellmesMasterUserGroup).filter(CellmesMasterUserGroup.id == payload.user_group).first()
    if not group_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Foreign Key Error: User group ID [{payload.user_group}] does not exist."
        )

    # 2. Check for duplicate user_id
    duplicate_user = db.query(CellmesMasterUser).filter(CellmesMasterUser.user_id.ilike(clean_user_id)).first()
    if duplicate_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate Error: User ID '{clean_user_id}' is already registered."
        )

    try:
        # Hash plain text password securely
        hashed_pw = hash_password(payload.password)

        new_user = CellmesMasterUser(
            user_group=payload.user_group,
            user_name=payload.user_name.strip(),
            user_id=clean_user_id,
            email=payload.email.strip() if payload.email else None,
            password_hash=hashed_pw,
            failed_attempt=0,
            is_active="YES"
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return StandardUserActionResponse(
            status="SUCCESS",
            message=f"User account '{clean_user_id}' created successfully.",
            user=MasterUserResponse(
                id=new_user.id,
                user_group=new_user.user_group,
                group_name=group_exists.group_name,
                user_name=new_user.user_name,
                user_id=new_user.user_id,
                email=new_user.email,
                failed_attempt=new_user.failed_attempt,
                last_login_attemt=new_user.last_login_attemt,
                is_active=new_user.is_active
            ),
            processed_at=datetime.now()
        )

    except Exception as db_err:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database Exception: Failed to create user account. Context: {str(db_err)}"
        )


# =============================================================================
# 3. PATCH METHOD: UPDATE USER DETAILS
# =============================================================================
@router.patch("/{id}", response_model=StandardUserActionResponse)
def update_master_user(
    id: int, 
    payload: MasterUserUpdatePayload, 
    db: Session = Depends(get_db)
):
    """
    Updates user account parameters: user_group, user_name, user_id, email, password, and is_active.
    """
    target_user = db.query(CellmesMasterUser).filter(CellmesMasterUser.id == id).first()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Query Error: User record with ID [{id}] not found."
        )

    try:
        # 1. Update user_group if supplied (Validate foreign key)
        if payload.user_group is not None:
            group_exists = db.query(CellmesMasterUserGroup).filter(CellmesMasterUserGroup.id == payload.user_group).first()
            if not group_exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Foreign Key Error: User group ID [{payload.user_group}] does not exist."
                )
            target_user.user_group = payload.user_group

        # 2. Update user_id if supplied (Check uniqueness)
        if payload.user_id is not None:
            clean_user_id = payload.user_id.strip()
            conflict = db.query(CellmesMasterUser).filter(
                CellmesMasterUser.user_id.ilike(clean_user_id),
                CellmesMasterUser.id != id
            ).first()
            if conflict:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Conflict: Another user with user_id '{clean_user_id}' already exists."
                )
            target_user.user_id = clean_user_id

        # 3. Update user_name if supplied
        if payload.user_name is not None:
            target_user.user_name = payload.user_name.strip()

        # 4. Update email if supplied
        if payload.email is not None:
            target_user.email = payload.email.strip()

        # 5. Update password_hash if new password provided
        if payload.password is not None:
            target_user.password_hash = hash_password(payload.password)

        # 6. Update is_active status if supplied
        if payload.is_active is not None:
            target_user.is_active = payload.is_active.upper()

        db.commit()
        db.refresh(target_user)

        # Fetch joined group_name for response
        resolved_group = db.query(CellmesMasterUserGroup).filter(CellmesMasterUserGroup.id == target_user.user_group).first()

        return StandardUserActionResponse(
            status="SUCCESS",
            message=f"User ID [{id}] updated successfully.",
            user=MasterUserResponse(
                id=target_user.id,
                user_group=target_user.user_group,
                group_name=resolved_group.group_name if resolved_group else "UNKNOWN",
                user_name=target_user.user_name,
                user_id=target_user.user_id,
                email=target_user.email,
                failed_attempt=target_user.failed_attempt,
                last_login_attemt=target_user.last_login_attemt,
                is_active=target_user.is_active
            ),
            processed_at=datetime.now()
        )

    except HTTPException:
        raise
    except Exception as db_err:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database Exception: Failed to update user record. Context: {str(db_err)}"
        )