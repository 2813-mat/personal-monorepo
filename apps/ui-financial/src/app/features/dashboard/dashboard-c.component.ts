import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppDataService } from '../../layout/app-data.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { CatDotComponent } from '../../ui/cat-dot/cat-dot.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { daysUntilClosing } from '@caixa-familia/shared-utils';
import type { Card } from '@caixa-familia/shared-types';

@Component({
  selector: 'cf-dashboard-c',
  standalone: true,
  imports: [MoneyComponent, AvatarComponent, CatDotComponent, ProgressBarComponent, IconComponent, RouterLink],
  template: `
    <div class="kpi-strip">
      <div class="kpi-item">
        <div class="kpi-label">Receita</div>
        <cf-money [value]="receita()" size="lg" [negColor]="false" />
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi-item">
        <div class="kpi-label">Gastos</div>
        <cf-money [value]="gastos()" size="lg" [negColor]="false" color="var(--neg)" />
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi-item">
        <div class="kpi-label">Saldo</div>
        <cf-money [value]="saldo()" size="lg" [negColor]="false" [color]="saldo() >= 0 ? 'var(--pos)' : 'var(--neg)'" />
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi-item">
        <div class="kpi-label">Faturas</div>
        <cf-money [value]="totalFaturas()" size="lg" [negColor]="false" />
      </div>
      <div class="kpi-end">
        <div class="kpi-label">{{ todayStr }}</div>
        <div class="kpi-sub">{{ daysLeftInMonth }} dias até o mês fechar</div>
      </div>
    </div>

    <div class="dash-grid">
      <div class="col-main">
        <div class="section-header">
          <h1 class="section-title">Faturas em aberto</h1>
          <span class="section-meta">Ordenado por proximidade do fechamento</span>
        </div>
        <div class="cards-grid">
          @for (card of sortedCards(); track card.id) {
            <div class="card-item">
              <div class="card-color-bar" [style.background]="card.color"></div>
              <div class="card-body">
                <div class="card-row">
                  <div>
                    <div class="card-name-row">
                      <span class="card-name">{{ card.bank }}</span>
                      <span class="card-last4">···{{ card.last4 }}</span>
                    </div>
                    <div class="card-holder-row">
                      <cf-avatar [holder]="card.holder" [size]="14" />
                      <span class="card-holder-label">{{ card.holder }}</span>
                    </div>
                  </div>
                  <div class="card-close-info">
                    <span class="close-pill" [class.warn]="daysLeft(card) <= 7 && daysLeft(card) > 3" [class.urgent]="daysLeft(card) <= 3">
                      <cf-icon name="calendar" [size]="9" />
                      {{ daysLeft(card) === 0 ? 'fecha hoje' : daysLeft(card) + 'd p/ fechar' }}
                    </span>
                    <span class="card-close-day num">dia {{ card.closing }}</span>
                  </div>
                </div>
                <div class="card-value-row">
                  <cf-money [value]="card.current" size="xl" [negColor]="false" />
                  <span class="card-limit num">/ R$ {{ formatShort(card.limit) }}</span>
                </div>
                <cf-progress-bar [value]="card.current" [max]="card.limit" [color]="card.color" [height]="4" />
                <div class="card-meta-row">
                  <span class="card-util num">{{ utilPct(card) }}% do limite</span>
                  <span class="card-due num">vence dia {{ card.due }}</span>
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <div class="col-side">
        <div class="panel">
          <div class="panel-head">
            <span class="panel-title">Metas &amp; reservas</span>
            <span class="panel-meta">aporte mensal: R$ 1.800</span>
          </div>
          <div class="panel-body">
            @for (goal of data.goals(); track goal.id) {
              <div class="goal-item">
                <div class="goal-row">
                  <div>
                    <div class="goal-name">{{ goal.label }}</div>
                    <div class="goal-months">{{ monthsLeft(goal) }} meses no ritmo atual</div>
                  </div>
                  <div class="goal-values">
                    <cf-money [value]="goal.balance" size="md" [negColor]="false" />
                    <span class="goal-target num">/ R$ {{ formatShort(goal.target) }}</span>
                  </div>
                </div>
                <cf-progress-bar [value]="goal.balance" [max]="goal.target" [color]="goal.color" [height]="4" />
                <div class="goal-pct num">{{ goalPct(goal) }}% concluído</div>
              </div>
            }
          </div>
        </div>

        <div class="panel panel--flex">
          <div class="panel-head">
            <span class="panel-title">Atividade recente</span>
            <a class="panel-meta panel-link" routerLink="/transactions">Ver tudo →</a>
          </div>
          <div class="panel-body panel-body--compact">
            @for (tx of recentTx(); track tx.id) {
              <div class="activity-item">
                <div class="activity-left">
                  <div class="activity-date-dot">
                    <span class="activity-date num">{{ formatDay(tx.date) }}/mai</span>
                    <cf-cat-dot [catId]="tx.cat" [size]="7" />
                  </div>
                  <div class="activity-info">
                    <span class="activity-label">{{ tx.label }}</span>
                    <span class="activity-cat">
                      {{ catLabel(tx.cat) }}
                      @if (tx.installments) { · {{ tx.installments.n }}/{{ tx.installments.of }} }
                    </span>
                  </div>
                </div>
                <div class="activity-right">
                  <cf-money [value]="tx.value" size="sm" [negColor]="false" />
                  <span class="activity-method">{{ methodLabel(tx.method) }}</span>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .kpi-strip { display:flex; align-items:center; background:var(--surface); border:1px solid var(--line); box-shadow:var(--shadow-sm); padding:10px 16px; margin-bottom:12px; }
    .kpi-item { display:flex; flex-direction:column; gap:2px; }
    .kpi-divider { width:1px; height:32px; background:var(--line); margin:0 16px; }
    .kpi-label { font-size:10.5px; color:var(--ink-3); text-transform:uppercase; letter-spacing:0.6px; font-weight:600; }
    .kpi-end { margin-left:auto; text-align:right; }
    .kpi-sub { font-size:11px; color:var(--ink-4); margin-top:2px; }

    .dash-grid { display:grid; grid-template-columns:1.55fr 1fr; gap:12px; }
    .section-header { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:10px; }
    .section-title { font-size:16px; font-weight:600; letter-spacing:-0.2px; color:var(--ink-1); }
    .section-meta { font-size:11px; color:var(--ink-4); }

    .cards-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
    .card-item { background:var(--surface); border:1px solid var(--line); box-shadow:var(--shadow-sm); overflow:hidden; }
    .card-color-bar { height:4px; }
    .card-body { padding:10px 14px; }
    .card-row { display:flex; justify-content:space-between; align-items:flex-start; }
    .card-name-row { display:flex; align-items:center; gap:6px; }
    .card-name { font-size:13px; font-weight:600; color:var(--ink-1); }
    .card-last4 { font-size:11px; color:var(--ink-4); }
    .card-holder-row { display:flex; align-items:center; gap:6px; margin-top:4px; }
    .card-holder-label { font-size:11px; color:var(--ink-4); }
    .card-close-info { display:flex; flex-direction:column; align-items:flex-end; gap:4px; }
    .close-pill { display:inline-flex; align-items:center; gap:4px; font-size:10.5px; font-weight:500; padding:2px 6px; background:var(--surface-alt); border:1px solid var(--line); color:var(--ink-2); text-transform:uppercase; letter-spacing:0.4px; }
    .close-pill.warn { background:var(--warn-soft); color:var(--warn); border-color:transparent; }
    .close-pill.urgent { background:var(--neg-soft); color:var(--neg); border-color:transparent; }
    .card-close-day { font-size:11px; color:var(--ink-4); }
    .card-value-row { display:flex; align-items:baseline; justify-content:space-between; margin-top:12px; }
    .card-limit { font-size:11px; color:var(--ink-4); }
    .card-meta-row { display:flex; justify-content:space-between; margin-top:4px; }
    .card-util, .card-due { font-size:11px; color:var(--ink-4); }

    .col-side { display:flex; flex-direction:column; gap:12px; }
    .panel { background:var(--surface); border:1px solid var(--line); box-shadow:var(--shadow-sm); }
    .panel--flex { flex:1; }
    .panel-head { display:flex; align-items:baseline; justify-content:space-between; padding:10px 14px 8px; border-bottom:1px solid var(--line-soft); }
    .panel-title { font-size:11px; color:var(--ink-3); text-transform:uppercase; letter-spacing:0.7px; font-weight:600; }
    .panel-meta { font-size:11px; color:var(--ink-4); }
    .panel-link:hover { color:var(--brand); }
    .panel-body { padding:8px 14px 10px; }
    .panel-body--compact { padding:4px 14px 8px; }
    .goal-item { padding:8px 0; border-bottom:1px solid var(--line-soft); }
    .goal-item:last-child { border-bottom:none; }
    .goal-row { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; }
    .goal-name { font-size:13px; font-weight:500; color:var(--ink-1); }
    .goal-months { font-size:11px; color:var(--ink-4); margin-top:2px; }
    .goal-values { display:flex; flex-direction:column; align-items:flex-end; }
    .goal-target { font-size:11px; color:var(--ink-4); }
    .goal-pct { font-size:11px; color:var(--ink-4); margin-top:4px; }
    .activity-item { display:flex; justify-content:space-between; align-items:center; padding:7px 0; border-bottom:1px solid var(--line-soft); gap:8px; }
    .activity-item:last-child { border-bottom:none; }
    .activity-left { display:flex; gap:8px; align-items:center; min-width:0; }
    .activity-date-dot { display:flex; flex-direction:column; align-items:center; gap:2px; width:28px; flex-shrink:0; }
    .activity-date { font-size:10px; color:var(--ink-4); }
    .activity-info { display:flex; flex-direction:column; min-width:0; }
    .activity-label { font-size:12.5px; color:var(--ink-1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .activity-cat { font-size:11px; color:var(--ink-4); }
    .activity-right { display:flex; flex-direction:column; align-items:flex-end; flex-shrink:0; }
    .activity-method { font-size:11px; color:var(--ink-4); }
  `],
})
export class DashboardCComponent {
  protected data = inject(AppDataService);
  private today = new Date();

  todayStr = this.today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  daysLeftInMonth = (() => {
    const last = new Date(this.today.getFullYear(), this.today.getMonth() + 1, 0);
    return last.getDate() - this.today.getDate();
  })();

  receita = computed(() =>
    this.data.incomes()
      .filter(i => { const f = this.data.holderFilter(); return f === 'todos' || i.holder === f; })
      .reduce((s, i) => s + i.value, 0)
  );

  gastos = computed(() => {
    const f = this.data.holderFilter();
    return this.data.transactions()
      .filter(t => f === 'todos' || t.holder === f || (f !== 'shared' && t.holder === 'shared'))
      .reduce((s, t) => s + t.value, 0);
  });

  saldo = computed(() => this.receita() - this.gastos());

  totalFaturas = computed(() => this.data.cards().reduce((s, c) => s + c.current, 0));

  // Fix: slice(0, 6) garante grade 2×3 completa
  sortedCards = computed(() =>
    [...this.data.cards()]
      .sort((a, b) => this.daysLeft(a) - this.daysLeft(b))
      .slice(0, 6)
  );

  recentTx = computed(() =>
    [...this.data.transactions()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7)
  );

  daysLeft(card: Card) { return daysUntilClosing(card, this.today); }
  utilPct(card: Card) { return ((card.current / card.limit) * 100).toFixed(0); }
  formatShort(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
  formatDay(date: string) { return date.split('-')[2]; }
  catLabel(id: string) { return this.data.catBy()[id]?.label ?? id; }
  methodLabel(m: string) { return this.data.cardBy()[m]?.bank ?? 'Pix'; }
  monthsLeft(g: { balance: number; target: number; monthly: number }) { return Math.ceil((g.target - g.balance) / g.monthly); }
  goalPct(g: { balance: number; target: number }) { return ((g.balance / g.target) * 100).toFixed(0); }
}
