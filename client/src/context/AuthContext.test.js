import React, { useContext } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AuthContext, { AuthProvider } from './AuthContext';
import { API, refresh } from '../api';
jest.mock('../api', () => ({ API: { get: jest.fn(), post: jest.fn() }, refresh: jest.fn() }));
function Identity() { const { user } = useContext(AuthContext); return <span>{user ? `${user.name}:${user.role}` : 'anonymous'}</span>; }
beforeEach(() => { localStorage.clear(); jest.clearAllMocks(); });
test('initialization waits for persisted identity instead of using JWT claims as a role', async () => {
  localStorage.setItem('authToken', 'stored');
  API.get.mockResolvedValue({ data: { user: { name: 'Test', role: 'manager' } } });
  render(<AuthProvider><Identity /></AuthProvider>);
  expect(await screen.findByText('Test:manager')).toBeTruthy();
  expect(API.get).toHaveBeenCalledWith('/api/auth/info', { headers: { Authorization: 'Bearer stored' } });
});
test('expired stored access token refreshes and loads persisted identity', async () => {
  localStorage.setItem('authToken', 'expired');
  API.get.mockRejectedValueOnce({ response: { status: 401 } }).mockResolvedValue({ data: { user: { name: 'Test', role: 'user' } } });
  refresh.mockResolvedValue({ data: { accessToken: 'renewed' } });
  render(<AuthProvider><Identity /></AuthProvider>);
  expect(await screen.findByText('Test:user')).toBeTruthy();
  expect(localStorage.getItem('authToken')).toBe('renewed'); expect(refresh).toHaveBeenCalledTimes(1);
});
test('invalid session finishes initialization with anonymous identity', async () => {
  localStorage.setItem('authToken', 'invalid');
  API.get.mockRejectedValue({ response: { status: 401 } }); refresh.mockRejectedValue(new Error('Unauthorized'));
  render(<AuthProvider><Identity /></AuthProvider>);
  expect(await screen.findByText('anonymous')).toBeTruthy();
  await waitFor(() => expect(localStorage.getItem('authToken')).toBeNull());
});
