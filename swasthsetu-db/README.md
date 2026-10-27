# SwasthSetu Database

Database foundation for SwasthSetu.

## Ownership

Person 4 — Hospital/Admin + Integration

## Core entities

- Doctor
- ActiveSession
- TemporaryInput
- TemporaryIntake

## Privacy

Patient-related data is temporary and must not be retained after a
consultation session ends.

The database must not be used as a permanent patient medical-record system.

## Doctor identity

Each doctor has:

- doctor ID
- unique doctor code
- QR value

The QR/code identifies the doctor directly.

There is no hospital classification in the MVP.

## Cleanup

When a session is completed or cancelled:

1. Temporary patient input is deleted.
2. Temporary AI intake is deleted.
3. Temporary audio/storage references are cleaned.
4. Remaining session data is removed according to the final cleanup policy.

Cleanup must be verified during privacy testing.