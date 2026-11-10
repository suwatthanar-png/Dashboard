# Security Specification — Training Satisfaction Survey & Live Dashboard

## 1. Data Invariants
1. **Anonymous by Design (Zero PII)**: No names, emails, phone numbers, or user accounts are collected or stored.
2. **One Submission Per Device**: Each response document ID is the client-generated `deviceId` (`^[a-zA-Z0-9_-]{8,64}$`). `update` and `delete` are strictly denied (`if false`), so once a device submits, it cannot overwrite or delete its response or another device's response.
3. **Strict Schema & Bounded Payloads**: Every `SurveyResponse` document must contain exactly `['deviceId', 'surveyKey', 'q1', 'q2', 'q3', 'q4', 'q5', 'comment', 'createdAt']`. No shadow fields are permitted.
4. **Score Range Integrity**: `q1` through `q5` must be integers strictly between `1` and `5`.
5. **Text Boundary**: `comment` must be a string with length `<= 500` characters.
6. **Temporal Integrity**: `createdAt` must equal `request.time` (server timestamp).
7. **Scoped Queries**: `allow list` enforces `resource.data.surveyKey == 'default-training'` so queries must scope to the active survey key.

## 2. Adversarial Payloads ("Dirty Dozen")
1. **Shadow Field Injection**: `{ ..., isAdmin: true }` -> Rejected by `hasOnly(...)`.
2. **Out-of-Range Score (High)**: `{ ..., q1: 6 }` -> Rejected by `q1 >= 1 && q1 <= 5`.
3. **Out-of-Range Score (Zero/Negative)**: `{ ..., q3: 0 }` -> Rejected by `q3 >= 1 && q3 <= 5`.
4. **Float Score**: `{ ..., q2: 4.5 }` -> Rejected by `is int`.
5. **String Score**: `{ ..., q5: "5" }` -> Rejected by `is int`.
6. **Oversized Comment (DoW)**: `{ ..., comment: "A".repeat(501) }` -> Rejected by `comment.size() <= 500`.
7. **Mismatched Device ID**: Document path `/responses/device_abc12345` with `{ deviceId: "other_device123" }` -> Rejected by `incoming().deviceId == deviceId`.
8. **Path Poisoning (Long/Invalid ID)**: Document path `/responses/bad!id` or 200-char ID -> Rejected by `isValidId(deviceId)`.
9. **Spoofed Timestamp**: `{ ..., createdAt: new Date("2020-01-01") }` -> Rejected by `createdAt == request.time`.
10. **Missing Required Field**: Payload omitting `q4` -> Rejected by `hasAll(...)`.
11. **Overwrite / Tamper Attempt**: `updateDoc` on an existing `/responses/{deviceId}` -> Rejected by `allow update: if false`.
12. **Delete Attempt**: `deleteDoc` on `/responses/{deviceId}` -> Rejected by `allow delete: if false`.
