import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { identityApi } from '../api/endpoints';
import { getCurrentPersona, setCurrentPersona } from '../api/client';
import type { PersonaRead } from '../api/types';

interface PersonaContextValue {
  personaKey: string;
  personas: PersonaRead[];
  currentPersona: PersonaRead | undefined;
  setPersonaKey: (key: string) => void;
  isLoading: boolean;
}

const PersonaContext = createContext<PersonaContextValue | undefined>(undefined);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [personaKey, setPersonaKeyState] = useState<string>(() => getCurrentPersona());

  const personasQuery = useQuery({
    queryKey: ['personas'],
    queryFn: () => identityApi.personas(),
    staleTime: Infinity,
  });

  const personas = useMemo(() => personasQuery.data ?? [], [personasQuery.data]);
  const currentPersona = useMemo(
    () => personas.find((p) => p.persona_key === personaKey),
    [personas, personaKey],
  );

  const setPersonaKey = (key: string) => {
    setCurrentPersona(key);
    setPersonaKeyState(key);
  };

  const value: PersonaContextValue = {
    personaKey,
    personas,
    currentPersona,
    setPersonaKey,
    isLoading: personasQuery.isLoading,
  };

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona(): PersonaContextValue {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error('usePersona must be used within a PersonaProvider');
  return ctx;
}
