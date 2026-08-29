/**
 * Rysunek planu sklepu — siatka, klocki z kolorami kategorii, napisy i trasa.
 *
 * Obrót rysujemy transformacją SVG wokół środka pierwszej kratki klocka,
 * dokładnie tam, gdzie obraca go model. Dzięki temu to, co widać, zgadza się
 * co do kratki z tym, co liczy silnik trasy.
 */

import { memo } from 'react';
import Svg, { Circle, G, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { categoryColors } from '../../design/tokens';
import { BLOCK_BY_KEY } from '../data/blocks';
import { sectionCategory, sectionName, type SectionKey } from '../data/sections';
import { useTheme } from '../lib/theme';
import { cellsOf, type MapBlock, type StoreMap } from '../lib/mapModel';

type Props = {
  map: StoreMap;
  /** Piksele na kratkę. */
  cell: number;
  /** Zaznaczone klocki — zaznaczyć można kilka naraz. */
  selectedIds?: string[] | null;
  /** Łamana trasy — indeksy kratek. */
  path?: number[] | null;
  /**
   * Widok uproszczony: bez nazw sekcji, a klocki stykające się bokami zlewają
   * się w jedną bryłę. Do podglądu trasy, gdzie liczy się kształt sklepu
   * i droga przez niego, a nie to, co stoi na której półce.
   */
  uproszczony?: boolean;
  /** Kropki z numerami — gdzie po drodze coś się bierze. */
  punkty?: { cell: number; nr: number }[] | null;
};

function fit(text: string, lengthPx: number, fontSize: number): string {
  const max = Math.floor(lengthPx / (fontSize * 0.58));
  if (max < 2) return '';
  if (text.length <= max) return text;
  return text.slice(0, Math.max(1, max - 1)) + '…';
}

function StorePlanInner({ map, cell, selectedIds, path, uproszczony, punkty }: Props) {
  const t = useTheme();
  const cat = categoryColors[t.isDark ? 'dark' : 'light'];
  const pxW = cell * map.gridW;
  const pxH = cell * map.gridH;
  /** Grubość murów — skaluje się z przybliżeniem, ale nie znika przy oddaleniu. */
  const mur = Math.max(2, cell * 0.22);

  /** Zbiór kratek zajętych przez cokolwiek poza wejściem — tylko do widoku uproszczonego. */
  const bryla = new Set<number>();
  if (uproszczony) {
    for (const b of map.blocks) {
      if (b.type === 'wejscie') continue;
      for (const c of cellsOf(map, b)) bryla.add(c);
    }
  }

  const points =
    path && path.length > 1
      ? path
          .map((i) => {
            const x = i % map.gridW;
            const y = (i - x) / map.gridW;
            return `${(x + 0.5) * cell},${(y + 0.5) * cell}`;
          })
          .join(' ')
      : null;

  const label = (
    key: string,
    text: string,
    bx: number,
    by: number,
    bw: number,
    bh: number,
    color: string
  ) => {
    const vertical = bh > bw;
    const along = (vertical ? bh : bw) * cell;
    const across = (vertical ? bw : bh) * cell;
    const size = Math.max(6, Math.min(across * 0.42, 13));
    const shown = fit(text, along - 4, size);
    if (!shown) return null;
    const cx = (bx + bw / 2) * cell;
    const cy = (by + bh / 2) * cell;
    return (
      <SvgText
        key={key}
        x={cx}
        y={cy}
        fontSize={size}
        fontWeight="700"
        fill={color}
        textAnchor="middle"
        alignmentBaseline="middle"
        transform={vertical ? `rotate(-90, ${cx}, ${cy})` : undefined}
      >
        {shown}
      </SvgText>
    );
  };

  const renderBlock = (b: MapBlock) => {
    const def = BLOCK_BY_KEY[b.type];
    const selected = !!selectedIds?.includes(b.id);
    const vertical = b.h >= b.w;

    // Kolor bierzemy z pierwszej kategorii — to ona nadaje klockowi charakter.
    const first = b.sections?.[0] ?? null;
    const firstB = b.sectionsB?.[0] ?? null;
    const colorA = first
      ? cat[sectionCategory(first)]
      : b.type === 'sciana'
        ? cat.pusty
        : def.fixed
          ? cat.infra
          : cat.pusty;
    const colorB = firstB ? cat[sectionCategory(firstB)] : null;
    const ink = t.isDark ? '#141412' : '#ffffff';
    const paleA = !first && !def.fixed && b.type !== 'sciana';

    /** Kilka kategorii na jednym klocku skracamy do „pierwsza +N". */
    const opis = (list: SectionKey[] | undefined, fallback: string) => {
      if (!list || !list.length) return fallback;
      if (list.length === 1) return sectionName(list[0]);
      return `${sectionName(list[0])} +${list.length - 1}`;
    };
    const inkA = paleA ? t.colors.foreground : ink;

    const halfW = colorB ? (vertical ? b.w / 2 : b.w) : b.w;
    const halfH = colorB ? (vertical ? b.h : b.h / 2) : b.h;

    // Obrót wokół środka pierwszej kratki — tak samo jak w modelu.
    const pivotX = (b.x + 0.5) * cell;
    const pivotY = (b.y + 0.5) * cell;
    const rot = b.rot ?? 0;

    return (
      <G key={b.id} transform={rot ? `rotate(${rot}, ${pivotX}, ${pivotY})` : undefined}>
        <Rect
          x={b.x * cell + 0.5}
          y={b.y * cell + 0.5}
          width={halfW * cell - 1}
          height={halfH * cell - 1}
          rx={2.5}
          fill={colorA}
          opacity={b.type === 'sciana' ? 0.8 : 1}
        />
        {colorB && (
          <Rect
            x={(vertical ? b.x + b.w / 2 : b.x) * cell + 0.5}
            y={(vertical ? b.y : b.y + b.h / 2) * cell + 0.5}
            width={(vertical ? b.w / 2 : b.w) * cell - 1}
            height={(vertical ? b.h : b.h / 2) * cell - 1}
            rx={2.5}
            fill={colorB}
          />
        )}
        <Rect
          x={b.x * cell + 0.5}
          y={b.y * cell + 0.5}
          width={b.w * cell - 1}
          height={b.h * cell - 1}
          rx={2.5}
          fill="none"
          stroke={selected ? t.colors.foreground : t.colors.border}
          strokeWidth={selected ? 2.5 : 0.75}
        />
        {label(b.id + 'a', opis(b.sections, def.label), b.x, b.y, halfW, halfH, inkA)}
        {colorB &&
          label(
            b.id + 'b',
            opis(b.sectionsB, ''),
            vertical ? b.x + b.w / 2 : b.x,
            vertical ? b.y : b.y + b.h / 2,
            vertical ? b.w / 2 : b.w,
            vertical ? b.h : b.h / 2,
            ink
          )}
      </G>
    );
  };

  return (
    <Svg width={pxW} height={pxH}>
      <Rect x={0} y={0} width={pxW} height={pxH} fill={t.colors.card} />


      <G opacity={0.4}>
        {Array.from({ length: map.gridW + 1 }, (_, i) => (
          <Line key={`v${i}`} x1={i * cell} y1={0} x2={i * cell} y2={pxH} stroke={t.colors.border} strokeWidth={0.5} />
        ))}
        {Array.from({ length: map.gridH + 1 }, (_, i) => (
          <Line key={`h${i}`} x1={0} y1={i * cell} x2={pxW} y2={i * cell} stroke={t.colors.border} strokeWidth={0.5} />
        ))}
      </G>

      {uproszczony
        ? /*
             Każdą zajętą kratkę rysujemy osobno, tym samym wypełnieniem i BEZ
             obrysu. Sąsiadujące kratki zlewają się wtedy w jedną bryłę same
             z siebie — nie trzeba liczyć obwiedni wielokątów, a regał z pięciu
             klocków wygląda jak jeden regał.
           */
          [...bryla].map((c) => (
            <Rect
              key={`u${c}`}
              x={(c % map.gridW) * cell}
              y={Math.floor(c / map.gridW) * cell}
              width={cell}
              height={cell}
              fill={t.colors.mutedForeground}
              opacity={0.35}
            />
          ))
        : map.blocks.filter((b) => b.type !== 'wejscie').map(renderBlock)}

      {points && (
        <Polyline
          points={points}
          fill="none"
          stroke={t.colors.foreground}
          strokeWidth={Math.max(1.5, cell * 0.14)}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.85}
        />
      )}

      {/* wejście na wierzchu, bo trasa z niego wychodzi */}
      {map.blocks.filter((b) => b.type === 'wejscie').map(renderBlock)}

      {/*
        Mury budynku. Bez wyraźnego obrysu plan wyglądał jak kartka w kratkę bez
        końca i nie było widać, gdzie kończy się sala — a to ona wyznacza, ile
        w ogóle jest miejsca. Rysujemy na wierzchu, do środka, żeby gruba linia
        nie uciekła poza płótno.
      */}
      <Rect
        x={mur / 2}
        y={mur / 2}
        width={Math.max(0, pxW - mur)}
        height={Math.max(0, pxH - mur)}
        fill="none"
        stroke={t.colors.foreground}
        strokeWidth={mur}
        strokeLinejoin="miter"
        opacity={0.75}
      />
      {punkty?.map((p) => {
        const cx = ((p.cell % map.gridW) + 0.5) * cell;
        const cy = (Math.floor(p.cell / map.gridW) + 0.5) * cell;
        const r = Math.max(7, cell * 0.62);
        return (
          <G key={`p${p.nr}`}>
            <Circle cx={cx} cy={cy} r={r} fill={t.colors.primary} stroke={t.colors.card} strokeWidth={Math.max(1, r * 0.14)} />
            <SvgText
              x={cx}
              y={cy + r * 0.36}
              fontSize={r * 1.05}
              fontWeight="700"
              fill={t.colors.primaryForeground}
              textAnchor="middle"
            >
              {p.nr}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

export const StorePlan = memo(StorePlanInner);
