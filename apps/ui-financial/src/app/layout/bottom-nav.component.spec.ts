import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { BottomNavComponent } from './bottom-nav.component';
import { AuthService } from '../core/auth/auth.service';

function build(canWrite = true) {
  TestBed.configureTestingModule({
    imports: [BottomNavComponent],
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { canWrite: signal(canWrite), logout: jest.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(BottomNavComponent);
  fixture.detectChanges();
  return fixture;
}

afterEach(() => TestBed.resetTestingModule());

describe('BottomNavComponent', () => {
  it('renders the three fixed destinations', () => {
    const links = build().nativeElement.querySelectorAll('a.bn-item');
    expect(Array.from(links).map((a: any) => a.getAttribute('href'))).toEqual([
      '/dashboard',
      '/transactions',
      '/cards',
    ]);
  });

  it('shows the new-expense button to writers', () => {
    expect(build(true).nativeElement.querySelector('.bn-fab')).not.toBeNull();
  });

  it('hides the new-expense button from readers', () => {
    expect(build(false).nativeElement.querySelector('.bn-fab')).toBeNull();
  });

  it('emits newExpense when the button is pressed', () => {
    const fixture = build(true);
    const seen: void[] = [];
    fixture.componentInstance.newExpense.subscribe(() => seen.push(undefined));
    fixture.nativeElement.querySelector('.bn-fab').click();
    expect(seen.length).toBe(1);
  });

  it('toggles the more sheet', () => {
    const fixture = build();
    expect(fixture.nativeElement.querySelector('cf-more-sheet')).toBeNull();
    fixture.nativeElement.querySelector('.bn-more').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('cf-more-sheet')).not.toBeNull();
  });

  it('lists in the more sheet every destination the bottom bar left out', () => {
    const fixture = build();
    fixture.nativeElement.querySelector('.bn-more').click();
    fixture.detectChanges();
    const hrefs = Array.from(
      fixture.nativeElement.querySelectorAll('cf-more-sheet a.ms-item'),
    ).map((a: any) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/fixed', '/budgets', '/goals', '/reports', '/settings']);
  });
});
