import { TestBed } from '@angular/core/testing';
import { ViewportService } from './viewport.service';

type Listener = (e: { matches: boolean }) => void;

function mockMatchMedia(initial: boolean) {
  const listeners: Listener[] = [];
  const mql = {
    matches: initial,
    media: '(min-width: 768px)',
    addEventListener: (_: string, fn: Listener) => listeners.push(fn),
    removeEventListener: jest.fn(),
  };
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => mql,
  });
  return { emit: (matches: boolean) => listeners.forEach(fn => fn({ matches })) };
}

afterEach(() => TestBed.resetTestingModule());

describe('ViewportService', () => {
  it('starts desktop when the query already matches', () => {
    mockMatchMedia(true);
    expect(TestBed.inject(ViewportService).isDesktop()).toBe(true);
  });

  it('starts mobile when the query does not match', () => {
    mockMatchMedia(false);
    expect(TestBed.inject(ViewportService).isDesktop()).toBe(false);
  });

  it('follows the media query when the viewport changes', () => {
    const { emit } = mockMatchMedia(false);
    const vp = TestBed.inject(ViewportService);
    expect(vp.isDesktop()).toBe(false);
    emit(true);
    expect(vp.isDesktop()).toBe(true);
    emit(false);
    expect(vp.isDesktop()).toBe(false);
  });

  it('queries the single project breakpoint', () => {
    mockMatchMedia(true);
    const spy = jest.spyOn(window, 'matchMedia');
    TestBed.inject(ViewportService);
    expect(spy).toHaveBeenCalledWith('(min-width: 768px)');
  });
});
