import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { reportError, resetErrorReporting } from '../lib/errorReporting';
import { RouteErrorBoundary } from '../components/common/RouteErrorBoundary';

describe('browser error reporting', () => {
  const beacon = vi.fn();
  const fetchMock = vi.fn();

  beforeEach(() => {
    resetErrorReporting();
    beacon.mockReset().mockReturnValue(true);
    fetchMock.mockReset().mockResolvedValue({ ok: true });
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/product/boot?token=secret-value');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const sentBody = async (call = 0) => JSON.parse(await (beacon.mock.calls[call][1] as Blob).text());

  it('sends the message, stack and page path, and never the query string', async () => {
    reportError(new Error('Cannot read properties of undefined'), 'react');

    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0][0]).toBe('/api/client-errors');
    const body = await sentBody();
    expect(body).toMatchObject({ message: 'Cannot read properties of undefined', page: '/product/boot', source: 'react' });
    expect(JSON.stringify(body)).not.toContain('secret-value');
  });

  it('reports a repeated error once and stops after five different ones', () => {
    reportError(new Error('same'));
    reportError(new Error('same'));
    expect(beacon).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 10; i++) reportError(new Error(`different ${i}`));
    expect(beacon).toHaveBeenCalledTimes(5);
  });

  it('ignores browser noise that is not a bug in the site', () => {
    reportError(new Error('ResizeObserver loop completed with undelivered notifications.'));
    reportError('Script error.');
    reportError(new Error('x'), 'promise'); // a real one still goes through
    expect(beacon).toHaveBeenCalledTimes(1);
  });

  it('falls back to fetch when beacons are refused, truncates long text, and never throws', async () => {
    beacon.mockReturnValue(false);
    reportError(new Error('m'.repeat(2000)));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).message).toHaveLength(500);

    fetchMock.mockRejectedValue(new Error('offline'));
    expect(() => reportError(new Error('another'))).not.toThrow();
    Object.defineProperty(navigator, 'sendBeacon', { value: () => { throw new Error('blocked'); }, configurable: true });
    expect(() => reportError(new Error('third'))).not.toThrow();
  });

  it('the screen boundary reports a crash and offers a reload instead of a blank page', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Broken = () => {
      throw new Error('render exploded');
    };
    render(
      <RouteErrorBoundary resetKey="/x">
        <Broken />
      </RouteErrorBoundary>
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    expect(beacon).toHaveBeenCalledTimes(1);
  });

  it('explains a stale release in plain words when a screen file has gone', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Stale = () => {
      throw new Error('Failed to fetch dynamically imported module: /assets/AdminDashboardPage-abc.js');
    };
    render(
      <RouteErrorBoundary resetKey="/admin">
        <Stale />
      </RouteErrorBoundary>
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/newer version of Footzi is available/i);
  });
});
