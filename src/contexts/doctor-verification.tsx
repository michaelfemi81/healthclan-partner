import { createContext, useContext, type ReactNode } from 'react';

type DoctorVerificationValue = {
  approved: boolean;
  verificationStatus: string;
  accountStatus: string;
  refreshVerification: () => Promise<void>;
};

const DoctorVerificationContext = createContext<DoctorVerificationValue>({
  approved: false,
  verificationStatus: 'pending',
  accountStatus: 'pending',
  refreshVerification: async () => undefined,
});

export function DoctorVerificationProvider({
  approved,
  verificationStatus,
  accountStatus,
  refreshVerification,
  children,
}: DoctorVerificationValue & { children: ReactNode }) {
  return (
    <DoctorVerificationContext.Provider
      value={{ approved, verificationStatus, accountStatus, refreshVerification }}
    >
      {children}
    </DoctorVerificationContext.Provider>
  );
}

export function useDoctorVerification() {
  return useContext(DoctorVerificationContext);
}
