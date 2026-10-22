# PipeVision AI audit and work report

Audit date: 2026-10-21. Findings were checked against the working tree, including pre-existing edits. No cloud database connection, migration, deployment, commit, push, or production-data operation was performed.

## Baseline and environment

- Read `AGENTS.md`, `PROJECT_CONTEXT.md`, README, package manifests/lockfiles, ignore rules, frontend routing/auth/API flows, backend entrypoint/routes/controllers/middleware/models, and existing changes before editing.
- Existing work in ProjectCreation, ProjectHome, auth/project controllers, the reusable player, and instruction/context documents was retained and extended.
- Local Node: 24.2.0. Actual installed versions include ReactPlayer 2.16.1, react-scripts 5.0.1, Axios 1.18.1, Express 4.22.2, Mongoose 6.13.10, jsonwebtoken 8.5.1, Multer 1.4.5-lts.2. No dependency versions were changed or reinstalled; installed dependency trees were already available.
- Baseline backend `npm test` failed because its script was a placeholder. Baseline frontend test runner found no tests. Baseline production build succeeded with lint warnings.
- FFmpeg and FFprobe are available locally. Tests generate their own short video and remove their test media. Database model calls are mocked; model casting and embedded schemas are real in the media workflow test.
- Sandbox DNS blocked npm audit initially; audits completed with network permission. Localhost test listeners also required sandbox escalation.

## Prioritized findings and changes

### P0 — authorization and sensitive data

1. **Unauthenticated private APIs.** Before this patch, requests without Authorization could reach project list/details/create/delete/upload/permission operations, detection reads/writes and PDF generation (`server/routes/*`). Added verified HS256 JWT authentication backed by the persisted user; all project resources now require object access. Invalid/expired/tampered/missing tokens return 401; authenticated disallowed access returns 403. Tests exercise the actual app wiring.
2. **Signup role elevation.** `POST /api/auth/register` previously forwarded the request role into User.create. It now always assigns `user`; registration no longer advertises admin/manager choices. Role updates require admin, validate role values, and prohibit self-demotion to avoid losing the active administrator. No existing account roles were modified.
3. **No reliable project ownership.** The original project schema had a display-name owner, not a trusted creator identity. Added optional immutable `createdBy`, set from the authenticated user on creation. Admins retain access; other users need creator identity or an explicit matching email permission with `hasPermission: true`. Legacy projects without a creator are accessible only to admins and existing explicit members. Invited managers cannot change permissions; permission management requires creator/admin.
4. **Private files exposed through static routes.** Removed unrestricted `/uploads` and `/frames` serving. `/api/media/link` verifies membership and that the media is recorded in that project, then issues a five-minute path-scoped signed link. `/api/media/file` supports streaming/range requests, validates the signature and safe relative path, and disables caching. Access JWTs cannot substitute for media capabilities. Both frontend video views and review images use private links.
5. **Client-controlled file deletion and URL fetching.** deleteVideo now takes the filename from the stored video, not request `s3Key`; local deletion rejects non-basename keys. Detection no longer downloads request `videoUrl` or opens a client-specified local path. It reads the persisted upload in the server uploads directory and returns 404 when bytes are absent. Add-video accepts only existing upload keys scoped to that project and stores a server-controlled URL.
6. **Logout did not revoke tokens.** Added hidden `User.tokenVersion` with default zero. Access/refresh JWTs include it, and both validation paths compare it with the persisted value. Logout increments the version using a verified refresh cookie and clears the cookie. This logs out all that user's JWT sessions. Legacy JWTs without a version work as version zero until revoked. Media links remain valid until their five-minute expiry.
7. **User details and exception leakage.** Password selection stays disabled for ordinary user queries; auth responses do not return a password. Role-update failures and unexpected middleware errors no longer serialize exception objects. Removed verbose backend project/detection data logs. Startup database errors no longer print connection error details that might contain a URI.

### P1 — core workflow defects

- **Unstable private client.** `useAxiosPrivate` recreated Axios every render while consumers used it as an effect dependency. Memoized it, added current-token request headers, retained one-retry semantics, and shared in-flight refresh requests. All active protected project/detection JSON calls now use this hook.
- **Incomplete identity at startup.** AuthContext now gets persisted identity/role/email from `/auth/info`, refreshes an expired token once, and hides protected children during initial verification. Project pages require login. Local logout clears state even if the API is unavailable.
- **Optional videos.** Preserved the user's empty-project-then-upload flow and partial-success message. Multipart upload now supplies project identity in the query so authorization runs before Multer writes a file. Attach retries for an already attached key return the existing video. Metadata failures request safe discard of an unattached upload; a lost attach response cannot cause cleanup to delete an attached video.
- **Misleading permission errors.** Ordinary members no longer request the restricted user directory on ProjectHome. A directory failure does not replace a successfully loaded project with a page error. Project load failures stop the loading state and show an error.
- **Broken saved detection objects.** Result formatting spreads Mongoose `toObject()` output rather than subdocument internals. Stored frames now use actual extracted URLs, uniquely prefixed by video ID, rather than fabricated shared frame paths. Missing assignedSections is handled. Reviewed results cannot change the trusted stored frame path or video ID.
- **Review/navigation.** Detection video identity is carried in the query string as well as navigation state, supporting copied URLs/reloads. The review page uses the shared ReactPlayer v2 component. Its manual-defect button now appends a schema-compatible observation to the results that are actually saved. Retained-defect counts are bounded, and removing results resets the viewer index. Sample/mock wording is visible in review and reports.
- **PDF races/path access.** Reports stream per request rather than writing multiple requests into the same PDF filename. Image lookup is confined to basenames in the frames directory, query utilities are validated, and stream errors are handled. Authenticated downloads use an Axios blob rather than a public window.open URL. The report no longer asserts that actual project data is sanitized.
- **Error status crashes.** Error middleware only accepts numeric 400–599 statuses, translates validation/cast/upload-size errors to 400, and returns safe 500s for unexpected failures. Corrected the historical Error-as-status call sites.
- **Password-save hook.** Added the missing return when a password is unchanged, preventing it from being hashed again after next(). Email uniqueness validation excludes the same user document.

### P2 — reliability

- Uploads are bounded to one 100 MB file, checked for supported MIME/extension, then inspected using FFprobe with timeout/output bounds. Invalid contents are deleted and rejected. This validates actual video streams/duration, not universal browser codec compatibility.
- FFmpeg extraction has a process timeout. Missing media is reported honestly; host rewriting cannot restore missing bytes.
- Local development refresh cookies use SameSite=Lax without Secure; production uses SameSite=None and Secure. Clear-cookie settings match. Credentialed CORS retains explicit configured origins.
- Database changes now precede local video/project file deletion, so a database failure cannot first destroy media still referenced by unchanged metadata.

### P3 — maintainability

- Extracted `server/app.js` from startup so tests exercise production routing without importing the database startup side effect.
- Centralized authentication, project filtering/access policy, permission management, private media links and private-client refresh behavior.
- Removed verified unused duplicate ProjectHome upload/add handlers, obsolete commented project controller implementations, and unused S3 initialization imports. A large ProjectHome and other lint/dead-code cleanup remain; no broad rewrite was attempted.

## API flow inventory and contract mapping

| Flow / frontend consumer | Server route and controller | Contract / change |
| --- | --- | --- |
| Register / RegisterScreen | POST `/api/auth/register` → auth.register | name/email/password; server forces user; accessToken response |
| Login / LoginScreen | POST `/api/auth/login` → auth.login | credential strings; generic invalid credentials; accessToken + HttpOnly cookie |
| Identity / AuthContext, private pages | GET `/api/auth/info` → auth.getInfo | Bearer access JWT; persisted safe user |
| Refresh / shared API helper | GET `/api/auth/refresh` → auth.refresh | credentialed refresh cookie; version validation; accessToken response |
| Logout / AuthContext | POST `/api/auth/logout` → auth.logout | clears cookie; verified cookie revokes issued user JWTs |
| User directory / permission UI, AdminPage | GET `/api/auth/getusers` → auth.getAllUsers | admin/manager only; passwords excluded by schema |
| Role edit / AdminPage | PUT `/api/auth/changerole/:id` → auth.changeUserRole | admin only; validated role; no self-demotion |
| List / ProjectList, legacy ProjectVideo | GET `/api/project/getprojects` → project.getProjects | `{ allProjects }`, now filtered by access |
| Details / ProjectHome, review | POST `/api/project/projectinfo` → project.getProjectInfoByID | `{ id }`, `{ projectInfo }`; project access required |
| Create / ProjectCreation | POST `/api/project/createproject` → project.createProject | manager/admin; optional videos remain separate; ID response unchanged |
| Upload / creation and home | POST `/api/project/uploadVideo?projectId=…` | authenticated authorized manager/admin; multipart videoFile; success/url/s3Key |
| Attach / creation and home | POST `/api/project/addVideo` → project.addVideo | projectId/title/utilityType/url/s3Key; scoped existing upload; idempotent sequential retry |
| Failed attach cleanup | POST `/api/project/discardUpload` | projectId/s3Key; authorized, scoped, unattached only |
| Video/project deletion / home | POST `/api/project/deletevideo`, `/deleteproject` | project access + manager/admin; videoId references persisted file key |
| Status / home | POST `/api/project/updateStatus` | projectId/status; authorized manager/admin |
| Permissions / home | POST `/api/project/addPerm`, `/deletePerm` | creator/admin, plus manager/admin role; existing payload shapes preserved |
| Sections / home | POST `/api/project/generate-sections` | projectId, Sanitary/Storm, integer estimatedSections 2–1000 |
| Sample detection / home | POST `/api/detection` → detection.detectDefects | projectId/videoId/optional assignedSections; submitted media URL ignored |
| Review / ProjectDefectDetection | GET `/api/detection/results?projectId=…&videoId=…` | safe plain subdocuments with private frame paths |
| Save review | POST `/api/detection/saveResults` | projectId/videoId/detectionResults; trusted frame paths retained |
| PDF / home | GET `/api/report/generate-pdf/:projectId?utility=…` | project auth; private binary PDF, Sanitary/Storm/Both |
| Private media / shared hook | POST `/api/media/link`, GET `/api/media/file?token=…` | authorized link issuance followed by scoped time-limited streaming |

Intentional security contract changes: anonymous API access and raw static media URLs no longer work; uploads must identify a project; arbitrary remote video URLs cannot be attached or fetched. Server and active frontend callers were updated together. Existing ProjectVideo is an incomplete legacy details screen and remains a follow-up, not a completed video-detail workflow. `routes/uploadvideo.js` and its commented controller are unmounted legacy code.

## Verification

- Backend: **20 passing tests** using `node --test server/test/security.test.js` with a localhost listener and mocked database operations. Includes anonymous route matrix; expired/tampered tokens; roles/project membership; signup escalation; owner-controlled creation; invalid IDs/video metadata; missing media; real generated video upload/content rejection; idempotent attach; private range streaming; FFmpeg sample frames; review persistence; PDF bytes; refresh/logout revocation; closed raw static routes; numeric errors; and persisted-key deletion with database-failure protection.
- Frontend: **9 passing tests** across private Axios, AuthContext and ProjectCreation. Includes stable client identity, current-token headers, one refresh/retry, failed-refresh logout, zero-video creation, blank-title rejection, partial-success/orphan-cleanup handling, verified startup identity, expired-token startup refresh, and invalid-session initialization.
- Production build succeeds with ESLint warnings. No standalone lint script exists; the separate local ESLint check completed with 0 errors and 81 warnings. Warnings are not claimed fixed. Existing Testing Library emits a React act deprecation warning; the partial-failure test intentionally exercises a logged error.
- All 20 server JavaScript files passed `node --check`; `git diff --check` passed. The final production build exited successfully. No live browser, Safari, Atlas or deployed-service smoke test was performed.

## Remaining risks and safe next actions

1. **Review existing privileged accounts with the owner before release.** Prior public signup allowed arbitrary role elevation. No existing users were queried or demoted, and no admin migration was run. Preserve at least one verified owner admin. Admins can access legacy projects; reconcile legacy creator assignments only using verified ownership and an approved migration.
2. **Dependency vulnerabilities remain.** `npm audit --omit=dev`: server 8 (3 moderate, 4 high, 1 critical); full server tree 36 (2 low, 9 moderate, 24 high, 1 critical). Frontend runtime/full tree 115 (3 low, 37 moderate, 73 high, 2 critical). CRA tooling is declared in dependencies, so its build-time tree is included in the frontend runtime audit; this is not evidence that every advisory affects the static browser bundle. Server findings include Axios/follow-redirects, Express/body-parser/qs/proxy-addr, ip-address and jsonwebtoken. Critical entries are proxy-addr (both trees) and shell-quote (client). Deliberate compatible updates and regression testing are needed; jsonwebtoken's offered update is major. No force-fix or unreviewed dependency upgrade was applied.
3. **Durable private storage is not implemented.** Uploads/frames are still on local ephemeral disk. Choose private object storage and lifecycle cleanup before claiming production persistence. Browser closure/crash can still leave unattached uploads; explicit failure cleanup is best-effort. Concurrent attach requests can still race despite sequential retry deduplication. File-cleanup failures after deletion are logged and require reconciliation. Frame cleanup after video/project deletion remains outstanding.
4. **Runtime/reproducibility drift.** server/package.json still advertises Node 14.x, Docker uses 21.7.3, README references 21.x, while checks ran on Node 24.2.0. Align them deliberately to one supported runtime and test the container. Existing local lockfiles are ignored and not tracked; decide to retain audited lockfiles for reproducible npm ci before changing deployment installation. No clean-install/container check was claimed.
5. **Abuse/session hardening.** No distributed rate limit, detection work queue, refresh rotation/device-session table, or security event audit trail exists. Token-version logout invalidates all user sessions, not one device; failure to reach the backend cannot revoke its cookie. Existing short media capabilities remain usable until expiry, and an open player may need a fresh link after expiry. Concurrent logout and refresh in the browser needs further race testing. JWTs remain in localStorage, as in the existing strategy.
6. **Media limitations.** MIME/extension/FFprobe checks do not guarantee Safari codec support; real browser playback remains unverified. No real posters are generated. Sample frame timestamps still assume 30 fps; non-30-fps and very short videos need explicit handling. Remote/S3 legacy videos require controlled reupload/migration; missing local binaries cannot be recovered by this code.
7. **Further UI work.** Legacy ProjectVideo is incomplete; ProjectHome is still large; manual observation editing, full viewer interactions, accessibility, duplicate-submit races and all role-specific controls need browser coverage. Existing ESLint warnings remain. Startup connectivity failures currently clear local auth rather than offering a reconnect state.
8. **Deployment validation remains separate.** Test Atlas availability with owner-approved configuration, exact production/preview CORS origins, cookie behavior and private playback/downloads in real browsers before any deployment. No production data was touched, and no deployed security state was changed by these local edits.
