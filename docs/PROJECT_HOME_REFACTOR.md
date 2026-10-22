# ProjectHome refactor

This change is scoped to `client/src/Projects/ProjectHome.js`, its new `project-home/` feature folder, characterization tests and this report. Existing uncommitted changes were preserved. Backend code, schemas, deployment files, package versions, AuthContext, private Axios, the private-media hook and InspectionVideoPlayer were not changed in this task. No production data, commits, pushes or deployments were involved.

## Component responsibility map

All paths below are relative to `client/src/Projects/`.

| File | Responsibility | Lines |
| --- | --- | ---: |
| [ProjectHome.js](../client/src/Projects/ProjectHome.js) | Route ID, active utility, loading/error display and page composition | 59 |
| [useProjectHomeData.js](../client/src/Projects/project-home/useProjectHomeData.js) | Load project and persisted user identity; derive existing control flags; update shared videos, permissions and generated-section choices | 79 |
| [ProjectOverview.js](../client/src/Projects/project-home/ProjectOverview.js) | Project metadata, editable status draft and status request | 91 |
| [ProjectActions.js](../client/src/Projects/project-home/ProjectActions.js) | Delete project, toggle permission list and remove permissions | 79 |
| [PipelineSectionsPanel.js](../client/src/Projects/project-home/PipelineSectionsPanel.js) | Per-utility count drafts, replacement confirmation and generation request | 77 |
| [ProjectVideos.js](../client/src/Projects/project-home/ProjectVideos.js) | Utility-filtered video cards, section assignment, existing private player, deletion and detection navigation | 138 |
| [VideoUploadPanel.js](../client/src/Projects/project-home/VideoUploadPanel.js) | Title/notes draft, drop validation, upload/attach/cleanup sequence and upload progress | 147 |
| [ProjectReportDownloads.js](../client/src/Projects/project-home/ProjectReportDownloads.js) | Authenticated blob downloads and object-URL cleanup | 46 |

Before (starting working tree, including prior uncommitted changes): **753 lines** in ProjectHome. After: **59 lines** in ProjectHome and **657 lines** in the extracted production files, **716 total**. Tests and the markup snapshot are counted separately. The purpose is cohesive ownership and readable workflows, not a smaller aggregate at any cost.

## State ownership and data flow

- `ProjectHome` owns the active utility because the tabs, pipeline editor, video list and upload share it. Feature components remain mounted when the utility changes, preserving drafts and in-flight state. Video cards retain their original video keys; cards filtered out by a tab change unmount as before.
- `useProjectHomeData` owns project data and exposes small mutation callbacks. Successful permission removal/video deletion/upload updates that shared state once. Selected video sections now live only in each video's `assignedSections`; the former duplicate selection map is removed. Existing section choices and assignments survive tab switches.
- Overview owns its status draft. Its existing reset whenever the project object changes is deliberately preserved, including after unrelated project mutations. The status request and existing alert/header behavior are unchanged.
- Pipeline owns count drafts keyed by utility. Generated section choices remain shared with the video list. The original server project snapshot is retained for the detection metadata payload, matching the original page even after generation. Unifying those two representations would change observable request behavior and was not part of this refactor.
- Upload owns its draft and busy state. The utility captured when the drop occurs is used throughout upload/attach, even if the user switches tabs while it is pending. Only a successful attachment appends the new video to shared state. Existing sequential request shapes, alternate response handling, validation, alerts, cleanup and duplicate-drop guard remain intact.
- The video list owns detection busy state shared by all its cards. It submits current assignments through the unchanged private client and preserves the query string plus navigation state. The existing InspectionVideoPlayer and `usePrivateMedia` are reused unchanged: lazy ReactPlayer v2 initialization, `url`/`playsinline`, signed-link acquisition, unmount cleanup and playback-error behavior remain in their original implementation.
- Permission-list visibility is local to ProjectActions. Existing UI flags and role distinctions are preserved; backend authorization remains authoritative. No new provider, generic form/action abstraction, memoization or context layer was introduced.

## Verified dead-code removal

The old permission-grant handlers were reachable only through other unused handlers/state, with no rendered grant UI. Removed their `selectedUsers`, `showPermissions`, `users` state and unused user-directory fetch. The persisted identity request remains `/api/auth/info`. This removes an unused lookup, not a user-directory API contract or a permission feature. Other removed state includes write-only file/estimated-section/status-change values, unused video-draft URL/key/type fields, commented-out add-video UI and unused imports. The existing permission removal UI remains characterized.

## Verification and results

Baseline: the existing **9 client tests passed**. Repository lint had **0 errors / 81 warnings**; ProjectHome had no tests.

Before extraction, 21 page characterization cases plus the markup snapshot passed against the original page. After extraction and additional boundary cases, **all 27 page cases and the same snapshot passed against both a temporary copy of the original page and the refactored page**. The temporary copy was removed, and the snapshot was not updated to accept the refactor.

Final checks:

- `CI=true npm test -- --watchAll=false` in client: **36 tests passed**, 4 suites, 1 snapshot passed. Includes all 9 original tests and 27 ProjectHome cases.
- `node --test server/test/security.test.js`: **20 existing security/API tests passed** with database calls mocked, including generated test video. The localhost listener required sandbox escalation; it did not connect to Atlas.
- Targeted ESLint for the page, extracted files and page tests: **0 errors / 0 warnings**. Full `eslint src`: **0 errors / 61 warnings**, all outside this refactor's files.
- Babel parser syntax check for all 9 changed/new JavaScript/JSX files: passed. `node --check` for the plain JavaScript data hook: passed.
- `npm run build` in client: **passed with existing lint warnings**.
- `git diff --check`: passed. SHA-256 comparisons against the starting working tree confirmed 32 backend/auth/API/media/package/deployment files remained unchanged. No staging or commit was performed.

The page cases cover loading/errors; project metadata and original element/class/style markup; utility filtering including legacy videos; count drafts and generation validation/confirmation/errors; role/member controls; permission removal and failure; status updates/reset; actual private-media hook behavior with ReactPlayer mocked; lazy v2 props, error display and link acquisition after tab remount; upload validation, progress, repeated drops, both attachment response shapes, cleanup after metadata failure, drafts and utility capture; video/project deletion confirmation/failure; assignment persistence; detection payload, busy state, failure and navigation; private report download/error and object-URL cleanup.

## Limitations retained within scope

- No manual browser, pixel comparison, Safari codec/decode or real production API test was performed. The fixture snapshot protects rendered markup/classes/inline styles; ReactPlayer is mocked, so passing playback tests verify integration and lifecycle rather than decoding real video in a browser.
- The installed Testing Library version emits its pre-existing React act deprecation warning. The existing project-creation failure test logs its intentional error. Neither is a newly introduced application failure. Remaining repository lint warnings were not suppressed.
- Existing signed-media-link expiry behavior, storage durability, API error presentation, project-load/in-flight navigation races, and role/UI/backend discrepancies were preserved rather than redesigned. Status changes still use the original response/state behavior; generation still preserves the original detection metadata snapshot. These are not claimed fixed.
- The previous audit's dependency, deployment, data ownership and durable-storage risks remain outside this frontend refactor. No public demo or unrelated refactor work was undertaken.
