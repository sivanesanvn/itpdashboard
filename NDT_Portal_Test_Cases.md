# NDT Portal — Full Test Case Suite

**Project:** NDT Portal (Cutech, Singapore)  
**Date:** 2026-06-02  
**Total Test Cases:** ~150  
**Roles Covered:** Manager, Coordinator, Client, Technician, Scaffold, Insulation, Painting  

---

## Legend

| Column | Description |
|--------|-------------|
| TC-ID | Unique test case identifier |
| Title | Short description of the test |
| Pre | Preconditions required |
| Steps | Action sequence |
| Expected | Expected outcome |
| Variables | Key data inputs / edge values |

---

## Section 1 — Authentication (`/`)

| TC-ID | Title | Pre | Steps | Expected | Variables |
|-------|-------|-----|-------|----------|-----------|
| AUTH-01 | Valid login — manager | Manager account exists | Enter valid email + password → Submit | Redirected to `/manager/dashboard` | role = manager |
| AUTH-02 | Valid login — client | Client account exists | Enter valid email + password → Submit | Redirected to `/client/requests` | role = client |
| AUTH-03 | Valid login — tech | Tech account exists | Enter valid email + password → Submit | Redirected to `/tech/jobs` | role = tech |
| AUTH-04 | Valid login — scaffold | Scaffold account exists | Enter valid email + password → Submit | Redirected to `/contractor/jobs` | role = scaffold |
| AUTH-05 | Valid login — insulation | Insulation account exists | Enter valid email + password → Submit | Redirected to `/contractor/jobs` | role = insulation |
| AUTH-06 | Valid login — painting | Painting account exists | Enter valid email + password → Submit | Redirected to `/contractor/jobs` | role = painting |
| AUTH-07 | Valid login — coordinator | Coordinator account exists | Enter valid email + password → Submit | Redirected to `/coordinator/dashboard` | role = coordinator |
| AUTH-08 | Wrong password | Valid email exists | Enter correct email + wrong password → Submit | Error message shown, stay on login page | password = incorrect |
| AUTH-09 | Non-existent email | — | Enter unknown email + any password → Submit | Auth error shown | email = unknown |
| AUTH-10 | Empty form submit | — | Click Submit with no inputs | Validation error or auth error shown | email = "", password = "" |
| AUTH-11 | Role-based redirect integrity | All 7 roles exist | Login each role in sequence | Each lands on the correct route per ROLE_ROUTES | All 7 role routes |

---

## Section 2 — Layout / Navigation (All Roles)

| TC-ID | Title | Pre | Steps | Expected |
|-------|-------|-----|-------|----------|
| NAV-01 | Nav tabs render per role | Logged in as any role | Load any authenticated page | Correct nav tabs shown per role |
| NAV-02 | Active tab highlighted | On `/manager/dashboard` | Observe nav bar | Dashboard tab is highlighted/active |
| NAV-03 | Change password — success | Logged in | Click username → Change password → Enter matching passwords (≥8 chars) → Submit | Password updated, success feedback shown |
| NAV-04 | Change password — mismatch | Logged in | Enter two different passwords → Submit | Error: passwords do not match |
| NAV-05 | Change password — too short | Logged in | Enter password < 8 characters → Submit | Error: minimum length not met |
| NAV-06 | Sign out | Logged in | Click username → Sign out | Redirected to login page, session cleared |
| NAV-07 | Logo display | Any authenticated page | Load page | Cutech + TicWerks logos visible in header |
| NAV-08 | Nav badge counter | Requests needing action | Load page | Badge count shown on relevant nav tab |

---

## Section 3 — Client: New Request (`/client/new`)

### 3.1 Step 1 — Site & Scope Information

| TC-ID | Title | Pre | Steps | Expected | Variables |
|-------|-------|-----|-------|----------|-----------|
| CNR-01 | Complete Step 1 — submit basic only | Logged in as client | Fill all Step 1 required fields → Click "Submit basic only" | Request created with status = New, redirected to requests list | All required s1 fields filled |
| CNR-02 | Proceed to Step 2 | Step 1 complete | Click "Next: Technical Details" | Step 2 form displayed, draftId stored | draftId set in state |
| CNR-03 | Step 2 complete submission | Step 1 done, Step 2 filled | Fill all s2 fields → Submit | Request updated with step 2 fields, step2_complete = true | material, thickness, pipeSize, pNumber, code, acceptance |
| CNR-04 | Missing required Step 1 field | — | Leave `location` blank → Submit | Validation error shown for missing field | location = "" |
| CNR-05 | NDT method search — partial match | Step 1 open | Type "UT" in MethodSelect | All UT-variant methods appear in dropdown | method search = "UT" |
| CNR-06 | NDT method clear | Method selected | Click clear button on MethodSelect | Field cleared, placeholder shown | — |
| CNR-07 | Priority — Normal | — | Select Normal priority | Saved as priority = Normal | priority = Normal |
| CNR-08 | Priority — Urgent | — | Select Urgent priority | Saved as priority = Urgent | priority = Urgent |
| CNR-09 | Priority — Shutdown | — | Select Shutdown priority | Saved as priority = Shutdown | priority = Shutdown |
| CNR-10 | Support work flags | — | Toggle scaffold, insulation, painting checkboxes ON | All three flags saved: needs_scaffold, needs_insulation, needs_painting = true | All 3 toggled |
| CNR-11 | File upload — valid PDF | — | Attach a PDF file < 50MB | File uploaded to `documents` bucket, request_documents record created | file.size < 52428800 |
| CNR-12 | File upload — large file | — | Attach file > 50MB | Error or rejection shown | file.size > 52428800 |
| CNR-13 | Multiple file upload | — | Attach 3 files simultaneously | All 3 uploaded, 3 request_documents records created | 3 files selected |
| CNR-14 | Prefill from last request | Previous request exists for this client | Open new request form | Requester name, company, department pre-filled from last request | last request data |
| CNR-15 | Date needed — past date | — | Set dateNeeded to a date in the past | Saved as-is (or warning shown per implementation) | dateNeeded < 2026-06-02 |

---

## Section 4 — Client: All Requests (`/client/all-requests`)

### 4.1 Search & Filter

| TC-ID | Title | Pre | Steps | Expected | Variables |
|-------|-------|-----|-------|----------|-----------|
| CAR-01 | List own requests only | Client has 3 requests; other clients have requests too | Load page | Only logged-in client's requests shown | client_id = user.id |
| CAR-02 | Search by request ID | Requests exist | Type partial request number in search box | Matching requests filtered in real time | search = "NDT-00" |
| CAR-03 | Search by NDT method | Requests exist | Type "UT" in search | Requests with UT method shown | search = "UT" |
| CAR-04 | Search by location | Requests exist | Type location name | Matching requests shown | search = "Plant A" |
| CAR-05 | Filter by status pill | Requests in multiple statuses | Click "Scheduled" pill | Only Scheduled requests shown | filter = "Scheduled" |
| CAR-06 | Filter by category | Requests in multiple categories | Select "Meridium" from dropdown | Only Meridium category requests shown | category = "Meridium" |
| CAR-07 | Filter by date range | Requests across months | Set dateFrom = 2026-01-01, dateTo = 2026-03-31 | Only requests created/scheduled in that range shown | dateFrom, dateTo |
| CAR-08 | Combined filter + search | Requests exist | Set status = Scheduled AND search = "UT" | Both filters applied simultaneously | — |
| CAR-09 | Clear all filters | Filters active | Clear all filters | All requests shown | filter = "", search = "", category = "" |

### 4.2 Request Detail Drawer

| TC-ID | Title | Pre | Steps | Expected |
|-------|-------|-----|-------|----------|
| CAR-10 | Open request detail drawer | Requests in list | Click any request row | Right-side drawer opens with full request details |
| CAR-11 | NDT Timeline shows correct step | Request in "Scheduled" status | Open drawer | Scheduled step highlighted in NDTTimeline |
| CAR-12 | View all 8 status steps in timeline | — | Open requests at each status | Correct step highlighted per status across all 8 NDT_STATUSES |

### 4.3 Edit Request

| TC-ID | Title | Pre | Steps | Expected | Variables |
|-------|-------|-----|-------|----------|-----------|
| CAR-13 | Edit request — New status | Request is New | Open drawer → Edit → Modify location → Save | Request updated in DB, no notification sent | status = New |
| CAR-14 | Edit request — Scheduled status | Request is Scheduled | Edit any field → Save | Warning shown (manager will be notified), changes saved, reschedule email triggered | status = Scheduled |
| CAR-15 | Edit blocked after On-going | Request is On-going | Open drawer | Edit button not available | status = On-going |
| CAR-16 | Edit blocked for Completed | Request is Report accepted | Open drawer | Edit not available | status = Report accepted |
| CAR-17 | Toggle support work in edit | Request is New | Edit → Toggle scaffold OFF → Save | needs_scaffold = false saved | needs_scaffold |

### 4.4 Actions

| TC-ID | Title | Pre | Steps | Expected | Variables |
|-------|-------|-----|-------|----------|-----------|
| CAR-18 | Cancel request — New | Status = New | Click Cancel → Confirm | Status → Cancelled | status: New → Cancelled |
| CAR-19 | Cancel request — Scheduled | Status = Scheduled | Click Cancel → Confirm | Status → Cancelled | status: Scheduled → Cancelled |
| CAR-20 | Accept draft report | Status = Draft Report Submitted | Click Accept Report | Status → Draft Report Accepted | — |
| CAR-21 | Upload supporting document | Any status | Upload file via DocumentUpload | File in storage, record in request_documents | — |
| CAR-22 | Download document | Document attached | Click download on file | Signed URL generated (valid 3600s), file downloads | — |
| CAR-23 | Print request | Request selected | Click Print | PrintRequest modal opens with full data | — |
| CAR-24 | Add comment | Request open | Type comment text → Post | Comment saved and appears with name, role badge, timestamp | — |
| CAR-25 | View status history / audit trail | Request with history | Status History tab in drawer | All status transitions shown with timestamps and actor | — |

---

## Section 5 — Client: Dashboard (`/client/requests`)

| TC-ID | Title | Pre | Steps | Expected |
|-------|-------|-----|-------|----------|
| CDB-01 | Total count | 5 requests exist | Load | Total stat = 5 |
| CDB-02 | Active count | 2 active requests | Load | Active = 2 (excludes Cancelled / Completed) |
| CDB-03 | Overdue count | 1 request past scheduled date, not completed | Load | Overdue count = 1 |
| CDB-04 | Awaiting review count | 1 request in Draft Report Submitted | Load | Awaiting Review = 1 |
| CDB-05 | Period filter — Monthly | Switch to Monthly | Load | Only current month's requests counted in stats |
| CDB-06 | Period filter — Yearly | Switch to Yearly | Load | Only current year's requests counted |
| CDB-07 | Period filter — Overall | Switch to Overall | Load | All requests counted regardless of date |
| CDB-08 | Alert: awaiting review visible | Requests awaiting review exist | Load | Alert section displayed, links to requests list |
| CDB-09 | Alert: overdue visible | Overdue requests exist | Load | Overdue alert section displayed |
| CDB-10 | Charts render — By Status | Requests with varied statuses | Load | DonutChart renders with correct status proportions |
| CDB-11 | Charts render — By Category | Requests in multiple categories | Load | DonutChart renders for Category |
| CDB-12 | Charts render — By NDT Method | Requests using different methods | Load | DonutChart renders for Method |
| CDB-13 | Empty state | No requests exist for client | Load | Zero counts shown, no crash, empty charts handled gracefully |

---

## Section 6 — Client: Schedule Calendar (`/client/schedule`)

| TC-ID | Title | Pre | Steps | Expected |
|-------|-------|-----|-------|----------|
| CSCH-01 | Month view loads | Scheduled requests exist | Load | Calendar grid shows current month with correct days |
| CSCH-02 | Job appears on correct date | Request scheduled 2026-06-15 | Month view | Job card shown on June 15 |
| CSCH-03 | Click day opens detail panel | Job on June 15 | Click June 15 | Detail panel opens showing job info |
| CSCH-04 | Navigate to next month | On June 2026 | Click next arrow | July 2026 calendar shown |
| CSCH-05 | Navigate to previous month | On June 2026 | Click previous arrow | May 2026 calendar shown |
| CSCH-06 | Today button | On a different month | Click Today | Returns to current month/week/day |
| CSCH-07 | Week view | Load | Click Week tab | 7-column week grid shown with job cards |
| CSCH-08 | Day view | Load | Click Day tab | Single-day full job listing shown |
| CSCH-09 | Support job status in day panel | Scaffold job assigned | Click day with scaffold job | Scaffold status badge visible in detail panel |
| CSCH-10 | Unscheduled requests not shown | 2 New (unscheduled) requests | Load calendar | Unscheduled requests do not appear on calendar |

---

## Section 7 — Manager: Dashboard (`/manager/dashboard`)

| TC-ID | Title | Pre | Steps | Expected |
|-------|-------|-----|-------|----------|
| MDB-01 | Key metrics — New count | 2 New requests | Load | New metric = 2 |
| MDB-02 | Key metrics — Active count | 3 active requests | Load | Active metric = 3 |
| MDB-03 | Key metrics — Completed count | 4 completed | Load | Completed metric = 4 |
| MDB-04 | Action required section | 2 New requests | Load | Both New requests appear in Action Required |
| MDB-05 | Schedule modal opens | New request in Action Required | Click Schedule button | Modal opens with date picker, tech selector, support toggles |
| MDB-06 | Schedule — assign tech + date | Modal open | Select tech, pick date, add notes → Confirm | Status → Scheduled, tech_id set, scheduled_date saved |
| MDB-07 | Schedule — enable scaffold | Modal open | Toggle scaffold ON → select scaffold contractor | support_jobs record created with job_type = scaffold on confirm |
| MDB-08 | Schedule — enable insulation | Modal open | Toggle insulation ON → select contractor | Insulation support_job created |
| MDB-09 | Schedule — enable painting | Modal open | Toggle painting ON → select contractor | Painting support_job created |
| MDB-10 | Schedule — no support work | Modal open | Leave all support toggles OFF → Confirm | No support_jobs records created |
| MDB-11 | Update status modal | Active request | Click Update Status → Select new status → Confirm | Request status updated in DB |
| MDB-12 | Period filter — Monthly | Switch to Monthly | Load | Metrics reflect only current month |
| MDB-13 | Period filter — Yearly | Switch | Load | Metrics reflect current year |
| MDB-14 | Period filter — Overall | Switch | Load | All time metrics |
| MDB-15 | Charts render | Data exists | Load | Status, Category, Method DonutCharts + BarChart rendered |
| MDB-16 | BarChart — Day view | Load BarChart | Click Day | Last 14 days shown as bars |
| MDB-17 | BarChart — Week view | Click Week | Last 10 weeks shown |
| MDB-18 | BarChart — Month view | Click Month | Last 12 months shown |

---

## Section 8 — Manager: All Requests (`/manager/requests`)

| TC-ID | Title | Pre | Steps | Expected |
|-------|-------|-----|-------|----------|
| MRQ-01 | View all company requests | Requests from multiple clients | Load | All requests visible (not filtered by client_id) |
| MRQ-02 | Search by company | Requests from different companies | Search "Acme" | Only Acme requests shown |
| MRQ-03 | Search by request ID | — | Search NDT number | Matching request shown |
| MRQ-04 | Search by requestor name | — | Type requestor name | Matching requests shown |
| MRQ-05 | Filter by status pill | — | Click status pill | Filtered results |
| MRQ-06 | Filter by category + date range | — | Set category = Turn Around, dateFrom / dateTo | Combined filter applied |
| MRQ-07 | Open detail drawer | — | Click request row | Drawer opens with full details |
| MRQ-08 | Update status from drawer | — | Change status dropdown → Confirm | Status updated in DB |
| MRQ-09 | Cancel request | New or Scheduled request | Click Cancel | Status → Cancelled |
| MRQ-10 | Upload report document | Manager/Tech role | Upload via DocumentUpload (type = report) | File saved to `reports` bucket, record created |
| MRQ-11 | Delete document — own upload | Manager uploaded doc | Click delete | File removed from storage and DB |
| MRQ-12 | Delete document — any upload | Manager role | Click delete on any user's doc | Deletion succeeds (manager privilege) |
| MRQ-13 | Audit trail | Request with history | Status History tab | All status transitions shown |
| MRQ-14 | Add comment | Request open | Type + post | Comment saved and visible |

---

## Section 9 — Manager: Schedule Calendar (`/manager/schedule`)

| TC-ID | Title | Expected |
|-------|-------|----------|
| MSC-01 | All-company jobs visible | Jobs from all clients shown on calendar (no client_id filter) |
| MSC-02 | Month view | Current month grid with all scheduled jobs |
| MSC-03 | Week view | 7-column grid with all jobs |
| MSC-04 | Day view | Full single-day job listing |
| MSC-05 | Navigation prev/next/today | Date ranges update correctly |
| MSC-06 | Day click shows support job status | Scaffold/insulation/painting badges in detail panel |
| MSC-07 | Multiple jobs on same day | All jobs shown on that day cell |

---

## Section 10 — Manager: Team (`/manager/team`)

| TC-ID | Title | Pre | Steps | Expected | Variables |
|-------|-------|-----|-------|----------|-----------|
| MTM-01 | View team grouped by role | Members with varied roles | Load | Members grouped: Manager, Tech, Client, Contractors | — |
| MTM-02 | Invite user — technician | — | Fill: name, email, role=tech, cert, company → Submit | User created or invite instructions shown | role = tech |
| MTM-03 | Invite user — client | — | Fill: name, email, role=client, company → Submit | User created | role = client |
| MTM-04 | Invite user — contractor roles | — | Fill form with role = scaffold / insulation / painting | User created | role ∈ contractor roles |
| MTM-05 | Invite — missing required fields | — | Submit with empty name or email | Validation error shown | — |
| MTM-06 | Cert field visible for tech only | role = tech selected | Observe form | Certification field shown | role = tech |
| MTM-07 | Cert field hidden for non-tech | role = client selected | Observe form | Certification field hidden | role ≠ tech |

---

## Section 11 — Manager: Technicians (`/manager/technicians`)

| TC-ID | Title | Pre | Steps | Expected |
|-------|-------|-----|-------|----------|
| MTECH-01 | View all technicians | Techs exist | Load | All techs listed with name, certification, active job count |
| MTECH-02 | Active job count — Scheduled | Tech has 2 Scheduled jobs | Load | Count = 2 next to technician |
| MTECH-03 | Active job count — On-going | Tech has 1 On-going job | Load | Count = 1 |
| MTECH-04 | Completed jobs not counted | Tech has 1 Scheduled + 1 Completed | Load | Active count = 1 (Completed excluded) |
| MTECH-05 | Toggle availability — Available → Busy | Tech is available | Click toggle | available = false, badge shows Busy |
| MTECH-06 | Toggle availability — Busy → Available | Tech is busy | Click toggle | available = true, badge shows Available |
| MTECH-07 | Zero jobs count | Tech with no active jobs | Load | Count = 0, no crash |

---

## Section 12 — Technician: Jobs (`/tech/jobs`)

### 12.1 Job List

| TC-ID | Title | Pre | Steps | Expected |
|-------|-------|-----|-------|----------|
| TJ-01 | View only assigned jobs | Tech A has 2 assigned; 5 total in system | Load | Only Tech A's 2 jobs shown |
| TJ-02 | Active jobs tab content | Jobs in various statuses | Load | Active tab: Scheduled, On-going, Site work completed jobs |
| TJ-03 | History tab content | Completed/accepted jobs exist | Click History tab | Completed, Report Accepted, Cancelled jobs shown |
| TJ-04 | Cannot see other tech's jobs | Two techs exist | Login as Tech A | Tech B's jobs not visible |

### 12.2 Status Transitions

| TC-ID | Title | Pre | Steps | Expected | Variables |
|-------|-------|-----|-------|----------|-----------|
| TJ-05 | Scheduled → On-going | Job is Scheduled | Click "Start Job" button | Status → Site Work On-going, DB updated | Scheduled → Site Work On-going |
| TJ-06 | On-going → Site work completed | Job is On-going | Click "Mark Complete" | Status → Site work completed | On-going → Site work completed |
| TJ-07 | Site work completed → Draft Report Submitted | Job is Site work completed | Click "Submit Report" | Status → Draft Report Submitted, notify-report API called | → Draft Report Submitted |
| TJ-08 | Email notification on report submit | — | Complete TJ-07 | Client receives email with request number, method, link to portal | RESEND_API_KEY set |

### 12.3 Detail Drawer & Actions

| TC-ID | Title | Pre | Steps | Expected |
|-------|-------|-----|-------|----------|
| TJ-09 | Open job detail drawer | — | Click job row | Full job info, support jobs, NDT timeline shown |
| TJ-10 | Upload supporting document | Job open | Upload file | File saved to storage, record in request_documents |
| TJ-11 | Download document | Document attached | Click download | File downloads via signed URL |
| TJ-12 | Print job | Job open | Click Print | Printer-optimized view opens in new tab |
| TJ-13 | Add comment | Job open | Type comment → Post | Comment appears in thread with tech name + role badge |
| TJ-14 | View support job status | Job with scaffold attached | Open drawer | Scaffold status badge visible |

---

## Section 13 — Contractor: Jobs (`/contractor/jobs`)

### 13.1 Scaffold Workflow

| TC-ID | Title | Pre | Steps | Expected | Variables |
|-------|-------|-----|-------|----------|-----------|
| SCF-01 | View only own scaffold jobs | Scaffold contractor assigned to 2 jobs | Load | Only own 2 support_jobs shown | contractor_id = user.id |
| SCF-02 | Status: Pending → Erection | Job = Pending | Click Next Stage | Status → Erection | Pending → Erection |
| SCF-03 | Status: Erection → Ready to use | Job = Erection | Click Next Stage | Status → Ready to use | Erection → Ready to use |
| SCF-04 | Status: Ready to use → Dismantling | Job = Ready to use | Click Next Stage | Status → Dismantling | Ready to use → Dismantling |
| SCF-05 | Status: Dismantling → Completed | Job = Dismantling | Click Next Stage | Status → Completed | Dismantling → Completed |
| SCF-06 | Date recorded on transition | Erection stage | Progress to Ready | erection_date stamped in DB | erection_date |
| SCF-07 | Add notes | Job open | Enter note text → Save | Notes saved to support_jobs.notes | — |
| SCF-08 | View parent NDT request | Job selected | Observe detail panel | Parent request number, method, location visible | — |
| SCF-09 | Active vs completed split | Mixed statuses | Load | Active tab: pending/in-progress; Completed tab: finished | — |

### 13.2 Insulation Workflow

| TC-ID | Title | Steps | Expected |
|-------|-------|-------|----------|
| INS-01 | Pending → In progress | Click Next Stage | Status → In progress |
| INS-02 | In progress → Ready to use | Click Next Stage | Status → Ready to use |
| INS-03 | Ready to use → Completed | Click Next Stage | Status → Completed |
| INS-04 | Add notes | Enter + save | Notes saved |

### 13.3 Painting Workflow

| TC-ID | Title | Steps | Expected |
|-------|-------|-------|----------|
| PNT-01 | Pending → In progress | Click Next Stage | Status → In progress |
| PNT-02 | In progress → Completed | Click Next Stage | Status → Completed |
| PNT-03 | Add notes | Enter + save | Notes saved |

---

## Section 14 — Coordinator: Dashboard (`/coordinator/dashboard`)

| TC-ID | Title | Pre | Steps | Expected |
|-------|-------|-----|-------|----------|
| CRD-01 | View all company requests | Requests from multiple clients | Load | All company requests visible (not filtered by client_id) |
| CRD-02 | Dashboard tab — metrics | Load | Observe stats | Total, Active, Overdue, Awaiting Review counts correct |
| CRD-03 | All Requests tab | Click tab | Request list with search/filter shown |
| CRD-04 | Workload tab | Click tab | Breakdown by requestor: total, active, overdue per person |
| CRD-05 | Search by request ID | Type request number | Matching request shown |
| CRD-06 | Search by method/location | Type keyword | Filtered results |
| CRD-07 | Advanced filters toggle | Click filter icon | Status, category, requestedBy, dateFrom, dateTo fields shown |
| CRD-08 | Filter by status | Select status | Filtered results |
| CRD-09 | Filter by requestor | Select requestor name | Only that requestor's requests shown |
| CRD-10 | Filter by date range | Set dateFrom + dateTo | Date-filtered results |
| CRD-11 | Open detail drawer | Click request row | Drawer opens with full details and documents |
| CRD-12 | Print from drawer | Drawer open, click Print | PrintRequest modal opens |
| CRD-13 | Charts render | Data exists | Load dashboard tab | DonutCharts and counts render correctly |

---

## Section 15 — DocumentUpload Component

| TC-ID | Title | Pre | Steps | Expected | Variables |
|-------|-------|-----|-------|----------|-----------|
| DOC-01 | Upload PDF — document type | Authorized role, fileType = document | Select PDF → Upload | File in `documents` bucket, request_documents record created | fileType = document |
| DOC-02 | Upload report — tech role | fileType = report, role = tech | Upload file | File saved to `reports` bucket | bucket = reports |
| DOC-03 | Upload report — manager role | role = manager | Upload | File saved to `reports` bucket | — |
| DOC-04 | Upload report — client role | fileType = report, role = client | Observe UI | Upload button not shown (clients cannot upload reports) | — |
| DOC-05 | Download creates signed URL | File exists | Click download | Signed URL generated (valid 3600s), file downloads | expiry = 3600 |
| DOC-06 | Delete own document | Uploader = current user | Click delete | File removed from storage, DB record deleted | — |
| DOC-07 | Manager deletes any document | role = manager | Click delete on other user's doc | Deletion succeeds | — |
| DOC-08 | Client cannot delete others' docs | Doc uploaded by different user | Observe UI | Delete button not shown | — |
| DOC-09 | Multiple file upload | — | Select 3 files simultaneously | All 3 uploaded, 3 request_documents records created | 3 files |
| DOC-10 | Accepted file types | — | Select PDF, Word, Excel, Image | All accepted and uploaded | .pdf, .doc, .xlsx, .jpg |

---

## Section 16 — Comments Component

| TC-ID | Title | Steps | Expected |
|-------|-------|-------|----------|
| CMT-01 | Post comment | Enter text → Post | Comment saved with user name, role, and timestamp |
| CMT-02 | Comment appears immediately | Post comment | Comment visible in list without page reload |
| CMT-03 | Empty comment blocked | Click Post with empty text box | No submission (button disabled or validation error) |
| CMT-04 | Role badge on comment | Post as manager | Manager badge shown next to commenter name |
| CMT-05 | Chronological order | Multiple comments posted | Comments listed oldest first |
| CMT-06 | Multiple roles can comment | Client + Manager both comment | Both appear in thread with correct role badges |

---

## Section 17 — Print / PDF Export

| TC-ID | Title | Steps | Expected |
|-------|-------|-------|----------|
| PRN-01 | Print modal opens | Click Print on any request | Modal with preview shown |
| PRN-02 | Open print view | Click "Open print view" in modal | New browser tab opens with printer-optimized HTML |
| PRN-03 | Status timeline in print | Request has status history | View print page | NDT status timeline rendered |
| PRN-04 | Attachments listed | Request has attached docs | View print page | Filename, type, uploader, file size listed |
| PRN-05 | Support jobs in print | Support jobs assigned | View print page | Scaffold / insulation / painting status shown |
| PRN-06 | Audit trail in print | Status history exists | View print page | All status changes with timestamps shown |
| PRN-07 | Manager notes in print | Manager notes set | View print page | Manager notes section rendered |
| PRN-08 | High-temp warning | High temperature flag set | View print page | Warning shown in print view |
| PRN-09 | No attachments state | Request has no docs | View print page | Attachments section shows "none" gracefully |

---

## Section 18 — API Routes

| TC-ID | Title | Pre | Steps | Expected | Variables |
|-------|-------|-----|-------|----------|-----------|
| API-01 | notify-report — success | RESEND_API_KEY set | Tech submits report (TJ-07) | POST to Resend API succeeds, client receives email with request details | — |
| API-02 | notify-report — email content | — | Check email received | Contains: request number, company, method, location, portal link | — |
| API-03 | notify-report — missing API key | RESEND_API_KEY unset | Tech submits report | API returns error response, no uncaught crash | — |
| API-04 | notify-reschedule — success | Managers exist, RESEND_API_KEY set | Client edits Scheduled request → Save | POST to Resend with all manager emails as recipients | — |
| API-05 | notify-reschedule — email content | — | Check email received by manager | Contains: request number, client name, method, old scheduled date | — |
| API-06 | notify-reschedule — no managers | No manager profiles in DB | Client edits Scheduled request | Gracefully handles empty recipient list, no crash | managers = [] |

---

## Section 19 — Cross-Role Data Isolation (RLS)

| TC-ID | Title | Pre | Steps | Expected |
|-------|-------|-----|-------|----------|
| RLS-01 | Client sees only own requests | Client A and Client B have requests | Login as Client A | Client B's requests not visible |
| RLS-02 | Tech sees only assigned jobs | Tech A and Tech B have assigned jobs | Login as Tech A | Tech B's jobs not visible |
| RLS-03 | Scaffold sees only own support jobs | Two scaffold contractors assigned | Login as Scaffold Contractor A | Contractor B's jobs not visible |
| RLS-04 | Manager sees all requests | Requests from multiple clients | Login as Manager | All company requests visible |
| RLS-05 | Coordinator sees all requests | Requests from multiple clients | Login as Coordinator | All requests visible |
| RLS-06 | Contractor cannot access manager routes | Scaffold user logged in | Navigate to `/manager/dashboard` | Redirected to login or access denied |
| RLS-07 | Client cannot access tech routes | Client logged in | Navigate to `/tech/jobs` | Redirected or access denied |
| RLS-08 | Tech cannot see other clients' documents | Doc belongs to different company | Tech loads job | Only docs for their assigned request visible |

---

## Section 20 — End-to-End Status Lifecycle

| TC-ID | Title | Actors | Steps | Expected Final State |
|-------|-------|--------|-------|---------------------|
| E2E-01 | Full happy path | Client, Manager, Tech, Client | 1. Client submits request → 2. Manager schedules + assigns tech → 3. Tech starts job → 4. Tech marks site work complete → 5. Tech submits report → 6. Client accepts report | Status: New → Scheduled → Site Work On-going → Site work completed → Draft Report Submitted → Draft Report Accepted |
| E2E-02 | Cancel at New | Client | Client submits → Client cancels | Status = Cancelled |
| E2E-03 | Cancel at Scheduled | Manager | Manager schedules → Cancels | Status = Cancelled |
| E2E-04 | Scaffold parallel workflow | Manager, Scaffold Contractor | Schedule with scaffold → Scaffold: Pending → Erection → Ready → Dismantling → Completed while NDT progresses | NDT and scaffold statuses progress independently |
| E2E-05 | Full support work (all 3) | Manager, 3 Contractors | Schedule with scaffold + insulation + painting | Three separate support_jobs created, each progresses independently |
| E2E-06 | Reschedule notification | Client, Manager | Client edits Scheduled request → Manager receives email | notify-reschedule API fires, manager email received |
| E2E-07 | Basic request → Tech completes | Client, Manager, Tech | Submit basic (no step 2) → Schedule → Execute | Step2_complete = false throughout; flow completes normally |
| E2E-08 | Multiple requests same client | Client | Submit 3 requests | All 3 appear in client list, processed independently |

---

## Section 21 — Key Variable & Edge Cases

| TC-ID | Variable | Scenario | Expected |
|-------|----------|----------|----------|
| VAR-01 | scheduled_date = null | Request never scheduled | Not shown on calendar; no null crash |
| VAR-02 | tech_id = null | Unassigned request | Tech job list does not include it; no error |
| VAR-03 | available = false on all techs | All techs marked busy | Schedule modal still lists techs (manager override) |
| VAR-04 | step2_complete = false | Client submitted basic only | Step 2 fields shown as empty/N/A in detail views |
| VAR-05 | support_jobs = [] | No support work assigned | Support work section shows "none requested", no crash |
| VAR-06 | priority = Shutdown | Shutdown turnaround request | Red/urgent badge shown per PRIORITY_COLOR |
| VAR-07 | priority = Urgent | Urgent request | Urgent color badge shown |
| VAR-08 | Long description | description = 2000+ characters | Text wraps correctly, no layout overflow |
| VAR-09 | NDT method = "PAUT-TFM" | Uncommon method selected | Saves and displays correctly |
| VAR-10 | Zero requests | Brand new account | Empty state shown on all list/dashboard pages, no crash |
| VAR-11 | company mismatch | Coordinator from Company A | Only Company A requests shown |
| VAR-12 | Simultaneous status update | Two users update same request | Last write wins; no DB corruption |
| VAR-13 | Very long file name | Upload file with 200-char name | Truncated in UI, full path stored in DB |
| VAR-14 | Special characters in search | Search "O'Brien & Sons" | Handled safely, no XSS or SQL injection |
| VAR-15 | dateFrom > dateTo | Invalid date range | No results or validation error shown |
| VAR-16 | Request with all support types | needs_scaffold + insulation + painting = true | All three support_jobs created on scheduling |
| VAR-17 | Tech with no jobs | Tech newly added | Active and History tabs show empty state |
| VAR-18 | Multiple files with same name | Upload two files named "report.pdf" | Both uploaded with unique storage paths |
| VAR-19 | Category = Ad-Hoc | Filter by Ad-Hoc | Only Ad-Hoc requests shown |
| VAR-20 | All 21 NDT methods | Each method selected in new request | All methods save and display correctly |

---

## Appendix — Status Reference

### NDT Request Statuses (NDT_STATUSES)
```
New → Scheduled → Site Work On-going → Site work completed
→ Draft Report Submitted → Draft Report Accepted → Report accepted
                                                  → Cancelled (any point)
```

### Support Job Statuses (SUPPORT_STATUSES)
| Type | Statuses |
|------|----------|
| Scaffold | Pending → Erection → Ready to use → Dismantling → Completed |
| Insulation Removal | Pending → In progress → Ready to use → Completed |
| Painting | Pending → In progress → Completed |

### Roles & Routes (ROLE_ROUTES)
| Role | Route |
|------|-------|
| manager | /manager/dashboard |
| coordinator | /coordinator/dashboard |
| client | /client/requests |
| tech | /tech/jobs |
| scaffold | /contractor/jobs |
| insulation | /contractor/jobs |
| painting | /contractor/jobs |

---

*Generated for NDT Portal — Cutech, Singapore*  
*Total test cases: ~150 across 21 sections*
