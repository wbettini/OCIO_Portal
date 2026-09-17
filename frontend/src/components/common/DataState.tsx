import type { ReactNode } from 'react';
import { Caption1, MessageBar, MessageBarBody, MessageBarTitle, Spinner } from '@fluentui/react-components';
import { ApiError } from '../../api/client';

interface DataStateProps {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  isEmpty?: boolean;
  emptyMessage?: string;
  loadingLabel?: string;
  children: ReactNode;
}

/** Centralizes the loading / error / empty presentation for a server-driven
 * collection so pages only need to describe their data, not the plumbing. */
export function DataState({
  isLoading,
  isError,
  error,
  isEmpty = false,
  emptyMessage = 'No records found.',
  loadingLabel = 'Loading…',
  children,
}: DataStateProps) {
  if (isLoading) {
    return <Spinner label={loadingLabel} />;
  }

  if (isError) {
    return (
      <MessageBar intent="error">
        <MessageBarBody>
          <MessageBarTitle>Something went wrong</MessageBarTitle>
          {error instanceof ApiError ? error.message : 'Failed to load data from the API.'}
        </MessageBarBody>
      </MessageBar>
    );
  }

  if (isEmpty) {
    return <Caption1>{emptyMessage}</Caption1>;
  }

  return <>{children}</>;
}
