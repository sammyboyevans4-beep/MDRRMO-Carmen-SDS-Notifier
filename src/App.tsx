import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  UserAccount,
  CarmenIncidentReport,
  AppDetailsConfig,
  IncidentStatus,
} from './types';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_APP_DETAILS,
  INITIAL_CARMEN_INCIDENTS,
} from './data/carmenData';
import { AuthView } from './components/AuthView';
import { ClientDashboard } from './components/ClientDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { sirenManager } from './utils/sirenManager';

const STORAGE_KEYS = {
  USER: 'mdrrmo_carmen_current_user',
  REGISTERED_USERS: 'mdrrmo_carmen_registered_users',
  INCIDENTS: 'mdrrmo_carmen_incidents',
  APP_DETAILS: 'mdrrmo_carmen_app_details',
  SIREN_ACTIVE: 'mdrrmo_carmen_siren_active',
};

export default function App() {
  // Current Authenticated User (null = Home Screen with Client Login, Admin Login, Client Registration)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Registered Users (in addition to default private system accounts)
  const [registeredUsers, setRegisteredUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REGISTERED_USERS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Centralized Incidents List
  const [incidents, setIncidents] = useState<CarmenIncidentReport[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INCIDENTS);
      return saved ? JSON.parse(saved) : INITIAL_CARMEN_INCIDENTS;
    } catch {
      return INITIAL_CARMEN_INCIDENTS;
    }
  });

  // Configurable App Details
  const [appDetails, setAppDetails] = useState<AppDetailsConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.APP_DETAILS);
      return saved ? JSON.parse(saved) : DEFAULT_APP_DETAILS;
    } catch {
      return DEFAULT_APP_DETAILS;
    }
  });

  // Emergency Siren State
  const [isSirenActive, setIsSirenActive] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SIREN_ACTIVE);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // Reference to prevent duplicate audio triggers
  const previousIncidentCountRef = useRef<number>(incidents.length);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    } catch {}
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(registeredUsers));
    } catch {}
  }, [registeredUsers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(incidents));
    } catch {}
  }, [incidents]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.APP_DETAILS, JSON.stringify(appDetails));
    } catch {}
  }, [appDetails]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SIREN_ACTIVE, isSirenActive ? 'true' : 'false');
    } catch {}
  }, [isSirenActive]);

  // Audio Siren synchronization
  useEffect(() => {
    if (currentUser?.role === 'admin' && isSirenActive) {
      sirenManager.startEmergencySiren();
    } else {
      sirenManager.stopEmergencySiren();
    }
  }, [currentUser, isSirenActive]);

  // CENTRALIZED SERVER SYNCHRONIZATION
  // Fetches latest incidents and siren state from server every 2.5 seconds
  const syncWithServer = useCallback(async () => {
    try {
      const [incRes, sirenRes, appRes] = await Promise.all([
        fetch('/api/incidents'),
        fetch('/api/siren/status'),
        fetch('/api/app-details'),
      ]);

      if (incRes.ok) {
        const data = await incRes.json();
        if (data.success && Array.isArray(data.incidents)) {
          setIncidents(data.incidents);

          // If new incident was added and siren is active
          if (data.incidents.length > previousIncidentCountRef.current) {
            previousIncidentCountRef.current = data.incidents.length;
          }
        }
      }

      if (sirenRes.ok) {
        const sirenData = await sirenRes.json();
        setIsSirenActive(!!sirenData.isSirenActive);
      }

      if (appRes.ok) {
        const appData = await appRes.json();
        if (appData.success && appData.appDetails) {
          setAppDetails(appData.appDetails);
        }
      }
    } catch {
      // Offline fallback: rely on localStorage
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    syncWithServer();

    // Polling interval
    const interval = setInterval(syncWithServer, 2500);
    return () => clearInterval(interval);
  }, [syncWithServer]);

  // Handlers
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    if (user.role === 'admin' && isSirenActive) {
      sirenManager.startEmergencySiren();
    }
  };

  const handleRegisterUser = (newUser: UserAccount) => {
    setRegisteredUsers((prev) => [newUser, ...prev]);
  };

  const handleLogout = () => {
    sirenManager.stopEmergencySiren();
    setCurrentUser(null);
  };

  // Submit Emergency Incident (Called from Client Dashboard)
  const handleSubmitIncident = (newReport: CarmenIncidentReport) => {
    setIncidents((prev) => [newReport, ...prev]);
    setIsSirenActive(true);
    previousIncidentCountRef.current += 1;

    if (currentUser?.role === 'admin') {
      sirenManager.startEmergencySiren();
    }
  };

  // Turn Off Siren (Called by authorized Admin)
  const handleTurnOffSiren = async (incidentId?: string) => {
    const adminName = currentUser ? currentUser.username : 'Admin';

    setIsSirenActive(false);
    sirenManager.stopEmergencySiren();

    try {
      await fetch('/api/siren/silence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminName, incidentId }),
      });
    } catch {
      // Fallback locally
    }

    const now = new Date().toISOString();
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.alarmStatus === 'Active' || (incidentId && inc.id === incidentId)) {
          return {
            ...inc,
            alarmStatus: 'Silenced',
            alarmLog: inc.alarmLog
              ? {
                  ...inc.alarmLog,
                  alarmStatus: 'silenced',
                  silencedByAdmin: adminName,
                  sirenStopTime: now,
                }
              : {
                  incidentId: inc.id,
                  incidentReceivedTime: inc.dateTime,
                  sirenActivationTime: inc.dateTime,
                  alarmStatus: 'silenced',
                  silencedByAdmin: adminName,
                  sirenStopTime: now,
                },
            adminAcknowledgement: {
              acknowledgedBy: adminName,
              acknowledgedAt: now,
              actionNotes: `Siren stopped by ${adminName}. Incident acknowledged.`,
            },
          };
        }
        return inc;
      })
    );
  };

  // Update Incident Status (Called by authorized Admin)
  const handleUpdateIncidentStatus = async (
    incidentId: string,
    newStatus: IncidentStatus,
    notes?: string
  ) => {
    const adminName = currentUser ? currentUser.username : 'Admin';
    const now = new Date().toISOString();

    try {
      await fetch(`/api/incidents/${incidentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, notes, adminName }),
      });
    } catch {
      // Fallback locally
    }

    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== incidentId) return inc;
        return {
          ...inc,
          status: newStatus,
          adminNotificationStatus: 'Acknowledged',
          adminAcknowledgement: {
            acknowledgedBy: adminName,
            acknowledgedAt: now,
            actionNotes: notes || `Status updated to ${newStatus} by ${adminName}`,
          },
        };
      })
    );
  };

  // Update App Details (Called by authorized Admin)
  const handleUpdateAppDetails = async (newConfig: AppDetailsConfig) => {
    setAppDetails(newConfig);

    try {
      await fetch('/api/app-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
    } catch {
      // Fallback
    }
  };

  // 1. HOME SCREEN - Immediately displays Client Login, Admin Login, Client Registration
  // (No guest access allowed)
  if (!currentUser) {
    return (
      <AuthView
        onLoginSuccess={handleLoginSuccess}
        registeredUsers={registeredUsers}
        onRegisterUser={handleRegisterUser}
        appName={appDetails.appName}
        hotline={appDetails.mdrrmoContactNumber}
      />
    );
  }

  // 2. CLIENT DASHBOARD (Clean, mobile-optimized, focused only on emergency reporting & direct dial)
  // "My Submitted Report" feature completely removed
  if (currentUser.role === 'client') {
    return (
      <ClientDashboard
        user={currentUser}
        appDetails={appDetails}
        onLogout={handleLogout}
        onSubmitIncident={handleSubmitIncident}
      />
    );
  }

  // 3. ADMIN DASHBOARD (5 primary functions: Reported Incident, Realtime Map, History, App Details, Turn Off Siren)
  return (
    <AdminDashboard
      currentAdmin={currentUser}
      incidents={incidents}
      appDetails={appDetails}
      onUpdateAppDetails={handleUpdateAppDetails}
      onLogout={handleLogout}
      onTurnOffSiren={handleTurnOffSiren}
      isSirenActive={isSirenActive}
      onUpdateIncidentStatus={handleUpdateIncidentStatus}
    />
  );
}
