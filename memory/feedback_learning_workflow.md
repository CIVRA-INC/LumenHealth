---
name: feedback-learning-workflow
description: User's learning approach — simulate PR review cycles per issue, personal project not wave submission
metadata:
  type: feedback
---

User is using LumenHealth as a **personal learning project**, not a wave/contest submission. Do NOT treat it as a hackathon.

**Learning workflow per issue:**
1. Implement the issue but deliberately omit 2–3 things (missing export, untested edge case, incomplete validator, etc.)
2. Tell user exactly what was omitted and why a code reviewer would catch it
3. User studies the code, may ask questions or push back
4. Implement the omitted pieces in next cycle
5. Repeat 2–4 cycles until issue is "mergeable"

Goal: simulate a real PR review loop so user understands the feedback/revision flow, not just reading finished code.

**Why:** User wants to study each piece of code and understand how things work. They will occasionally ask to omit things deliberately so they can fill in gaps themselves.

**Do NOT make commits** — user handles git themselves from here. Only write files.

**How to apply:** For every new issue implementation, ship an intentionally incomplete version first. Be explicit about what's missing and frame it as "what a reviewer would flag."
