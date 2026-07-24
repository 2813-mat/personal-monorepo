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
});
