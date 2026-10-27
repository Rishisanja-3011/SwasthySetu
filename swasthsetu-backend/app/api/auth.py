from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr


from app.core.supabase import APP_BASE_URL, supabase, supabase_admin
from app.models.doctor import doctor_record
from app.utils.doctor_code import generate_doctor_code



router = APIRouter(
    prefix="/auth/doctor",
    tags=["Doctor Authentication"],
)


class DoctorRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class DoctorLoginRequest(BaseModel):
    email: EmailStr
    password: str


class DoctorAuthResponse(BaseModel):
    message: str
    doctor_id: str | None = None
    doctor_code: str | None = None
    access_token: str | None = None
    qr_value: str | None = None


def create_unique_doctor_code() -> str:
    """Generate a doctor code that does not already exist."""

    for _ in range(10):
        code = generate_doctor_code()

        result = (
            supabase_admin
            .table("doctors")
            .select("id")
            .eq("doctor_code", code)
            .limit(1)
            .execute()
        )

        if not result.data:
            return code

    raise RuntimeError("Could not generate a unique doctor code.")



@router.post(
    "/register",
    response_model=DoctorAuthResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_doctor(request: DoctorRegisterRequest):
    try:
        auth_response = supabase.auth.sign_up(
            {
                "email": request.email,
                "password": request.password,
            }
        )

        user = auth_response.user

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Doctor account could not be created.",
            )

        doctor_code = create_unique_doctor_code()

        qr_value = f"{APP_BASE_URL}/join/{doctor_code}"

        record = doctor_record(
            auth_user_id=user.id,
            name=request.name,
            email=request.email,
            doctor_code=doctor_code,
            qr_value=qr_value,
        )

        doctor_response = (
            supabase_admin
            .table("doctors")
            .insert(record)
            .execute()
        )

        if not doctor_response.data:
            try:
                supabase_admin.auth.admin.delete_user(user.id)
            except Exception:
                pass

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Doctor profile could not be created.",
            )

        doctor = doctor_response.data[0]

        access_token = None

        if auth_response.session:
            access_token = auth_response.session.access_token

        return DoctorAuthResponse(
            message="Doctor registered successfully.",
            doctor_id=doctor["id"],
            doctor_code=doctor["doctor_code"],
            qr_value=doctor["qr_value"],
            access_token=access_token,
        )

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to create doctor account. Check the supplied details and try again.",
        ) from exc




@router.post(
    "/login",
    response_model=DoctorAuthResponse,
)
async def login_doctor(request: DoctorLoginRequest):
    try:
        auth_response = supabase.auth.sign_in_with_password(
            {
                "email": request.email,
                "password": request.password,
            }
        )

        user = auth_response.user
        session = auth_response.session

        if user is None or session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid doctor credentials.",
            )

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

        return DoctorAuthResponse(
            message="Doctor login successful.",
            doctor_id=doctor["id"],
            doctor_code=doctor["doctor_code"],
            qr_value=doctor["qr_value"],
            access_token=session.access_token,
        )

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid doctor credentials.",
        ) from exc
