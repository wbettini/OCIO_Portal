import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Badge,
  Breadcrumb,
  BreadcrumbButton,
  BreadcrumbDivider,
  BreadcrumbItem,
  Button,
  Caption1,
  Dropdown,
  Input,
  Option,
  Subtitle2,
  Title3,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  Alert24Regular,
  Apps24Regular,
  Box24Regular,
  BoardHeart24Regular,
  BuildingBank24Regular,
  ClipboardCheckmark24Regular,
  DataTrending24Regular,
  DocumentTable24Regular,
  Home24Regular,
  People24Regular,
  Search24Regular,
  Settings24Regular,
  StackStar24Regular,
} from '@fluentui/react-icons';
import { HIDE_DEMO_LABELS, NAV_ITEMS } from '../../constants';
import { usePersona } from '../../context/PersonaContext';

const NAV_ICONS: Record<string, typeof Home24Regular> = {
  '/': Home24Regular,
  '/workforce': People24Regular,
  '/applications': Apps24Regular,
  '/platforms': StackStar24Regular,
  '/assets': Box24Regular,
  '/capabilities': BoardHeart24Regular,
  '/planner': DocumentTable24Regular,
  '/attestations': ClipboardCheckmark24Regular,
  '/analytics': DataTrending24Regular,
  '/administration': Settings24Regular,
};

const useStyles = makeStyles({
  root: {
    display: 'grid',
    gridTemplateColumns: '260px 1fr',
    gridTemplateRows: 'auto 1fr auto',
    gridTemplateAreas: '"header header" "nav main" "footer footer"',
    minHeight: '100vh',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  header: {
    gridArea: 'header',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    backgroundColor: '#0b3a67',
    color: 'white',
    flexWrap: 'wrap',
    boxShadow: tokens.shadow4,
  },
  brandBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  brandText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  brandTitle: {
    color: 'white',
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase500,
    letterSpacing: '0.5px',
  },
  brandSubLabel: {
    color: 'rgba(255,255,255,0.75)',
  },
  badgeRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
  },
  badge: {
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  personaPill: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: '999px',
    paddingLeft: tokens.spacingHorizontalS,
  },
  nav: {
    gridArea: 'nav',
    flexShrink: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: tokens.spacingVerticalM,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  navSectionLabel: {
    padding: `0 ${tokens.spacingHorizontalM}`,
    marginBottom: tokens.spacingVerticalXS,
    color: tokens.colorNeutralForeground2,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorNeutralForeground2,
    textDecoration: 'none',
    fontSize: tokens.fontSizeBase300,
  },
  navLinkActive: {
    backgroundColor: '#e6eff8',
    color: '#0b3a67',
    fontWeight: tokens.fontWeightSemibold,
  },
  main: {
    gridArea: 'main',
    padding: tokens.spacingVerticalL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    maxWidth: '1400px',
  },
  breadcrumbText: {
    textTransform: 'capitalize',
  },
  footer: {
    gridArea: 'footer',
    padding: tokens.spacingVerticalM,
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
});

function useBreadcrumbTrail() {
  const location = useLocation();
  const current = NAV_ITEMS.find((item) =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path),
  );
  return current;
}

export function AppShell() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { personaKey, personas, currentPersona, setPersonaKey } = usePersona();
  const currentNavItem = useBreadcrumbTrail();

  return (
    <div className={styles.root}>
      <header className={styles.header} role="banner">
        <div className={styles.brandBlock}>
          <BuildingBank24Regular />
          <div className={styles.brandText}>
            <Title3 className={styles.brandTitle}>OCIO Portal</Title3>
            <Caption1 className={styles.brandSubLabel}>Office of the CIO · Executive Portal</Caption1>
          </div>
          {HIDE_DEMO_LABELS ? null : (
            <div className={styles.badgeRow}>
              <Badge appearance="filled" color="warning" className={styles.badge}>
                Local Prototype Mode
              </Badge>
              <Badge appearance="filled" color="danger" className={styles.badge}>
                Demonstration Data
              </Badge>
            </div>
          )}
        </div>
        <div className={styles.headerActions}>
          <Input
            contentBefore={<Search24Regular />}
            placeholder="Search the portal"
            aria-label="Global search"
          />
          <Button
            icon={<Alert24Regular />}
            appearance="subtle"
            aria-label="Notifications"
            style={{ color: 'white' }}
          />
          <div className={styles.personaPill}>
            <Dropdown
              aria-label="Select persona"
              value={currentPersona ? `${currentPersona.display_name} (${currentPersona.title})` : personaKey}
              selectedOptions={[personaKey]}
              onOptionSelect={(_, data) => {
                if (data.optionValue) setPersonaKey(data.optionValue);
              }}
            >
              {personas.map((persona) => (
                <Option key={persona.persona_key} value={persona.persona_key} text={persona.display_name}>
                  {persona.display_name} — {persona.title}
                </Option>
              ))}
            </Dropdown>
          </div>
        </div>
      </header>

      <nav className={styles.nav} aria-label="Primary">
        <Subtitle2 className={styles.navSectionLabel}>Portal</Subtitle2>
        {NAV_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.path] ?? Home24Regular;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
              }
            >
              <Icon />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <main className={styles.main} role="main">
        <Breadcrumb aria-label="Breadcrumb">
          <BreadcrumbItem>
            <BreadcrumbButton className={styles.breadcrumbText} onClick={() => navigate('/')}>
              Home
            </BreadcrumbButton>
          </BreadcrumbItem>
          {currentNavItem && currentNavItem.path !== '/' ? (
            <>
              <BreadcrumbDivider />
              <BreadcrumbItem>
                <BreadcrumbButton className={styles.breadcrumbText} current>
                  {currentNavItem.label}
                </BreadcrumbButton>
              </BreadcrumbItem>
            </>
          ) : null}
        </Breadcrumb>
        <Outlet />
      </main>

      <footer className={styles.footer} role="contentinfo">
        {HIDE_DEMO_LABELS ? (
          <Caption1>OCIO Portal</Caption1>
        ) : (
          <Caption1>OCIO Portal — Local Prototype Mode · All data is synthetic demonstration data.</Caption1>
        )}
      </footer>
    </div>
  );
}
