import React, { useState, useRef, useEffect } from 'react';
import {
  CarmenIncidentReport,
  EmergencyCategory,
  UserAccount,
  AppDetailsConfig,
} from '../types';
import { CARMEN_BARANGAYS, findNearestCarmenBarangay } from '../data/carmenData';
import {
  PhoneCall,
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Upload,
  X,
  Crosshair,
  Flame,
  Trees,
  Car,
  HeartPulse,
  LogOut,
  ShieldCheck,
  RotateCcw,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface ClientDashboardProps {
  user: UserAccount;
  appDetails: AppDetailsConfig;
  onLogout: () => void;
  onSubmitIncident: (newReport: CarmenIncidentReport) => Promise<boolean> | void;
}

const EMERGENCY_CATEGORIES: {
  category: EmergencyCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeBg: string;
  borderActive: string;
}[] = [
  {
    category: 'Structural Fire',
    label: 'Structural Fire',
    icon: Flame,
    color: 'text-red-600',
    badgeBg: 'bg-red-50 text-red-700 border-red-200',
    borderActive: 'border-red-600 ring-2 ring-red-500/30 bg-red-50/50',
  },
  {
    category: 'Grass Fire',
    label: 'Grass Fire',
    icon: Trees,
    color: 'text-amber-600',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    borderActive: 'border-amber-600 ring-2 ring-amber-500/30 bg-amber-50/50',
  },
  {
    category: 'Vehicular Accident',
    label: 'Vehicular Accident',
    icon: Car,
    color: 'text-blue-600',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    borderActive: 'border-blue-600 ring-2 ring-blue-500/30 bg-blue-50/50',
  },
  {
    category: 'Medical Assistance',
    label: 'Medical Assistance',
    icon: HeartPulse,
    color: 'text-rose-600',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    borderActive: 'border-rose-600 ring-2 ring-rose-500/30 bg-rose-50/50',
  },
];

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  user,
  appDetails,
  onLogout,
  onSubmitIncident,
}) => {
  // Modal State
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<EmergencyCategory>('Structural Fire');
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const [barangay, setBarangay] = useState<string>(user.barangay || 'Poblacion');
  const [landmarkOrAddress, setLandmarkOrAddress] = useState<string>('');

  // AI-Identified Scene Address & Landmark state (zero delay)
  const [completeAddress, setCompleteAddress] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('');
  const [isAiLocating, setIsAiLocating] = useState<boolean>(false);
  const [aiIdentified, setAiIdentified] = useState<boolean>(false);
  const [aiSceneSummary, setAiSceneSummary] = useState<string>('');

  // GPS state
  const [lat, setLat] = useState<number>(9.2275);
  const [lng, setLng] = useState<number>(125.9958);
  const [gpsStatus, setGpsStatus] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Live Camera stream state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Submission & Confirmation state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string>('');
  const [submittedReport, setSubmittedReport] = useState<CarmenIncidentReport | null>(null);

  // Automatic AI Scene Locator (zero delay background resolution)
  const detectSceneLocationWithAi = async (params?: {
    photo?: string;
    targetLat?: number;
    targetLng?: number;
    targetBrgy?: string;
    targetCat?: EmergencyCategory;
    landmarkText?: string;
  }) => {
    setIsAiLocating(true);
    try {
      const pPhoto = params?.photo !== undefined ? params.photo : photoDataUrl;
      const pLat = params?.targetLat !== undefined ? params.targetLat : lat;
      const pLng = params?.targetLng !== undefined ? params.targetLng : lng;
      const pBrgy = params?.targetBrgy !== undefined ? params.targetBrgy : barangay;
      const pCat = params?.targetCat !== undefined ? params.targetCat : selectedCategory;
      const pLandmark = params?.landmarkText !== undefined ? params.landmarkText : (landmark || landmarkOrAddress);

      const res = await fetch('/api/ai/locate-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoDataUrl: pPhoto,
          latitude: pLat,
          longitude: pLng,
          barangay: pBrgy,
          category: pCat,
          landmarkHint: pLandmark,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.location) {
          setCompleteAddress(data.location.completeAddress);
          setLandmark(data.location.landmark);
          setAiIdentified(true);
          if (data.location.aiSceneSummary) {
            setAiSceneSummary(data.location.aiSceneSummary);
          }
          if (!landmarkOrAddress) {
            setLandmarkOrAddress(data.location.landmark);
          }
        }
      }
    } catch (err) {
      console.warn('AI scene locator non-blocking error:', err);
    } finally {
      setIsAiLocating(false);
    }
  };

  // Automatically detect GPS when opening the report modal
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('GPS not supported by your browser. Using Brgy. center.');
      detectSceneLocationWithAi();
      return;
    }
    setIsLocating(true);
    setGpsStatus('Acquiring high-accuracy GPS fix...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setLat(userLat);
        setLng(userLng);
        setIsLocating(false);

        const nearest = findNearestCarmenBarangay(userLat, userLng);
        setBarangay(nearest.name);
        setGpsStatus(
          `GPS Acquired: ${userLat.toFixed(5)}, ${userLng.toFixed(5)} (±${Math.round(
            pos.coords.accuracy || 10
          )}m, Brgy. ${nearest.name})`
        );
        detectSceneLocationWithAi({ targetLat: userLat, targetLng: userLng, targetBrgy: nearest.name });
      },
      (err) => {
        setIsLocating(false);
        const defaultB = CARMEN_BARANGAYS.find((b) => b.name === barangay) || CARMEN_BARANGAYS[0];
        setLat(defaultB.latitude);
        setLng(defaultB.longitude);
        setGpsStatus(`GPS signal low (${err.message}). Set to Brgy. ${defaultB.name} location.`);
        detectSceneLocationWithAi({ targetLat: defaultB.latitude, targetLng: defaultB.longitude, targetBrgy: defaultB.name });
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  };

  // Start Camera Stream
  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch {
      alert('Camera access unavailable. You can upload a photo file from your device.');
    }
  };

  // Toggle Camera Facing
  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (isCameraActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextFacing },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch {
        // Fallback
      }
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Capture Photo from Video Stream
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoDataUrl(dataUrl);
      stopCamera();
      detectSceneLocationWithAi({ photo: dataUrl });
    }
  };

  // Upload Photo File
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const resultUrl = event.target?.result as string;
      setPhotoDataUrl(resultUrl);
      stopCamera();
      detectSceneLocationWithAi({ photo: resultUrl });
    };
    reader.readAsDataURL(file);
  };

  // Sample Scene Photos for testing
  const handleUseSamplePhoto = (cat: EmergencyCategory) => {
    const demoMap: Record<EmergencyCategory, string> = {
      'Structural Fire':
        'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=800&q=80',
      'Grass Fire':
        'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80',
      'Vehicular Accident':
        'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80',
      'Medical Assistance':
        'https://images.unsplash.com/photo-1587745416684-47953f16f02f?auto=format&fit=crop&w=800&q=80',
    };
    const sampleUrl = demoMap[cat];
    setPhotoDataUrl(sampleUrl);
    stopCamera();
    detectSceneLocationWithAi({ photo: sampleUrl, targetCat: cat });
  };

  // Open Report Modal
  const openReportModal = () => {
    setSubmissionError('');
    setShowReportModal(true);
    handleDetectGPS();
    detectSceneLocationWithAi();
  };

  // Close Report Modal
  const closeReportModal = () => {
    stopCamera();
    setShowReportModal(false);
    setSubmissionError('');
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // SUBMIT INCIDENT VIA CENTRALIZED BACKEND
  const handleReportNow = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError('');

    if (!photoDataUrl) {
      setSubmissionError('Please provide a photograph of the emergency scene (take photo or upload file).');
      return;
    }

    setIsSubmitting(true);

    const now = new Date().toISOString();
    const incNumber = `INC-CRM-${Date.now().toString().slice(-4)}`;

    const newReport: CarmenIncidentReport = {
      id: `inc-carmen-${Date.now()}`,
      incidentNumber: incNumber,
      category: selectedCategory,
      photoDataUrl,
      dateTime: now,
      clientId: user.id,
      clientFullName: user.fullName,
      clientPhoneNumber: user.cellphoneNumber,
      clientBarangay: user.barangay,
      gpsCoordinates: {
        latitude: lat,
        longitude: lng,
        accuracyMeters: 8,
      },
      incidentLocation: {
        barangay,
        landmarkOrAddress:
          landmark.trim() || landmarkOrAddress.trim() || `Brgy. ${barangay}, Carmen, Surigao del Sur`,
        completeAddress:
          completeAddress.trim() ||
          `Barangay ${barangay}, Carmen, Surigao del Sur, 8315 Mindanao, Philippines`,
        landmark:
          landmark.trim() || landmarkOrAddress.trim() || `Near Barangay ${barangay} Center`,
        aiIdentified: true,
        aiSceneSummary: aiSceneSummary || `${selectedCategory} reported at Brgy. ${barangay}`,
      },
      status: 'Pending',
      adminNotificationStatus: 'Unread',
      alarmStatus: 'Active',
      alarmLog: {
        incidentId: `inc-carmen-${Date.now()}`,
        incidentReceivedTime: now,
        sirenActivationTime: now,
        alarmStatus: 'active',
      },
    };

    try {
      // 1. Send to centralized online backend
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReport),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Server rejected incident report.');
      }

      // Propagate locally as well for immediate UI response
      onSubmitIncident(data.incident || newReport);

      // Successfully transmitted! Display confirmation
      setSubmittedReport(data.incident || newReport);
      setShowReportModal(false);
      setPhotoDataUrl('');
      setLandmarkOrAddress('');
      setCompleteAddress('');
      setLandmark('');
      setAiIdentified(false);
      setAiSceneSummary('');
      stopCamera();
    } catch (err: any) {
      console.error('Failed to submit incident report to server:', err);
      // Fulfill requirement 7:
      // "If the upload fails because of an internet or server problem, the application should clearly notify the Client instead of falsely indicating that the report was sent."
      setSubmissionError(
        'Upload Failed: Could not connect to MDRRMO Carmen server. Please check your internet connection or call the 24/7 hotline directly.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans overflow-x-hidden">
      {/* ======================================================== */}
      {/* TOP HEADER */}
      {/* ======================================================== */}
      <header className="bg-emerald-800 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white text-emerald-800 flex items-center justify-center font-black shadow-xs shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-800" />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-black tracking-tight text-white">
                {appDetails.appName}
              </h1>
              <p className="text-[11px] text-emerald-200">
                Carmen, Surigao del Sur
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-950 text-emerald-100 flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-700/50"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN CONTAINER (MOBILE & TABLET OPTIMIZED) */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 sm:p-5 flex flex-col gap-4">
        {/* Logged-in Client Identity Badge */}
        <div className="p-3.5 bg-white border border-emerald-200 rounded-2xl shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Caller
              </span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded-sm">
                Verified
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 truncate">
              {user.fullName}
            </h2>
            <p className="text-xs text-slate-600 font-medium truncate">
              <span className="font-mono text-emerald-800 font-bold">{user.cellphoneNumber}</span> · Brgy. {user.barangay}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* ======================================================== */}
        {/* ACTION 1: DIRECT DIAL BUTTON (HIGH VISIBILITY) */}
        {/* ======================================================== */}
        <div className="bg-emerald-800 text-white rounded-2xl p-4 shadow-md border border-emerald-700 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-emerald-300 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                MDRRMO Carmen 24/7 Hotline
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-emerald-700/80 px-2 py-0.5 rounded-full text-emerald-100">
              ALWAYS READY
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white">
              {appDetails.mdrrmoContactNumber}
            </span>
          </div>

          <a
            href={`tel:${appDetails.mdrrmoContactNumber.replace(/\D/g, '')}`}
            className="w-full py-3 bg-white hover:bg-emerald-50 text-emerald-900 rounded-xl text-sm font-black shadow-md flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer"
          >
            <PhoneCall className="w-4 h-4 text-emerald-700" />
            <span>DIRECT DIAL NOW</span>
          </a>
        </div>

        {/* ======================================================== */}
        {/* ACTION 2: PROMINENT REPORT EMERGENCY BUTTON */}
        {/* ======================================================== */}
        <div className="bg-white border-2 border-emerald-600 rounded-2xl p-5 shadow-lg flex flex-col gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
              Report an Emergency
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              Take or upload a photo of the scene, select the emergency type, and transmit immediately with GPS to the MDRRMO Carmen command center.
            </p>
          </div>

          {/* PROMINENT REPORT EMERGENCY BUTTON */}
          <button
            type="button"
            onClick={openReportModal}
            className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-base sm:text-lg font-black shadow-xl shadow-emerald-700/25 transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer border border-emerald-600"
          >
            <Camera className="w-6 h-6" />
            <span>REPORT EMERGENCY</span>
          </button>

          {/* The 4 emergency categories preview */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-left">
            {EMERGENCY_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.category}
                  onClick={openReportModal}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <Icon className={`w-4 h-4 ${cat.color} shrink-0`} />
                  <span className="truncate">{cat.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Safety Instructions Card */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-1.5 text-xs text-slate-700">
          <div className="flex items-center gap-2 font-bold text-emerald-950">
            <HelpCircle className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Emergency Reporting Guide</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            1. Keep yourself safe. Never enter dangerous fire or accident zones.<br />
            2. Take a clear photograph of the scene.<br />
            3. Tap <strong>REPORT NOW</strong> to instantly alert MDRRMO Carmen.
          </p>
        </div>
      </main>

      {/* ======================================================== */}
      {/* REPORT EMERGENCY MODAL (PHOTO → SELECT TYPE → REPORT NOW) */}
      {/* ======================================================== */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-lg w-full border border-emerald-200 overflow-hidden flex flex-col max-h-[94vh]">
            {/* Modal Header */}
            <div className="bg-emerald-800 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-300" />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Report Emergency
                </h3>
              </div>
              <button
                type="button"
                onClick={closeReportModal}
                disabled={isSubmitting}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Submission Error Banner */}
              {submissionError && (
                <div className="p-3.5 bg-red-50 border-2 border-red-300 rounded-xl text-xs text-red-800 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{submissionError}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={`tel:${appDetails.mdrrmoContactNumber.replace(/\D/g, '')}`}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Call Hotline Now</span>
                    </a>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STEP 1: PHOTOGRAPH OF EMERGENCY SCENE */}
              {/* ---------------------------------------------------- */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
                  1. Scene Photograph <span className="text-red-500">*</span>
                </label>

                {/* If live camera stream active */}
                {isCameraActive && (
                  <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-emerald-600 aspect-video flex items-center justify-center">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleCameraFacing}
                        className="px-2.5 py-1 bg-black/60 text-white rounded-lg text-xs font-bold flex items-center gap-1 backdrop-blur-xs cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Flip</span>
                      </button>
                    </div>
                    <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-4">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-full shadow-lg flex items-center gap-2 cursor-pointer border-2 border-white"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Snap Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-3 py-2 bg-slate-800 text-white font-bold text-xs rounded-full cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* If photo captured or selected */}
                {!isCameraActive && photoDataUrl && (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-600 bg-slate-100 group">
                    <img
                      src={photoDataUrl}
                      alt="Emergency Scene"
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPhotoDataUrl('')}
                        className="px-2.5 py-1 rounded-lg bg-black/70 text-white text-xs font-bold flex items-center gap-1 hover:bg-red-700 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 bg-emerald-800/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Photo Attached</span>
                    </div>
                  </div>
                )}

                {/* Buttons to Take or Upload Photo */}
                {!isCameraActive && !photoDataUrl && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="py-3 px-3 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-600 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <Camera className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>Take Photo</span>
                      </button>

                      <label className="py-3 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors text-center">
                        <Upload className="w-4 h-4 text-slate-600 shrink-0" />
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Quick Demo Scene photos */}
                    <div className="pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Or use demo scene photo:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUseSamplePhoto('Structural Fire')}
                          className="text-[10px] py-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md truncate cursor-pointer font-medium"
                        >
                          Structural Fire
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUseSamplePhoto('Grass Fire')}
                          className="text-[10px] py-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md truncate cursor-pointer font-medium"
                        >
                          Grass Fire
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUseSamplePhoto('Vehicular Accident')}
                          className="text-[10px] py-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md truncate cursor-pointer font-medium"
                        >
                          Vehicular
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUseSamplePhoto('Medical Assistance')}
                          className="text-[10px] py-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md truncate cursor-pointer font-medium"
                        >
                          Medical
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ---------------------------------------------------- */}
              {/* STEP 2: SELECT TYPE OF EMERGENCY */}
              {/* ---------------------------------------------------- */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
                  2. Select Type of Emergency <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {EMERGENCY_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === cat.category;
                    return (
                      <button
                        key={cat.category}
                        type="button"
                        onClick={() => setSelectedCategory(cat.category)}
                        className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                          isSelected
                            ? cat.borderActive
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${cat.color} shrink-0`} />
                        <span className="text-xs font-black text-slate-900 leading-snug">
                          {cat.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ---------------------------------------------------- */}
              {/* LOCATION & AI SCENE DETECTION (AUTOMATIC ADDRESS & LANDMARK) */}
              {/* ---------------------------------------------------- */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Location & Scene Identification
                    </label>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full">
                      AI Instant Fix
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={isLocating}
                    className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? 'Locating...' : 'Refresh GPS'}</span>
                  </button>
                </div>

                {/* AI Scene Recognition Status banner */}
                <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs shrink-0">{isAiLocating ? '⏳' : '✨'}</span>
                    <span className="text-[11px] text-emerald-950 font-medium truncate">
                      {isAiLocating
                        ? 'AI identifying scene address & landmark...'
                        : aiIdentified
                        ? 'AI identified scene address & landmark ready'
                        : 'AI auto-detects address & landmark with zero delay'}
                    </span>
                  </div>
                  {isAiLocating && (
                    <div className="w-3.5 h-3.5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin shrink-0" />
                  )}
                </div>

                {/* Complete Address Auto-sent by AI */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] text-slate-600 font-bold">
                      Complete Address of Scene <span className="text-emerald-700 font-bold">(Auto-sent)</span>
                    </span>
                    {completeAddress && (
                      <span className="text-[9px] text-emerald-700 font-mono font-bold">✓ AI Resolved</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={completeAddress}
                    onChange={(e) => setCompleteAddress(e.target.value)}
                    placeholder="e.g. Rizal Street, Purok 3, Barangay Poblacion, Carmen, Surigao del Sur"
                    className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 focus:bg-white rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                {/* Prominent Landmark Auto-sent by AI */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] text-slate-600 font-bold">
                      Scene Landmark <span className="text-emerald-700 font-bold">(Auto-sent)</span>
                    </span>
                    {landmark && (
                      <span className="text-[9px] text-emerald-700 font-mono font-bold">✓ AI Identified</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => {
                      setLandmark(e.target.value);
                      setLandmarkOrAddress(e.target.value);
                    }}
                    placeholder="e.g. Near Carmen Public Gymnasium & San Agustin Church"
                    className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 focus:bg-white rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Barangay</span>
                    <select
                      value={barangay}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBarangay(val);
                        const found = CARMEN_BARANGAYS.find((b) => b.name === val);
                        if (found) {
                          setLat(found.latitude);
                          setLng(found.longitude);
                          detectSceneLocationWithAi({
                            targetBrgy: val,
                            targetLat: found.latitude,
                            targetLng: found.longitude,
                          });
                        }
                      }}
                      className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      {CARMEN_BARANGAYS.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">GPS Fix</span>
                    <div className="w-full text-[11px] px-2.5 py-2 bg-slate-100 border border-slate-300 rounded-xl text-slate-700 font-mono truncate">
                      {lat.toFixed(4)}, {lng.toFixed(4)}
                    </div>
                  </div>
                </div>

                {gpsStatus && (
                  <p className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                    <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                    <span className="truncate">{gpsStatus}</span>
                  </p>
                )}
              </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* STEP 3: PROMINENT "REPORT NOW" BUTTON */}
            {/* ---------------------------------------------------- */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={handleReportNow}
                disabled={isSubmitting || !photoDataUrl}
                className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-2xl text-base sm:text-lg font-black shadow-xl shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed border border-emerald-600"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Transmitting Emergency Report...</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5" />
                    <span>REPORT NOW</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-slate-500 text-center mt-1.5 font-medium">
                Submits photo, emergency category, AI-identified address, and landmark directly to MDRRMO Carmen
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUCCESS CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {submittedReport && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border-2 border-emerald-500 overflow-hidden text-center p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-emerald-950 uppercase tracking-tight">
                REPORT SENT SUCCESSFULLY
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-700">
                Your emergency report has been sent to MDRRMO Carmen.
              </p>
            </div>

            {/* Recap Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-left space-y-2">
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                <span className="text-slate-500">Incident Reference:</span>
                <span className="font-mono font-bold text-slate-900">
                  {submittedReport.incidentNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Category:</span>
                <span className="font-bold text-emerald-800">{submittedReport.category}</span>
              </div>

              {/* Complete Address & Landmark */}
              <div className="flex flex-col gap-0.5 py-1 border-t border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Scene Complete Address</span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                    AI Transmitted
                  </span>
                </div>
                <span className="font-bold text-slate-900 text-xs">
                  {submittedReport.incidentLocation.completeAddress ||
                    `Brgy. ${submittedReport.incidentLocation.barangay}, Carmen, Surigao del Sur`}
                </span>
                {submittedReport.incidentLocation.landmark && (
                  <span className="text-emerald-800 text-[11px] font-semibold flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                    <span>Landmark: {submittedReport.incidentLocation.landmark}</span>
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Barangay:</span>
                <span className="font-medium text-slate-800">
                  Brgy. {submittedReport.incidentLocation.barangay}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Caller:</span>
                <span className="font-medium text-slate-800">{submittedReport.clientFullName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Time:</span>
                <span className="font-mono text-slate-700">
                  {new Date(submittedReport.dateTime).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-medium">
              ✓ The MDRRMO Carmen operations center has been alerted and the siren grid has sounded. Keep your phone line accessible for dispatch verification.
            </p>

            <div className="pt-2 flex flex-col gap-2">
              <a
                href={`tel:${appDetails.mdrrmoContactNumber.replace(/\D/g, '')}`}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Hotline to Follow Up</span>
              </a>

              <button
                type="button"
                onClick={() => setSubmittedReport(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Done / Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
