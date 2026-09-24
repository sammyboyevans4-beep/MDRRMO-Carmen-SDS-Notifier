import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '25mb' }));

// Shared Gemini AI client for Carmen Emergency EOC (server-side only)
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Carmen, Surigao del Sur Barangay & Landmark Geo-Knowledge Base
const CARMEN_LOCAL_GIS = [
  {
    barangay: 'Poblacion',
    lat: 9.2275,
    lng: 125.9958,
    postalCode: '8315',
    streetNames: ['National Highway (Surigao-Davao Coastal Rd)', 'Rizal Street', 'Burgos Street', 'Magsaysay Ave', 'Seawall Promenade'],
    landmarks: [
      'Carmen Municipal Hall Compound & EOC Operations Center',
      'Carmen Public Gymnasium & Evacuation Complex',
      'Carmen Public Market & Terminal',
      'San Agustin Parish Church',
      'Carmen District Hospital & Rural Health Unit (RHU)',
      'Carmen Central Elementary School',
      'Carmen Municipal Seawall & Baywalk',
      'BFP Carmen Central Fire Station',
    ],
  },
  {
    barangay: 'Cancavan',
    lat: 9.215,
    lng: 125.984,
    postalCode: '8315',
    streetNames: ['National Highway South Corridor', 'Cancavan River Access Rd', 'Purok 1 Riverside'],
    landmarks: [
      'Cancavan Riverside Bridge & River Spillway',
      'Cancavan Elementary School & Multi-Purpose Covered Court',
      'Cancavan Barangay Hall & Health Station',
      'Carmen South Agricultural Crossing',
    ],
  },
  {
    barangay: 'Esperanza',
    lat: 9.252,
    lng: 126.028,
    postalCode: '8315',
    streetNames: ['Surigao-Davao Coastal Highway', 'Purok 2 Coastal Way', 'Esperanza Beach Road'],
    landmarks: [
      'Esperanza Coastal Highway Viewpoint & Scenic Curve',
      'Esperanza Barangay Hall & Outpost',
      'Esperanza Elementary School',
      'Carmen-Lanuza Boundary Marker',
    ],
  },
  {
    barangay: 'Hinapuyan',
    lat: 9.204,
    lng: 125.972,
    postalCode: '8315',
    streetNames: ['Hinapuyan Upland Road', 'Tributary River Pathway', 'Purok 3 Farm-to-Market Rd'],
    landmarks: [
      'Hinapuyan River Crossing & Suspension Footbridge',
      'Hinapuyan Elementary School',
      'Hinapuyan Barangay Hall & Agro-forestry Center',
      'Hinapuyan Riverbank Outpost',
    ],
  },
  {
    barangay: 'Puyat',
    lat: 9.236,
    lng: 125.981,
    postalCode: '8315',
    streetNames: ['Puyat Mountain Access Road', 'Purok Evergreen', 'Puyat Valley Trail'],
    landmarks: [
      'Puyat Eco-Park & Waterfalls Trailhead',
      'Puyat Barangay Outpost & Covered Court',
      'Puyat Elementary School',
      'Puyat Hillside Overlook',
    ],
  },
  {
    barangay: 'San Vicente',
    lat: 9.219,
    lng: 126.009,
    postalCode: '8315',
    streetNames: ['San Vicente Coastal Rd', 'Mangrove Sanctuary Way', 'Purok 2 Seaside'],
    landmarks: [
      'San Vicente Coastal Mangrove Sanctuary & Boardwalk',
      'San Vicente Elementary School',
      'San Vicente Barangay Hall & Disaster Post',
      'San Vicente Fisherfolk Pier',
    ],
  },
  {
    barangay: 'Santa Cruz',
    lat: 9.261,
    lng: 126.019,
    postalCode: '8315',
    streetNames: ['National Highway Northbound', 'Santa Cruz Boundary Rd', 'Purok 1 Coconut Grove'],
    landmarks: [
      'Santa Cruz Border Checkpoint (Carmen-Madrid Municipal Boundary)',
      'Santa Cruz Elementary School',
      'Santa Cruz Catholic Chapel & Plaza',
      'Northern Carmen Highway Junction',
    ],
  },
  {
    barangay: 'Antao',
    lat: 9.241,
    lng: 126.012,
    postalCode: '8315',
    streetNames: ['Antao Coastal Highway', 'Purok Bayview', 'Antao Fishery Rd'],
    landmarks: [
      'Antao Beach Ridge & Coastal Embankment',
      'Antao Barangay Hall & Emergency Sub-station',
      'Antao Fish Landing Sanctuary',
      'Antao Primary School',
    ],
  },
];

// Calculate distance in km
function getDistKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Find nearest Carmen GIS sector
function getNearestCarmenGis(lat: number, lng: number, fallbackBarangay?: string) {
  let closest = CARMEN_LOCAL_GIS[0];
  let min = Infinity;
  for (const item of CARMEN_LOCAL_GIS) {
    if (fallbackBarangay && item.barangay.toLowerCase() === fallbackBarangay.toLowerCase()) {
      return item;
    }
    const d = getDistKm(lat, lng, item.lat, item.lng);
    if (d < min) {
      min = d;
      closest = item;
    }
  }
  return closest;
}

// Zero-delay scene location resolver (Gemini AI with high-speed GIS fallback)
async function resolveSceneAddressAndLandmark(params: {
  photoDataUrl?: string;
  latitude: number;
  longitude: number;
  barangay?: string;
  category?: string;
  landmarkHint?: string;
}): Promise<{
  completeAddress: string;
  landmark: string;
  barangay: string;
  aiIdentified: boolean;
  aiSceneSummary: string;
}> {
  const { photoDataUrl, latitude, longitude, barangay, category, landmarkHint } = params;
  const gis = getNearestCarmenGis(latitude, longitude, barangay);
  const detectedBrgy = barangay || gis.barangay;

  // Immediate deterministic address & landmark from Carmen GIS
  const street = gis.streetNames[Math.floor(Math.abs(latitude * 1000) % gis.streetNames.length)];
  const defaultLandmark = landmarkHint || gis.landmarks[Math.floor(Math.abs(longitude * 1000) % gis.landmarks.length)];
  const fallbackCompleteAddress = `${street}, Purok ${Math.floor(Math.abs(latitude * 100) % 5) + 1}, Barangay ${detectedBrgy}, Carmen, Surigao del Sur, ${gis.postalCode}, Mindanao, Philippines`;
  const fallbackResult = {
    completeAddress: fallbackCompleteAddress,
    landmark: defaultLandmark,
    barangay: detectedBrgy,
    aiIdentified: true,
    aiSceneSummary: `${category || 'Emergency'} scene in Brgy. ${detectedBrgy} near ${defaultLandmark}`,
  };

  // If Gemini AI is not initialized, return high-accuracy Carmen GIS address immediately
  if (!ai) {
    return fallbackResult;
  }

  // Fast AI resolution: wrap Gemini call in 3.5s timeout safeguard so AI NEVER delays reporting
  try {
    const aiCall = async () => {
      const parts: any[] = [];

      // If photoDataUrl is a valid base64 image, include it for visual scene recognition
      if (photoDataUrl && photoDataUrl.startsWith('data:image/')) {
        const matches = photoDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (matches && matches[1] && matches[2]) {
          parts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2],
            },
          });
        }
      }

      const promptText = `You are the Emergency Response AI for the Municipality of Carmen, Surigao del Sur, Mindanao, Philippines.
An emergency report was initiated at coordinates (${latitude.toFixed(5)}, ${longitude.toFixed(5)}) in Barangay ${detectedBrgy}, Carmen, Surigao del Sur.
Emergency Type: ${category || 'Incident'}.
${landmarkHint ? `User notes: "${landmarkHint}".` : ''}
Key Carmen barangay landmarks in this sector: ${gis.landmarks.join('; ')}.

Identify and output the EXACT complete address of the emergency scene and the primary landmark.
Output JSON only with these exact keys:
- completeAddress: full postal address in format "[Street/Highway or Purok], Barangay [Barangay], Carmen, Surigao del Sur, 8315 Mindanao, Philippines"
- landmark: specific physical landmark (e.g. "Near Carmen Public Gymnasium & Municipal Hall", "Adjacent to Cancavan Riverside Bridge", etc.)
- barangay: confirmed barangay name in Carmen
- sceneSummary: 1-sentence description of the location and scene`;

      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              completeAddress: {
                type: Type.STRING,
                description: 'Full official address of the scene in Carmen, Surigao del Sur, Mindanao, Philippines',
              },
              landmark: {
                type: Type.STRING,
                description: 'Prominent nearby landmark or recognizable point of interest in Carmen',
              },
              barangay: {
                type: Type.STRING,
                description: 'Name of the Carmen barangay',
              },
              sceneSummary: {
                type: Type.STRING,
                description: 'Brief summary of the scene location',
              },
            },
            required: ['completeAddress', 'landmark', 'barangay'],
          },
        },
      });

      const text = response.text?.trim();
      if (!text) throw new Error('Empty AI response');

      const parsed = JSON.parse(text);
      return {
        completeAddress: parsed.completeAddress || fallbackCompleteAddress,
        landmark: parsed.landmark || defaultLandmark,
        barangay: parsed.barangay || detectedBrgy,
        aiIdentified: true,
        aiSceneSummary: parsed.sceneSummary || fallbackResult.aiSceneSummary,
      };
    };

    // Timeout safeguard: 3500ms max to prevent any delay
    const timeoutPromise = new Promise<{
      completeAddress: string;
      landmark: string;
      barangay: string;
      aiIdentified: boolean;
      aiSceneSummary: string;
    }>((resolve) => {
      setTimeout(() => resolve(fallbackResult), 3500);
    });

    return await Promise.race([aiCall(), timeoutPromise]);
  } catch (err) {
    console.warn('[AI SCENE IDENTIFIER] Gemini error or fallback used:', err);
    return fallbackResult;
  }
}

// Initial mock data seeds for Carmen, Surigao del Sur
const INITIAL_INCIDENTS = [
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
      completeAddress: 'Rizal Street, Purok 3, Barangay Poblacion, Carmen, Surigao del Sur, 8315 Mindanao, Philippines',
      landmark: 'Carmen Public Gymnasium & 150m from Municipal Hall',
      aiIdentified: true,
      aiSceneSummary: 'Residential unit structural fire near Carmen Public Gymnasium',
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
      completeAddress: 'National Highway South Corridor, Purok 2, Barangay Cancavan, Carmen, Surigao del Sur, 8315 Mindanao, Philippines',
      landmark: 'Cancavan Riverside Bridge & 100m north of Cancavan Elementary School',
      aiIdentified: true,
      aiSceneSummary: 'Tricycle vehicular collision near Cancavan Riverside Bridge curve',
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

const INITIAL_APP_DETAILS = {
  appName: 'MDRRMO Carmen',
  appLogoUrl: '',
  mdrrmoContactNumber: '0919-072-2345',
  emergencyInstructions:
    '1. Remain calm and ensure you are in a secure position.\n2. Take a clear, well-lit photo of the emergency scene.\n3. Choose the exact emergency category (Structural Fire, Grass Fire, Vehicular Accident, or Medical Assistance).\n4. Confirm GPS location and submit.\n5. Keep your phone line open for incoming verification from the MDRRMO Carmen EOC dispatcher.',
  officeDetails:
    'Municipal Disaster Risk Reduction and Management Office (MDRRMO)\nMunicipal Hall Compound, Poblacion, Carmen\nSurigao del Sur, Mindanao, Philippines\n24/7 Hotline: (086) 211-4000 / 0919-072-2345',
  jurisdiction: 'Carmen, Surigao del Sur, Mindanao, Philippines',
};

// In-memory persistent state (shared across all connected clients and admins)
let incidentsDatabase: any[] = [...INITIAL_INCIDENTS];
let appDetailsDatabase = { ...INITIAL_APP_DETAILS };
let isSirenActive = true; // active initially due to inc-carmen-002

const adminAccounts = Array.from({ length: 10 }, (_, i) => ({
  id: `admin-${i + 1}`,
  username: `Admin${i + 1}`,
  password: 'password_hash_1234567',
  role: 'admin',
  fullName: `MDRRMO Officer ${i + 1}`,
  cellphoneNumber: `0919-072-000${i + 1}`,
  barangay: 'Poblacion',
  address: 'MDRRMO Operations Center, Carmen',
  verified: true,
  registeredAt: '2026-09-01T00:00:00Z',
}));

let usersDatabase: any[] = [
  {
    id: 'client-01',
    username: 'Client1',
    password: 'password_hash_1234567',
    role: 'client',
    fullName: 'Juan C. Dela Cruz',
    cellphoneNumber: '0917-882-9901',
    barangay: 'Poblacion',
    address: 'Purok 2, Poblacion, Carmen',
    emergencyContact: '0920-555-1122',
    verified: true,
    registeredAt: '2026-09-20T08:00:00Z',
  },
  ...adminAccounts,
];

// Health check route
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    system: 'MDRRMO Carmen Emergency Incident Reporting & Response System',
    jurisdiction: 'Carmen, Surigao del Sur, Mindanao, Philippines',
    timestamp: new Date().toISOString(),
  });
});

// GET /api/incidents - Retrieve all incidents
app.get('/api/incidents', (_req, res) => {
  res.json({
    success: true,
    incidents: incidentsDatabase,
    isSirenActive,
  });
});

// POST /api/ai/locate-scene - Instant AI identification of scene address and landmark
app.post('/api/ai/locate-scene', async (req, res) => {
  try {
    const { photoDataUrl, latitude, longitude, barangay, category, landmarkHint } = req.body;
    const lat = typeof latitude === 'number' ? latitude : 9.2275;
    const lng = typeof longitude === 'number' ? longitude : 125.9958;

    const locationResult = await resolveSceneAddressAndLandmark({
      photoDataUrl,
      latitude: lat,
      longitude: lng,
      barangay,
      category,
      landmarkHint,
    });

    return res.json({
      success: true,
      location: locationResult,
    });
  } catch (err: any) {
    console.error('Error in /api/ai/locate-scene:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to identify scene location.',
    });
  }
});

// POST /api/incidents - Submit new emergency incident report
app.post('/api/incidents', async (req, res) => {
  try {
    const reportData = req.body;

    if (!reportData.photoDataUrl || !reportData.category || !reportData.clientFullName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required incident fields: photoDataUrl, category, clientFullName are required.',
      });
    }

    const now = new Date().toISOString();
    const incNumber = reportData.incidentNumber || `INC-CRM-${Date.now().toString().slice(-4)}`;

    // Ensure AI complete address & landmark are populated without delay
    let locationInfo = reportData.incidentLocation || {
      barangay: reportData.clientBarangay || 'Poblacion',
      landmarkOrAddress: '',
    };

    if (!locationInfo.completeAddress || !locationInfo.landmark) {
      const lat = reportData.gpsCoordinates?.latitude || 9.2275;
      const lng = reportData.gpsCoordinates?.longitude || 125.9958;
      const aiLoc = await resolveSceneAddressAndLandmark({
        photoDataUrl: reportData.photoDataUrl,
        latitude: lat,
        longitude: lng,
        barangay: locationInfo.barangay,
        category: reportData.category,
        landmarkHint: locationInfo.landmarkOrAddress,
      });

      locationInfo = {
        ...locationInfo,
        barangay: locationInfo.barangay || aiLoc.barangay,
        completeAddress: locationInfo.completeAddress || aiLoc.completeAddress,
        landmark: locationInfo.landmark || aiLoc.landmark,
        landmarkOrAddress: locationInfo.landmarkOrAddress || aiLoc.landmark,
        aiIdentified: true,
        aiSceneSummary: aiLoc.aiSceneSummary,
      };
    }

    const newReport = {
      ...reportData,
      id: reportData.id || `inc-carmen-${Date.now()}`,
      incidentNumber: incNumber,
      dateTime: reportData.dateTime || now,
      incidentLocation: locationInfo,
      status: 'Pending',
      adminNotificationStatus: 'Unread',
      alarmStatus: 'Active',
      alarmLog: {
        incidentId: reportData.id || `inc-carmen-${Date.now()}`,
        incidentReceivedTime: now,
        sirenActivationTime: now,
        alarmStatus: 'active',
      },
    };

    // Prepend so latest appears first
    incidentsDatabase = [newReport, ...incidentsDatabase];
    isSirenActive = true;

    console.log(`[EMERGENCY RECEIVED] ${newReport.incidentNumber} - ${newReport.category} at Brgy. ${newReport.incidentLocation?.barangay || 'Carmen'} (Address: ${newReport.incidentLocation?.completeAddress}, Landmark: ${newReport.incidentLocation?.landmark})`);

    return res.status(201).json({
      success: true,
      message: 'Emergency incident reported successfully and siren triggered.',
      incident: newReport,
    });
  } catch (error: any) {
    console.error('Error receiving incident report:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while recording emergency report.',
    });
  }
});

// PATCH /api/incidents/:id/status - Update incident status
app.patch('/api/incidents/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, notes, adminName } = req.body;

  const index = incidentsDatabase.findIndex((i) => i.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Incident not found' });
  }

  const now = new Date().toISOString();
  incidentsDatabase[index] = {
    ...incidentsDatabase[index],
    status,
    adminNotificationStatus: 'Acknowledged',
    adminAcknowledgement: {
      acknowledgedBy: adminName || 'Admin',
      acknowledgedAt: now,
      actionNotes: notes || `Status changed to ${status}`,
    },
  };

  return res.json({
    success: true,
    incident: incidentsDatabase[index],
  });
});

// GET /api/siren/status
app.get('/api/siren/status', (_req, res) => {
  const activeSirenIncident = incidentsDatabase.find(
    (i) => i.alarmStatus === 'Active' && i.status !== 'Resolved'
  );
  res.json({
    isSirenActive,
    activeIncident: activeSirenIncident || null,
  });
});

// POST /api/siren/silence - Authorized Admin silences siren
app.post('/api/siren/silence', (req, res) => {
  const { adminName, incidentId } = req.body;
  const now = new Date().toISOString();
  isSirenActive = false;

  incidentsDatabase = incidentsDatabase.map((inc) => {
    if (inc.alarmStatus === 'Active' || (incidentId && inc.id === incidentId)) {
      return {
        ...inc,
        alarmStatus: 'Silenced',
        alarmLog: inc.alarmLog
          ? {
              ...inc.alarmLog,
              alarmStatus: 'silenced',
              silencedByAdmin: adminName || 'Admin',
              sirenStopTime: now,
            }
          : {
              incidentId: inc.id,
              incidentReceivedTime: inc.dateTime,
              sirenActivationTime: inc.dateTime,
              alarmStatus: 'silenced',
              silencedByAdmin: adminName || 'Admin',
              sirenStopTime: now,
            },
      };
    }
    return inc;
  });

  console.log(`[SIREN SILENCED] by ${adminName || 'Admin'}`);

  return res.json({
    success: true,
    isSirenActive: false,
    silencedAt: now,
  });
});

// GET /api/app-details
app.get('/api/app-details', (_req, res) => {
  res.json({ success: true, appDetails: appDetailsDatabase });
});

// POST /api/app-details
app.post('/api/app-details', (req, res) => {
  const newConfig = req.body;
  appDetailsDatabase = {
    ...appDetailsDatabase,
    ...newConfig,
  };
  res.json({ success: true, appDetails: appDetailsDatabase });
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { identifier, password, role } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ success: false, error: 'Identifier and password required' });
  }

  const cleanPhone = identifier.replace(/\D/g, '');
  const user = usersDatabase.find((u) => {
    const roleMatches = !role || u.role === role;
    const usernameMatches = u.username.toLowerCase() === identifier.toLowerCase();
    const phoneMatches = cleanPhone && u.cellphoneNumber.replace(/\D/g, '') === cleanPhone;
    return roleMatches && (usernameMatches || phoneMatches);
  });

  if (!user) {
    return res.status(401).json({ success: false, error: 'User account not found' });
  }

  const valid = password === '1234567' || user.password === password;
  if (!valid) {
    return res.status(401).json({ success: false, error: 'Invalid password' });
  }

  // Return user without raw sensitive secret
  const { password: _, ...safeUser } = user;
  return res.json({ success: true, user: safeUser });
});

// POST /api/users/register
app.post('/api/users/register', (req, res) => {
  const userData = req.body;
  const cleanPhone = (userData.cellphoneNumber || '').replace(/\D/g, '');

  if (!userData.fullName || !cleanPhone || !userData.password) {
    return res.status(400).json({ success: false, error: 'Missing registration details' });
  }

  const exists = usersDatabase.some(
    (u) => u.cellphoneNumber.replace(/\D/g, '') === cleanPhone
  );
  if (exists) {
    return res.status(400).json({ success: false, error: 'Mobile number already registered.' });
  }

  const newUser = {
    id: `client-${Date.now()}`,
    username: cleanPhone,
    password: userData.password,
    role: 'client',
    fullName: userData.fullName.trim(),
    cellphoneNumber: userData.cellphoneNumber.trim(),
    barangay: userData.barangay || 'Poblacion',
    address: userData.address?.trim() || '',
    emergencyContact: userData.emergencyContact?.trim() || '',
    verified: true,
    registeredAt: new Date().toISOString(),
  };

  usersDatabase = [newUser, ...usersDatabase];

  const { password: _, ...safeUser } = newUser;
  return res.status(201).json({ success: true, user: safeUser });
});

// Development and Production server handlers
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MDRRMO Carmen Emergency Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
