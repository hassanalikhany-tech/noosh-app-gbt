import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { GuestService } from '../../services/guestService';

interface AuthGateProps {
  children: React.ReactNode;
}

/** This release keeps all personal data in this browser on this device. */
const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    void GuestService.restoreExistingLocalData().catch(() => {}).finally(() => {
      GuestService.start();
      if (mounted) setReady(true);
    });
    return () => { mounted = false; };
  }, []);

  if (!ready) {
    return (
      <div className="auth-screen min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-700" />
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGate;
