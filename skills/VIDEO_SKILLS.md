# Video Agent Skill Pack

- **HeyGen Avatar:** establish persistent face/voice identity before presenter video when needed.
- **HeyGen Video:** create new presenter-led videos.
- **HeyGen Translate:** translate/dub an existing source video while preserving presenter identity and lip-sync.
- **Chengfeng 剪口播:** transcribe → detect mistakes/silence → review → user-confirmed cut → retranscribe cut → corrected subtitles.
- **Chengfeng 口播成片:** storyboard → timeline preview → configured aspect ratio/animation → MP4 → QA.
- **Ian Xiaohei SVG Motion:** semantic SVG + GSAP motion from a cognitive anchor; no automatic PNG vectorization.
- **Chengfeng 自进化:** integrate durable corrections into the relevant methodology section.

Preserve project memory and identity locks across skills. Chain workflows where required and exclude unrelated skills from video routing.

## Mode-aware routing

`selectVideoSkills(instruction, mode)` in `agent-core/video-agent-skills.ts` layers production-mode defaults on top of instruction-matched skills:

- **Cinematic mode** always includes **Chengfeng 口播成片** (storyboard/timeline) and **Ian Xiaohei SVG Motion**, so continuity-aware sequencing and motion review stay in the loop.
- **Viral mode** always includes **Chengfeng 剪口播** (cut/caption) and **Chengfeng 口播成片**, so fast-cut, caption-ready output is the default rather than an afterthought.
- **Standard mode** relies on instruction-matched skills only.

Derived from the user-supplied HeyGen and Chengfeng video skill packs.
