# NDT Portal — User Manual

**Cutech NDT Inspection Management System**
*A guide for all users — written in plain language*

---

## Table of Contents

1. [What Is This Portal?](#1-what-is-this-portal)
2. [Logging In](#2-logging-in)
3. [Common Features (All Users)](#3-common-features-all-users)
4. [Client Guide](#4-client-guide)
5. [Manager Guide](#5-manager-guide)
6. [Coordinator Guide](#6-coordinator-guide)
7. [NDT Technician Guide](#7-ndt-technician-guide)
8. [Contractor Guide (Scaffold / Insulation / Painting)](#8-contractor-guide-scaffold--insulation--painting)
9. [Request Status Explained](#9-request-status-explained)
10. [Support Job Status Explained](#10-support-job-status-explained)
11. [Frequently Asked Questions](#11-frequently-asked-questions)

---

## 1. What Is This Portal?

The NDT Portal is a web-based system used by **Cutech** to manage Non-Destructive Testing (NDT) inspection jobs from start to finish.

**Here is how it works in simple terms:**

1. A **client** submits an inspection request (e.g. "I need ultrasonic testing on this pipe").
2. A **manager** reviews the request, picks a date, and assigns an NDT technician. If scaffolding, insulation removal, or painting is needed first, the manager assigns the relevant contractors too.
3. The **contractors** carry out their preparation work and update their progress in the portal.
4. The **NDT technician** arrives on site, performs the inspection, and uploads the report to the portal.
5. The **client or coordinator** reviews the draft report and accepts it.
6. The job is closed and the full record is stored for future reference.

Everyone involved — client, manager, coordinator, technician, contractor — has their own login and sees only the information relevant to their role.

---

## 2. Logging In

1. Open the portal in any web browser.
2. Enter your **email address** and **password**.
3. Click **Sign In**.
4. You will be taken directly to your dashboard — the portal remembers your role and shows the right screens automatically.

> **First time?** Your account is created by the manager. You will receive an email invitation with a link to set your password. If you have not received one, contact your manager.

> **Forgot your password?** Use the "Forgot password" link on the login page, or ask your manager to reset it.

---

## 3. Common Features (All Users)

These features are available to everyone regardless of role.

### The Header Bar

At the top of every page you will see:
- The **Cutech** and **TicWerks** logos on the left.
- Your **name** and **role badge** (e.g. "Client", "Tech") on the right.
- A small dropdown arrow next to your name — click it to:
  - **Change password** — update your login password.
  - **Sign out** — log out of the portal safely.

### The Navigation Tabs

Below the header is a row of tabs. These change depending on your role and take you to different sections of the portal.

### Changing Your Password

1. Click the dropdown arrow next to your name (top right).
2. Click **Change password**.
3. Enter your new password twice to confirm.
4. Click **Save**.

---

## 4. Client Guide

As a client, you use the portal to **submit inspection requests** and **track their progress**.

### 4.1 Your Dashboard

When you log in, you land on your dashboard. It shows you a quick summary of your requests:

| Stat | What it means |
|------|---------------|
| **Total** | All requests you have ever submitted |
| **Active** | Jobs currently in progress |
| **Awaiting Review** | Draft reports ready for you to approve |
| **Overdue** | Jobs that have passed their requested date without being completed |

You can filter these stats by **Monthly**, **Yearly**, or **Overall** using the buttons at the top.

Three charts show your requests broken down by **status**, **category**, and **NDT method** — useful for spotting patterns.

**Important banners to watch:**
- **"Reports waiting for review"** — A report has been submitted by the technician. You need to review and accept it.
- **"Overdue requests"** — Jobs past their needed date. Follow up with your manager.

---

### 4.2 Submitting a New Request

Click **New Request** in the navigation tabs.

**Step 1 — Basic Information** (required)

| Field | What to enter |
|-------|---------------|
| Requester details | Already filled in automatically from your profile |
| Site location | Where the inspection needs to happen |
| Job category | Meridium / Turn Around / Ad-Hoc |
| Equipment number | The tag or ID of the equipment to be inspected |
| Contact person on site | The person who will be present during inspection |
| Contact phone | Their phone number |
| NDT method | The type of inspection needed (e.g. UT, MT, PT — see your engineer if unsure) |
| Quantity | Number of items or locations to inspect |
| Description | Brief description of the scope of work |
| Date needed | When you need the inspection done by |
| Priority | Normal / Urgent / Shutdown-turnaround |
| Support work needed | Tick if scaffolding, insulation removal, or painting is required before the inspection |
| Attachments | Upload any drawings, specs, or reference documents (PDF, Word, Excel, images, DWG — max 50 MB each) |

Click **Submit** to send with basic info only, or click **Next: Technical Details** to add more.

**Step 2 — Technical Details** (optional)

These fields help the technician prepare. Fill them in if you have the information:
- Material and component type
- Wall thickness
- Pipe or vessel size
- P-number
- Applicable standards and acceptance criteria
- Special requirements or safety notes

Click **Submit with details** when done, or **Skip & Submit** to send without this step.

After submitting, you will see a confirmation. Click **Submit another** to add more requests.

---

### 4.3 Viewing All Your Requests

Click **All Requests** in the navigation tabs.

You will see a table listing every request you have submitted. Click any row to open the **detail panel** on the right, which shows:
- The full status timeline (where in the process the job is now)
- All the information you submitted
- Scheduled date and assigned technician (once scheduled)
- Uploaded documents and reports
- A history of every status change with dates and times

**To review and accept a draft report:**
1. Find the request with status **"Draft Report Submitted"** (it will appear in the dashboard alert too).
2. Click the row to open the detail panel.
3. Download and review the uploaded report.
4. If you are happy with it, change the status to **"Draft Report Accepted"** using the status dropdown.

---

## 5. Manager Guide

As a manager, you have full access to the portal. Your main tasks are scheduling jobs, managing the team, and tracking overall progress.

### 5.1 Your Dashboard

Your dashboard shows:
- **New requests** that need to be scheduled
- **Active jobs** currently in progress
- A bar chart of requests over time
- Donut charts by status, category, and method

**"Action required — New requests"** — This table lists all incoming requests waiting for a date and technician. Deal with these first.

**"Active jobs"** — These are jobs already underway. You can update their status from here.

---

### 5.2 Scheduling a New Request

1. On your dashboard, find the request in the **"Action required"** table.
2. Click the **Schedule** button on that row.
3. Fill in the scheduling details:
   - **Scheduled date** — Pick the inspection date from the calendar.
   - **Technician** — Start typing a name to search and select the right technician.
   - **Notes for technician** — Any special instructions.
   - **Support work** — If the request needs scaffolding, insulation, or painting, tick the relevant boxes and select the contractor.
4. Click **Save** (or equivalent confirm button). The status moves to **"Scheduled"** and the technician and contractors are notified.

---

### 5.3 Updating a Request Status

1. On the dashboard's "Active jobs" table, click **Update** next to a job.
2. Select the new status from the list.
3. Confirm. The status history is logged automatically.

You can also update status from the **All Requests** page by clicking a request row and using the status dropdown in the detail panel.

---

### 5.4 All Requests Page

Click **Requests** in the navigation tabs for the full list of every request in the system.

**Searching and filtering:**
- Use the **search bar** to search by request ID, company, location, method, requester name, or equipment number.
- Use the **date range** fields to narrow by submission date.
- Use the column filter dropdowns (Status, Method, Category, Equipment, Location, Requested By) to drill down further.
- Click **Clear all filters** to reset.

**Viewing details:**
Click any row to open the full detail panel. From here you can:
- See the complete status timeline
- Update the status
- Upload or download supporting documents
- Upload or download NDT reports
- Read the audit trail (every status change, who made it, when)
- Cancel a request (if it has not been closed or cancelled already)
- Print the request details

---

### 5.5 Schedule (Calendar View)

Click **Schedule** in the navigation tabs to see a calendar of all scheduled jobs.

**Three views:**
- **Month** — Overview of the whole month. Click any day to see its jobs in a side panel.
- **Week** — Seven-day view with job cards showing request number, method, and technician.
- **Day** — Detailed list of every job for a selected day.

Use the **← →** arrows to move between periods. Click **Today** to jump back to today.

Each job card shows the company, location, priority, NDT method, technician, and any support work status — useful for spotting conflicts or overloads.

---

### 5.6 Managing Your Team

Click **Team** in the navigation tabs.

You will see all users grouped by role (Manager, Coordinator, Client, Technician, Scaffold, Insulation, Painting).

**To invite a new user:**
1. Click **Invite user**.
2. Fill in their full name, email, role, and company.
3. For clients/coordinators, add their position and department.
4. For technicians, add their certification details.
5. Click **Send invite**.
6. The user will receive an email to set their password and log in.

**To edit a user's profile:**
1. Find the user in the table and click **Edit**.
2. Update their details as needed.
3. Click **Save changes**.

---

### 5.7 Technician Availability

Click **Technicians** in the navigation tabs.

This page shows all NDT technicians with their current availability status and how many active jobs they have.

**To mark a technician as available or busy:**
- Click the **Available** or **Busy** toggle button on their card.

Use this page to check who is free before scheduling a new job.

---

## 6. Coordinator Guide

As a coordinator, your role is similar to a manager — you can see all requests, submit new ones, and review reports — but you do not manage the team.

### 6.1 Your Dashboard

Your dashboard is the same as the client dashboard but shows **all requests in the system**, not just your own. Key sections:
- Stats cards: Total, Active, Awaiting Review, Overdue
- **"Reports waiting for review"** alert — Click to go to requests with draft reports ready for approval
- **"Overdue requests"** banner — Jobs past their needed date

Filter by Monthly, Yearly, or Overall using the buttons at the top.

---

### 6.2 Submitting a New Request

You can submit requests on behalf of clients. The process is identical to the client new request form (see [Section 4.2](#42-submitting-a-new-request)).

---

### 6.3 Reviewing Draft Reports

When a technician uploads a report and sets the status to **"Draft Report Submitted"**, it appears in your dashboard alert.

1. Click on the alert or go to **All Requests**.
2. Find the request with status **"Draft Report Submitted"**.
3. Open the detail panel and download the report.
4. If the report is acceptable, update the status to **"Draft Report Accepted"**.

---

## 7. NDT Technician Guide

As a technician, the portal shows you the jobs assigned to you so you can update progress and upload your inspection reports.

### 7.1 Your Jobs Page

When you log in, you see your jobs divided into two sections:

- **Active jobs** — Jobs currently assigned to you that are in progress.
- **Completed jobs** — Jobs you have finished (compact list for reference).

Each active job card shows:
- Request ID and status badge
- Company name, NDT method, location, and scheduled date
- A visual timeline showing where the job sits in the workflow
- Scope details and manager notes
- Support work section — shows the status of any scaffold, insulation, or painting work (so you know if the site is ready)

---

### 7.2 Updating Job Status

When you start work or reach a new stage, update the status so everyone stays informed.

1. Find the job card (or click **Details** to open the full detail drawer).
2. Click the **"Mark as: [next status]"** button. It always shows the logical next step.
3. Confirm. The status updates immediately and the history is logged.

**Typical technician status flow:**
> Scheduled → Site Work On-going → Site Work Completed → Draft Report Submitted

---

### 7.3 Uploading Your NDT Report

Once you have completed the inspection and written the report:

1. Click **Details** on the job card to open the detail drawer.
2. Scroll to the **NDT Report** section.
3. Click the upload button and select your report file.
4. Once uploaded, update the status to **"Draft Report Submitted"** so the client or coordinator knows it is ready for review.

You can also upload **supporting documents** (site photos, sketches, calibration records) in the **Supporting Documents** section of the same drawer.

---

### 7.4 Viewing Documents

All documents uploaded for a job (by the client, manager, or yourself) are visible in the detail drawer. Click any file to download and view it.

---

### 7.5 Printing Job Details

1. Click **Details** on a job card to open the drawer.
2. Click the **Print** button.
3. The portal opens a print-ready view. Use your browser's print function (Ctrl+P / Cmd+P) to print or save as PDF.

---

## 8. Contractor Guide (Scaffold / Insulation / Painting)

As a support contractor, you see only the jobs assigned to your company. You update the status of your work as you progress through each stage.

### 8.1 Your Jobs Page

When you log in, you see your jobs in two sections:
- **Active jobs** — Work currently assigned to you.
- **Completed jobs** — Finished work (compact list for reference).

Each active job card shows:
- The type of work (Scaffold / Insulation / Painting) and current status badge
- Company name, site location, NDT method, and the scheduled NDT date
- A **progress bar** showing all stages of your work, with completed stages ticked, the current stage highlighted, and future stages shown as upcoming
- Any notes from the manager

---

### 8.2 Updating Your Work Status

As you complete each stage of your work, mark it in the portal.

1. Find the active job card.
2. Click the **"Mark: [next stage]"** button.
3. The status updates and moves to the next step.

**Scaffold stages:**
> Pending → Erection → Ready to Use → Dismantling → Completed

**Insulation Removal stages:**
> Pending → In Progress → Ready to Use → Completed

**Painting stages:**
> Pending → In Progress → Completed

> **Important:** The NDT technician cannot begin inspection until the scaffold/insulation status shows **"Ready to Use"**. Please keep your status up to date so the team can plan accordingly.

---

### 8.3 Adding Notes

If you need to leave a note on a job (e.g. delay reason, special condition):

1. Click the **Note** button on the job card.
2. Type your note in the box that appears.
3. Confirm to save.

The note will be visible to the manager and technician.

---

## 9. Request Status Explained

Every NDT request moves through the following stages. You will see these statuses throughout the portal.

| Status | What it means |
|--------|---------------|
| **New request** | Just submitted by the client. Waiting for the manager to schedule it. |
| **Scheduled** | Manager has assigned a technician and set a date. |
| **Site Work On-going** | NDT technician is on site performing the inspection. |
| **Site Work Completed** | Inspection is done. Report is being written. |
| **Draft Report Submitted** | Technician has uploaded the draft report. Awaiting review. |
| **Draft Report Accepted** | Client or coordinator has reviewed and approved the draft. |
| **Report Accepted** | Final report accepted. Job is closing. |
| **Cancelled** | Request was cancelled at some point in the process. |

---

## 10. Support Job Status Explained

Support jobs (scaffold, insulation, painting) have their own separate status tracking.

### Scaffold

| Status | Meaning |
|--------|---------|
| Pending | Assigned but not yet started |
| Erection | Scaffolding is being built |
| Ready to Use | Scaffold is up and safe — NDT can proceed |
| Dismantling | Inspection done, scaffold being taken down |
| Completed | All scaffold work finished |

### Insulation Removal

| Status | Meaning |
|--------|---------|
| Pending | Assigned but not yet started |
| In Progress | Insulation is being removed |
| Ready to Use | Area is clear — NDT can proceed |
| Completed | All insulation work finished |

### Painting

| Status | Meaning |
|--------|---------|
| Pending | Assigned but not yet started |
| In Progress | Painting is underway |
| Completed | Painting finished |

---

## 11. Frequently Asked Questions

**Q: I cannot log in. What should I do?**
A: Check that your email and password are correct. If you have forgotten your password, use the "Forgot password" link on the login page. If your account does not exist yet, contact your manager to invite you.

**Q: I submitted a request — when will it be scheduled?**
A: The manager reviews new requests and schedules them. Once scheduled, the status will change to "Scheduled" and you will be able to see the date and technician in the request details.

**Q: How do I know when my report is ready?**
A: Your dashboard will show an alert under "Reports waiting for review" when a draft report has been uploaded. You will also see the request status change to "Draft Report Submitted".

**Q: I uploaded the wrong document. Can I remove it?**
A: Contact your manager to remove incorrect files.

**Q: Can I edit a request after submitting it?**
A: Requests cannot be edited after submission. If something is wrong, add a comment in the request detail panel explaining the correction needed, and notify your manager directly.

**Q: As a technician, what do I do if the scaffold is not ready when I arrive on site?**
A: Check the support job status in your job detail panel. If it still shows "Erection" or "Pending", the scaffold is not ready. Contact the scaffold contractor or your manager to resolve the delay. Update your job status to reflect any delays.

**Q: How do I print a request or job?**
A: Open the request or job detail panel and click the **Print** button. Your browser's print dialog will open — you can print to paper or save as PDF.

**Q: I can see a "Cancel" button on a request. What happens if I cancel it?**
A: Cancelling a request marks it as "Cancelled" and stops the workflow. This cannot be undone. Only cancel if the job is genuinely no longer needed. Contact your manager if you are unsure.

**Q: What does "Meridium / Turn Around / Ad-Hoc" mean under Job Category?**
A: These are the job categories used by Cutech:
- **Meridium** — Planned inspection from the Meridium asset management system.
- **Turn Around** — Inspection during a planned plant shutdown / turnaround.
- **Ad-Hoc** — Unplanned or one-off inspection request.

---

*For system support or access issues, contact your Cutech manager.*

*Portal developed by TicWerks.*
