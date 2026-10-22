import { createApp } from "../app.js";
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Project from '../models/Project.js';
import errorHandler from '../middleware/error.js';
import { canAccess, projectFilter } from '../middleware/auth.js';

const uid = '000000000000000000000001';
const pid = '000000000000000000000002';
const vid = '000000000000000000000003';
const other = '000000000000000000000004';
let role = 'user', version = 0, project, created, server, origin;
const originals = { userFind: User.findById, updateUser: User.updateOne, findOneUser: User.findOne, create: User.create, projectFind: Project.findById, projectCreate: Project.create, find: Project.find };
const token = () => jwt.sign({ id: uid, version }, process.env.JWT_SECRET);
const call = async (path, body, auth = token(), method = body === undefined ? 'GET' : 'POST') => {
  const response = await fetch(origin + path, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const buffer = await response.arrayBuffer();
  const text = Buffer.from(buffer).toString();
  return { status: response.status, body: response.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text };
};
before(async () => {
  process.env.JWT_SECRET = 'isolated-test-access-secret';
  process.env.REFRESH_TOKEN_SECRET = 'isolated-test-refresh-secret';
  User.findById = () => { const value = { _id: uid, email: 'test@example.test', role, tokenVersion: version }; return { select: async () => value, then: resolve => resolve(value) }; };
  User.updateOne = async () => { version += 1; return { modifiedCount: 1 }; };
  User.findOne = () => ({ select: async () => ({ _id: uid, tokenVersion: version, matchPassword: async password => password === "ValidPassword" }) });
  User.create = async values => { created = values; return { _id: uid }; };
  Project.findById = () => ({ then: resolve => resolve(project), populate: async () => project });
  Project.create = async values => { created = values; return { _id: pid }; };
  Project.find = async filter => { created = filter; return []; };
  const app = createApp();
  server = await new Promise((resolve, reject) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); s.on("error", reject); });
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  User.findById = originals.userFind; User.updateOne = originals.updateUser; User.findOne = originals.findOneUser; User.create = originals.create;
  Project.findById = originals.projectFind; Project.create = originals.projectCreate; Project.find = originals.find;
  if (server) await new Promise(resolve => server.close(resolve));
});

test('anonymous clients cannot access private API endpoints', async () => {
  for (const [path, body] of [
    ['/api/project/getprojects'], ['/api/project/projectinfo', { id: pid }],
    ['/api/project/createproject', {}], ['/api/project/uploadVideo?projectId=' + pid, {}],
    ['/api/project/addVideo', {}], ['/api/project/deletevideo', {}], ['/api/project/deleteproject', {}],
    ['/api/project/updateStatus', {}], ['/api/project/addPerm', {}], ['/api/project/deletePerm', {}], ['/api/project/generate-sections', {}],
    ['/api/detection', {}], ['/api/detection/saveResults', {}], ['/api/detection/results?projectId=' + pid],
    ['/api/report/generate-pdf/' + pid], ['/api/auth/getusers'], ['/api/auth/info'], ['/api/media/link', { projectId: pid }]
  ]) assert.equal((await call(path, body, null)).status, 401, path);
});
test('expired and tampered tokens are rejected', async () => {
  for (const value of [jwt.sign({ id: uid }, process.env.JWT_SECRET, { expiresIn: -1 }), token() + 'tampered'])
    assert.equal((await call('/api/project/getprojects', undefined, value)).status, 401);
});
test('public signup always assigns ordinary user role', async () => {
  assert.equal((await call('/api/auth/register', { name: 'Test', email: 'test@example.test', password: 'TestPassword', role: 'admin' }, null)).status, 200);
  assert.equal(created.role, 'user');
});
test('project access respects owner, explicit permission, admin and legacy records', async () => {
  for (const userRole of ['user', 'manager', 'admin']) {
    role = userRole; project = { _id: pid, createdBy: other, permissions: [], videos: [] };
    assert.equal((await call('/api/project/projectinfo', { id: pid })).status, role === 'admin' ? 200 : 403);
    project.createdBy = uid;
    assert.equal((await call('/api/project/projectinfo', { id: pid })).status, 200);
    delete project.createdBy; project.permissions = [{ email: 'test@example.test', hasPermission: true }];
    assert.equal((await call('/api/project/projectinfo', { id: pid })).status, 200);
    project.permissions[0].hasPermission = false;
    assert.equal(canAccess({ _id: uid, role, email: 'test@example.test' }, project), role === 'admin');
  }
});
test('ordinary users cannot create projects or change roles; admin cannot self-demote', async () => {
  role = 'user'; assert.equal((await call('/api/project/createproject', { title: 'Demo' })).status, 403);
  assert.equal((await call('/api/auth/changerole/' + uid, { role: 'admin' }, token(), 'PUT')).status, 403);
  role = 'admin'; assert.equal((await call('/api/auth/changerole/' + uid, { role: 'user' }, token(), 'PUT')).status, 400);
});
test('manager creates empty project with server-controlled owner and filtered listing', async () => {
  role = 'manager'; assert.equal((await call('/api/project/createproject', { title: 'Demo', createdBy: other, videos: [{}] })).status, 200);
  assert.equal(created.createdBy, uid); assert.deepEqual(created.videos, []);
  await call('/api/project/getprojects'); assert.deepEqual(created, projectFilter({ _id: uid, email: 'test@example.test', role }));
});
test('invalid project IDs return 400; missing projects return 404', async () => {
  assert.equal((await call('/api/project/projectinfo', { id: 'bad' })).status, 400);
  project = null; assert.equal((await call('/api/project/projectinfo', { id: pid })).status, 404);
});
test('video metadata requires valid utility, title and a real project-scoped upload', async () => {
  role = 'manager'; project = { _id: pid, createdBy: uid, permissions: [], videos: [] };
  for (const values of [{ title: ' ', utilityType: 'Storm' }, { title: 'Video', utilityType: 'Invalid' }, { title: 'Video', utilityType: 'Storm', s3Key: '../../.env' }]) {
    assert.equal((await call('/api/project/addVideo', { projectId: pid, url: 'https://example.test/video', ...values })).status, 400);
  }
});
test('detection ignores submitted URL and honestly reports missing stored media', async () => {
  project = { _id: pid, createdBy: uid, permissions: [], videos: [{ _id: vid, url: '/uploads/missing-test-video.mp4', assignedSections: [] }] };
  assert.equal((await call('/api/detection', { projectId: pid, videoId: vid, videoUrl: 'http://127.0.0.1/private' })).status, 404);
});
test('media links require recorded media; file endpoint rejects access tokens and invalid signatures', async () => {
  project = { _id: pid, createdBy: uid, permissions: [], videos: [] };
  assert.equal((await call('/api/media/link', { projectId: pid, url: '/uploads/private.mp4' })).status, 404);
  assert.equal((await call('/api/media/file?token=' + token())).status, 401);
  assert.equal((await call('/api/media/file?token=invalid')).status, 401);
});
test('authorized empty-project PDF streams a real PDF and rejects invalid utility', async () => {
  project = { _id: pid, createdBy: uid, permissions: [], videos: [], title: 'Test', dateOpened: new Date(), status: 'Open' };
  const result = await call('/api/report/generate-pdf/' + pid);
  assert.equal(result.status, 200); assert.ok(result.body.startsWith('%PDF-'));
  assert.equal((await call('/api/report/generate-pdf/' + pid + '?utility=invalid')).status, 400);
});
test('error middleware never uses an Error object as HTTP status', () => {
  let status;
  errorHandler({ statusCode: new Error('bad'), message: 'Failure' }, {}, { status(value) { status = value; return this; }, json() {} }, () => {});
  assert.equal(status, 500);
});

test('unauthorized project IDs block every sensitive project flow', async () => {
  role = 'manager'; project = { _id: pid, createdBy: other, permissions: [], videos: [] };
  for (const [path, body] of [
    ['/api/project/deleteproject', { projectId: pid }], ['/api/project/deletevideo', { projectId: pid, videoId: vid }],
    ['/api/project/addVideo', { projectId: pid }], ['/api/project/updateStatus', { projectId: pid }],
    ['/api/project/addPerm', { projectId: pid }], ['/api/project/deletePerm', { projectId: pid }],
    ['/api/project/uploadVideo?projectId=' + pid, {}], ['/api/project/discardUpload', { projectId: pid }],
    ['/api/project/generate-sections', { projectId: pid }], ['/api/detection', { projectId: pid }],
    ['/api/detection/saveResults', { projectId: pid }], ['/api/detection/results?projectId=' + pid],
    ['/api/report/generate-pdf/' + pid], ['/api/media/link', { projectId: pid }]
  ]) assert.equal((await call(path, body)).status, 403, path);
});
test('invited managers cannot grant project access', async () => {
  role = 'manager'; project = { _id: pid, createdBy: other, permissions: [{ email: 'test@example.test', hasPermission: true }], videos: [] };
  assert.equal((await call('/api/project/addPerm', { projectId: pid, email: 'new@example.test', name: 'New', hasPermission: true })).status, 403);
});
test('refresh rejects missing, invalid and expired cookies; logout clears the same cookie path', async () => {
  assert.equal((await call('/api/auth/refresh', undefined, null)).status, 401);
  for (const value of ['invalid', jwt.sign({ id: uid }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: -1 })]) {
    const response = await fetch(origin + '/api/auth/refresh', { headers: { Cookie: `jwt=${value}` } });
    assert.equal(response.status, 401);
  }
  const response = await fetch(origin + '/api/auth/refresh', { headers: { Cookie: `jwt=${jwt.sign({ id: uid }, process.env.REFRESH_TOKEN_SECRET)}` } });
  assert.equal(response.status, 200); assert.equal(jwt.verify((await response.json()).accessToken, process.env.JWT_SECRET).id, uid);
  const logout = await fetch(origin + '/api/auth/logout', { method: 'POST' });
  assert.equal(logout.status, 200); assert.match(logout.headers.get('set-cookie'), /jwt=; Path=\//);
});
test('real upload, attach retry, private streaming, sample extraction, review and PDF', async t => {
  const { execFileSync } = await import('node:child_process');
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); }
  catch { t.skip('FFmpeg unavailable'); return; }
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'pipevision-test-'));
  let key;
  try {
    execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=160x120:r=30', '-t', '11', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', path.join(temp, 'test.mp4')]);
    role = 'manager';
    project = new Project({ _id: pid, createdBy: uid, title: 'Generated test project', videos: [] });
    project.save = async () => project;
    const upload = async bytes => {
      const form = new FormData(); form.append('videoFile', new Blob([bytes], { type: 'video/mp4' }), 'test.mp4');
      return fetch(origin + '/api/project/uploadVideo?projectId=' + pid, { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: form });
    };
    const bad = await upload('not a video'); assert.equal(bad.status, 400);
    const response = await upload(await fs.readFile(path.join(temp, 'test.mp4'))); assert.equal(response.status, 200);
    const uploaded = await response.json(); key = uploaded.s3Key;
    const payload = { projectId: pid, title: 'Generated video', utilityType: 'Storm', url: uploaded.url, s3Key: key };
    const attached = await call('/api/project/addVideo', payload); assert.equal(attached.status, 200);
    assert.equal((await call('/api/project/addVideo', payload)).status, 200); assert.equal(project.videos.length, 1);
    assert.equal((await call('/api/project/discardUpload', { projectId: pid, s3Key: key })).status, 409);
    const link = await call('/api/media/link', { projectId: pid, url: uploaded.url }); assert.equal(link.status, 200);
    const range = await fetch(origin + link.body.url, { headers: { Range: 'bytes=0-31' } }); assert.equal(range.status, 206); assert.equal((await range.arrayBuffer()).byteLength, 32);
    const videoId = String(project.videos[0]._id);
    const detected = await call('/api/detection', { projectId: pid, videoId, assignedSections: ['STMH 1-STMH 2'], videoUrl: 'http://127.0.0.1/ignored' });
    assert.equal(detected.status, 200); assert.equal(detected.body.sample, true); assert.ok(project.videos[0].detectionCompleted);
    const results = await call(`/api/detection/results?projectId=${pid}&videoId=${videoId}`); assert.equal(results.status, 200);
    assert.ok(results.body.detectionResults[0].defectType); assert.match(results.body.detectionResults[0].framePath, new RegExp(videoId));
    const saved = await call('/api/detection/saveResults', { projectId: pid, videoId, detectionResults: results.body.detectionResults.map(d => ({ ...d, inspectorComments: 'Reviewed', framePath: '/../../.env' })) }); assert.equal(saved.status, 200);
    assert.ok(project.videos[0].detectionResults.every(d => d.framePath.startsWith('/frames/')));
    const pdf = await call('/api/report/generate-pdf/' + pid); assert.equal(pdf.status, 200); assert.ok(pdf.body.startsWith('%PDF-'));
    for (const defect of project.videos[0].detectionResults) await fs.unlink(path.resolve('server', 'frames', path.basename(defect.framePath))).catch(() => {});
  } finally {
    if (key) await fs.unlink(path.resolve('server', 'uploads', key)).catch(() => {});
    await fs.rm(temp, { recursive: true, force: true });
  }
});

test('login validates credential types, returns generic invalid credential errors and never returns password', async () => {
  assert.equal((await call('/api/auth/login', { email: { $ne: null }, password: 'ValidPassword' }, null)).status, 400);
  assert.equal((await call('/api/auth/login', { email: 'test@example.test', password: 'Wrong' }, null)).status, 401);
  const response = await call('/api/auth/login', { email: 'test@example.test', password: 'ValidPassword' }, null);
  assert.equal(response.status, 200); assert.deepEqual(Object.keys(response.body), ['accessToken']);
});
test('logout revokes previously issued access and refresh tokens', async () => {
  const oldAccess = token();
  const oldRefresh = jwt.sign({ id: uid, version }, process.env.REFRESH_TOKEN_SECRET);
  const response = await fetch(origin + '/api/auth/logout', { method: 'POST', headers: { Cookie: `jwt=${oldRefresh}` } });
  assert.equal(response.status, 200);
  assert.equal((await call('/api/project/getprojects', undefined, oldAccess)).status, 401);
  const refreshed = await fetch(origin + '/api/auth/refresh', { headers: { Cookie: `jwt=${oldRefresh}` } });
  assert.equal(refreshed.status, 401);
});
test('public static media paths do not expose uploads or frames', async () => {
  assert.equal((await call('/uploads/private.mp4', undefined, null)).status, 404);
  assert.equal((await call('/frames/private.jpg', undefined, null)).status, 404);
});

test('authorized video deletion ignores client filename and does not delete files when the DB update fails', async () => {
  const fs = (await import('node:fs')).default;
  const originalUnlink = fs.unlink;
  const originalUpdate = Project.findByIdAndUpdate;
  const deleted = [];
  try {
    role = 'manager';
    project = new Project({ _id: pid, createdBy: uid, title: 'Test', videos: [{ _id: vid, title: 'Test', url: '/uploads/stored.mp4', s3Key: 'stored.mp4' }] });
    fs.unlink = (file, callback) => { deleted.push(file); callback(null); };
    Project.findByIdAndUpdate = async () => project;
    assert.equal((await call('/api/project/deletevideo', { projectId: pid, videoId: vid, s3Key: '../../.env' })).status, 200);
    assert.equal(deleted.length, 1); assert.ok(deleted[0].endsWith('/uploads/stored.mp4'));
    deleted.length = 0;
    Project.findByIdAndUpdate = async () => { throw new Error('Simulated DB failure'); };
    assert.equal((await call('/api/project/deletevideo', { projectId: pid, videoId: vid, s3Key: '../../.env' })).status, 500);
    assert.equal(deleted.length, 0);
  } finally { fs.unlink = originalUnlink; Project.findByIdAndUpdate = originalUpdate; }
});
