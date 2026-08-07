import { Component, inject, computed, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { slugify } from '@caixa-familia/shared-utils';
import { AppDataService } from '../../layout/app-data.service';
import { ViewportService } from '../../core/viewport.service';
import { AuthService } from '../../core/auth/auth.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { CatDotComponent } from '../../ui/cat-dot/cat-dot.component';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { CategoryEditDrawerComponent } from './category-edit-drawer.component';
import { ConfirmModalComponent } from '../../ui/confirm-modal/confirm-modal.component';
import type { Category, Holder } from '@caixa-familia/shared-types';

type SectionId = 'cats' | 'people' | 'cards' | 'rules' | 'import' | 'notif' | 'backup';

interface NavItem {
  id: SectionId;
  label: string;
  icon: string;
}

interface Person {
  name: Holder;
  email: string;
  role: string;
  tag: string;
}

@Component({
  selector: 'cf-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MoneyComponent,
    CatDotComponent,
    AvatarComponent,
    IconComponent,
    CategoryEditDrawerComponent,
    ConfirmModalComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  protected data = inject(AppDataService);
  protected vp = inject(ViewportService);
  protected auth = inject(AuthService);

  protected activeSection = signal<SectionId>('cats');

  protected editingCategory = signal<Category | null>(null);

  /** Paleta fixa — garante um hex válido para o @IsHexColor do backend. */
  readonly palette = [
    '#2E7D5B', '#1F4E79', '#9F1239', '#7A4F1D',
    '#B45309', '#3F2C7A', '#0F2D4F', '#7A1F3D',
  ];

  readonly showNewCategory = signal(false);

  readonly newCategory = new FormGroup({
    label: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    budget: new FormControl<number>(0, { nonNullable: true, validators: [Validators.min(0)] }),
    color: new FormControl(this.palette[0], { nonNullable: true, validators: [Validators.required] }),
  });

  private readonly labelValue = signal('');

  readonly newCategorySlug = computed(() => slugify(this.labelValue()));

  readonly slugTaken = computed(() => {
    const slug = this.newCategorySlug();
    return slug !== '' && this.data.categories().some((c) => c.id === slug);
  });

  constructor() {
    this.newCategory.controls.label.valueChanges.subscribe((v) => this.labelValue.set(v ?? ''));
  }

  toggleNewCategory(): void {
    this.showNewCategory.update((open) => !open);
  }

  saveCategory(): void {
    const slug = this.newCategorySlug();
    if (this.newCategory.invalid || this.slugTaken() || !slug) return;
    const v = this.newCategory.getRawValue();
    this.data.createCategory({
      id: slug,
      label: v.label,
      color: v.color,
      budget: Number(v.budget),
      // O backend atribui a posição real (último + 1) e o recarregamento a traz.
      order: 0,
    });
    this.cancelNewCategory();
  }

  /**
   * `delta` é -1 para subir e 1 para descer. Manda a lista completa: o
   * PATCH /categories/order rejeita lista parcial com 400 — é o contrato.
   */
  moveCategory(slug: string, delta: -1 | 1): void {
    const slugs = this.data.categories().map((c) => c.id);
    const from = slugs.indexOf(slug);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= slugs.length) return;
    const next = [...slugs];
    [next[from], next[to]] = [next[to], next[from]];
    this.data.reorderCategories(next);
  }

  isFirstCategory(slug: string): boolean {
    return this.data.categories()[0]?.id === slug;
  }

  isLastCategory(slug: string): boolean {
    const list = this.data.categories();
    return list[list.length - 1]?.id === slug;
  }

  readonly confirmingRemoval = signal<string | null>(null);

  askRemoveCategory(slug: string): void {
    this.confirmingRemoval.set(slug);
  }

  confirmRemoveCategory(): void {
    const slug = this.confirmingRemoval();
    if (slug) this.data.removeCategory(slug);
    this.confirmingRemoval.set(null);
  }

  cancelRemoveCategory(): void {
    this.confirmingRemoval.set(null);
  }

  cancelNewCategory(): void {
    this.newCategory.reset({ label: '', budget: 0, color: this.palette[0] });
    this.showNewCategory.set(false);
  }

  protected navItems: NavItem[] = [
    { id: 'cats',   label: 'Categorias',     icon: 'target' },
    { id: 'people', label: 'Pessoas',        icon: 'list' },
    { id: 'cards',  label: 'Cartões',        icon: 'card' },
    { id: 'rules',  label: 'Recorrências',   icon: 'repeat' },
    { id: 'import', label: 'Importar',       icon: 'upload' },
    { id: 'notif',  label: 'Notificações',   icon: 'bell' },
    { id: 'backup', label: 'Backup',         icon: 'download' },
  ];

  protected people: Person[] = [
    { name: 'Mateus', email: 'mateus@email.com', role: 'Admin',  tag: '#1F4E79' },
    { name: 'Thais',  email: 'thais@email.com',  role: 'Editor', tag: '#7A1F3D' },
  ];

  protected totalBudget = computed(() =>
    this.data.categories().reduce((s, c) => s + c.budget, 0)
  );

  protected totalLimit = computed(() =>
    this.data.cards().reduce((s, c) => s + c.limit, 0)
  );

  protected catTxCount(catId: string): number {
    return this.data.transactions().filter(t => t.cat === catId).length;
  }

  protected personTxCount(name: Holder): number {
    return this.data.transactions().filter(t => t.holder === name).length;
  }

  protected bankTag(bank: string): string {
    return bank.slice(0, 4).toUpperCase();
  }

  protected formatNum(value: number): string {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value);
  }
}
