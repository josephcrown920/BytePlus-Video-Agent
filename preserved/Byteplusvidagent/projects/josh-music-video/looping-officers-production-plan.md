# Looping Officers — Production Plan

**Project:** NBA Josh - "Street Lights" Music Video
**Scene:** Looping Officers (Surreal Urban Night Scene)
**Duration:** 15 seconds
**Format:** 16:9 Cinematic
**Layers:** 2 + Composite
**Primary Tool:** Seedance 2.0 (BytePlus)
**Edit Tool:** CapCut / Premiere / DaVinci Resolve

---

## 01 — The Concept

A cinematic 15-second urban night scene with a surreal glitch twist:

- **NBA Josh** performs calmly in the foreground (bottom-right of frame)
- **Police officers** run aggressively in the background (top-left of frame)
- The officers are **stuck in a loop** — running hard but going nowhere
- The camera is **completely static and locked-off**
- At the end, Josh glances over his shoulder with a smirk, then casually walks out of frame

**Key Effect:** The "loop" is not an AI trick — it is created in post by taking 2-3 seconds of officer footage and looping it for the full 15 seconds while Josh's clip plays normally. Simple, effective, surreal.

---

## 02 — Frame Composition

```
┌──────────────────────────────────────────────────┐
│  ┌──────────────┐                                │
│  │  OFFICERS    │                                │
│  │  top-left    │                                │
│  │  full body   │                                │
│  │  looping     │                                │
│  └──────────────┘                                │
│           EMPTY SPACE                            │
│           creates depth + tension                │
│                                                  │
│                          ┌────────────────────┐  │
│                          │     NBA JOSH       │  │
│                          │   bottom-right     │  │
│                          │    waist up        │  │
│                          │   foreground       │  │
│                          └────────────────────┘  │
└──────────────────────────────────────────────────┘
```

**Why this works:** The diagonal composition creates natural visual tension — officers top-left chasing toward Josh bottom-right. The empty middle space gives the frame cinematic breathing room and makes Josh feel unreachable.

---

## 03 — The Two Layers

### Layer A — NBA Josh (Foreground)
- **Duration:** 10-15 second clip
- **Position:** Bottom right of frame
- **Shot:** Waist up medium shot
- **Action:** Performs his hook with calm, fearless energy. Subtle hand gestures, relaxed confidence. Glances over shoulder near end. Walks out of frame at close.
- **Camera:** Static locked-off camera. Zero camera movement.

### Layer B — Officers (Background)
- **Duration:** Only 2-3 seconds needed (looped 5-7x)
- **Position:** Top left of frame
- **Shot:** Full body, running hard
- **Action:** Arms pumping intensely, leaning forward, determined urgent expressions
- **Camera:** Static locked-off camera (must match Layer A exactly)
- **Post:** Motion blur applied in edit. Soft blur for depth.

---

## 04 — AI Generation Prompts

### Layer A Prompt — NBA Josh (Seedance 2.0)

```
Cinematic music video scene. A tall athletic Black male rapper with long red-tipped dreadlocks, diamond "NBA JOSH" chain, arm tattoos, studded leather belt, black leather pants and gold watch, stands in the bottom right of frame, shot from waist up, facing slightly left toward camera. Dark wet urban street at night. Performs his hook with calm fearless energy, subtle hand gestures, relaxed confidence. Static locked-off camera. Zero camera movement. Dramatic overhead streetlight, high contrast, moody atmosphere. Near the end he glances over his left shoulder with a smirk, then turns and slowly walks out of frame. Realistic, cinematic, music video aesthetic, shallow depth of field.
```

### Layer B Prompt — Officers (Seedance 2.0)

```
Two male police officers in full navy uniforms with silver badges and black tactical belts run aggressively in the upper left of frame, full body visible, running hard toward the right side of screen. Dark wet urban street at night. Arms pumping intensely, leaning forward, determined urgent expressions. Dramatic high contrast night lighting. Motion blur on their bodies. Static locked-off camera. Cinematic, realistic, 2-3 seconds of strong running motion.
```

---

## 05 — Seedance Generation Settings

| Setting | Layer A (Josh) | Layer B (Officers) |
|---|---|---|
| **Model** | Seedance 2.0 | Seedance 2.0 |
| **Mode** | Text to Video | Text to Video |
| **Duration** | 12 seconds | 4 seconds |
| **Aspect Ratio** | 16:9 | 16:9 |
| **Resolution** | 1080p | 1080p |
| **Variations** | Generate 3, pick best | Generate 3, pick best |
| **Camera** | Static, zero movement | Static, zero movement |

💡 **Tip:** Use a reference image of Josh's face as first frame for Layer A to lock in likeness. Seedance sometimes needs 2-3 attempts to lock in likeness.

---

## 06 — 15-Second Scene Timeline

### 0:00 – 0:03 — Opening
Josh appears bottom-right, performing calmly. Officers begin running in top-left. Loop starts.

### 0:03 – 0:08 — Build
Officers continue looping. Josh performs hook with confident hand gestures. No one is gaining ground.

### 0:08 – 0:12 — Tension Peak
Officers still stuck in the loop. Running hard, going nowhere. The surreal glitch energy is obvious. Josh completely unbothered.

### 0:12 – 0:14 — The Look
Josh finishes his hook. Pauses briefly. Glances over his left shoulder at the officers with a calm, confident smirk.

### 0:14 – 0:15 — Exit
Josh casually turns and walks out of frame. Officers still running in place. Scene ends.

---

## 07 — Post-Production Composite (Step by Step)

**In CapCut / Premiere / DaVinci Resolve:**

1. **Import Layer B (Officers) as base track**
   Open new project → Add the officers clip to the main timeline first. This is your background.

2. **Loop the officers clip to 15 seconds**
   Copy → paste it back-to-back until total length reaches 15 seconds. Or use the loop feature.
   *Pro tip:* Crossfade 2 frames between each loop to hide the cut.

3. **Add Layer A (Josh) as overlay**
   Add overlay → import the Josh clip. Place it over the officers timeline. Scale and position him to the bottom-right of frame.
   *Use mask / chroma key if needed to clean up edges.*

4. **Apply blur to the officers layer**
   Select officers clip → Effects → add a soft blur filter. This creates depth and the shallow DOF look, pushing them into the background.

5. **Add motion blur to officers**
   Select officers layer → Video Effects → search "Motion Blur". Apply at medium intensity to reinforce the running energy.

6. **Color grade the whole scene**
   Select all → Adjust: Brightness -10, Contrast +20, Saturation -15. Then add a cinematic LUT filter (look for teal/orange presets).
   *Goal:* Match the color of both layers so they look like the same scene.

7. **Add vignette**
   Go to Effects → Vignette. Apply at 30-40% intensity. This darkens the corners and focuses attention on Josh.

8. **Add sound design**
   - Layer B: Distant siren sound, police radio chatter (low volume)
   - Layer A: Josh's vocal track (main focus)
   - Ambient: Rain sounds, city atmosphere

9. **Export at highest quality**
   Export → select 1080p at 60fps (or 24fps for more cinematic feel).

---

## 08 — Tools & Cost

| Tool | Purpose | Cost | Access |
|---|---|---|---|
| **Seedance 2.0** | Video generation (via BytePlus ARK) | API credits | BytePlus console |
| **Seedream 5.0** | Character reference image generation | API credits | BytePlus console |
| **CapCut** | Editing + compositing | Free | Desktop / Mobile |
| **Optional: Seedream** | Generate reference images for Josh face lock | API credits | BytePlus console |

**Strategy:** Generate everything on preview first. Only commit to full 1080p generation once you have confirmed that the generations look right — good likeness on Josh, right composition, right energy.

---

## 09 — Continuity Checklist

- [ ] Josh's face/likeness is consistent between reference and video
- [ ] Both layers use **exactly the same lighting** (overhead streetlight, night)
- [ ] Both layers have **exactly the same camera angle** (eye level, static)
- [ ] Both layers have **matching color temperature** (cool blue night)
- [ ] Josh is in the foreground (bottom-right), officers in background (top-left)
- [ ] The empty middle space is maintained for cinematic breathing room
- [ ] Rain/wet street is present in both layers
- [ ] Officers loop seamlessly (crossfade transitions)
- [ ] Final color grade unifies both layers

---

*Out The Mud Records · Video Plan · NBA JOSH · REF-002*
