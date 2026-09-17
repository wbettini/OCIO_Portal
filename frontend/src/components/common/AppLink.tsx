import type { MouseEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link as FluentLink } from '@fluentui/react-components';

interface AppLinkProps {
  to: string;
  children: ReactNode;
  className?: string;
}

/** Fluent-styled link that performs client-side navigation via React Router,
 * without relying on Fluent's strict `as` slot typing.
 */
export function AppLink({ to, children, className }: AppLinkProps) {
  const navigate = useNavigate();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    navigate(to);
  };

  return (
    <FluentLink as="a" href={to} onClick={handleClick} className={className}>
      {children}
    </FluentLink>
  );
}
