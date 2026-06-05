import { Component, input, output, computed } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

interface EmptyAction {
  label: string;
  icon?: string;
}

@Component({
  selector: 'cf-empty-state',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  icon = input('list');
  title = input.required<string>();
  description = input('');
  actions = input<EmptyAction[]>([]);

  actionClick = output<number>();

  visibleActions = computed(() => this.actions().slice(0, 3));
}
