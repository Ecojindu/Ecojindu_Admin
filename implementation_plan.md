# Connect AI to Ecojindu Dashboard

This document details the architectural changes required across the Ecojindu microservices to achieve the three main goals:
1. Sync WhatsApp AI orders to the admin dashboard.
2. Allow admins to manually send payment links and tickets from the dashboard.
3. Save and display all AI chat sessions in a new dashboard tab.

## User Review Required

> [!IMPORTANT]
> **Manual Payment Links**: By default, the system might automatically send payment links upon booking creation. If we introduce manual sending by admins, do you want to disable automatic payment links for WhatsApp bookings entirely, or should this be a fallback? 
> 
> **Chat Session Storage**: We will store the AI chat logs in the central Postgres database managed by `Econjindo-Backend`. This means the `Ecojindu_ai` bot will need to make an API call to save the chat history after each message. Does this sound good?

## Proposed Changes

### Ecojindu-Backend (Postgres DB & API)

This is the central source of truth. We need to expand it to store chat sessions and handle manual payment link triggers.

#### [NEW] `app/models/ai_session.py`
- Create a new SQLAlchemy model `AISession` to store `session_id`, `customer_phone`, `chat_history` (JSONB), and timestamps.

#### [NEW] `alembic/versions/..._add_ai_sessions_table.py`
- Generate an Alembic migration for the new `ai_sessions` table.

#### [MODIFY] `app/api/v1/admin.py` (or new router `ai_sessions.py`)
- Add `GET /v1/admin/ai-sessions` to fetch a list of all AI chat sessions.
- Add `GET /v1/admin/ai-sessions/{id}` to fetch a specific chat transcript.

#### [MODIFY] `app/api/v1/bookings.py`
- Expose a new admin endpoint `POST /v1/admin/bookings/{ref}/send-payment-link` that generates the Paystack checkout link and uses the notification service (SMS/Email) to send it to the passenger.

---

### Ecojindu_ai (The AI Bot)

The AI bot needs to persist its in-memory sessions to the backend and ensure bookings are properly tagged.

#### [MODIFY] `api_client.py`
- Add a new function `sync_chat_session(session_id, phone, history)` that sends an HTTP POST to `Ecojindu-Backend` to save the chat state.
- Ensure `create_booking()` passes `"channel": "whatsapp"` in the payload so the dashboard can correctly label the source.

#### [MODIFY] `bot_logic.py`
- Update `handle_incoming_message` to call `sync_chat_session()` every time a new message is appended to the history, ensuring the dashboard has real-time (or near real-time) visibility into the chat.

---

### Ecojindu-Admin (The Next.js Dashboard)

The frontend needs a new tab for chat logs and a button to trigger payment links.

#### [NEW] `src/app/(ops)/ai-sessions/page.tsx`
- Create a new datatable page listing all AI chat sessions, sortable by date and phone number.

#### [NEW] `src/app/(ops)/ai-sessions/[id]/page.tsx` (or a Drawer component)
- A chat transcript view that renders the JSONB `chat_history` in a WhatsApp-style UI (user bubbles on the right, AI bubbles on the left).

#### [MODIFY] `src/app/(ops)/bookings/page.tsx` (or the booking detail drawer)
- Add a **"Send Payment Link"** button in the booking detail drawer. When clicked, it will hit the new `POST /v1/admin/bookings/{ref}/send-payment-link` backend endpoint.
- Ensure the table correctly displays the `whatsapp` channel icon/badge for bookings made via the AI.

#### [MODIFY] `src/components/app-shell.tsx`
- Add the new "AI Sessions" route to the primary operations sidebar navigation.

## Verification Plan

### Automated Tests
- Run `pytest` in `Econjindo-Backend` to verify the new `ai_sessions` endpoints and the manual payment link endpoint.

### Manual Verification
- Start the `Econjindo-Backend`, `Ecojindu-Admin`, and `Ecojindu_ai` locally.
- Send a message via the WhatsApp bot mock endpoint to trigger a conversation.
- Open the Admin dashboard, navigate to "AI Sessions", and verify the chat log appears and updates in real-time.
- Complete a booking via the AI.
- Open the Admin dashboard, find the new booking, and click "Send Payment Link".
- Verify the SMS/Email logs in the backend show the payment link was dispatched.
