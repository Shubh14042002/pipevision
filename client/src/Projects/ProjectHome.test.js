import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ReactPlayer from 'react-player';
import ProjectHome from './ProjectHome';

const mockNavigate = jest.fn();
const mockApi = { get: jest.fn(), post: jest.fn() };
jest.mock('../api/useAxiosPrivate', () => () => mockApi);
jest.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'project-123' }),
  useNavigate: () => mockNavigate,
}));
jest.mock('react-player', () => jest.fn());

const jsonConfig = { headers: { 'Content-Type': 'application/json' } };
const dropText = 'Drag & drop an MP4, MOV, or WebM video here after entering a title';
const projectFixture = {
  _id: 'project-123', title: 'North sewer inspection', description: 'Inspection description',
  dateOpened: '2026-01-02T12:00:00.000Z', status: 'Open', projectOwner: 'Owner',
  contractor: 'Contractor', location: 'North district',
  pipelineSections: { sanitary: [{ from: 'SMH A', to: 'SMH B' }], storm: [] },
  permissions: [
    { _id: 'permission-1', email: 'member@example.test', name: 'Member', hasPermission: true },
    { _id: 'permission-2', email: 'denied@example.test', name: 'Denied member', hasPermission: false },
  ],
  videos: [
    { _id: 'sanitary-video', title: 'Sanitary inspection', notes: 'Sanitary notes', utilityType: 'Sanitary',
      url: '/uploads/sanitary.mp4', s3Key: 'sanitary.mp4', assignedSections: ['SMH A-SMH B'] },
    { _id: 'storm-video', title: 'Storm inspection', notes: 'Storm notes', utilityType: 'Storm',
      url: '/uploads/storm.mp4', s3Key: 'storm.mp4', assignedSections: [] },
    { _id: 'legacy-video', title: 'Legacy inspection', notes: '', url: '/uploads/legacy.mp4',
      s3Key: 'legacy.mp4', assignedSections: [], detectionCompleted: true },
  ],
};
let project, user, postHandlers, clickDownload;
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

beforeEach(() => {
  jest.clearAllMocks();
  ReactPlayer.mockImplementation(props => (
    <div data-testid="react-player" data-url={props.url}>
      <button onClick={() => props.onError(new Error('Unsupported video'))}>Simulate playback failure</button>
    </div>
  ));
  project = JSON.parse(JSON.stringify(projectFixture));
  user = { _id: 'manager-1', role: 'manager', email: 'manager@example.test' };
  postHandlers = {};
  jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  jest.spyOn(window, 'alert').mockImplementation(() => {});
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('01/02/2026');
  clickDownload = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  URL.createObjectURL = jest.fn(() => 'blob:report');
  URL.revokeObjectURL = jest.fn();
  mockApi.get.mockImplementation(path => {
    if (path === '/api/auth/info') return Promise.resolve({ data: { user } });
    if (path === '/api/auth/getusers') return Promise.resolve({ data: { users: [user] } });
    if (path.startsWith('/api/report/')) return Promise.resolve({ data: new Blob(['PDF']) });
    throw new Error(`Unexpected GET ${path}`);
  });
  mockApi.post.mockImplementation((path, payload, config) => {
    if (postHandlers[path]) return postHandlers[path](payload, config);
    if (path === '/api/project/projectinfo') return Promise.resolve({ data: { projectInfo: project } });
    if (path === '/api/media/link') return Promise.resolve({ data: { url: `/api/media/file?token=${payload.url.split('/').pop()}` } });
    if (['/api/project/deletevideo', '/api/project/deleteproject', '/api/project/deletePerm', '/api/project/updateStatus', '/api/project/discardUpload'].includes(path)) return Promise.resolve({ data: { success: true } });
    if (path === '/api/project/generate-sections') return Promise.resolve({ data: { sections: [{ from: 'STMH 1', to: 'STMH 2' }] } });
    if (path === '/api/detection') return Promise.resolve({ data: { detectionResults: [{ frameNumber: 1 }] } });
    throw new Error(`Unexpected POST ${path}`);
  });
});
afterEach(() => jest.restoreAllMocks());

async function ready(canManage = true) {
  const view = render(<ProjectHome />);
  await screen.findByRole('heading', { name: project.title });
  await screen.findAllByRole('button', { name: /Play video/ });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Delete Project' }).disabled).toBe(!canManage));
  return view;
}
function drop(file = new File(['video'], 'inspection.mp4', { type: 'video/mp4' })) {
  fireEvent.drop(screen.getByText(dropText), { dataTransfer: { files: [file] } });
  return file;
}
async function changeUtility(name) {
  fireEvent.click(screen.getByRole('tab', { name }));
  // Flush the private-media link response triggered by mounting the new video list.
  await act(async () => { await Promise.resolve(); });
}
function selectOption(label, option) {
  fireEvent.mouseDown(screen.getByLabelText(label));
  fireEvent.click(screen.getByRole('option', { name: option }));
}

test('renders project metadata, controls and unchanged initial page markup', async () => {
  const { container } = await ready();
  expect(screen.getByText('Inspection description', { exact: false })).toBeTruthy();
  expect(screen.getByText('North district', { exact: false })).toBeTruthy();
  expect(screen.getByRole('tab', { name: 'Sanitary' }).getAttribute('aria-selected')).toBe('true');
  expect(screen.getByRole('button', { name: 'Update' }).disabled).toBe(true);
  expect(mockApi.post).toHaveBeenCalledWith('/api/project/projectinfo', { id: 'project-123' });
  expect(mockApi.get).toHaveBeenCalledWith('/api/auth/info', jsonConfig);
  // Normalize React's generated IDs; retain all element attributes, classes and inline styles.
  expect(container.innerHTML.replace(/:r[a-z0-9]+:/g, ':mui-id:')).toMatchSnapshot();
});

test('shows loading and then the backend project-load error', async () => {
  const pending = deferred(); postHandlers['/api/project/projectinfo'] = () => pending.promise;
  render(<ProjectHome />); expect(screen.getByText('Loading project details...')).toBeTruthy();
  await act(async () => pending.reject({ response: { data: { error: 'Forbidden' } } }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Forbidden');
  expect(screen.queryByRole('heading', { name: project.title })).toBeNull();
});

test('utility tabs filter videos, keep legacy videos under Sanitary and retain section drafts', async () => {
  await ready();
  expect(screen.getByRole('heading', { name: 'Sanitary inspection' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Legacy inspection' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Storm inspection' })).toBeNull();
  fireEvent.change(screen.getByLabelText('Enter Number of Pipeline Sections'), { target: { value: '4' } });
  await changeUtility('Storm');
  expect(screen.getByRole('heading', { name: 'Storm inspection' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Legacy inspection' })).toBeNull();
  expect(screen.getByLabelText('Enter Number of Pipeline Sections').value).toBe('');
  await changeUtility('Sanitary');
  expect(screen.getByLabelText('Enter Number of Pipeline Sections').value).toBe('4');
});

test('validates, confirms replacement and generates sections using the active utility', async () => {
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Re-generate Sections' }));
  expect(window.alert).toHaveBeenCalledWith('Pipeline should have at least 2 sections!');
  fireEvent.change(screen.getByLabelText('Enter Number of Pipeline Sections'), { target: { value: '3' } });
  window.confirm.mockReturnValueOnce(false);
  fireEvent.click(screen.getByRole('button', { name: 'Re-generate Sections' }));
  expect(mockApi.post).not.toHaveBeenCalledWith('/api/project/generate-sections', expect.anything());
  await changeUtility('Storm');
  fireEvent.change(screen.getByLabelText('Enter Number of Pipeline Sections'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Generate Sections' }));
  await screen.findByText('Sections generated for Storm.');
  expect(mockApi.post).toHaveBeenCalledWith('/api/project/generate-sections', { projectId: 'project-123', utilityType: 'Storm', estimatedSections: 2 });
  fireEvent.mouseDown(screen.getByLabelText('Select Sections Covered by Video'));
  expect(screen.getByRole('option', { name: 'STMH 1 → STMH 2' })).toBeTruthy();
});

test('uses private media links and preserves lazy ReactPlayer v2 props and playback errors', async () => {
  await ready();
  expect(ReactPlayer).not.toHaveBeenCalled();
  expect(mockApi.post).toHaveBeenCalledWith('/api/media/link', { projectId: 'project-123', url: '/uploads/sanitary.mp4' });
  fireEvent.click(screen.getAllByRole('button', { name: /Play video/ })[0]);
  expect(screen.getByTestId('react-player').getAttribute('data-url')).toBe('http://localhost:5001/api/media/file?token=sanitary.mp4');
  expect(ReactPlayer.mock.calls.at(-1)[0]).toMatchObject({ controls: true, playsinline: true, playing: false, width: '100%', height: '100%' });
  const logError = jest.spyOn(console, 'error').mockImplementation(() => {});
  fireEvent.click(screen.getByRole('button', { name: 'Simulate playback failure' }));
  expect(screen.getByText('Unable to play this video.')).toBeTruthy();
  expect(logError).toHaveBeenCalled();
});

test('ignores private-link completion after tab unmount and acquires a fresh link on return', async () => {
  const link = deferred();
  postHandlers['/api/media/link'] = payload => payload.url === '/uploads/sanitary.mp4' ? link.promise : Promise.resolve({ data: { url: '/api/media/file?token=other' } });
  render(<ProjectHome />); await screen.findByRole('heading', { name: project.title });
  await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith('/api/media/link', { projectId: 'project-123', url: '/uploads/sanitary.mp4' }));
  await changeUtility('Storm');
  await act(async () => link.resolve({ data: { url: '/api/media/file?token=old-sanitary' } }));
  fireEvent.click(await screen.findByRole('button', { name: /Play video/ }));
  expect(screen.getByTestId('react-player').getAttribute('data-url')).toContain('token=other');
  await changeUtility('Sanitary');
  await screen.findAllByRole('button', { name: /Play video/ });
  expect(mockApi.post.mock.calls.filter(([path, payload]) => path === '/api/media/link' && payload.url === '/uploads/sanitary.mp4')).toHaveLength(2);
});

test.each([
  ['manager', 'manager@example.test', true], ['admin', 'admin@example.test', true],
  ['user', 'member@example.test', true], ['user', 'denied@example.test', false],
])('preserves permission controls for %s (%s)', async (role, email, allowed) => {
  user = { ...user, role, email }; await ready(allowed);
  expect(screen.getByRole('button', { name: 'Manage Permissions' }).disabled).toBe(!allowed);
  expect(screen.getByLabelText('Status').getAttribute('aria-disabled')).toBe(allowed ? null : 'true');
  expect(screen.getByLabelText(/Video Title/).disabled).toBe(!allowed);
});

test('toggles existing permissions and removes the selected member without adding a grant UI', async () => {
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Manage Permissions' }));
  expect(screen.getByText('Member')).toBeTruthy(); expect(screen.getByText('No Permission')).toBeTruthy();
  fireEvent.click(screen.getAllByRole('button', { name: 'remove' })[0]);
  await waitFor(() => expect(screen.queryByText('Member')).toBeNull());
  expect(mockApi.post).toHaveBeenCalledWith('/api/project/deletePerm', { projectId: 'project-123', email: 'member@example.test' }, jsonConfig);
  fireEvent.click(screen.getByRole('button', { name: 'Hide Permissions' }));
  expect(screen.queryByText('Denied member')).toBeNull();
  expect(mockApi.post.mock.calls.some(([path]) => path === '/api/project/addPerm')).toBe(false);
});

test('status updates preserve the existing payload and alert', async () => {
  await ready(); selectOption('Status', 'Closed');
  fireEvent.click(screen.getByRole('button', { name: 'Update' }));
  await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Status updated successfully'));
  expect(mockApi.post).toHaveBeenCalledWith('/api/project/updateStatus', { projectId: 'project-123', status: 'Closed' }, jsonConfig);
});

test('rejects title-less or invalid video drops without uploading', async () => {
  await ready(); drop(); expect(window.alert).toHaveBeenCalledWith('Please enter a video title before uploading.');
  fireEvent.change(screen.getByLabelText(/Video Title/), { target: { value: 'New inspection' } });
  drop(new File(['text'], 'text.txt', { type: 'text/plain' }));
  expect(window.alert).toHaveBeenCalledWith('Please upload a valid video file, such as MP4, MOV, or WebM.');
  expect(mockApi.post.mock.calls.some(([path]) => path.includes('/uploadVideo'))).toBe(false);
});

test.each(['newVideo', 'project'])('uploads and attaches a video using the active utility (%s response)', async format => {
  const upload = deferred();
  postHandlers['/api/project/uploadVideo?projectId=project-123'] = () => upload.promise;
  postHandlers['/api/project/addVideo'] = () => Promise.resolve({ data: format === 'newVideo' ? { newVideo: { _id: 'new-video' } } : { project: { videos: [{ _id: 'new-video' }] } } });
  await ready();
  fireEvent.change(screen.getByLabelText(/Video Title/), { target: { value: ' New inspection ' } });
  fireEvent.change(screen.getByLabelText('Video Description / Notes'), { target: { value: ' Notes ' } });
  await changeUtility('Storm');
  const file = drop(); await screen.findByText('Uploading video...');
  fireEvent.drop(screen.getByText('Uploading video...'), { dataTransfer: { files: [file] } });
  expect(mockApi.post.mock.calls.filter(([path]) => path.includes('/uploadVideo'))).toHaveLength(1);
  const [, form, config] = mockApi.post.mock.calls.find(([path]) => path.includes('/uploadVideo'));
  expect(form.get('videoFile')).toBe(file); expect(form.get('projectId')).toBe('project-123');
  expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
  await act(async () => upload.resolve({ data: { success: true, url: '/uploads/new.mp4', s3Key: 'new.mp4' } }));
  await screen.findByRole('heading', { name: 'New inspection' });
  await screen.findAllByRole('button', { name: /Play video/ });
  expect(mockApi.post).toHaveBeenCalledWith('/api/project/addVideo', { projectId: 'project-123', title: 'New inspection', notes: 'Notes', url: '/uploads/new.mp4', s3Key: 'new.mp4', utilityType: 'Storm', assignedSections: [] }, jsonConfig);
  expect(screen.getByLabelText(/Video Title/).value).toBe('');
  expect(window.alert).toHaveBeenCalledWith('Video uploaded successfully.');
});

test('metadata failure cleans up the unattached upload and retains the draft', async () => {
  postHandlers['/api/project/uploadVideo?projectId=project-123'] = () => Promise.resolve({ data: { success: true, url: '/uploads/new.mp4', s3Key: 'new.mp4' } });
  postHandlers['/api/project/addVideo'] = () => Promise.reject({ response: { data: { error: 'Metadata failed' } } });
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await ready(); fireEvent.change(screen.getByLabelText(/Video Title/), { target: { value: 'New inspection' } }); drop();
  await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Video upload failed: Metadata failed'));
  expect(mockApi.post).toHaveBeenCalledWith('/api/project/discardUpload', { projectId: 'project-123', s3Key: 'new.mp4' });
  expect(screen.queryByRole('heading', { name: 'New inspection' })).toBeNull();
  expect(screen.getByLabelText(/Video Title/).value).toBe('New inspection');
});

test('video deletion honors cancellation, sends stored identifiers and removes only the video', async () => {
  await ready(); window.confirm.mockReturnValueOnce(false);
  fireEvent.click(screen.getAllByRole('button', { name: '' })[0]);
  expect(mockApi.post).not.toHaveBeenCalledWith('/api/project/deletevideo', expect.anything(), expect.anything());
  fireEvent.click(screen.getAllByRole('button', { name: '' })[0]);
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Sanitary inspection' })).toBeNull());
  expect(screen.getByRole('heading', { name: 'Legacy inspection' })).toBeTruthy();
  expect(mockApi.post).toHaveBeenCalledWith('/api/project/deletevideo', { projectId: 'project-123', videoId: 'sanitary-video', s3Key: 'sanitary.mp4' }, jsonConfig);
});

test('project deletion confirms and navigates only after success', async () => {
  const deletion = deferred(); postHandlers['/api/project/deleteproject'] = () => deletion.promise;
  await ready(); fireEvent.click(screen.getByRole('button', { name: 'Delete Project' }));
  expect(mockNavigate).not.toHaveBeenCalled();
  await act(async () => deletion.resolve({ data: { success: true } }));
  expect(mockApi.post).toHaveBeenCalledWith('/api/project/deleteproject', { projectId: 'project-123' });
  expect(mockNavigate).toHaveBeenCalledWith('/');
});

test('submits the current section assignments and navigates using the unchanged detection contract', async () => {
  const detection = deferred(); postHandlers['/api/detection'] = () => detection.promise;
  await ready();
  // Unselect the saved sanitary section, then close the multiple-select menu.
  fireEvent.mouseDown(screen.getAllByLabelText('Select Sections Covered by Video')[0]);
  fireEvent.click(screen.getByRole('option', { name: 'SMH A → SMH B' }));
  fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape', code: 'Escape' });
  fireEvent.click(screen.getByRole('button', { name: 'Run Sample Detection' }));
  expect(mockApi.post).toHaveBeenCalledWith('/api/detection', { projectId: 'project-123', videoId: 'sanitary-video', videoUrl: '/uploads/sanitary.mp4', pipelineSections: project.pipelineSections, assignedSections: [] });
  expect(screen.getAllByRole('button', { name: 'Processing...' }).every(button => button.disabled)).toBe(true);
  await act(async () => detection.resolve({ data: { detectionResults: [{ frameNumber: 42 }] } }));
  expect(mockNavigate).toHaveBeenCalledWith('/project/project-123/detection-results?videoId=sanitary-video', { state: { videoId: 'sanitary-video', videoTitle: 'Sanitary inspection', detectionResults: [{ frameNumber: 42 }] } });
});

test('detection failure restores controls and reports the backend message', async () => {
  postHandlers['/api/detection'] = () => Promise.reject({ response: { data: { error: 'Video unavailable' } } });
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await ready(); fireEvent.click(screen.getByRole('button', { name: 'Run Sample Detection' }));
  await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Video unavailable'));
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Run Sample Detection' }).disabled).toBe(false);
});

test('downloads reports privately as blobs and schedules object URL cleanup', async () => {
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Download Storm Report' }));
  await waitFor(() => expect(clickDownload).toHaveBeenCalledTimes(1));
  expect(mockApi.get).toHaveBeenCalledWith('/api/report/generate-pdf/project-123?utility=Storm', { responseType: 'blob' });
  expect(URL.createObjectURL).toHaveBeenCalled();
  await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:report'), { timeout: 2000 });
});

test('keeps section selections across utility changes and preserves the detection metadata snapshot after generation', async () => {
  await ready();
  await changeUtility('Storm');
  fireEvent.change(screen.getByLabelText('Enter Number of Pipeline Sections'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Generate Sections' }));
  await screen.findByText('Sections generated for Storm.');
  fireEvent.mouseDown(screen.getByLabelText('Select Sections Covered by Video'));
  fireEvent.click(screen.getByRole('option', { name: 'STMH 1 → STMH 2' }));
  fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape', code: 'Escape' });
  await changeUtility('Sanitary');
  await changeUtility('Storm');
  expect(screen.getByLabelText('Select Sections Covered by Video').textContent).toContain('STMH 1');
  fireEvent.click(screen.getByRole('button', { name: 'Run Sample Detection' }));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  expect(mockApi.post).toHaveBeenCalledWith('/api/detection', {
    projectId: 'project-123', videoId: 'storm-video', videoUrl: '/uploads/storm.mp4',
    pipelineSections: project.pipelineSections, assignedSections: ['STMH 1-STMH 2'],
  });
});

test('retains an upload draft across tabs and attaches to the utility at the time of the drop', async () => {
  const upload = deferred();
  postHandlers['/api/project/uploadVideo?projectId=project-123'] = () => upload.promise;
  postHandlers['/api/project/addVideo'] = () => Promise.resolve({ data: { newVideo: { _id: 'new-video' } } });
  await ready();
  fireEvent.change(screen.getByLabelText(/Video Title/), { target: { value: 'Pending inspection' } });
  fireEvent.change(screen.getByLabelText('Video Description / Notes'), { target: { value: 'Draft notes' } });
  await changeUtility('Storm'); await changeUtility('Sanitary');
  expect(screen.getByLabelText('Video Description / Notes').value).toBe('Draft notes');
  drop(); await screen.findByText('Uploading video...');
  await changeUtility('Storm');
  await act(async () => upload.resolve({ data: { success: true, url: '/uploads/pending.mp4', s3Key: 'pending.mp4' } }));
  await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Video uploaded successfully.'));
  expect(mockApi.post).toHaveBeenCalledWith('/api/project/addVideo', expect.objectContaining({ utilityType: 'Sanitary', title: 'Pending inspection' }), jsonConfig);
  expect(screen.queryByRole('heading', { name: 'Pending inspection' })).toBeNull();
  expect(screen.getByLabelText(/Video Title/).value).toBe('');
  await changeUtility('Sanitary');
  expect(screen.getByRole('heading', { name: 'Pending inspection' })).toBeTruthy();
});

test('failed deletion retains the video, permission and project navigation state', async () => {
  postHandlers['/api/project/deletevideo'] = () => Promise.reject(new Error('Delete failed'));
  postHandlers['/api/project/deletePerm'] = () => Promise.reject(new Error('Permission update failed'));
  postHandlers['/api/project/deleteproject'] = () => Promise.reject(new Error('Project delete failed'));
  const logError = jest.spyOn(console, 'error').mockImplementation(() => {});
  await ready();
  fireEvent.click(screen.getAllByRole('button', { name: '' })[0]);
  await waitFor(() => expect(logError).toHaveBeenCalledWith('Error deleting video:', expect.any(Error)));
  expect(screen.getByRole('heading', { name: 'Sanitary inspection' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Manage Permissions' }));
  fireEvent.click(screen.getAllByRole('button', { name: 'remove' })[0]);
  await waitFor(() => expect(logError).toHaveBeenCalledWith('Error removing permission:', expect.any(Error)));
  expect(screen.getByText('Member')).toBeTruthy();
  window.confirm.mockReturnValueOnce(false);
  fireEvent.click(screen.getByRole('button', { name: 'Delete Project' }));
  expect(mockApi.post).not.toHaveBeenCalledWith('/api/project/deleteproject', expect.anything());
  fireEvent.click(screen.getByRole('button', { name: 'Delete Project' }));
  await waitFor(() => expect(logError).toHaveBeenCalledWith('Error deleting project:', expect.any(Error)));
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('project mutations retain the mounted player and preserve the existing status-draft reset', async () => {
  await ready(); fireEvent.click(screen.getAllByRole('button', { name: /Play video/ })[0]);
  selectOption('Status', 'Closed');
  expect(screen.getByRole('button', { name: 'Update' }).disabled).toBe(false);
  const linksBefore = mockApi.post.mock.calls.filter(([path]) => path === '/api/media/link').length;
  fireEvent.click(screen.getByRole('button', { name: 'Manage Permissions' }));
  fireEvent.click(screen.getAllByRole('button', { name: 'remove' })[0]);
  await waitFor(() => expect(screen.queryByText('Member')).toBeNull());
  await waitFor(() => expect(screen.getByRole('button', { name: 'Update' }).disabled).toBe(true));
  expect(screen.getByTestId('react-player').getAttribute('data-url')).toContain('sanitary.mp4');
  expect(mockApi.post.mock.calls.filter(([path]) => path === '/api/media/link')).toHaveLength(linksBefore);
});

test('failed generation and report download keep their existing error feedback', async () => {
  postHandlers['/api/project/generate-sections'] = () => Promise.reject(new Error('Unavailable'));
  const originalGet = mockApi.get.getMockImplementation();
  mockApi.get.mockImplementation((path, config) => path.startsWith('/api/report/') ? Promise.reject(new Error('Unavailable')) : originalGet(path, config));
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await ready(); await changeUtility('Storm');
  fireEvent.change(screen.getByLabelText('Enter Number of Pipeline Sections'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Generate Sections' }));
  await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Failed to generate pipeline sections.'));
  expect(screen.getByText('No sections generated for Storm yet.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Download Full Report (Both)' }));
  await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Unable to download report.'));
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});


test('ordinary members never request the privileged user directory', async () => {
  user = { ...user, role: 'user', email: 'member@example.test' };
  await ready();
  expect(mockApi.get).not.toHaveBeenCalledWith('/api/auth/getusers', expect.anything());
});
