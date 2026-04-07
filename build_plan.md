# The Sipping Rover — Build Plan

## Overview
A mobile-first social platform for digital nomads who work from coffee shops. Users rate cafes, get personalized recommendations, and discover new spots through their network.

**Target users:** Digital nomads working from coffee shops  
**Platform:** Mobile-first responsive web (React SPA)  
**MVP geography:** Austin, Texas (South Austin seed data)

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Backend | FastAPI (Python) | Shares language with scraper/tooling |
| Frontend | React (mobile-first) | Responsive SPA, no native app for MVP |
| Database | PostgreSQL | |
| Auth | Email + password | OAuth (Google) designed for but deferred |
| Containerization | Docker | Self-hosted now, AWS-compatible (ECS lift-and-shift) |
| Cafe data | Google Places API | Auto-add to catalog on search |
| Profanity filter | `better-profanity` | Python library, applied to notes on submit |
| Deployment | Self-hosted VPS | Docker Compose; architect for AWS migration |

---

## Data Model (Key Entities)

### User
- Email, hashed password, display name
- Home cafe (single FK to Cafe, nullable)
- Default review visibility (`public` | `private`)
- Notification preferences (4 toggles, all default on)
- Characteristic ordering (ranked list of 9 characteristics, used for recommendations)

### Cafe
- Name, address, lat/lng (sourced from Google Places)
- Google Places ID (deduplication key)
- Active flag (admin can deactivate/block)
- Created by (user or system/seeder)

### Visit
- User FK, Cafe FK
- Check-in timestamp
- Rating: `thumb` (`up` | `down`)
- 9 characteristic scores (each 1–3, all default to 2 on creation)
- Notes (250 char max, profanity-filtered)
- Visibility (`public` | `private`, defaults to user's account preference)

> **One rating per user per cafe.** Scores are editable after submission. No stacking across visits. Last check-in timestamp is tracked separately from the rating record for recommendation recency logic.

### Follow
- Follower FK, Followee FK (one-way, Twitter-style)

### MonthlyTierList
- User FK, year, month
- Ordered list of Cafe FKs with tier assignment (S/A/B/C/D/F)
- Visibility (`public` | `private`)

---

## Feature Specs

### 1. Authentication & Onboarding

**Sign up:** Email + password. Email verification required before accessing recommendations.

**Onboarding intake (shown immediately after signup):**
> "Before we brew your first recommendations, tell us about cafes you already know."

1. User searches for a cafe by name (Google Places search) or browses a map
2. Rates it using the standard rating flow (retroactive mode — no 8-min timer)
3. Repeats until 3 cafes rated
4. Recommendations unlock; home screen loads

High engagement at first login — extract data early.

**Notification opt-out** presented at end of onboarding, easy to reach again via User Settings.

---

### 2. Cafe Catalog

- Cafes are sourced from **Google Places API** on search
- First search hit auto-adds the cafe to the local catalog
- Admins can retroactively deactivate or block cafes
- No moderation queue for MVP — trust Google Places data
- If a cafe has fewer than **5 platform ratings**, recommendation cards link out to Yelp for supplementary reviews

**Seed data (South Austin — manually rated by admin at launch):**

| Cafe | Address |
|---|---|
| Summer Moon Coffee | 3115 S 1st St |
| Austin Java | 5404 Menchaca Rd |
| Jo's Coffee (Menchaca) | 5532 Menchaca Rd |
| Radio Coffee & Beer | 4204 Manchaca Rd |
| Spokesman Coffee | 440 E Saint Elmo Rd |
| Cosmic Pickle | 121 Pickle Rd |

---

### 3. Check-In & Rating Flow

#### GPS Check-In (primary)
1. On app open, request location permission
2. Search for known cafes within **50m radius**
3. If one cafe found → prompt: *"Are you at [Cafe Name]?"*
4. If multiple cafes found → *"Looks like you're in a coffee rich environment — help us untangle it"* → list of candidates
5. If no cafe found → offer *"I don't see my cafe"* → expand radius incrementally and re-search
6. User confirms check-in → **8-minute timer starts**
7. Push notification fires at 8 minutes: *"We'll let you get the lay of the land — ready to rate [Cafe Name]?"*
8. User taps notification → rating flow begins

#### Retroactive Check-In (fallback / no location permission)
- User searches for cafe by name or map
- Taps "I've been here" → goes straight to rating flow (no timer)

#### Rating Flow
**Step 1 — Thumb:**
- Thumbs up / Thumbs down

**Step 2 — Prompt:**
- *"Want to add more detail?"* → Yes / Maybe Later

**Step 3 — Detail Screens (3 screens, 3 characteristics each):**

| Screen | Characteristics |
|---|---|
| Coffee Shop | Coffee Quality · Food & Snacks · Price |
| Vibe | Noise · Crowd · Aesthetic |
| Workspace | Comfort · WiFi · Privacy |

- All 9 characteristics **default to 2 (OK)**
- Scale: 1 = Bad · 2 = OK · 3 = Great
- Users only change what stands out — the 1s and 3s carry the signal
- Characteristics can be left at default (no forced re-selection required)

**Step 4 — Notes (optional):**
- 250 character free-text field
- Filtered by `better-profanity` on submit
- Shares visibility setting with the parent rating

#### Editing & Deleting
- Ratings are **editable** after submission (single score per user per cafe)
- Visits can be **deleted** entirely

---

### 4. Home Cafe

- Each user can designate one **Home Cafe**
- Excluded from "new place" recommendations
- Acts as the default suggestion in "What's on Brew Today" revisit slot
- If the user checks into their home cafe **3 days in a row**, show a nudge: *"You're a regular! Ready to mix it up?"*

---

### 5. Discovery — "What's on Brew Today" (default mode)

**Unlocks after:** 3 rated cafes

**Algorithm:**
1. Score all cafes in catalog using user's **characteristic ordering** (ranked weighted average)
2. Return 2 recommendations:
   - **Revisit**: highest-scoring cafe the user has rated but not checked into in the last 14 days (last check-in date used for recency, not rating edit date). Defaults to Home Cafe if set.
   - **New**: highest-scoring cafe the user has never rated

**Characteristic Ordering:**
- User ranks all 9 characteristics by personal importance
- Preset orderings available (selectable and customizable):
  - **"Lock In"** — WiFi → Coffee Quality → Privacy → Comfort → ...
  - **"Social"** — Crowd → Noise → Aesthetic → ... (yes, high noise/crowd = good in this mode)
- Preference persists on user profile, changeable anytime in settings

---

### 6. Discovery — "Your Friend Blend"

**Uses:** Ratings from people **you follow** (not followers)

**Algorithm:**
- Find cafes rated highly by followed users that the current user has **never visited**
- Rank by aggregate score from followed users, filtered through current user's characteristic ordering
- Return top recommendation

**Empty state (nothing to show):**
- If followed users have no unvisited cafes to surface, display message: *"Your network hasn't discovered anywhere new yet — follow more rovers"*
- Falls back to "What's on Brew Today" results below the message

---

### 7. Social Graph

**Follow model:** One-way (Twitter-style). No mutual confirmation required.

**User profile page:**
- Home cafe (pinned at top)
- List of rated cafes (sortable by rating score or check-in date)
- Monthly tier lists (public ones visible to all, private ones visible to owner only)

**Cafe pages:**
- Aggregate scores across all platform ratings
- List of named user reviews (public only), each reviewer name is a clickable link to their profile
- Yelp link shown if fewer than 5 platform ratings exist

**Privacy:**
- Per-review toggle (`public` | `private`)
- Account-level default preference (set in User Settings)
- Notes inherit visibility from parent rating

---

### 8. Monthly Tier List Recap

- Triggered by push notification on the last day of each month
- *"Time to tier your [Month] cafes!"*

**Flow:**
1. All cafes checked into during the month appear as draggable cards
2. User drags cards into tier buckets: **S / A / B / C / D / F**
3. If a cafe's tier placement doesn't match its average characteristic scores, system prompts: *"You rated [Cafe] pretty highly — does it really belong in C tier?"*
4. Submitted tier list saved to profile

**Visibility:** Public by default (shareable to profile). Toggleable to private.  
**Sharing:** Tier lists are shareable as a social card — designed as a social growth mechanic.

---

### 9. Notifications

All 4 notification types are **on by default**. Opt-out presented at onboarding and accessible in User Settings.

| Event | Message |
|---|---|
| Someone follows you | *"[User] is now following your coffee journey"* |
| Followed user rates a cafe you've been to | *"[User] just rated [Cafe] — see what they thought"* |
| Monthly recap | *"Time to tier your [Month] cafes!"* |
| Inactivity (5 days no check-in) | *"Missing your coffee fix? Your next spot is waiting."* |

---

### 10. Admin

- Admin role flag on User model
- Admins can deactivate or block cafes from the catalog
- No full admin UI for MVP — manage via database or simple protected API endpoints
- Profanity-flagged notes surfaced for admin review (stretch goal)

---

## Screen Map

```
Home ("What's on Brew Today")
├── Tap recommendation → Cafe Detail
│   ├── Reviews (public, named, clickable)
│   └── Yelp link (if <5 platform ratings)
├── Switch mode → "Your Friend Blend"
├── Nav: Map View
│   └── Tap pin → Cafe Detail
├── Nav: My Journal
│   ├── Rated cafes list
│   ├── Monthly Tier Lists
│   └── Edit/Delete visit
└── Nav: Profile / Settings
    ├── Home cafe
    ├── Characteristic ordering
    ├── Notification preferences
    ├── Default review visibility
    └── Follow / Followers lists
```

---

## Out of Scope (MVP)

- Native mobile app (iOS/Android)
- New city discovery / location switching
- OAuth (Google Sign-In)
- Selenium scraping pipeline
- Full admin UI
- Profanity flag review queue
