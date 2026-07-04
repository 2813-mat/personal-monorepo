import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TransactionApiService } from './transaction-api.service';
import { environment } from '../../../environments/environment';

describe('TransactionApiService', () => {
  let service: TransactionApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TransactionApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TransactionApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs transactions with year/month params', () => {
    service.list({ year: 2026, month: 5 }).subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/transactions?year=2026&month=5`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('DELETEs by id', () => {
    service.remove('t1').subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/transactions/t1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
