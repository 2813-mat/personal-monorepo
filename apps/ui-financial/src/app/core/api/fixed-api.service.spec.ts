import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FixedApiService } from './fixed-api.service';
import { environment } from '../../../environments/environment';

describe('FixedApiService', () => {
  let service: FixedApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FixedApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FixedApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs fixed expenses with year and month params', () => {
    service.list({ year: 2026, month: 5 }).subscribe();
    const req = httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/fixed-expenses`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('year')).toBe('2026');
    expect(req.request.params.get('month')).toBe('5');
    req.flush([]);
  });

  it('POSTs a new fixed expense', () => {
    const body = { label: 'Aluguel', value: 2000, dueDay: 5, categorySlug: 'casa', holder: 'shared' };
    service.create(body).subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/fixed-expenses`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ id: 'f1', ...body, paidThisMonth: false });
  });
});
