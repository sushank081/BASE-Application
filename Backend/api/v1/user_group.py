from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.session import get_db
from models.user_group import CellmesMasterUserGroup
from schemas.user_group import (
    UserGroupCreatePayload,
    UserGroupUpdatePayload,
    UserGroupResponse,
    StandardUserGroupActionResponse
)

router = APIRouter(prefix="/master/user-groups", tags=["User Groups Management"])

# =============================================================================
# 1. GET METHOD: RETRIEVE ALL USER GROUPS
# =============================================================================
@router.get("", response_model=List[UserGroupResponse])
def get_all_user_groups(db: Session = Depends(get_db)):
    """
    Retrieves all user group records from cellmes_master_usergroup table.
    """
    return db.query(CellmesMasterUserGroup).order_by(CellmesMasterUserGroup.id.asc()).all()


# =============================================================================
# 2. POST METHOD: CREATE NEW USER GROUP
# =============================================================================
@router.post("", response_model=StandardUserGroupActionResponse, status_code=status.HTTP_201_CREATED)
def create_user_group(payload: UserGroupCreatePayload, db: Session = Depends(get_db)):
    """
    Creates a new user group using group_name. Automatically defaults is_active to 'YES'.
    """
    clean_group_name = payload.group_name.strip()

    # Check for duplicate group name
    existing_group = (
        db.query(CellmesMasterUserGroup)
        .filter(CellmesMasterUserGroup.group_name.ilike(clean_group_name))
        .first()
    )

    if existing_group:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate Error: User group name '{clean_group_name}' already exists."
        )

    try:
        new_group = CellmesMasterUserGroup(
            group_name=clean_group_name,
            is_active="YES"
        )
        db.add(new_group)
        db.commit()
        db.refresh(new_group)

        return StandardUserGroupActionResponse(
            status="SUCCESS",
            message=f"User group '{clean_group_name}' created successfully.",
            group=UserGroupResponse.model_validate(new_group),
            processed_at=datetime.now()
        )

    except Exception as db_err:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database Exception: Failed to insert user group record. Context: {str(db_err)}"
        )


# =============================================================================
# 3. PATCH METHOD: UPDATE GROUP NAME AND/OR ACTIVE STATUS
# =============================================================================
@router.patch("/{group_id}", response_model=StandardUserGroupActionResponse)
def update_user_group(
    group_id: int, 
    payload: UserGroupUpdatePayload, 
    db: Session = Depends(get_db)
):
    """
    Updates group_name and/or is_active status ('YES'/'NO') for a specific user group by ID.
    """
    target_group = db.query(CellmesMasterUserGroup).filter(CellmesMasterUserGroup.id == group_id).first()

    if not target_group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Query Error: User group record with ID [{group_id}] not found."
        )

    try:
        # 1. Handle group_name update if supplied
        if payload.group_name is not None:
            clean_name = payload.group_name.strip()
            
            # Prevent conflict with another group's name
            name_conflict = (
                db.query(CellmesMasterUserGroup)
                .filter(
                    CellmesMasterUserGroup.group_name.ilike(clean_name),
                    CellmesMasterUserGroup.id != group_id
                )
                .first()
            )
            if name_conflict:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Name Conflict: Another user group named '{clean_name}' already exists."
                )
            
            target_group.group_name = clean_name

        # 2. Handle is_active status update if supplied
        if payload.is_active is not None:
            target_group.is_active = payload.is_active.upper()

        # Update modification timestamp
        target_group.updation_time = datetime.now()

        db.commit()
        db.refresh(target_group)

        return StandardUserGroupActionResponse(
            status="SUCCESS",
            message=f"User group ID [{group_id}] updated successfully.",
            group=UserGroupResponse.model_validate(target_group),
            processed_at=datetime.now()
        )

    except HTTPException:
        raise
    except Exception as db_err:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database Exception: Failed to update user group record. Context: {str(db_err)}"
        )