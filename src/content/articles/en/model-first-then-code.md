---
lang: en
title: Model first, then code
description: "Good code starts with clear boundaries: which states exist, who changes them, and what the system promises when something fails."
date: 2026-10-21
translationKey: model-first-then-code
---

The first draft of a feature is rarely code. It is a short description of the states: empty, loading, ready, failed. Once those have names, the code has somewhere to go.

A model is useful when it answers three questions: what can happen, who is allowed to make it happen, and what the user sees when it does. Everything else is detail.

This does not require a diagram or a long document. A paragraph and a list are enough. The point is to decide before the compiler forces the decision.
