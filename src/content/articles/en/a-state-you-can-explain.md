---
lang: en
title: A state you can explain
description: Users do not need the whole transition graph; they need an answer to what is happening now and what comes next.
date: 2026-10-09
translationKey: a-state-you-can-explain
---

A state machine can be correct and still be impossible to explain. The user does not see the graph. They see a screen at one moment and need to know what it means.

So every visible state should have a short sentence: what is happening, what the system is waiting for, and what the user can do. If the sentence needs three clauses, the state is probably doing too much.

This is also a useful review question. When a new branch is added, ask which sentence changes. A branch that changes nothing visible may not need to exist.
