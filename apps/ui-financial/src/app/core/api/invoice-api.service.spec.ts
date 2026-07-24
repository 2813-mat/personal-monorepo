import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InvoiceApiService } from './invoice-api.service';
import { environment } from '../../../environments/environment';

describe('InvoiceApiService', () => {
  let service: InvoiceApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InvoiceApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InvoiceApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs the invoice history for a card', () => {
    service.listByCard('nu-t').subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/cards/nu-t/invoices`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('GETs the open invoice for a card', () => {
    service.getOpen('nu-t').subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/cards/nu-t/invoice`);
    expect(req.request.method).toBe('GET');
    req.flush({ total: 0, items: [] });
  });

  it('POSTs an invoice close with the cycle coordinates', () => {
    service.closeInvoice('nu-t', 2026, 8).subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/cards/nu-t/invoices/close`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ year: 2026, month: 8 });
    req.flush({});
  });
});
