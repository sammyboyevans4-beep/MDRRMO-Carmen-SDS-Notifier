export type EmergencyCategory =
  | 'Structural Fire'
  | 'Grass Fire'
  | 'Vehicular Accident'
  | 'Medical Assistance';

export type UserRole = 'client' | 'admin';

export type IncidentStatus = 'Pending' | 'Responders Dispatched' | 'On Scene' | 'Resolved';

export interface CarmenBarangay {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
}

export interface AlarmLog {
  incidentId: string;
  incidentReceivedTime: string;
  sirenActivationTime: string;
  alarmStatus: 'active' | 'silenced';
  silencedByAdmin?: string;
  sirenStopTime?: string;
}

export interface CarmenIncidentReport {
  id: string;
  incidentNumber: string;
  category: EmergencyCategory;
  photoDataUrl: string;
  photoCaption?: string;
  dateTime: string;
  clientId: string;
  clientFullName: string;
  clientPhoneNumber: string;
  clientBarangay: string;
  gpsCoordinates: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
  };
  incidentLocation: {
    barangay: string;
    landmarkOrAddress: string;
    completeAddress?: string;
    landmark?: string;
    aiIdentified?: boolean;
    aiSceneSummary?: string;
  };
  status: IncidentStatus;
  adminNotificationStatus: 'Unread' | 'Acknowledged';
  alarmStatus: 'Active' | 'Silenced';
  alarmLog?: AlarmLog;
  adminAcknowledgement?: {
    acknowledgedBy: string;
    acknowledgedAt: string;
    actionNotes?: string;
  };
}

export interface AppDetailsConfig {
  appName: string;
  appLogoUrl: string;
  mdrrmoContactNumber: string;
  emergencyInstructions: string;
  officeDetails: string;
  jurisdiction: string;
}

export interface UserAccount {
  id: string;
  username: string;
  password: string; // Stored securely
  role: UserRole;
  fullName: string;
  cellphoneNumber: string;
  barangay: string;
  address?: string;
  emergencyContact?: string;
  verified: boolean;
  registeredAt: string;
}
