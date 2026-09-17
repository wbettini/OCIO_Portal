import type { ReactNode } from 'react';
import { Body1, Caption1, Title2, makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  subtitle: {
    display: 'block',
    color: tokens.colorNeutralForeground2,
  },
  hint: {
    display: 'block',
    color: tokens.colorNeutralForeground3,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
});

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  hint?: string;
  actions?: ReactNode;
}

/** Standard page title block: Title2 heading, optional Body1 subtitle on its
 * own line, optional Caption1 hint, and an optional right-aligned actions slot. */
export function PageHeader({ title, subtitle, hint, actions }: PageHeaderProps) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <div className={styles.titleRow}>
        <Title2 as="h2">{title}</Title2>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {subtitle ? <Body1 className={styles.subtitle}>{subtitle}</Body1> : null}
      {hint ? <Caption1 className={styles.hint}>{hint}</Caption1> : null}
    </div>
  );
}
