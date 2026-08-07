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

  it('POSTs a new category', () => {
    const body = { slug: 'farmacia', label: 'Farmácia', color: '#2E7D5B', budget: 300 };
    service.createCategory(body).subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/categories`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ id: 'cuid-1', ...body });
  });

  it('PATCHes a category', () => {
    service.updateCategory('casa', { budget: 600 }).subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/categories/casa`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ budget: 600 });
    req.flush({});
  });

  it('DELETEs a category', () => {
    service.removeCategory('casa').subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/categories/casa`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('PATCHes the whole order in one call', () => {
    service.reorderCategories(['saude', 'casa']).subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/categories/order`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ slugs: ['saude', 'casa'] });
    req.flush([]);
  });

  it('POSTs a new card', () => {
    const body = {
      name: 'Inter', bank: 'Inter', color: '#FF7A00', closingDay: 1,
      dueDay: 8, creditLimit: 1000, last4: '0001', holder: 'shared',
    };
    service.createCard(body).subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/cards`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('PATCHes a card', () => {
    service.updateCard('c1', { creditLimit: 6000 }).subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/cards/c1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ creditLimit: 6000 });
    req.flush({});
  });

  it('DELETEs a card', () => {
    service.removeCard('c1').subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/cards/c1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('PATCHes the archive flag on its own route', () => {
    service.archiveCard('c1', true).subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/cards/c1/archive`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ archived: true });
    req.flush({});
  });
});
