import type { ReactNode } from 'react';
import { Button, Input, makeStyles, tokens } from '@fluentui/react-components';
import { Filter24Regular, Search24Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  filters: {
    display: 'flex',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM,
  },
  spacer: { flex: '1 1 auto' },
});

interface TableToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  onReset?: () => void;
}

/** Search + filter strip shared by table-driven pages. */
export function TableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search',
  filters,
  actions,
  onReset,
}: TableToolbarProps) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      {onSearchChange ? (
        <Input
          contentBefore={<Search24Regular />}
          placeholder={searchPlaceholder}
          value={searchValue ?? ''}
          onChange={(_, data) => onSearchChange(data.value)}
        />
      ) : null}
      <div className={styles.filters}>{filters}</div>
      <div className={styles.spacer} />
      {onReset ? (
        <Button appearance="subtle" icon={<Filter24Regular />} onClick={onReset}>
          Reset
        </Button>
      ) : null}
      {actions}
    </div>
  );
}
