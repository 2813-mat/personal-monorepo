import { Component, computed, effect, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import type { FixedExpense, Holder, Income, Transaction } from '@caixa-familia/shared-types';
import { AppDataService } from '../../layout/app-data.service';
import { IconComponent } from '../../ui/icon/icon.component';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { CatDotComponent } from '../../ui/cat-dot/cat-dot.component';
import { CardChipComponent } from '../../ui/card-chip/card-chip.component';

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@Component({
  selector: 'cf-expense-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IconComponent,
    AvatarComponent,
    CatDotComponent,
    CardChipComponent,
  ],
  host: {
    '(document:keydown.escape)': 'onClose()',
    '(document:keydown.control.enter)': 'save()',
    '(document:keydown.meta.enter)': 'save()',
  },
  templateUrl: './expense-drawer.component.html',
  styleUrl: './expense-drawer.component.scss',
})
export class ExpenseDrawerComponent {
  protected data = inject(AppDataService);

  closed = output<void>();

  /** Quando presente, o drawer abre no modo aporte já apontando para esta meta. */
  readonly presetGoal = input<string | null>(null);

  /** Vazio = criar (comportamento atual). Preenchido = editar. */
  readonly editing = input<Transaction | null>(null);

  protected isEditing = computed(() => this.editing() !== null);

  form = new FormGroup({
    type: new FormControl<'expense' | 'income' | 'contribution' | 'fixed'>('expense', { nonNullable: true }),
    value: new FormControl<number>(0, { nonNullable: true, validators: [Validators.required, Validators.min(0.01)] }),
    label: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    cat: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    date: new FormControl(todayIso(), { nonNullable: true, validators: [Validators.required] }),
    dueDay: new FormControl<number | null>(null),
    goal: new FormControl<string | null>(null),
    method: new FormControl<string>('pix', { nonNullable: true, validators: [Validators.required] }),
    holder: new FormControl<Holder>('shared', { nonNullable: true, validators: [Validators.required] }),
    installments: new FormGroup({
      enabled: new FormControl(false, { nonNullable: true }),
      total: new FormControl(1, { nonNullable: true }),
    }),
    recurring: new FormControl(false, { nonNullable: true }),
  });

  /**
   * Que campos o tipo escolhido de fato usa.
   *
   * `save()` monta um objeto diferente por tipo, e o template mostrava campos
   * que aquele objeto descarta: receita exibia categoria, método de pagamento e
   * parcelamento, e nenhum dos três chegava ao `Income`. Estes sinais existem
   * para que "este campo vai a algum lugar?" tenha uma resposta só, aqui do
   * lado do `save()` que a define.
   */
  protected tipo = toSignal(this.form.controls.type.valueChanges, {
    initialValue: this.form.controls.type.value,
  });

  protected isIncome = computed(() => this.tipo() === 'income');
  protected showCategoria = computed(() => this.tipo() === 'expense' || this.tipo() === 'fixed');
  protected showMetodo = computed(() => this.tipo() === 'expense');
  /** Parcelar e recorrer são coisas de despesa; a edição não mexe em nenhum dos dois. */
  protected showToggles = computed(() => !this.isEditing() && this.tipo() === 'expense');

  constructor() {
    effect(() => {
      const slug = this.presetGoal();
      if (!slug) return;
      this.form.patchValue({ type: 'contribution', goal: slug });
    });

    effect(() => {
      const tx = this.editing();
      if (!tx) return;
      this.form.patchValue({
        type: 'expense',
        label: tx.label,
        value: tx.value,
        cat: tx.cat,
        method: tx.method,
        holder: tx.holder,
        date: tx.date,
      });
      // Mudar o tipo de um lançamento existente é outra operação; o PATCH
      // também não aceita alterar parcelamento.
      this.form.controls.type.disable();
      this.form.markAsPristine();
    });

    this.form.controls.type.valueChanges.subscribe((type) => {
      const cat = this.form.controls.cat;
      if (type === 'income' || type === 'contribution') {
        cat.clearValidators();
      } else {
        cat.setValidators([Validators.required]);
      }
      cat.updateValueAndValidity();

      // A contribution targets a goal instead of a category.
      const goal = this.form.controls.goal;
      if (type === 'contribution') {
        goal.setValidators([Validators.required]);
      } else {
        goal.clearValidators();
      }
      goal.updateValueAndValidity();

      // A fixed expense is a template with a due day, not a dated payment.
      const dueDay = this.form.controls.dueDay;
      const date = this.form.controls.date;
      if (type === 'fixed') {
        dueDay.setValidators([Validators.required, Validators.min(1), Validators.max(31)]);
        date.clearValidators();
      } else {
        dueDay.clearValidators();
        date.setValidators([Validators.required]);
      }
      dueDay.updateValueAndValidity();
      date.updateValueAndValidity();
    });
  }

  /**
   * Chip, linha de método e segmento mexem no form por código, e `setValue`
   * não marca `dirty` — só interação via ControlValueAccessor marca. Sem isto o
   * Salvar do modo edição, que é `[disabled]="form.pristine"`, nunca habilita:
   * dava para trocar o cartão e não dava para salvar.
   */
  pick<T>(control: FormControl<T>, value: T) {
    control.setValue(value);
    control.markAsDirty();
  }

  stepInstallments(delta: number) {
    const ctrl = this.form.controls.installments.controls.total;
    const next = Math.max(1, ctrl.value + delta);
    ctrl.setValue(next);
  }

  onClose() {
    this.closed.emit();
  }

  save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();

    const editing = this.editing();
    if (editing) {
      if (this.form.pristine) return;
      // note, recurring e installments sobrevivem pelo espalhamento: o PATCH
      // não os edita aqui.
      this.data.updateTransaction({
        ...editing,
        label: v.label,
        value: Number(v.value),
        cat: v.cat,
        method: v.method,
        holder: v.holder,
        date: v.date,
      });
      this.onClose();
      return;
    }

    if (v.type === 'fixed') {
      const fixed: FixedExpense = {
        id: '', // server assigns
        label: v.label,
        value: Number(v.value),
        due: Number(v.dueDay),
        cat: v.cat,
        holder: v.holder,
        paidThisMonth: false,
      };
      this.data.createFixed(fixed);
      this.onClose();
      return;
    }

    if (v.type === 'contribution') {
      this.data.addContribution(String(v.goal), Number(v.value), v.date);
      this.onClose();
      return;
    }

    if (v.type === 'income') {
      const income: Income = {
        id: '', // server assigns
        label: v.label,
        holder: v.holder,
        value: Number(v.value),
        date: v.date,
        // Receita lançada aqui é avulsa por definição: recorrência de receita
        // mora em /incomes, como cadastro que gera a linha de cada mês. Fixar
        // em false também impede que o toggle marcado numa despesa vaze para
        // cá quando o tipo muda.
        recurring: false,
      };
      this.data.createIncome(income);
      this.onClose();
      return;
    }

    const tx: Transaction = {
      id: '', // server assigns
      date: v.date,
      label: v.label,
      value: Number(v.value),
      cat: v.cat,
      holder: v.holder,
      method: v.method,
      installments: v.installments.enabled ? { n: 1, of: Number(v.installments.total) } : null,
      recurring: v.recurring,
      reviewed: false, // lançamento novo nasce por conferir
    };
    this.data.createTransaction(tx);
    this.onClose();
  }
}
