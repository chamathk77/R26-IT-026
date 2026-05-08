import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  DEFAULT_CURRENT_USER_ID,
  DummyUser,
  getManageableUsers,
  SEED_USERS,
} from '../data/dummyUsers';

interface DummySessionContextValue {
  users: DummyUser[];
  currentUser: DummyUser;
  manageableUsers: DummyUser[];
  updateOwnProfile: (patch: Pick<DummyUser, 'name' | 'email' | 'phone'>) => void;
  /** Owner: only role when editing others. Admin: full edit for staff. */
  updateUserById: (
    userId: string,
    patch: Partial<Pick<DummyUser, 'name' | 'email' | 'phone' | 'role'>>,
  ) => void;
  removeUserById: (userId: string) => void;
  logoutSession: () => void;
  deleteOwnAccount: () => void;
}

const DummySessionContext = createContext<DummySessionContextValue | undefined>(
  undefined,
);

interface Props {
  children: React.ReactNode;
  onExitToLogin: () => void;
}

export function DummySessionProvider({ children, onExitToLogin }: Props) {
  const [users, setUsers] = useState<DummyUser[]>(() => [...SEED_USERS]);
  const [currentUserId, setCurrentUserId] = useState(DEFAULT_CURRENT_USER_ID);

  const currentUser = useMemo(() => {
    const u = users.find((x) => x.id === currentUserId);
    if (!u) {
      return SEED_USERS[0];
    }
    return u;
  }, [users, currentUserId]);

  const manageableUsers = useMemo(
    () => getManageableUsers(currentUser, users),
    [currentUser, users],
  );

  const updateOwnProfile = useCallback(
    (patch: Pick<DummyUser, 'name' | 'email' | 'phone'>) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === currentUserId ? { ...u, ...patch } : u,
        ),
      );
    },
    [currentUserId],
  );

  const updateUserById = useCallback(
    (
      userId: string,
      patch: Partial<Pick<DummyUser, 'name' | 'email' | 'phone' | 'role'>>,
    ) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)),
      );
    },
    [],
  );

  const removeUserById = useCallback(
    (userId: string) => {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (userId === currentUserId) {
        onExitToLogin();
      }
    },
    [currentUserId, onExitToLogin],
  );

  const logoutSession = useCallback(() => {
    onExitToLogin();
  }, [onExitToLogin]);

  const deleteOwnAccount = useCallback(() => {
    setUsers((prev) => prev.filter((u) => u.id !== currentUserId));
    onExitToLogin();
  }, [currentUserId, onExitToLogin]);

  const value = useMemo(
    () => ({
      users,
      currentUser,
      manageableUsers,
      updateOwnProfile,
      updateUserById,
      removeUserById,
      logoutSession,
      deleteOwnAccount,
    }),
    [
      users,
      currentUser,
      manageableUsers,
      updateOwnProfile,
      updateUserById,
      removeUserById,
      logoutSession,
      deleteOwnAccount,
    ],
  );

  return (
    <DummySessionContext.Provider value={value}>
      {children}
    </DummySessionContext.Provider>
  );
}

export function useDummySession() {
  const ctx = useContext(DummySessionContext);
  if (!ctx) {
    throw new Error('useDummySession must be used within DummySessionProvider');
  }
  return ctx;
}
