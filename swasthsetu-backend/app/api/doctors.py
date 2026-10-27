from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.supabase import supabase_admin


router = APIRouter(
    prefix="/doctors",
    tags=["Doctors"],
)


class DoctorProfileResponse(BaseModel):
    doctor_id: str
    name: str
    email: str
    doctor_code: str
    qr_value: str


class DoctorJoinResponse(BaseModel):
    doctor_id: str
    doctor_name: str
    doctor_code: str
    available: bool


@router.get(
    "/me",
    response_model=DoctorProfileResponse,
)
async def get_current_doctor(
    user=Depends(get_current_user),
):
    doctor_response = (
        supabase_admin
        .table("doctors")
        .select(
            "id, name, email, doctor_code, qr_value"
        )
        .eq("auth_user_id", user.id)
        .limit(1)
        .execute()
    )

    if not doctor_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found.",
        )

    doctor = doctor_response.data[0]

    return DoctorProfileResponse(
        doctor_id=doctor["id"],
        name=doctor["name"],
        email=doctor["email"],
        doctor_code=doctor["doctor_code"],
        qr_value=doctor["qr_value"],
    )


@router.get(
    "/{doctor_code}/join",
    response_model=DoctorJoinResponse,
)
async def get_doctor_for_join(doctor_code: str):
    doctor_response = (
        supabase_admin
        .table("doctors")
        .select(
            "id, name, doctor_code"
        )
        .eq("doctor_code", doctor_code)
        .limit(1)
        .execute()
    )

    if not doctor_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found.",
        )

    doctor = doctor_response.data[0]

    return DoctorJoinResponse(
        doctor_id=doctor["id"],
        doctor_name=doctor["name"],
        doctor_code=doctor["doctor_code"],
        available=True,
    )