import { Component, Input, computed, inject } from '@angular/core';
import { AppDataService } from '../../layout/app-data.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';
import { SparkbarsComponent } from '../../ui/sparkbars/sparkbars.component';
import { IconComponent } from '../../ui/icon/icon.component';
import type { Goal } from '@caixa-familia/shared-types';

const MONTH_ABBR = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

function fmtShort(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─── GoalCard (private subcomponent) ─────────────────────────────────────────

@Component({
  selector: 'cf-goal-card',
  standalone: true,
  imports: [MoneyComponent, ProgressBarComponent, SparkbarsComponent, IconComponent],
  template: `
    <div class="goal-card">
      <div class="goal-stripe" [style.background]="goal.color"></div>
      <div class="goal-body">

        <!-- Header -->
        <div class="goal-header">
          <div class="goal-header-left">
            <div class="goal-name-row">
              <span class="goal-name">{{ goal.label }}</span>
              <span class="goal-type-pill" [style.background]="softColor" [style.color]="goal.color">
                {{ typeLabel }}
              </span>
            </div>
            <span class="goal-subtitle">{{ goal.subtitle }}</span>
          </div>
          <div class="goal-header-actions">
            <button class="btn-ghost" disabled>Editar</button>
            <button class="btn-colored" [style.background]="goal.color" disabled>
              <cf-icon name="plus" [size]="11" /> Aporte extra
            </button>
          </div>
        </div>

        <!-- Big progress -->
        <div class="goal-progress-row">
          <cf-money [value]="goal.balance" size="xxl" [negColor]="false" />
          <span class="goal-target num">/ R$ {{ fmtShort(goal.target) }}</span>
        </div>
        <cf-progress-bar [value]="goal.balance" [max]="goal.target" [color]="goal.color" [height]="8" />
        <div class="goal-pct-row">
          <span class="goal-pct num" [style.color]="goal.color">{{ pct.toFixed(1) }}% concluído</span>
          <span class="goal-remaining num">R$ {{ fmtShort(remaining) }} restantes</span>
        </div>

        <!-- Stats row -->
        <div class="goal-stats">
          <div class="stat-col">
            <span class="stat-label">Aporte/mês</span>
            <cf-money [value]="goal.monthly" size="md" [negColor]="false" [cents]="false" />
          </div>
          <div class="stat-col">
            <span class="stat-label">Conclusão prev.</span>
            <span class="stat-value num">{{ months }} meses</span>
          </div>
          <div class="stat-col">
            <span class="stat-label">Aportes feitos</span>
            <span class="stat-value num">{{ history.length }}×</span>
          </div>
          <div class="stat-col stat-col-end">
            <span class="stat-label">Histórico</span>
            <cf-sparkbars
              [data]="history"
              [width]="140"
              [height]="28"
              [baseColor]="goal.color"
              [highlightColor]="goal.color"
              [highlightIndex]="history.length - 1"
            />
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .goal-card { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
    .goal-stripe { height: 4px; }
    .goal-body { padding: 14px 16px; }

    .goal-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .goal-header-left { display: flex; flex-direction: column; gap: 2px; }
    .goal-name-row { display: flex; align-items: center; gap: 8px; }
    .goal-name { font-size: 16px; font-weight: 600; color: var(--ink-1); }
    .goal-type-pill { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
    .goal-subtitle { font-size: 12px; color: var(--ink-3); }
    .goal-header-actions { display: flex; gap: 8px; }
    .btn-ghost { height: 26px; padding: 0 10px; border: 1px solid var(--line); border-radius: 6px; background: transparent; font-size: 12px; color: var(--ink-2); cursor: not-allowed; opacity: 0.6; }
    .btn-colored { height: 26px; padding: 0 10px; border: none; border-radius: 6px; font-size: 12px; color: #fff; cursor: not-allowed; opacity: 0.7; display: flex; align-items: center; gap: 4px; }

    .goal-progress-row { display: flex; align-items: baseline; justify-content: space-between; margin-top: 16px; }
    .goal-target { font-size: 14px; color: var(--ink-3); }
    .goal-pct-row { display: flex; justify-content: space-between; margin-top: 4px; }
    .goal-pct { font-size: 12px; font-weight: 600; }
    .goal-remaining { font-size: 12px; color: var(--ink-3); }

    .goal-stats { display: flex; gap: 16px; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--line-soft); align-items: flex-end; }
    .stat-col { display: flex; flex-direction: column; gap: 2px; }
    .stat-col-end { flex: 1; align-items: flex-end; }
    .stat-label { font-size: 11px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.04em; }
    .stat-value { font-size: 14px; font-weight: 600; color: var(--ink-1); }
  `],
})
export class GoalCardComponent {
  @Input() goal!: Goal;
  @Input() history!: number[];

  protected readonly fmtShort = fmtShort;

  get pct()       { return this.goal.balance / this.goal.target * 100; }
  get remaining() { return this.goal.target - this.goal.balance; }
  get months()    { return Math.ceil(this.remaining / this.goal.monthly); }
  get softColor() { return this.goal.type === 'sonho' ? '#FBF1E1' : '#E0F0E7'; }
  get typeLabel() { return this.goal.type === 'sonho' ? 'Sonho' : 'Emergência'; }
}

// ─── GoalsComponent (exported) ────────────────────────────────────────────────

type ProjectionRow = {
  label: string;
  goalAccs: Array<{ goal: Goal; acc: number; reached: boolean }>;
  total: number;
};

@Component({
  selector: 'cf-goals',
  standalone: true,
  imports: [MoneyComponent, ProgressBarComponent, GoalCardComponent],
  template: `
    <!-- KPI strip -->
    <div class="kpi-grid">
      <!-- Acumulado (wide card) -->
      <div class="kpi-wide">
        <div class="kpi-wide-row">
          <div>
            <div class="kpi-label">Acumulado em metas</div>
            <cf-money [value]="totalSaved()" size="xl" [negColor]="false" />
          </div>
          <div class="kpi-wide-right">
            <div class="kpi-label">Objetivo total</div>
            <cf-money [value]="totalTarget()" size="lg" [negColor]="false" />
            <span class="kpi-sub num">{{ totalPct().toFixed(0) }}% atingido</span>
          </div>
        </div>
        <cf-progress-bar [value]="totalSaved()" [max]="totalTarget()" color="var(--pos)" [height]="6" />
      </div>

      <!-- Metas ativas -->
      <div class="kpi-box">
        <div class="kpi-label">Metas ativas</div>
        <div class="kpi-value">{{ goals().length }}</div>
        <div class="kpi-sub">1 emergência · 1 sonho</div>
      </div>

      <!-- Aporte mensal -->
      <div class="kpi-box">
        <div class="kpi-label">Aporte mensal</div>
        <div class="kpi-value">
          <cf-money [value]="totalMonthly()" size="lg" [negColor]="false" [cents]="false" />
        </div>
        <div class="kpi-sub">soma de todas as metas</div>
      </div>

      <!-- Próx. aporte -->
      <div class="kpi-box">
        <div class="kpi-label">Próx. aporte</div>
        <div class="kpi-value num" style="font-size:18px">22/mai</div>
        <div class="kpi-sub">automático · Pix débito conta</div>
      </div>
    </div>

    <!-- Goal cards -->
    <div class="cards-grid">
      @for (goal of goals(); track goal.id) {
        <cf-goal-card [goal]="goal" [history]="goal.history" />
      }
    </div>

    <!-- Projection table -->
    <div class="panel">
      <div class="panel-head">
        <span class="panel-title">Projeção · próximos 12 meses</span>
        <span class="panel-meta">no ritmo atual de aporte</span>
      </div>
      <table class="tx">
        <thead>
          <tr>
            <th style="width:70px">Mês</th>
            @for (goal of goals(); track goal.id) {
              <th class="r" style="width:100px">{{ goal.label }}</th>
              <th style="width:220px">Acumulado</th>
            }
            <th class="r" style="width:110px">Total</th>
          </tr>
        </thead>
        <tbody>
          @for (row of projectionRows(); track row.label) {
            <tr>
              <td class="num">{{ row.label }}</td>
              @for (item of row.goalAccs; track item.goal.id) {
                <td class="r num">
                  <cf-money [value]="item.goal.monthly" size="sm" [negColor]="false" [cents]="false" />
                </td>
                <td>
                  <div class="proj-acc-row">
                    <span class="num tx-meta">R$ {{ fmtShort(item.acc) }} / R$ {{ fmtShort(item.goal.target) }}</span>
                    @if (item.reached) {
                      <span class="pill pos">meta atingida</span>
                    }
                  </div>
                  <cf-progress-bar
                    [value]="item.acc"
                    [max]="item.goal.target"
                    [color]="item.goal.color"
                    [height]="3"
                  />
                </td>
              }
              <td class="r num">
                <cf-money [value]="row.total" size="sm" [negColor]="false" [cents]="false" />
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    /* KPI strip */
    .kpi-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }

    .kpi-wide { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
    .kpi-wide-row { display: flex; justify-content: space-between; align-items: flex-start; }
    .kpi-wide-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }

    .kpi-box { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; }
    .kpi-label { font-size: 11px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.04em; }
    .kpi-value { font-size: 22px; font-weight: 700; color: var(--ink-1); }
    .kpi-sub { font-size: 12px; color: var(--ink-3); margin-top: 4px; }

    /* Cards grid */
    .cards-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }

    /* Projection table */
    .panel { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
    .panel-head { display: flex; justify-content: space-between; align-items: baseline; padding: 12px 16px; border-bottom: 1px solid var(--line); }
    .panel-title { font-size: 13px; font-weight: 600; color: var(--ink-1); }
    .panel-meta { font-size: 12px; color: var(--ink-3); }

    .proj-acc-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
    .tx-meta { font-size: 12px; color: var(--ink-3); }

    .pill.pos { background: var(--pos-soft); color: var(--pos); border: 1px solid var(--pos); font-size: 11px; padding: 1px 6px; border-radius: 20px; white-space: nowrap; }
  `],
})
export class GoalsComponent {
  protected readonly fmtShort = fmtShort;

  private readonly data = inject(AppDataService);
  readonly goals = this.data.goals;

  readonly totalSaved   = computed(() => this.goals().reduce((s, g) => s + g.balance, 0));
  readonly totalTarget  = computed(() => this.goals().reduce((s, g) => s + g.target, 0));
  readonly totalMonthly = computed(() => this.goals().reduce((s, g) => s + g.monthly, 0));
  readonly totalPct     = computed(() => this.totalSaved() / this.totalTarget() * 100);

  readonly projectionRows = computed((): ProjectionRow[] => {
    const goals = this.goals();
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(2026, 4 + i, 1);
      const label = MONTH_ABBR[date.getMonth()] + '/' + String(date.getFullYear()).slice(2);
      const goalAccs = goals.map(goal => {
        const acc = Math.min(goal.target, goal.balance + goal.monthly * (i + 1));
        return { goal, acc, reached: goal.balance + goal.monthly * (i + 1) >= goal.target };
      });
      const total = goalAccs.reduce((s, item) => s + item.acc, 0);
      return { label, goalAccs, total };
    });
  });
}
