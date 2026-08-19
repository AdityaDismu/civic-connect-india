# Civic Resolve

Build a FULLY FUNCTIONAL full-stack hackathon prototype called:

# CivicPulse AI

Tagline:

"REPORT IT. PRIORITIZE IT. TRACK IT. VERIFY IT."

Do NOT build this as a static UI mockup.

This must be a REAL WORKING APPLICATION with:

- real authentication

- real database

- real complaint creation

- real image uploads

- real AI processing

- real complaint IDs

- real status changes

- real community support

- real admin workflow

- real evidence uploads

- real citizen verification

- real map data

- real notifications

The entire citizen → admin → resolution → citizen verification workflow must actually work.

====================================================

1. PRODUCT VISION

====================================================

CivicPulse AI is an intelligent civic issue reporting and resolution platform.

Citizens can report:

- potholes

- garbage overflow

- drainage problems

- water leakage

- broken streetlights

- damaged footpaths

- open manholes

- fallen trees

- other civic infrastructure problems

Instead of making citizens figure out:

"Which government department do I contact?"

CivicPulse handles the intelligence layer.

The system:

REPORT

→ AI UNDERSTANDS

→ DUPLICATE CHECK

→ PRIORITIZE

→ ROUTE

→ AUTHORITY ACTION

→ LIVE TRACKING

→ RESOLUTION EVIDENCE

→ AI ASSESSMENT

→ CITIZEN VERIFICATION

→ VERIFIED RESOLUTION

This is NOT just a complaint submission portal.

The core innovation is:

AI Vision

+

Community Intelligence

+

Explainable Priority Scoring

+

Duplicate Detection

+

Location Intelligence

+

Live Resolution Tracking

+

Proof-Based Resolution

+

Citizen Verification

====================================================

2. MOST IMPORTANT REQUIREMENT

====================================================

DO NOT create fake dashboards.

DO NOT create fake statistics.

DO NOT create fake graphs.

DO NOT create fake complaint counts.

DO NOT create fake "10,000 users" numbers.

DO NOT use hardcoded complaint records as the main application data.

Every important piece of information must come from the database.

If demo data is necessary, create a SMALL clearly identifiable demo dataset.

The application should work from an empty database too.

We want a prototype that BEHAVES like a real civic platform, not one that merely LOOKS like one.

====================================================

3. TECH STACK

====================================================

Use a modern Lovable-compatible full-stack architecture.

Preferred:

Frontend:

- React

- TypeScript

- Tailwind CSS

- shadcn/ui

- React Router

- Lucide icons

Backend/data:

- Supabase

- PostgreSQL

- Supabase Auth

- Supabase Storage

- Row Level Security

AI:

- Google Gemini API

Maps:

- Leaflet / React Leaflet

- OpenStreetMap

Use Supabase Edge Functions or secure server-side functions for Gemini API calls.

CRITICAL:

NEVER expose the Gemini API key in frontend code.

Use environment/secrets.

====================================================

4. USER ROLES

====================================================

There are exactly TWO roles:

CITIZEN

ADMIN

Citizen:

- register

- login

- report issues

- upload images

- use AI analysis

- edit AI-generated description

- select location

- submit complaints

- receive complaint ID

- track complaints

- view map

- support community complaints

- receive notifications

- view evidence

- verify resolution

- reject resolution

- reopen issues

Admin:

- login

- view action queue

- view complaints

- view AI analysis

- view priority score

- view map

- assign department

- change complaint status

- upload work evidence

- upload resolution evidence

- submit resolution

- view citizen verification

- handle reopened complaints

- view escalations

- view civic hotspots

Use role-based route protection.

====================================================

5. DATABASE

====================================================

Create a proper relational Supabase/PostgreSQL schema.

Core tables:

profiles

departments

complaints

complaint_images

ai_analyses

status_history

assignments

community_support

resolution_evidence

citizen_verifications

notifications

escalations

hotspots

Relationships must be real.

Use foreign keys.

Use timestamps.

Use constraints.

Community support must have a unique constraint:

ONE USER CAN SUPPORT A PARTICULAR COMPLAINT ONLY ONCE.

====================================================

6. PROFILES

====================================================

profiles:

id

user_id

full_name

email

role

created_at

role:

CITIZEN

ADMIN

Never allow a citizen to access admin data.

Use Supabase Row Level Security.

====================================================

7. COMPLAINT TABLE

====================================================

complaints should contain at minimum:

id

display_id

user_id

title

description

category

severity

status

latitude

longitude

priority_score

priority_breakdown

suggested_department

created_at

updated_at

Complaint ID should look like:

CP-2026-00001

Generate it automatically.

====================================================

8. COMPLAINT STATUS

====================================================

Use a real status lifecycle:

SUBMITTED

AI_VERIFIED

ASSIGNED

IN_PROGRESS

RESOLUTION_SUBMITTED

CITIZEN_VERIFICATION

RESOLVED

REOPENED

ESCALATED

Every status change MUST create a status_history record.

Never simply overwrite the status without recording history.

====================================================

9. CITIZEN REPORTING FLOW

====================================================

This is the MOST IMPORTANT user journey.

Create a beautiful multi-step reporting experience.

STEP 1 — UPLOAD

Large upload area:

"Upload a photo of the civic issue"

Support:

- JPG

- PNG

- WEBP

Allow camera/mobile upload where available.

After upload:

show preview.

====================================================

10. AI IMAGE ANALYSIS

====================================================

Send the uploaded image securely to Gemini.

Gemini should analyze the image and return structured information:

issue_type

category

severity

risk

description

suggested_department

confidence

Example:

Pothole detected

Category:

Road Infrastructure

Severity:

HIGH

Risk:

Road safety

Suggested Department:

Road Maintenance

Description:

"Large pothole detected on the roadway that may pose a safety risk to vehicles and two-wheelers."

Do NOT automatically submit the report.

The citizen must review the AI result.

Show:

"AI detected this issue"

and allow:

EDIT DESCRIPTION

CHANGE CATEGORY

CHANGE SEVERITY

CONTINUE

If Gemini is unavailable:

show a graceful error and allow manual reporting.

Never fabricate AI results.

====================================================

11. LOCATION

====================================================

Use browser geolocation when permission is granted.

Show an interactive map.

Place a marker at the detected location.

Allow the user to drag the marker.

Show:

"Is this the correct location?"

The user confirms before submission.

Store latitude and longitude in the database.

====================================================

12. DUPLICATE DETECTION

====================================================

Before final submission:

check nearby complaints using:

- geographic proximity

- category

- description similarity where practical

If a similar complaint exists:

show:

"Potential similar issue found nearby"

Example:

Pothole reported

43m away

Complaint:

CP-2026-00017

Status:

IN PROGRESS

Buttons:

[ VIEW EXISTING ISSUE ]

[ SUPPORT EXISTING ISSUE ]

[ REPORT AS NEW ]

Do NOT automatically reject the new report.

====================================================

13. FINAL SUBMISSION

====================================================

After confirmation:

Create a REAL complaint record.

Generate:

CP-2026-XXXXX

Store:

- image

- AI analysis

- description

- category

- severity

- location

- user

- timestamp

- status

- priority score

Then show a professional complaint receipt.

====================================================

14. COMPLAINT RECEIPT

====================================================

Create a beautiful receipt page.

Display:

CivicPulse AI

Complaint ID:

CP-2026-00001

Issue:

Pothole

Severity:

HIGH

Location:

Sinhgad Road, Pune

Reported:

09 Aug 2026

Status:

AI VERIFIED

Buttons:

[ TRACK COMPLAINT ]

[ VIEW ON MAP ]

[ COPY COMPLAINT ID ]

If practical, include a QR code linking to the complaint tracking page.

====================================================

15. TRACKING PAGE

====================================================

Create a visual timeline:

✓ Report Submitted

✓ AI Verified

✓ Department Assigned

● Work In Progress

○ Resolution Evidence

○ Citizen Verification

○ Resolved

The timeline must come from the actual status_history database.

If the admin changes the status, the citizen must see the update.

Do NOT hardcode the timeline.

====================================================

16. COMMUNITY

====================================================

Create a real Community page.

Title:

"Your Community. Your Voice."

Show real complaints from the database.

Cards should contain:

issue image

issue title

category

distance if available

status

priority

supporter count

Button:

👍 SUPPORT

When clicked:

- insert community_support record

- prevent duplicate support

- update supporter count

- recalculate priority score

Show:

"4 people support this issue"

This must be real database data.

====================================================

17. CIVIC MAP

====================================================

Create a real interactive map using Leaflet + OpenStreetMap.

Show complaints from the database.

Marker states:

RED = critical/high active

ORANGE = medium

BLUE = in progress

GREEN = resolved

Filters:

ALL

POTHOLES

GARBAGE

DRAINAGE

WATER

STREETLIGHT

OTHER

Clicking a marker should open complaint information.

No fake markers unless clearly labeled demo data.

====================================================

18. PRIORITY ENGINE

====================================================

Every complaint gets a real priority score from 0–100.

Use:

Severity

+

Public Safety Risk

+

Community Support

+

Affected Area

+

Time Pending

+

Location Sensitivity

Store:

priority_score

and:

priority_breakdown

Example:

Priority Score

87 / 100

HIGH

Why?

✓ High safety risk

✓ Near sensitive location

✓ 5 community supporters

✓ Pending for 3 days

Make the score explainable.

Do NOT use random numbers.

====================================================

19. ADMIN PORTAL

====================================================

Create a completely separate admin experience.

Admin navigation:

ACTION QUEUE

ALL ISSUES

MAP

ESCALATIONS

The first page should be an ACTION QUEUE.

Not a fake analytics dashboard.

Example:

CRITICAL

Open Manhole

Priority 96

3 supporters

HIGH

Pothole

Priority 87

5 supporters

MEDIUM

Garbage Overflow

Priority 68

These must come from real database records.

Sort by priority_score DESC.

====================================================

20. ADMIN COMPLAINT DETAIL

====================================================

Admin clicks a complaint.

Show:

Complaint ID

Citizen image

AI analysis

Category

Severity

Risk

Location

Priority Score

Priority Breakdown

Community Support

Status History

Actions:

ASSIGN DEPARTMENT

START WORK

UPLOAD PROGRESS

SUBMIT RESOLUTION

ESCALATE

REOPEN

====================================================

21. DEPARTMENT ROUTING

====================================================

AI suggests:

Pothole → Road Maintenance

Garbage → Waste Management

Water leakage → Water Supply

Streetlight → Electrical

Drainage → Drainage Department

Fallen tree → Garden / Disaster Response

Admin can override the suggestion.

Create a real departments table.

====================================================

22. ADMIN WORKFLOW

====================================================

Admin assigns:

Road Maintenance

Then status becomes:

ASSIGNED

Create status_history.

Admin starts work:

IN_PROGRESS

Create status_history.

Admin can upload work progress image.

====================================================

23. RESOLUTION EVIDENCE

====================================================

Admin uploads final resolution evidence.

Example:

BEFORE

Original citizen image

AFTER

Repair image

Show both side-by-side.

Then use Gemini to assess the before/after evidence.

Gemini should return:

assessment

reason

confidence_label

Example:

Assessment:

LIKELY_RESOLVED

Reason:

"The pothole visible in the original image is no longer visible and the road surface appears repaired."

Confidence:

HIGH

Do NOT fabricate numerical AI accuracy.

Label it:

"AI Resolution Assessment"

====================================================

24. RESOLUTION SUBMISSION

====================================================

Admin clicks:

SUBMIT RESOLUTION

Then:

status =

CITIZEN_VERIFICATION

Create:

ResolutionEvidence

Create:

Notification

Notify the citizen:

"Work has been completed. Please verify the resolution."

====================================================

25. CITIZEN VERIFICATION

====================================================

Citizen opens complaint.

Show:

BEFORE → AFTER

Question:

"Is this issue actually fixed?"

Buttons:

✓ YES, VERIFIED

✕ NO, STILL UNRESOLVED

If YES:

Create CitizenVerification

is_verified = true

Status:

RESOLVED

Create status history.

Update map marker to GREEN.

Remove from active admin queue.

If NO:

Ask:

Why is it still unresolved?

Options:

Issue still exists

Partial repair

Wrong issue

Other

Allow optional evidence upload.

Then:

Status =

REOPENED

Create escalation.

Notify admin.

====================================================

26. NOTIFICATIONS

====================================================

Create real in-app notifications.

Events:

Complaint assigned

Work started

Evidence uploaded

Resolution submitted

Citizen verification required

Complaint reopened

Complaint resolved

Notification center should show:

Unread

Read

Use actual database records.

====================================================

27. ESCALATION

====================================================

If:

- complaint remains pending too long

- citizen rejects resolution

- issue is repeatedly reopened

Create escalation.

Admin has:

/admin/escalations

Show:

Complaint

Reason

Created

Status

No fake escalation records.

====================================================

28. CIVIC HOTSPOTS

====================================================

Use actual complaint locations.

If several similar complaints are close together:

identify a potential hotspot.

Example:

ROAD DAMAGE HOTSPOT

3 related reports

within 200m

Show on admin map.

This should be calculated from database coordinates.

Do not generate fake hotspots.

====================================================

29. AI CIVICPULSE ASSISTANT

====================================================

Create a simple AI assistant.

It can answer:

"How do I report a pothole?"

"What happens after I report?"

"Where can I track my complaint?"

"Is there already an issue near me?"

For database-related questions, use real database data where safe.

Do not expose private user information.

====================================================

30. CITIZEN DASHBOARD

====================================================

Create:

My Reports

Active

In Progress

Awaiting Verification

Resolved

Each card:

image

issue

complaint ID

status

priority

location

date

Click → tracking page.

Do not show fake totals.

====================================================

31. ADMIN MAP

====================================================

Admin map should show actual complaints.

Filters:

Severity

Category

Status

Priority

Department

Click marker → complaint.

Include hotspot visualization if available.

====================================================

32. AUTHENTICATION

====================================================

Use Supabase Auth.

Citizen registration.

Admin login.

IMPORTANT:

Do NOT allow users to choose ADMIN during public registration.

Admin accounts must be created securely/separately.

Use Row Level Security.

Citizen can only access their own private complaint data.

Public community information can be read according to defined policies.

Admin can access operational complaint data.

====================================================

33. STORAGE

====================================================

Use Supabase Storage.

Create appropriate storage buckets for:

complaint-images

resolution-evidence

Validate:

- file type

- file size

Never expose private files unnecessarily.

====================================================

34. SECURITY

====================================================

Implement:

Supabase Auth

RLS policies

Role-based access

Secure AI calls

No exposed API keys

File validation

Input validation

Protected admin routes

Never put Gemini API key in frontend.

====================================================

35. UI/UX

====================================================

The application must look like a serious startup/product prototype.

NOT a generic admin template.

Design language:

Clean

Modern

Civic

Trustworthy

Professional

Highly usable

Use:

- strong typography

- clean cards

- clear status badges

- excellent spacing

- subtle animations

- meaningful icons

- responsive design

- mobile-first citizen reporting

Do not overuse:

- gradients

- glassmorphism

- neon

- giant decorative AI graphics

- unnecessary charts

- fake statistics

The reporting flow should be extremely simple.

A citizen should be able to report an issue in under a minute.

====================================================

36. IMPORTANT UI SCREENS

====================================================

Build these screens:

PUBLIC:

/

 /login

 /register

CITIZEN:

/dashboard

/report

/complaint/:id

/community

/map

/notifications

ADMIN:

/admin/queue

/admin/complaint/:id

/admin/map

/admin/escalations

====================================================

37. LANDING PAGE

====================================================

Landing page should communicate:

Civic problems shouldn't disappear into a complaint box.

CivicPulse connects:

REPORT

→ AI

→ PRIORITY

→ ACTION

→ VERIFICATION

Primary CTA:

REPORT A CIVIC ISSUE

Secondary:

EXPLORE COMMUNITY

Do not use fake statistics.

====================================================

38. REAL DEMO DATA

====================================================

Create a small seed/demo dataset ONLY if needed.

Maximum approximately:

8 complaints

3 departments

2-3 demo citizens

1 demo admin

Clearly mark demo records internally if appropriate.

Do not create thousands of fake records.

The application must work with newly created complaints.

====================================================

39. HACKATHON DEMO MUST WORK

====================================================

This exact flow must work live:

1. Login as citizen

2. Upload pothole image

3. Gemini analyzes image

4. AI generates issue details

5. Citizen reviews

6. Location selected

7. Duplicate check

8. Submit

9. CP-2026-XXXXX generated

10. Receipt appears

11. Complaint appears on citizen dashboard

12. Complaint appears on map

13. Complaint appears in admin queue

14. Login as admin

15. Open complaint

16. Assign Road Maintenance

17. Change to IN_PROGRESS

18. Upload final repair image

19. Gemini assesses before/after

20. Submit resolution

21. Citizen receives notification

22. Citizen opens complaint

23. Citizen sees BEFORE and AFTER

24. Citizen verifies

25. Complaint becomes RESOLVED

26. Status timeline updates

27. Map marker becomes GREEN

28. Admin queue updates

THIS FLOW IS THE CORE ACCEPTANCE TEST.

====================================================

40. ERROR HANDLING

====================================================

Every important operation must have:

loading state

success state

error state

empty state

Examples:

AI unavailable

Upload failed

Location permission denied

Database error

Duplicate found

Unauthorized

Complaint not found

Never leave the user with a blank screen.

====================================================

41. PERFORMANCE

====================================================

Keep the prototype fast.

Do not fetch unnecessary data.

Use pagination where appropriate.

Optimize images before upload where practical.

Do not make unnecessary AI calls.

====================================================

42. CODE QUALITY

====================================================

Use reusable components.

Keep files reasonably sized.

Use TypeScript types/interfaces.

Avoid duplicated logic.

Use clear naming.

Do not generate giant monolithic components.

Keep database logic separate from UI logic.

====================================================

43. IMPORTANT LOVABLE DEVELOPMENT RULE

====================================================

BUILD THIS IN WORKING PHASES.

Do NOT create a fake frontend first and promise backend later.

Start by establishing:

1. Supabase connection

2. Database schema

3. Authentication

4. Storage

5. RLS

6. Core complaint data model

Then build the actual workflows on top.

After every major feature, ensure the frontend is connected to the actual backend/database.

====================================================

44. ACCEPTANCE CRITERIA

====================================================

Do not consider the project complete until:

✓ Citizen can register

✓ Citizen can login

✓ Citizen can upload image

✓ Gemini actually analyzes image

✓ Citizen can edit AI result

✓ Location works

✓ Complaint is stored

✓ Complaint ID generated

✓ Receipt works

✓ Tracking works

✓ Status history works

✓ Community support works

✓ Duplicate detection works

✓ Priority score works

✓ Admin login works

✓ Admin queue works

✓ Department assignment works

✓ Status updates work

✓ Evidence upload works

✓ Gemini resolution assessment works

✓ Citizen notification works

✓ Citizen verification works

✓ Reopening works

✓ Map uses real database complaints

✓ RLS protects user data

✓ No Gemini API key is exposed

✓ No important fake statistics exist

====================================================

45. FINAL PRODUCT GOAL

====================================================

When a judge asks:

"Show me what happens when I report a pothole."

We should be able to demonstrate the COMPLETE journey:

📸 REPORT

↓

🤖 AI UNDERSTANDS

↓

🔍 DUPLICATE CHECK

↓

🧠 PRIORITY

↓

🏛️ ADMIN ACTION

↓

🛰️ TRACKING

↓

📸 RESOLUTION EVIDENCE

↓

👤 CITIZEN VERIFICATION

↓

✅ VERIFIED RESOLUTION

The application must demonstrate that CivicPulse is not merely a complaint form.

It is a CLOSED-LOOP CIVIC RESOLUTION SYSTEM.

====================================================

FINAL INSTRUCTION

====================================================

Start building the actual application now.

Do not just explain what you would build.

Create the database, authentication, storage, backend logic, AI integration, pages, components and workflows.

Prioritize FUNCTIONALITY over decorative elements.

After implementing each major section, test the integration before moving on.

Do not stop after creating the UI.

Build the complete working prototype.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4b77d2bb-802f-4e3c-9ffb-15e027a8383b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
