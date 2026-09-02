# Video Agent Iteration Audit

Shared baseline now includes project memory, production routing, ModelArk-first video/image preference with FAL/Replicate/Vast fallbacks, ModelArk SSE, supplied preset index, and video-skill routing.

Acceptance path: `UI → API → agent memory/context → provider router → provider job → progress → QA → targeted revision → render → verified artifact`.

Open items are deliberately visible: live ModelArk model activation must be supplied through server secrets; UI-to-SSE end-to-end smoke testing is still required per product surface; real frame-level QA and durable queue behavior depend on deployed vision/Redis/Postgres/render workers. ModelArk is a preferred backend, not a hard lock.
