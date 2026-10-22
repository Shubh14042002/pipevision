import React from 'react';
import { render, act } from '@testing-library/react';
import AuthContext from '../context/AuthContext';
import useAxios from './useAxiosPrivate';
import { refresh } from './index';
jest.mock('./index', () => ({ API_BASE_URL: 'http://localhost:5001', refresh: jest.fn() }));
let instance;
const setters = { setUser: jest.fn(), setAuthToken: jest.fn() };
function Consumer() { instance = useAxios(); return null; }
beforeEach(() => { localStorage.clear(); jest.clearAllMocks(); });
test('private Axios instance stays stable and reads the latest access token', async () => {
  const ui = <AuthContext.Provider value={setters}><Consumer /></AuthContext.Provider>;
  const { rerender } = render(ui);
  const original = instance; rerender(<AuthContext.Provider value={setters}><Consumer /></AuthContext.Provider>); expect(instance).toBe(original);
  const seen = [];
  instance.defaults.adapter = async config => { seen.push(config.headers.Authorization); return { status: 200, data: {}, config }; };
  localStorage.setItem('authToken', 'first'); await instance.get('/test');
  localStorage.setItem('authToken', 'second'); await instance.get('/test');
  expect(seen).toEqual(['Bearer first', 'Bearer second']);
});
test('401 refresh retries once and updates the access token', async () => {
  render(<AuthContext.Provider value={setters}><Consumer /></AuthContext.Provider>);
  let attempts = 0;
  instance.defaults.adapter = async config => {
    attempts += 1;
    if (attempts === 1) throw Object.assign(new Error("Unauthorized"), { config, response: { status: 401 } });
    return { status: 200, data: config.headers.Authorization, config };
  };
  refresh.mockResolvedValue({ data: { accessToken: 'renewed' } });
  let response; await act(async () => { response = await instance.get('/test'); });
  expect(response.data).toBe('Bearer renewed'); expect(attempts).toBe(2);
  expect(setters.setAuthToken).toHaveBeenCalledWith('renewed');
});
test('failed refresh clears local auth and rejects without a retry loop', async () => {
  render(<AuthContext.Provider value={setters}><Consumer /></AuthContext.Provider>);
  instance.defaults.adapter = async config => { throw Object.assign(new Error("Unauthorized"), { config, response: { status: 401 } }); };
  refresh.mockRejectedValue(new Error('expired session'));
  localStorage.setItem('authToken', 'expired');
  await expect(instance.get('/test')).rejects.toThrow('expired session');
  expect(refresh).toHaveBeenCalledTimes(1); expect(localStorage.getItem('authToken')).toBeNull();
  expect(setters.setUser).toHaveBeenCalledWith(null);
});
