import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogApiService } from './catalog-api.service';
import { environment } from '../../../environments/environment';

describe('CatalogApiService', () => {
  let service: CatalogApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CatalogApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs categories', () => {
    service.listCategories().subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/categories`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('GETs cards', () => {
    service.listCards().subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/cards`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
