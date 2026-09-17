import type { ReactNode } from 'react';
import type React from 'react';
import { Card, CardHeader, Caption1, Subtitle2, makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalM,
    boxShadow: tokens.shadow4,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
});

interface SectionCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactElement;
  children: ReactNode;
}

/** Generic content card. Uses a plain div for the body so arbitrary
 * children (tables, lists, forms) can be nested safely.
 */
export function SectionCard({ title, subtitle, action, children }: SectionCardProps) {
  const styles = useStyles();
  return (
    <Card className={styles.card}>
      <CardHeader
        header={<Subtitle2>{title}</Subtitle2>}
        description={subtitle ? <Caption1>{subtitle}</Caption1> : undefined}
        action={action}
      />
      <div className={styles.body}>{children}</div>
    </Card>
  );
}
