import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { IncomeApiService } from './income-api.service';
import { environment } from '../../../environments/environment';

describe('IncomeApiService', () => {
  let service: IncomeApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IncomeApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(IncomeApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs incomes without params', () => {
    service.list().subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/incomes`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('POSTs a new income', () => {
    const body = { label: 'Salário', holder: 'Thais', value: 5000, date: '2026-05-05', recurring: true };
    service.create(body).subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/incomes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ id: 'i1', ...body });
  });
});
