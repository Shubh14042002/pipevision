import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProjectCreation from './ProjectCreation';
const mockNavigate = jest.fn();
const mockApi = { get: jest.fn(), post: jest.fn() };
jest.mock('../api/useAxiosPrivate', () => () => mockApi);
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
jest.mock('@mui/x-date-pickers', () => ({ DatePicker: () => null }));
jest.mock('@mui/x-date-pickers/LocalizationProvider', () => ({ LocalizationProvider: ({ children }) => children }));
beforeEach(() => {
  jest.clearAllMocks(); window.alert = jest.fn();
  mockApi.get.mockResolvedValue({ data: { user: { role: 'manager' } } });
});
async function ready() {
  render(<ProjectCreation />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Create Project' }).disabled).toBe(false));
}
test('create a valid project with no videos and navigate to the returned ID', async () => {
  mockApi.post.mockResolvedValue({ data: 'project-id' }); await ready();
  fireEvent.change(screen.getByLabelText(/Project Title/), { target: { value: ' Inspection ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create Project' }));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/project/project-id'));
  expect(mockApi.post).toHaveBeenCalledTimes(1);
  expect(mockApi.post.mock.calls[0][1]).toMatchObject({ title: 'Inspection', videos: [] });
});
test('reject blank title before any create or upload request', async () => {
  await ready(); fireEvent.click(screen.getByRole('button', { name: 'Create Project' }));
  expect(mockApi.post).not.toHaveBeenCalled();
});
test('optional upload metadata failure reports partial success and requests orphan cleanup', async () => {
  mockApi.post.mockImplementation(path => {
    if (path.includes('createproject')) return Promise.resolve({ data: 'project-id' });
    if (path.includes('uploadVideo')) return Promise.resolve({ data: { success: true, url: '/uploads/test.mp4', s3Key: 'test.mp4' } });
    if (path.includes('addVideo')) return Promise.reject(new Error('Metadata unavailable'));
    return Promise.resolve({ data: { success: true } });
  });
  await ready();
  fireEvent.change(screen.getByLabelText(/Project Title/), { target: { value: 'Inspection' } });
  fireEvent.change(screen.getByLabelText('Video Title'), { target: { value: 'Video' } });
  fireEvent.mouseDown(screen.getByLabelText('Utility Type'));
  fireEvent.click(screen.getByRole('option', { name: 'Storm' }));
  fireEvent.change(screen.getByLabelText('Select video file'), { target: { files: [new File(['video'], 'test.mp4', { type: 'video/mp4' })] } });
  fireEvent.click(screen.getByRole('button', { name: 'Create Project' }));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/project/project-id'));
  expect(mockApi.post).toHaveBeenCalledWith('/api/project/discardUpload', { projectId: 'project-id', s3Key: 'test.mp4' });
  expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Project created, but only 0 of 1 videos were added'));
});
