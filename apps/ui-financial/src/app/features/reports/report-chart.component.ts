import { Component, Input } from '@angular/core';

// ─── Chart geometry types ─────────────────────────────────────────────────────

export interface ChartBar {
  m: string;
  incX: number;
  incY: number;
  incH: number;
  expX: number;
  expY: number;
  expH: number;
  labelX: number;
  opacity: number;
}

export interface ChartModel {
  bars: ChartBar[];
  barW: number;
  gridlines: { y: number }[];
  polyline: string;
  points: { x: number; y: number }[];
}

// ─── ReportChart (private subcomponent: inline SVG, no chart lib) ──────────────

@Component({
  selector: 'cf-report-chart',
  standalone: true,
  templateUrl: './report-chart.component.html',
  styleUrl: './report-chart.component.scss',
})
export class ReportChartComponent {
  @Input({ required: true }) model!: ChartModel;

  protected readonly H = 200;
  protected readonly labelY = 200 - 6;
}
