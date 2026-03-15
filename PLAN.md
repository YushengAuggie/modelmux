# API Pilot — Master Plan

> *Test any LLM from your pocket.*

**App Name:** API Pilot (working title — can change)
**Platform:** Web first (mobile-responsive) → iOS later
**Tech Stack:** React/Next.js or pure HTML+JS (TBD)
**Status:** Phase 0 — Planning

---

## 🎯 Vision

A beautiful, mobile-first **LLM API testing app** for iOS. The primary use case: developers testing LLM endpoints (OpenAI, Anthropic, Gemini, Groq, Mistral, local models, etc.) from their phone — swapping models, tweaking prompts, comparing responses, adding tools.

Also supports basic raw HTTP requests (like a lightweight Postman), but that's secondary. The core magic is making LLM API testing **dead simple on mobile**.

**Why this exists:**
- No mobile app exists for testing LLM APIs specifically
- Postman killed their mobile app
- Developers test LLM endpoints constantly but always need a laptop
- The LLM ecosystem is fragmented (3+ formats) — we normalize it
- Every AI engineer has a phone. Not everyone has a laptop at hand.

**Niche:** The intersection of "Postman mobile" + "LLM playground" that nobody has built.

---

## 📋 Phases

### Phase 0: Research & Design (current)
- [x] Create project folder and master plan
- [ ] **Postman competitive analysis** — deep dive into features, UX, what works, what doesn't
- [ ] **Competitor scan** — existing iOS API clients (HTTPBot, Paw, RapidAPI, HTTP Catcher, etc.)
- [ ] **Feature matrix** — what to build in v1 vs later
- [ ] **UI/UX design** — wireframes, user flows, mobile-specific considerations
- [ ] **Technical architecture** — data model, networking, storage

### Phase 1: iOS Developer Account
- [ ] Enroll in Apple Developer Program ($99/year)
- [ ] Set up certificates, provisioning profiles
- [ ] Create App ID and bundle identifier

### Phase 2: MVP Build
- [ ] Core request builder (URL, method, headers, body, params)
- [ ] Response viewer (status, headers, body with syntax highlighting)
- [ ] Request history
- [ ] Collections (save & organize requests)
- [ ] Environment variables
- [ ] Basic auth support

### Phase 3: Polish & Launch
- [ ] App Store listing (screenshots, description, keywords)
- [ ] Landing page / product website
- [ ] TestFlight beta
- [ ] App Store submission
- [ ] Launch marketing (Product Hunt, Reddit, Twitter/X, Hacker News)

### Phase 4: Growth
- [ ] Import Postman collections
- [ ] OAuth 2.0 flow support
- [ ] WebSocket support
- [ ] GraphQL editor
- [ ] iCloud sync
- [ ] Share collections via link
- [ ] Apple Watch complications (quick status checks)

---

## 🔍 Research Deliverables (Phase 0)

### 1. Postman Analysis Report (`research/postman-analysis.md`)
- Core features breakdown
- UX patterns (what makes it easy)
- Pain points users complain about
- Mobile-specific gaps
- What to steal, what to skip

### 2. Competitor Landscape (`research/competitors.md`)
- Existing iOS API clients
- Feature comparison table
- App Store ratings & reviews analysis
- Gaps and opportunities

### 3. Feature Spec (`FEATURES.md`)
- MVP (v1.0) feature list — ruthlessly scoped
- v1.1+ roadmap
- Explicit "NOT building" list

### 4. UI/UX Design (`design/`)
- User flows (send a request, save to collection, switch environment)
- Wireframes (key screens)
- Design system (colors, typography, components)
- Mobile-specific UX decisions

### 5. Technical Architecture (`ARCHITECTURE.md`)
- Data model (requests, collections, environments, history)
- Networking layer design
- Local storage (Core Data vs SwiftData vs SQLite)
- Project structure

---

## 🍎 iOS Developer Account Guide

### What you need:
1. **Apple ID** — you probably already have one
2. **Enroll at** [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll/)
3. **Cost:** $99/year (required to publish to App Store)
4. **Timeline:** Usually approved in 24-48 hours

### Step-by-step:
1. Go to [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll/)
2. Sign in with your Apple ID
3. Choose "Individual" enrollment (not Organization)
4. Fill in personal details
5. Pay $99 USD
6. Wait for approval (usually same day to 48 hours)
7. Once approved, open Xcode → Preferences → Accounts → Add your Apple ID
8. Xcode auto-manages signing certificates

### What you get:
- Publish apps to the App Store
- TestFlight beta distribution (up to 10,000 testers)
- Access to all iOS APIs and frameworks
- CloudKit, push notifications, etc.
- App Analytics in App Store Connect

### Before you pay:
You can develop and test on your own device with just a free Apple ID + Xcode. You only need the $99 account when you're ready to ship to TestFlight or the App Store. **Don't pay until we're ready to test.**

---

## 🌐 Landing Page

Similar to your personal site — clean, single page, pure HTML/CSS:
- Hero: app name, tagline, screenshot mockup
- Features: 3-4 key selling points
- Download: App Store badge (once live)
- Open source: GitHub link (if applicable)

Will be built in Phase 3, hosted on GitHub Pages.

---

## 📁 Project Structure

```
api-pilot/
├── PLAN.md              ← this file (master plan)
├── FEATURES.md          ← feature spec (after research)
├── ARCHITECTURE.md      ← technical design (after research)
├── research/
│   ├── postman-analysis.md
│   └── competitors.md
├── design/
│   ├── user-flows.md
│   ├── wireframes/
│   └── design-system.md
├── ios/                 ← Xcode project (Phase 2)
├── landing/             ← product website (Phase 3)
└── assets/              ← screenshots, icons, marketing
```

---

## 🔑 Key Decisions (to make during Phase 0)

| Decision | Options | Status |
|----------|---------|--------|
| App name | API Pilot / Reqo / Pinch / Fetcher / ? | TBD |
| Pricing model | Free / Freemium / Paid | TBD |
| Open source? | Yes (builds trust) / No (monetize) | TBD |
| SwiftUI vs UIKit | SwiftUI (modern, faster dev) | Leaning SwiftUI |
| Data persistence | SwiftData vs Core Data vs SQLite | TBD |
| Sync strategy | iCloud / none for v1 | None for v1 |
| Import format | Postman collections JSON | v1.1+ |

---

## ⏭️ Next Steps

1. **Research Postman** — deep dive into features, UX, user complaints
2. **Scan competitors** — find and analyze iOS API clients
3. **Write analysis reports** → `research/`
4. **Define MVP features** → `FEATURES.md`
5. **Design UI/UX** → `design/`

---

*Created: 2026-03-14*
*Last updated: 2026-03-14*
