-- ============================================================
-- SwasthSetu Initial Database Schema
-- Person 4
--
-- Architecture:
--   Supabase Auth -> doctors -> active sessions -> temporary data
--
-- Privacy:
--   Patient-related data is temporary.
--   No permanent patient medical records are stored.
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- DOCTORS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    auth_user_id UUID NOT NULL UNIQUE
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    name VARCHAR(150) NOT NULL,

    email VARCHAR(255) NOT NULL UNIQUE,

    doctor_code VARCHAR(20) NOT NULL UNIQUE,

    qr_value TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- ACTIVE CONSULTATION SESSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    doctor_id UUID NOT NULL
        REFERENCES public.doctors(id)
        ON DELETE CASCADE,

    status VARCHAR(20) NOT NULL DEFAULT 'waiting',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    started_at TIMESTAMPTZ,

    completed_at TIMESTAMPTZ,

    expires_at TIMESTAMPTZ,

    CONSTRAINT active_sessions_status_check
        CHECK (
            status IN (
                'waiting',
                'processing',
                'ready',
                'active',
                'completed',
                'cancelled'
            )
        )
);


-- ============================================================
-- TEMPORARY PATIENT INPUT
-- ============================================================

CREATE TABLE IF NOT EXISTS public.temporary_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id UUID NOT NULL
        REFERENCES public.active_sessions(id)
        ON DELETE CASCADE,

    input_type VARCHAR(10) NOT NULL,

    language VARCHAR(20),

    text_content TEXT,

    audio_reference TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT temporary_inputs_type_check
        CHECK (
            input_type IN ('text', 'voice')
        )
);


-- ============================================================
-- TEMPORARY AI INTAKE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.temporary_intakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id UUID NOT NULL UNIQUE
        REFERENCES public.active_sessions(id)
        ON DELETE CASCADE,

    chief_complaint TEXT,

    symptoms JSONB,

    duration TEXT,

    relevant_history JSONB,

    medications JSONB,

    allergies JSONB,

    possible_symptom_categories JSONB,

    urgency VARCHAR(20),

    confidence JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT temporary_intakes_urgency_check
        CHECK (
            urgency IN ('low', 'moderate', 'high')
        )
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_doctors_doctor_code
    ON public.doctors(doctor_code);

CREATE INDEX IF NOT EXISTS idx_active_sessions_doctor_id
    ON public.active_sessions(doctor_id);

CREATE INDEX IF NOT EXISTS idx_active_sessions_status
    ON public.active_sessions(status);

CREATE INDEX IF NOT EXISTS idx_active_sessions_expires_at
    ON public.active_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_temporary_inputs_session_id
    ON public.temporary_inputs(session_id);

CREATE INDEX IF NOT EXISTS idx_temporary_intakes_session_id
    ON public.temporary_intakes(session_id);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.temporary_inputs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.temporary_intakes ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- DOCTOR POLICIES
-- ============================================================

CREATE POLICY "Doctors can view their own profile"
ON public.doctors
FOR SELECT
TO authenticated
USING (
    (SELECT auth.uid()) = auth_user_id
);


CREATE POLICY "Doctors can update their own profile"
ON public.doctors
FOR UPDATE
TO authenticated
USING (
    (SELECT auth.uid()) = auth_user_id
)
WITH CHECK (
    (SELECT auth.uid()) = auth_user_id
);


-- ============================================================
-- SESSION POLICIES
-- ============================================================

CREATE POLICY "Doctors can view their own sessions"
ON public.active_sessions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.doctors d
        WHERE d.id = active_sessions.doctor_id
        AND d.auth_user_id = (SELECT auth.uid())
    )
);


-- ============================================================
-- TEMPORARY INPUT POLICIES
-- ============================================================

CREATE POLICY "Doctors can view inputs from their sessions"
ON public.temporary_inputs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.active_sessions s
        JOIN public.doctors d
            ON d.id = s.doctor_id
        WHERE s.id = temporary_inputs.session_id
        AND d.auth_user_id = (SELECT auth.uid())
    )
);


-- ============================================================
-- TEMPORARY INTAKE POLICIES
-- ============================================================

CREATE POLICY "Doctors can view intakes from their sessions"
ON public.temporary_intakes
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.active_sessions s
        JOIN public.doctors d
            ON d.id = s.doctor_id
        WHERE s.id = temporary_intakes.session_id
        AND d.auth_user_id = (SELECT auth.uid())
    )
);