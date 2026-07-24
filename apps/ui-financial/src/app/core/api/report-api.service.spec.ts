import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportApiService } from './report-api.service';
import { environment } from '../../../environments/environment';

describe('ReportApiService', () => {
  let service: ReportApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ReportApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReportApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs the monthly summaries without params', () => {
    service.listMonthly().subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/reports/monthly`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('POSTs a month close with its coordinates', () => {
    service.closeMonth(2026, 6).subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/reports/monthly/close`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ year: 2026, month: 6 });
    req.flush({});
  });
});
