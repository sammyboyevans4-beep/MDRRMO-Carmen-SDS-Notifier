import {
  CarmenBarangay,
  UserAccount,
  CarmenIncidentReport,
  AppDetailsConfig,
} from '../types';

export const CARMEN_CENTER = {
  latitude: 9.2275,
  longitude: 125.9958,
  zoom: 13,
};

export const CARMEN_BARANGAYS: CarmenBarangay[] = [
  {
    id: 'brgy-poblacion',
    name: 'Poblacion',
    latitude: 9.2275,
    longitude: 125.9958,
    description: 'Municipal Center, MDRRMO EOC & Carmen Fire Station',
  },
  {
    id: 'brgy-antao',
    name: 'Antao',
    latitude: 9.241,
    longitude: 126.012,
    description: 'Northern Carmen coastal & agricultural zone',
  },
  {
    id: 'brgy-cancavan',
    name: 'Cancavan',
    latitude: 9.215,
    longitude: 125.984,
    description: 'Southern riverbank & grassland area',
  },
  {
    id: 'brgy-esperanza',
    name: 'Esperanza',
    latitude: 9.252,
    longitude: 126.028,
    description: 'Coastal settlement along Surigao-Davao coastal highway',
  },
  {
    id: 'brgy-hinapuyan',
    name: 'Hinapuyan',
    latitude: 9.204,
    longitude: 125.972,
    description: 'Upland agricultural and river tributary sector',
  },
  {
    id: 'brgy-puyat',
    name: 'Puyat',
    latitude: 9.236,
    longitude: 125.981,
    description: 'Residential puroks & barangay outpost zone',
  },
  {
    id: 'brgy-san-vicente',
    name: 'San Vicente',
    latitude: 9.219,
    longitude: 126.009,
    description: 'Eastern coastal plain area',
  },
  {
    id: 'brgy-santa-cruz',
    name: 'Santa Cruz',
    latitude: 9.261,
    longitude: 126.019,
    description: 'Northern boundary zone adjacent to Madrid border',
  },
];

// Default Private Accounts Configuration (Never exposed in UI placeholders or text)
export const DEFAULT_ACCOUNTS: UserAccount[] = [
  {
    id: 'client-01',
    username: 'Client1',
    password: 'password_hash_1234567', // Authenticates against '1234567'
    role: 'client',
    fullName: 'Juan C. Dela Cruz',
    cellphoneNumber: '0917-882-9901',
    barangay: 'Poblacion',
    address: 'Purok 2, Poblacion, Carmen',
    emergencyContact: '0920-555-1122',
    verified: true,
    registeredAt: '2026-09-20T08:00:00Z',
  },
  // 10 Private Admin Accounts for MDRRMO Carmen Command Team
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `admin-${i + 1}`,
    username: `Admin${i + 1}`,
    password: 'password_hash_1234567', // Authenticates against '1234567'
    role: 'admin' as const,
    fullName: `MDRRMO Officer ${i + 1} (${['Duty Chief', 'Dispatcher', 'Operations Head', 'Rescue Lead', 'EMT Lead', 'Field Officer', 'Comms Lead', 'Hazmat Officer', 'Safety Officer', 'EOC Director'][i]})`,
    cellphoneNumber: `0919-072-000${i + 1}`,
    barangay: 'Poblacion',
    address: 'MDRRMO Operations Center, Carmen',
    verified: true,
    registeredAt: '2026-09-01T00:00:00Z',
  })),
];

export const DEFAULT_APP_DETAILS: AppDetailsConfig = {
  appName: 'MDRRMO Carmen',
  appLogoUrl: '',
  mdrrmoContactNumber: '0919-072-2345',
  emergencyInstructions:
    '1. Remain calm and ensure you are in a secure position.\n2. Take a clear, well-lit photo of the emergency scene.\n3. Choose the exact emergency category (Structural Fire, Grass Fire, Vehicular Accident, or Medical Assistance).\n4. Confirm GPS location and submit.\n5. Keep your phone line open for incoming verification from the MDRRMO Carmen EOC dispatcher.',
  officeDetails:
    'Municipal Disaster Risk Reduction and Management Office (MDRRMO)\nMunicipal Hall Compound, Poblacion, Carmen\nSurigao del Sur, Mindanao, Philippines\n24/7 Hotline: (086) 211-4000 / 0919-072-2345',
  jurisdiction: 'Carmen, Surigao del Sur, Mindanao, Philippines',
};

export const INITIAL_CARMEN_INCIDENTS: CarmenIncidentReport[] = [
  {
    id: 'inc-carmen-001',
    incidentNumber: 'INC-CRM-2026-001',
    category: 'Structural Fire',
    photoDataUrl:
      'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=800&q=80',
    photoCaption: 'Smoke emerging from secondary residential unit',
    dateTime: '2026-09-23T15:45:00Z',
    clientId: 'client-01',
    clientFullName: 'Juan C. Dela Cruz',
    clientPhoneNumber: '0917-882-9901',
    clientBarangay: 'Poblacion',
    gpsCoordinates: {
      latitude: 9.2285,
      longitude: 125.9965,
      accuracyMeters: 6,
    },
    incidentLocation: {
      barangay: 'Poblacion',
      landmarkOrAddress: 'Purok 3, Near Carmen Public Gymnasium',
    },
    status: 'Responders Dispatched',
    adminNotificationStatus: 'Acknowledged',
    alarmStatus: 'Silenced',
    alarmLog: {
      incidentId: 'inc-carmen-001',
      incidentReceivedTime: '2026-09-23T15:45:00Z',
      sirenActivationTime: '2026-09-23T15:45:02Z',
      alarmStatus: 'silenced',
      silencedByAdmin: 'Admin1',
      sirenStopTime: '2026-09-23T15:46:10Z',
    },
    adminAcknowledgement: {
      acknowledgedBy: 'Admin1',
      acknowledgedAt: '2026-09-23T15:46:10Z',
      actionNotes:
        'Siren turned off. BFP Carmen Fire Truck 1 and MDRRMO Quick Response Vehicle dispatched with 6 responders.',
    },
  },
  {
    id: 'inc-carmen-002',
    incidentNumber: 'INC-CRM-2026-002',
    category: 'Vehicular Accident',
    photoDataUrl:
      'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80',
    photoCaption: 'Tricycle collision at curve',
    dateTime: '2026-09-23T16:10:00Z',
    clientId: 'client-01',
    clientFullName: 'Maria S. Torralba',
    clientPhoneNumber: '0928-334-1188',
    clientBarangay: 'Cancavan',
    gpsCoordinates: {
      latitude: 9.2155,
      longitude: 125.9842,
      accuracyMeters: 9,
    },
    incidentLocation: {
      barangay: 'Cancavan',
      landmarkOrAddress: 'Highway curve near Cancavan Elementary School',
    },
    status: 'Pending',
    adminNotificationStatus: 'Unread',
    alarmStatus: 'Active',
    alarmLog: {
      incidentId: 'inc-carmen-002',
      incidentReceivedTime: '2026-09-23T16:10:00Z',
      sirenActivationTime: '2026-09-23T16:10:02Z',
      alarmStatus: 'active',
    },
  },
];

// Helper to calculate distance between GPS coords
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// Find nearest Carmen barangay from coordinates
export function findNearestCarmenBarangay(lat: number, lon: number): CarmenBarangay {
  let closest = CARMEN_BARANGAYS[0];
  let minDistance = Infinity;

  for (const b of CARMEN_BARANGAYS) {
    const dist = calculateDistanceKm(lat, lon, b.latitude, b.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      closest = b;
    }
  }

  return closest;
}
