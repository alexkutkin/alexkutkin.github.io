---
lang: en
title: Errors as part of the contract
description: If a failure is part of what the system promises, it needs a name, a place and a clear way to recover.
date: 2026-10-13
translationKey: errors-as-contract
---

An error is not an exception to the design. It is one of the outcomes the design has to cover.

That means a failure needs the same care as a success: a name the user can understand, a place where it is shown, and a path back to work. A red box with a stack trace is not a recovery path.

The test is simple. Describe what the user sees when the network is gone, the token has expired and the data is half-loaded. If the description is missing a sentence, the contract is missing a state.
