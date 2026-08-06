import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../ui/icon/icon.component';
import { OPERACAO, PLANEJAMENTO, SISTEMA } from './nav-items';

@Component({
  selector: 'cf-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  operacao = OPERACAO;
  planejamento = PLANEJAMENTO;
  sistema = SISTEMA;
}
