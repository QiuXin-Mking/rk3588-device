# Product Deviation UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Align the local React interface with `01-产品偏差.md` without adding backend behavior or deciding product items marked as pending.

**Architecture:** Keep the existing React/Vite single-page structure and bottom navigation. Replace the home and realtime-page presentation with product-device models derived from existing offline status fields, while preserving hardware-dependent APIs for later RK3588 integration.

**Tech Stack:** React 19, TypeScript, Vite 6, Vitest, Testing Library, jsdom.

## Global Constraints

- Do not start or modify backend behavior in this phase.
- Undeveloped devices remain disabled and visually grey.
- Unknown hardware state is displayed as offline; do not invent online data.
- Y8 display scope, task source, task-defined capture UI, and storage destination remain pending product decisions.
- The fixed 1920×1080 touch layout must not overflow.

---

### Task 1: Home device and marketplace alignment

**Files:**
- Modify: `frontend/src/features/home/HomeScreen.tsx`
- Modify: `frontend/src/features/expansion/ExpansionScreens.tsx`
- Modify: `frontend/src/styles/device.css`
- Test: `frontend/src/features/home/HomeScreen.test.tsx`
- Test: `frontend/src/features/expansion/MarketplaceScreen.test.tsx`

- [x] Write failing tests for the eight home devices, disabled states, three marketplace display devices, and absence of transaction UI.
- [x] Run tests and confirm failures against the previous HSuit/iSuit interface.
- [x] Implement the requested device cards and display-only marketplace.
- [x] Run tests and confirm all home and marketplace tests pass.

### Task 2: Device status, camera channels, and details

**Files:**
- Modify: `frontend/src/features/data/DataScreens.tsx`
- Modify: `frontend/src/styles/device.css`
- Test: `frontend/src/features/data/RealtimeScreen.test.tsx`

- [x] Write failing tests for three status cards, four camera channels, removal of duplicate battery data, and device details.
- [x] Run tests and confirm failures against the previous hand-tracking interface.
- [x] Implement product device status cards and details using existing offline/hardware status fields.
- [x] Run tests and confirm all data-screen tests pass.

### Task 3: Navigation, build, and browser verification

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `frontend/src/test/setup.ts`

- [x] Make Home the initial tab while preserving the four fixed click-only navigation entries.
- [x] Run the complete unit and interaction suite.
- [x] Run TypeScript checking and the production Vite build.
- [x] Verify Home, Data, Marketplace, device details, and Records at 1920×1080 in a real browser.
