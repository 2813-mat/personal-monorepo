import { Component, inject, computed, signal } from '@angular/core';
import { AppDataService } from '../../layout/app-data.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { CatDotComponent } from '../../ui/cat-dot/cat-dot.component';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { IconComponent } from '../../ui/icon/icon.component';
import type { Holder } from '@caixa-familia/shared-types';

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
  imports: [MoneyComponent, CatDotComponent, AvatarComponent, IconComponent],
  template: `
    <div class="layout">
      <!-- Left nav -->
      <nav class="nav-card">
        @for (item of navItems; track item.id) {
          <button
            type="button"
            class="nav-item"
            [class.active]="activeSection() === item.id"
            (click)="activeSection.set(item.id)"
          >
            <cf-icon [name]="item.icon" [size]="13" color="currentColor" />
            <span>{{ item.label }}</span>
          </button>
        }
      </nav>

      <!-- Content -->
      <section class="content">
        @switch (activeSection()) {

          @case ('cats') {
            <div class="card">
              <div class="card-head">
                <div class="card-head-text">
                  <span class="card-title">Categorias</span>
                  <span class="card-sub">{{ data.categories().length }} ativas</span>
                </div>
                <div class="card-head-actions">
                  <button class="btn-ghost" disabled>Reordenar</button>
                  <button class="btn-primary" disabled>+ Nova categoria</button>
                </div>
              </div>

              <div class="table-scroll">
                <table class="tbl">
                  <thead>
                    <tr>
                      <th style="width:24px"></th>
                      <th>Nome</th>
                      <th>Cor</th>
                      <th class="r" style="width:130px">Orçamento/mês</th>
                      <th class="r" style="width:110px">Lançamentos</th>
                      <th style="width:80px">Status</th>
                      <th style="width:32px"></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of data.categories(); track c.id) {
                      <tr>
                        <td class="drag-cell">
                          <cf-icon name="grid" [size]="10" color="var(--ink-4)" />
                        </td>
                        <td>
                          <div class="name-cell">
                            <cf-cat-dot [catId]="c.id" [size]="8" />
                            <div class="name-stack">
                              <span class="name-label">{{ c.label }}</span>
                              <span class="name-sub mono">{{ c.id }}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div class="color-cell">
                            <span class="color-swatch" [style.background]="c.color"></span>
                            <span class="mono color-hex">{{ c.color }}</span>
                          </div>
                        </td>
                        <td class="r num">
                          <cf-money [value]="c.budget" [negColor]="false" size="sm" />
                        </td>
                        <td class="r num">{{ catTxCount(c.id) }}/mês</td>
                        <td><span class="pill pos">Ativa</span></td>
                        <td class="gear-cell">
                          <cf-icon name="settings" [size]="11" color="var(--ink-4)" />
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="card-foot">
                <span class="foot-note">Categorias organizam orçamentos e relatórios.</span>
                <span class="foot-total num">
                  Total budget: <cf-money [value]="totalBudget()" [negColor]="false" size="sm" />
                </span>
              </div>
            </div>
          }

          @case ('people') {
            <div class="card">
              <div class="card-head">
                <div class="card-head-text">
                  <span class="card-title">Pessoas</span>
                  <span class="card-sub">{{ people.length }} membros</span>
                </div>
              </div>

              <div class="people-list">
                @for (p of people; track p.name) {
                  <div class="person-row">
                    <cf-avatar [holder]="p.name" [size]="28" />
                    <div class="person-info">
                      <span class="person-name">{{ p.name }}</span>
                      <span class="person-email">{{ p.email }}</span>
                    </div>
                    <span class="role-pill" [style.background]="p.tag">{{ p.role }}</span>
                    <span class="person-count num">{{ personTxCount(p.name) }} lançamentos</span>
                  </div>
                }
              </div>

              <div class="card-foot">
                <span class="foot-note">Cada pessoa vê e lança no caixa compartilhado.</span>
                <button class="btn-ghost" disabled>Convidar pessoa</button>
              </div>
            </div>
          }

          @case ('cards') {
            <div class="card">
              <div class="card-head">
                <div class="card-head-text">
                  <span class="card-title">Cartões</span>
                  <span class="card-sub">{{ data.cards().length }} cadastrados</span>
                </div>
              </div>

              <div class="table-scroll">
                <table class="tbl">
                  <thead>
                    <tr>
                      <th style="width:48px"></th>
                      <th>Banco</th>
                      <th style="width:90px">Titular</th>
                      <th>Fatura</th>
                      <th class="r" style="width:130px">Limite</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of data.cards(); track c.id) {
                      <tr>
                        <td>
                          <span class="bank-tag" [style.background]="c.color">{{ bankTag(c.bank) }}</span>
                        </td>
                        <td>
                          <div class="name-stack">
                            <span class="name-label">{{ c.bank }}</span>
                            <span class="name-sub mono">···{{ c.last4 }}</span>
                          </div>
                        </td>
                        <td><cf-avatar [holder]="c.holder" [size]="22" /></td>
                        <td class="muted">fecha {{ c.closing }} · vence {{ c.due }}</td>
                        <td class="r num">R$ {{ formatNum(c.limit) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="card-foot">
                <span class="foot-note">Limites e datas de fechamento dos cartões.</span>
                <span class="foot-total num">limite total: R$ {{ formatNum(totalLimit()) }}</span>
              </div>
            </div>
          }

          @case ('rules') {
            <div class="placeholder">
              <cf-icon name="repeat" [size]="28" color="var(--ink-4)" />
              <span class="ph-title">Em breve</span>
              <span class="ph-desc">Regras de recorrência para lançar gastos fixos automaticamente.</span>
            </div>
          }

          @case ('import') {
            <div class="placeholder">
              <cf-icon name="upload" [size]="28" color="var(--ink-4)" />
              <span class="ph-title">Em breve</span>
              <span class="ph-desc">Importação de extratos e faturas em CSV/OFX.</span>
            </div>
          }

          @case ('notif') {
            <div class="placeholder">
              <cf-icon name="bell" [size]="28" color="var(--ink-4)" />
              <span class="ph-title">Em breve</span>
              <span class="ph-desc">Alertas de vencimento, estouro de orçamento e metas.</span>
            </div>
          }

          @case ('backup') {
            <div class="placeholder">
              <cf-icon name="download" [size]="28" color="var(--ink-4)" />
              <span class="ph-title">Em breve</span>
              <span class="ph-desc">Exportação e backup dos seus dados financeiros.</span>
            </div>
          }
        }
      </section>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .layout {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 12px;
      align-items: start;
    }

    /* Left nav */
    .nav-card {
      background: var(--surface);
      border: 1px solid var(--line);
      box-shadow: var(--shadow-sm);
      padding: 6px 0;
      display: flex;
      flex-direction: column;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 14px;
      font-size: 12.5px;
      color: var(--ink-2);
      background: transparent;
      border: none;
      border-left: 2px solid transparent;
      text-align: left;
      cursor: pointer;
      transition: background 0.12s;
      font-family: inherit;
    }
    .nav-item:hover { background: var(--surface-alt); }
    .nav-item.active {
      color: var(--ink-1);
      background: var(--surface-alt);
      border-left-color: var(--brand);
      font-weight: 500;
    }

    /* Content cards */
    .content { min-width: 0; }
    .card {
      background: var(--surface);
      border: 1px solid var(--line);
      box-shadow: var(--shadow-sm);
    }
    .card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid var(--line-soft);
    }
    .card-head-text { display: flex; flex-direction: column; gap: 2px; }
    .card-title { font-size: 13px; font-weight: 600; color: var(--ink-1); }
    .card-sub { font-size: 11.5px; color: var(--ink-3); }
    .card-head-actions { display: flex; gap: 8px; }

    .btn-ghost {
      height: 28px; padding: 0 12px;
      border: 1px solid var(--line); background: transparent;
      font-size: 12px; color: var(--ink-2);
      cursor: not-allowed; opacity: 0.6;
      font-family: inherit;
    }
    .btn-primary {
      height: 28px; padding: 0 12px;
      border: none; background: var(--brand);
      font-size: 12px; color: #fff;
      cursor: not-allowed; opacity: 0.7;
      font-family: inherit;
    }

    /* Tables */
    .table-scroll { overflow-x: auto; }
    .tbl {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }
    .tbl thead th {
      text-align: left;
      font-size: 10.5px;
      font-weight: 600;
      color: var(--ink-3);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--line);
      background: var(--surface-sunk);
      white-space: nowrap;
    }
    .tbl thead th.r { text-align: right; }
    .tbl tbody td {
      padding: 9px 12px;
      border-bottom: 1px solid var(--line-soft);
      color: var(--ink-2);
      vertical-align: middle;
    }
    .tbl tbody tr:last-child td { border-bottom: 0; }
    .tbl tbody tr:hover td { background: var(--surface-alt); }
    .r { text-align: right; }
    .mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
    .muted { color: var(--ink-3); }

    .drag-cell, .gear-cell { text-align: center; }

    .name-cell { display: flex; align-items: center; gap: 8px; }
    .name-stack { display: flex; flex-direction: column; gap: 1px; }
    .name-label { font-size: 12.5px; font-weight: 600; color: var(--ink-1); }
    .name-sub { font-size: 10.5px; color: var(--ink-4); }

    .color-cell { display: flex; align-items: center; gap: 8px; }
    .color-swatch {
      width: 14px; height: 14px;
      border: 1px solid var(--line);
      flex-shrink: 0;
    }
    .color-hex { font-size: 11px; color: var(--ink-3); }

    /* Pills */
    .pill {
      display: inline-block;
      padding: 2px 8px;
      font-size: 10.5px;
      font-weight: 500;
      letter-spacing: 0.2px;
      white-space: nowrap;
    }
    .pill.pos { background: var(--pos-soft); color: var(--pos); }

    /* Footer */
    .card-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 16px;
      border-top: 1px solid var(--line-soft);
    }
    .foot-note { font-size: 11.5px; color: var(--ink-4); }
    .foot-total {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--ink-1);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* People */
    .people-list { display: flex; flex-direction: column; }
    .person-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--line-soft);
    }
    .person-row:last-child { border-bottom: 0; }
    .person-info { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
    .person-name { font-size: 13px; font-weight: 600; color: var(--ink-1); }
    .person-email { font-size: 11.5px; color: var(--ink-3); }
    .role-pill {
      padding: 2px 9px;
      font-size: 10.5px;
      font-weight: 600;
      color: #fff;
      white-space: nowrap;
    }
    .person-count { font-size: 11.5px; color: var(--ink-3); }

    /* Bank tag */
    .bank-tag {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px; height: 20px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.3px;
      color: #fff;
      flex-shrink: 0;
    }

    /* Placeholder */
    .placeholder {
      background: var(--surface);
      border: 1px solid var(--line);
      box-shadow: var(--shadow-sm);
      padding: 48px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      text-align: center;
    }
    .ph-title { font-size: 14px; font-weight: 600; color: var(--ink-2); }
    .ph-desc { font-size: 12px; color: var(--ink-4); max-width: 360px; }
  `],
})
export class SettingsComponent {
  protected data = inject(AppDataService);

  protected activeSection = signal<SectionId>('cats');

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
