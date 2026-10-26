---
lang: en
title: A fallback path
description: Every external dependency needs a scenario in which it is absent.
date: 2026-09-19
translationKey: a-fallback-path
---

A dependency is not only the API that works. It is also the timeout, the empty response and the service that is down on a Sunday.

The fallback does not have to be clever. A cached value, a plain message or a disabled control is often enough, as long as the user is told what happened.

What matters is that the fallback is designed, not discovered during an incident. The best time to write it is while the happy path is still fresh.
