import { Badge, Caption1, Subtitle1, makeStyles, tokens } from '@fluentui/react-components';

export type KpiTone = 'neutral' | 'positive' | 'warning' | 'critical';

const TONE_BORDER: Record<KpiTone, string> = {
  neutral: '#0b3a67',
  positive: tokens.colorPaletteGreenBorderActive,
  warning: tokens.colorPaletteYellowBorderActive,
  critical: tokens.colorPaletteRedBorderActive,
};

const TONE_BADGE: Record<KpiTone, 'informative' | 'success' | 'warning' | 'danger'> = {
  neutral: 'informative',
  positive: 'success',
  warning: 'warning',
  critical: 'danger',
};

const useStyles = makeStyles({
  kpi: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: '12px 16px',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    minWidth: '180px',
    flex: '1 1 180px',
    minHeight: '124px',
    boxShadow: 'none',
  },
  label: {
    color: tokens.colorNeutralForeground3,
    fontSize: '12px',
    letterSpacing: '0.02em',
    textTransform: 'none',
  },
  valueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: tokens.spacingHorizontalXS,
    minHeight: '36px',
  },
  value: {
    fontSize: '26px',
    fontWeight: 700,
    lineHeight: 1,
    color: '#0b3a67',
  },
  unit: {
    color: tokens.colorNeutralForeground3,
    fontSize: '12px',
  },
  hint: {
    color: tokens.colorNeutralForeground3,
    fontSize: '11px',
    lineHeight: '1.4',
  },
});

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  tone?: KpiTone;
  badgeText?: string;
  trend?: string;
  hint?: string;
}

export function KpiCard({ label, value, unit, tone = 'neutral', badgeText, trend, hint }: KpiCardProps) {
  const styles = useStyles();
  return (
    <div className={styles.kpi} style={{ borderLeftColor: TONE_BORDER[tone] }}>
      <Caption1 className={styles.label}>{label}</Caption1>
      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
        {unit ? <Caption1 className={styles.unit}>{unit}</Caption1> : null}
      </div>
      {trend ? <Subtitle1>{trend}</Subtitle1> : null}
      {badgeText ? (
        <Badge appearance="tint" color={TONE_BADGE[tone]}>
          {badgeText}
        </Badge>
      ) : null}
      {hint ? <Caption1 className={styles.hint}>{hint}</Caption1> : null}
    </div>
  );
}
