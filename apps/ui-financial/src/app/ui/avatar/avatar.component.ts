import { Component, input, computed } from '@angular/core';
import type { Holder } from '@caixa-familia/shared-types';

@Component({
  selector: 'cf-avatar',
  standalone: true,
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.scss',
})
export class AvatarComponent {
  holder = input.required<Holder>();
  size = input(18);

  letter = computed(() => {
    if (this.holder() === 'Thais') return 'T';
    if (this.holder() === 'Mateus') return 'M';
    return '·';
  });

  bgColor = computed(() => {
    if (this.holder() === 'Thais') return '#7A1F3D';
    if (this.holder() === 'Mateus') return '#1F4E79';
    return '#475569';
  });
}
