---
lang: en
title: Boundaries before layers
description: A module begins where shared agreements end and responsibility for behaviour begins.
date: 2026-10-17
translationKey: boundaries-before-layers
---

A folder called `components` is not an architecture. It says where files live, not what they are allowed to know about each other.

A boundary becomes real when it has a contract: an input, an output and a reason to change. Layers drawn on a diagram are only useful if the code can be read along the same lines.

I prefer to start with one narrow interface and let the structure grow around it. The shape that emerges from working code is easier to defend than the shape that was drawn in advance.
