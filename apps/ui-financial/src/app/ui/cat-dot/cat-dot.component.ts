import { Component, input, computed, inject } from '@angular/core';
import { AppDataService } from '../../layout/app-data.service';

@Component({
  selector: 'cf-cat-dot',
  standalone: true,
  templateUrl: './cat-dot.component.html',
  styleUrl: './cat-dot.component.scss',
})
export class CatDotComponent {
  private data = inject(AppDataService);

  catId = input.required<string>();
  size = input(7);

  color = computed(() => this.data.catBy()[this.catId()]?.color ?? '#9CA3AF');
}
