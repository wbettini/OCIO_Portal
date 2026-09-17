import { makeStyles, tokens, Text } from '@fluentui/react-components';
import type { LifecycleChartPoint } from '../../api/types';

const useStyles = makeStyles({
  chart: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalM,
    height: '180px',
    padding: tokens.spacingVerticalM,
  },
  barColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalXS,
    flex: '1 1 0',
  },
  bar: {
    width: '100%',
    maxWidth: '48px',
    backgroundColor: '#0b3a67',
    borderRadius: `${tokens.borderRadiusMedium} ${tokens.borderRadiusMedium} 0 0`,
  },
});

interface BarChartProps {
  points: LifecycleChartPoint[];
}

/** Simple, dependency-free bar chart rendered from real API data. */
export function BarChart({ points }: BarChartProps) {
  const styles = useStyles();
  const max = Math.max(1, ...points.map((p) => p.count));

  return (
    <div className={styles.chart} role="img" aria-label="Asset end-of-life horizon chart">
      {points.map((point) => (
        <div className={styles.barColumn} key={point.bucket}>
          <Text size={200} weight="semibold">
            {point.count}
          </Text>
          <div
            className={styles.bar}
            style={{ height: `${Math.max(4, (point.count / max) * 120)}px` }}
          />
          <Text size={200} align="center">
            {point.bucket}
          </Text>
        </div>
      ))}
    </div>
  );
}
