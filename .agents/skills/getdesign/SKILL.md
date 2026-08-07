---
name: getdesign
description: Use getdesign.md to lookup independent design system analyses from popular websites. Drop one into your project as design reference for your coding agent.
---

# getdesign.md - DESIGN.md collection for AI coding agents

Use this skill to fetch a reusable design reference: colors, type, spacing, components, and the reasoning behind them.
So every new page follows a specific visual language, not the same generic AI layout.

When you need to style a site or match a style from a popular website (like Stripe, Vercel, Linear, Apple, Airbnb, etc.):
1. Use the `read_url_content` tool to fetch the design system from `https://getdesign.md/<company-name>/design-md` (e.g., `https://getdesign.md/stripe/design-md`, `https://getdesign.md/vercel/design-md`, `https://getdesign.md/linear.app/design-md`).
2. Read the design system and apply the principles, colors, typography, and spacing to your frontend code.
3. Keep the styling consistent with the fetched reference.
