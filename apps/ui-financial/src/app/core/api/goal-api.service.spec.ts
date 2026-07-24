import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GoalApiService } from './goal-api.service';
import { environment } from '../../../environments/environment';

describe('GoalApiService', () => {
  let service: GoalApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GoalApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GoalApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs goals without params', () => {
    service.list().subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/goals`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('POSTs a contribution to the goal slug', () => {
    const body = { amount: 500, date: '2026-05-22' };
    service.addContribution('sos', body).subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/goals/sos/contributions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });
});
