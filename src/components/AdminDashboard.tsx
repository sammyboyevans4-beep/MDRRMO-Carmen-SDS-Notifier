import React, { useState, useRef, useEffect } from 'react';
import {
  CarmenIncidentReport,
  UserAccount,
  AppDetailsConfig,
  IncidentStatus,
} from '../types';
import { CarmenMap } from './CarmenMap';
import { sirenManager } from '../utils/sirenManager';
import {
  ShieldAlert,
  Volume2,
  VolumeX,
  MapPin,
  Clock,
  User,
  Phone,
  CheckCircle2,
  LogOut,
  Settings,
  History,
  AlertTriangle,
  Flame,
  Trees,
  Car,
  HeartPulse,
  Save,
  Check,
  ChevronRight,
  ShieldCheck,
  LayoutGrid,
  Maximize2,
  ArrowLeft,
  Radio,
} from 'lucide-react';

interface AdminDashboardProps {
  currentAdmin: UserAccount;
  incidents: CarmenIncidentReport[];
  appDetails: AppDetailsConfig;
  onUpdateAppDetails: (newConfig: AppDetailsConfig) => void;
  onLogout: () => void;
  onTurnOffSiren: (incidentId?: string) => void;
  isSirenActive: boolean;
  onUpdateIncidentStatus: (incidentId: string, status: IncidentStatus, notes?: string) => void;
}

export type AdminTab =
  | 'all_features'
  | 'reported_incident'
  | 'realtime_map'
  | 'history'
  | 'app_details'
  | 'turn_off_siren';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentAdmin,
  incidents,
  appDetails,
  onUpdateAppDetails,
  onLogout,
  onTurnOffSiren,
  isSirenActive,
  onUpdateIncidentStatus,
}) => {
  // Start on 'all_features' so the admin home screen immediately shows all 5 features fitting on the smartphone!
  const [activeTab, setActiveTab] = useState<AdminTab>('all_features');

  // Selected incident for detail view or status change
  const [selectedIncident, setSelectedIncident] = useState<CarmenIncidentReport | null>(null);

  // App Details local edit form
  const [appName, setAppName] = useState(appDetails.appName);
  const [appLogoUrl, setAppLogoUrl] = useState(appDetails.appLogoUrl);
  const [mdrrmoContactNumber, setMdrrmoContactNumber] = useState(appDetails.mdrrmoContactNumber);
  const [emergencyInstructions, setEmergencyInstructions] = useState(
    appDetails.emergencyInstructions
  );
  const [officeDetails, setOfficeDetails] = useState(appDetails.officeDetails);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Test Alarm Sound state & handler
  const [isTestAlarmActive, setIsTestAlarmActive] = useState<boolean>(false);
  const testAlarmTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleStartTestAlarm = () => {
    if (testAlarmTimerRef.current) {
      clearTimeout(testAlarmTimerRef.current);
    }
    sirenManager.startEmergencySiren();
    setIsTestAlarmActive(true);
    // Auto silence test alarm after 15 seconds if not manually stopped
    testAlarmTimerRef.current = setTimeout(() => {
      sirenManager.stopEmergencySiren();
      setIsTestAlarmActive(false);
    }, 15000);
  };

  const handleTurnOffTestAlarm = () => {
    if (testAlarmTimerRef.current) {
      clearTimeout(testAlarmTimerRef.current);
      testAlarmTimerRef.current = null;
    }
    sirenManager.stopEmergencySiren();
    setIsTestAlarmActive(false);
  };

  useEffect(() => {
    return () => {
      if (testAlarmTimerRef.current) {
        clearTimeout(testAlarmTimerRef.current);
      }
    };
  }, []);

  // Active / current emergency reports (Pending, Responders Dispatched, On Scene)
  const activeReports = incidents.filter((i) => i.status !== 'Resolved');

  // Previously reported incidents (History)
  const historyReports = incidents;

  // Active incident causing siren, if any
  const sirenTriggerIncident = incidents.find(
    (i) => i.alarmStatus === 'Active' && i.status !== 'Resolved'
  );

  // Handle Save App Details
  const handleSaveAppDetails = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAppDetails({
      appName: appName.trim() || 'MDRRMO Carmen',
      appLogoUrl: appLogoUrl.trim(),
      mdrrmoContactNumber: mdrrmoContactNumber.trim() || '0919-072-2345',
      emergencyInstructions: emergencyInstructions.trim(),
      officeDetails: officeDetails.trim(),
      jurisdiction: 'Carmen, Surigao del Sur, Mindanao, Philippines',
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Turn off siren action
  const handleStopSiren = () => {
    onTurnOffSiren(sirenTriggerIncident?.id);
    handleTurnOffTestAlarm();
    sirenManager.stopEmergencySiren();
    sirenManager.playAcknowledgeTone();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans overflow-x-hidden">
      {/* ======================================================== */}
      {/* COMPACT MOBILE-FIRST TOP COMMAND HEADER */}
      {/* ======================================================== */}
      <header className="bg-emerald-900 text-white shadow-md sticky top-0 z-40 border-b border-emerald-800">
        <div className="max-w-5xl mx-auto px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2">
          {/* Logo & Identity */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white text-emerald-900 flex items-center justify-center font-black shadow-xs shrink-0">
              <ShieldAlert className="w-5 h-5 text-emerald-800" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs sm:text-sm font-black tracking-tight text-white uppercase truncate">
                  {appDetails.appName}
                </h1>
                <span className="bg-emerald-800 text-emerald-200 text-[9px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0">
                  {currentAdmin.username}
                </span>
              </div>
              <p className="text-[10px] text-emerald-200 truncate">
                Admin Command Center · Carmen
              </p>
            </div>
          </div>

          {/* Quick Siren Status & Logout */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isSirenActive && (
              <button
                type="button"
                onClick={handleStopSiren}
                className="px-2 sm:px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-black rounded-lg animate-pulse flex items-center gap-1 shadow-md border border-red-400 cursor-pointer"
                title="Silence Siren"
              >
                <Volume2 className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[10px] sm:text-xs">SILENCE</span>
              </button>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-950 text-emerald-100 flex items-center gap-1 transition-colors cursor-pointer border border-emerald-800/80"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* MOBILE NAVIGATION - 100% FITS IN SMARTPHONE SCREEN */}
        {/* ======================================================== */}
        <div className="bg-emerald-950 border-t border-emerald-800/80 px-2 py-1.5">
          <div className="max-w-5xl mx-auto grid grid-cols-6 gap-1 text-[10px] font-bold text-center">
            {/* 0. All Features (Home Screen) */}
            <button
              type="button"
              onClick={() => setActiveTab('all_features')}
              className={`py-1.5 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                activeTab === 'all_features'
                  ? 'bg-emerald-700 text-white font-black'
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-900/60'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="leading-none text-[9px] sm:text-[10px] truncate">All</span>
            </button>

            {/* 1. Reported Incident */}
            <button
              type="button"
              onClick={() => setActiveTab('reported_incident')}
              className={`py-1.5 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer relative ${
                activeTab === 'reported_incident'
                  ? 'bg-emerald-700 text-white font-black'
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-900/60'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="leading-none text-[9px] sm:text-[10px] truncate">Reports</span>
              {activeReports.length > 0 && (
                <span className="absolute -top-1 right-1 bg-red-600 text-white text-[8px] font-bold px-1 rounded-full">
                  {activeReports.length}
                </span>
              )}
            </button>

            {/* 2. Realtime Map */}
            <button
              type="button"
              onClick={() => setActiveTab('realtime_map')}
              className={`py-1.5 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                activeTab === 'realtime_map'
                  ? 'bg-emerald-700 text-white font-black'
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-900/60'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span className="leading-none text-[9px] sm:text-[10px] truncate">Map</span>
            </button>

            {/* 3. History */}
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`py-1.5 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-emerald-700 text-white font-black'
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-900/60'
              }`}
            >
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span className="leading-none text-[9px] sm:text-[10px] truncate">History</span>
            </button>

            {/* 4. App Details */}
            <button
              type="button"
              onClick={() => setActiveTab('app_details')}
              className={`py-1.5 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                activeTab === 'app_details'
                  ? 'bg-emerald-700 text-white font-black'
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-900/60'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-slate-300" />
              <span className="leading-none text-[9px] sm:text-[10px] truncate">Details</span>
            </button>

            {/* 5. Turn Off Siren */}
            <button
              type="button"
              onClick={() => setActiveTab('turn_off_siren')}
              className={`py-1.5 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                activeTab === 'turn_off_siren'
                  ? 'bg-red-700 text-white font-black'
                  : isSirenActive
                  ? 'bg-red-950/80 text-red-300 animate-pulse'
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-900/60'
              }`}
            >
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
              <span className="leading-none text-[9px] sm:text-[10px] truncate">Siren</span>
            </button>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* EMERGENCY SIREN ACTIVE BANNER (IF SIREN ENGAGED) */}
      {/* ======================================================== */}
      {isSirenActive && (
        <div className="bg-red-600 text-white px-3 py-2 shadow-lg flex items-center justify-between gap-2 border-b-2 border-red-700">
          <div className="flex items-center gap-2 min-w-0">
            <Volume2 className="w-5 h-5 shrink-0 animate-bounce" />
            <div className="min-w-0">
              <span className="text-xs font-black uppercase tracking-wide truncate block">
                EMERGENCY SIREN SOUNDING
              </span>
              <span className="text-[10px] text-red-100 truncate block">
                {sirenTriggerIncident
                  ? `${sirenTriggerIncident.category} in Brgy. ${sirenTriggerIncident.incidentLocation.barangay}`
                  : 'Active emergency alarm in Carmen'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleStopSiren}
            className="px-3 py-1.5 bg-white text-red-800 hover:bg-red-50 rounded-lg text-xs font-black uppercase shrink-0 shadow-md transition-transform active:scale-95 cursor-pointer"
          >
            turn off Siren
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* MAIN CONTAINER (SMARTPHONE OPTIMIZED, NO OVERFLOW) */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5 space-y-4">
        {/* ========================================================================= */}
        {/* HOME SCREEN OF CELLPHONE: SHOWS ALL 5 FEATURES FITTING IN SMARTPHONE */}
        {/* ========================================================================= */}
        {activeTab === 'all_features' && (
          <div className="space-y-4">
            {/* Admin Header Status Bar */}
            <div className="bg-white border border-emerald-200 rounded-2xl p-3 sm:p-4 shadow-xs flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Municipal Command System
                </span>
                <h2 className="text-sm sm:text-base font-black text-slate-900 truncate">
                  Admin Command Dashboard
                </h2>
                <p className="text-[11px] text-slate-600 truncate">
                  Carmen, Surigao del Sur, Mindanao Philippines
                </p>
              </div>

              {/* Siren Status Quick Badge */}
              <button
                type="button"
                onClick={() => setActiveTab('turn_off_siren')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95 ${
                  isSirenActive
                    ? 'bg-red-100 text-red-700 border border-red-300 animate-pulse'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              >
                {isSirenActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>{isSirenActive ? 'SIREN ON' : 'SIREN OFF'}</span>
              </button>
            </div>

            {/* ---------------------------------------------------- */}
            {/* FEATURE 5: "turn off Siren" (PROMINENT MOBILE CARD) */}
            {/* ---------------------------------------------------- */}
            <div
              className={`rounded-2xl p-4 shadow-sm border-2 transition-all flex flex-col sm:flex-row items-center justify-between gap-3 ${
                isSirenActive
                  ? 'bg-red-50 border-red-500'
                  : 'bg-white border-slate-200 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                    isSirenActive ? 'bg-red-600 text-white animate-bounce' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isSirenActive ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      turn off Siren
                    </h3>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isSirenActive ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isSirenActive ? 'ACTIVE' : 'SILENCED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {isSirenActive
                      ? 'Loud siren sounding on all Carmen Admin devices'
                      : 'Emergency siren system is silent and ready'}
                  </p>
                </div>
              </div>

              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {isSirenActive ? (
                  <button
                    type="button"
                    onClick={handleStopSiren}
                    className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                  >
                    <VolumeX className="w-4 h-4" />
                    <span>turn off Siren now</span>
                  </button>
                ) : (
                  <>
                    {isTestAlarmActive ? (
                      <button
                        type="button"
                        onClick={handleTurnOffTestAlarm}
                        className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-md uppercase tracking-wider animate-pulse"
                      >
                        <VolumeX className="w-4 h-4" />
                        <span>turn off test alarm</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStartTestAlarm}
                        className="w-full sm:w-auto px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-amber-700" />
                        <span>Test Alarm Sound</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveTab('turn_off_siren')}
                      className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Manage Siren Settings</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* FEATURE 1: "Reported Incident" (MOBILE CARD & QUEUE) */}
            {/* ---------------------------------------------------- */}
            <div className="bg-white border-2 border-emerald-600/30 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      Reported Incident
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Active emergency queue received from citizens
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('reported_incident')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 cursor-pointer"
                >
                  <span>View All ({activeReports.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {activeReports.length === 0 ? (
                <div className="p-4 bg-emerald-50/60 rounded-xl text-center text-xs text-emerald-900 font-medium">
                  ✓ No pending emergencies in Carmen at this moment.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeReports.slice(0, 2).map((incident) => (
                    <div
                      key={incident.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={incident.photoDataUrl}
                          alt={incident.category}
                          className="w-12 h-12 rounded-lg object-cover bg-slate-200 shrink-0 border border-slate-300"
                        />
                        <div className="min-w-0 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 truncate">
                              {incident.category}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.2 rounded">
                              {incident.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 truncate mt-0.5">
                            Brgy. {incident.incidentLocation.barangay} · {incident.clientFullName}
                          </p>
                          {incident.incidentLocation.completeAddress && (
                            <p className="text-[10px] text-slate-700 truncate font-medium">
                              📍 {incident.incidentLocation.completeAddress}
                            </p>
                          )}
                          {incident.incidentLocation.landmark && (
                            <p className="text-[10px] text-emerald-800 truncate font-bold">
                              Landmark: {incident.incidentLocation.landmark}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 font-mono">
                            {new Date(incident.dateTime).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedIncident(incident)}
                        className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer"
                      >
                        Inspect
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ---------------------------------------------------- */}
            {/* FEATURE 2: "Realtime Map of Carmen, Surigao del Sur, Mindanao Philippines" */}
            {/* ---------------------------------------------------- */}
            <div className="bg-white border-2 border-emerald-600/30 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight truncate">
                      Realtime Map of Carmen, Surigao del Sur, Mindanao Philippines
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Geospatial radar covering 8 Carmen barangays
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('realtime_map')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 cursor-pointer shrink-0"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Full Map</span>
                </button>
              </div>

              {/* Embedded Interactive Map fitting in smartphone screen */}
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <CarmenMap
                  incidents={incidents}
                  selectedIncidentId={selectedIncident?.id}
                  onSelectIncident={(inc) => setSelectedIncident(inc)}
                  heightClass="h-56 sm:h-72"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Center: 9.2275° N, 125.9958° E</span>
                <span className="font-bold text-emerald-800">
                  {incidents.length} Mapped Incidents
                </span>
              </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* FEATURE 3: "History of the incident reported" */}
            {/* ---------------------------------------------------- */}
            <div className="bg-white border-2 border-emerald-600/30 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      History of the incident reported
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Audit ledger of all emergency submissions & siren logs
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Full Ledger ({historyReports.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {historyReports.slice(0, 3).map((inc) => (
                  <div key={inc.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 truncate">{inc.incidentNumber}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-emerald-800 font-bold truncate">{inc.category}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        Brgy. {inc.incidentLocation.barangay} · {new Date(inc.dateTime).toLocaleDateString()}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        inc.status === 'Resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {inc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* FEATURE 4: "App details" */}
            {/* ---------------------------------------------------- */}
            <div className="bg-white border-2 border-emerald-600/30 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    4
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      App details
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Municipal emergency hotline & system configuration
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('app_details')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configure</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold block">Application Name</span>
                  <span className="font-bold text-slate-900 truncate block">{appDetails.appName}</span>
                </div>
                <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 font-bold block">24/7 Hotline</span>
                  <span className="font-mono font-bold text-emerald-900 truncate block">
                    {appDetails.mdrrmoContactNumber}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 block mb-0.5">Jurisdiction:</span>
                <span>{appDetails.jurisdiction}</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DEDICATED TAB 1: REPORTED INCIDENT (DETAILED WORKSPACE) */}
        {/* ========================================================================= */}
        {activeTab === 'reported_incident' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('all_features')}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  title="Back to All Features"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-emerald-950 uppercase tracking-tight">
                    1. Reported Incident
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Active emergency incidents transmitted by registered Carmen clients
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg">
                {activeReports.length} Active
              </span>
            </div>

            {activeReports.length === 0 ? (
              <div className="bg-white border border-emerald-200 rounded-2xl p-8 text-center space-y-2 shadow-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900">All Clear in Carmen</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No pending emergency reports. All previous reports have been resolved or are logged in History.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeReports.map((incident) => (
                  <div
                    key={incident.id}
                    className="bg-white rounded-2xl border-2 border-emerald-200 overflow-hidden shadow-sm"
                  >
                    <div
                      className={`px-3 py-2 flex items-center justify-between text-white text-xs font-bold ${
                        incident.category === 'Structural Fire'
                          ? 'bg-red-700'
                          : incident.category === 'Grass Fire'
                          ? 'bg-amber-700'
                          : incident.category === 'Vehicular Accident'
                          ? 'bg-blue-700'
                          : 'bg-rose-700'
                      }`}
                    >
                      <span className="font-mono">{incident.incidentNumber} · {incident.category}</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-mono uppercase">
                        {incident.status}
                      </span>
                    </div>

                    <div className="p-3.5 space-y-3">
                      <div className="flex gap-3">
                        <img
                          src={incident.photoDataUrl}
                          alt={incident.category}
                          className="w-24 h-24 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0 cursor-pointer"
                          onClick={() => setSelectedIncident(incident)}
                        />
                        <div className="space-y-1 text-xs min-w-0">
                          <div className="font-bold text-slate-900 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span className="truncate">Brgy. {incident.incidentLocation.barangay}</span>
                            {incident.incidentLocation.aiIdentified && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded shrink-0">
                                AI Address
                              </span>
                            )}
                          </div>
                          {incident.incidentLocation.completeAddress ? (
                            <p className="text-slate-800 font-medium text-[11px] line-clamp-2">
                              {incident.incidentLocation.completeAddress}
                            </p>
                          ) : (
                            <p className="text-slate-600 text-[11px] truncate">
                              {incident.incidentLocation.landmarkOrAddress}
                            </p>
                          )}
                          {incident.incidentLocation.landmark && (
                            <p className="text-emerald-800 font-bold text-[10px] truncate">
                              📍 Landmark: {incident.incidentLocation.landmark}
                            </p>
                          )}
                          <div className="font-bold text-slate-800 flex items-center gap-1 pt-0.5">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="truncate">{incident.clientFullName}</span>
                          </div>
                          <a
                            href={`tel:${incident.clientPhoneNumber}`}
                            className="text-emerald-700 font-mono text-[11px] flex items-center gap-1 font-bold hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{incident.clientPhoneNumber}</span>
                          </a>
                          <div className="text-[10px] text-slate-400 font-mono pt-0.5">
                            {new Date(incident.dateTime).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Status Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedIncident(incident)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Inspect Full
                        </button>

                        <div className="flex items-center gap-1.5">
                          {incident.status === 'Pending' && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateIncidentStatus(
                                  incident.id,
                                  'Responders Dispatched',
                                  'MDRRMO Quick Response dispatched.'
                                )
                              }
                              className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                            >
                              Dispatch
                            </button>
                          )}
                          {incident.status === 'Responders Dispatched' && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateIncidentStatus(
                                  incident.id,
                                  'On Scene',
                                  'Responders on scene.'
                                )
                              }
                              className="px-2.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                            >
                              On Scene
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateIncidentStatus(
                                incident.id,
                                'Resolved',
                                'Incident controlled and mitigated.'
                              )
                            }
                            className="px-2.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Resolve
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* DEDICATED TAB 2: REALTIME MAP OF CARMEN, SURIGAO DEL SUR */}
        {/* ========================================================================= */}
        {activeTab === 'realtime_map' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('all_features')}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  title="Back to All Features"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-xs sm:text-sm font-black text-emerald-950 uppercase tracking-tight">
                    2. Realtime Map of Carmen, Surigao del Sur, Mindanao Philippines
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    Geospatial tracking across all Carmen barangays
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border-2 border-emerald-600/30 shadow-sm">
              <CarmenMap
                incidents={incidents}
                selectedIncidentId={selectedIncident?.id}
                onSelectIncident={(inc) => setSelectedIncident(inc)}
                heightClass="h-[440px] sm:h-[550px]"
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DEDICATED TAB 3: HISTORY OF THE INCIDENT REPORTED */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('all_features')}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  title="Back to All Features"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-emerald-950 uppercase tracking-tight">
                    3. History of the incident reported
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    Full audit record of emergency incidents and siren logs
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                Total: {historyReports.length}
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-sm">
              {historyReports.map((inc) => (
                <div key={inc.id} className="p-3 sm:p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={inc.photoDataUrl}
                        alt={inc.category}
                        className="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0 cursor-pointer"
                        onClick={() => setSelectedIncident(inc)}
                      />
                      <div className="min-w-0 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 truncate">{inc.incidentNumber}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-emerald-800 font-bold truncate">{inc.category}</span>
                        </div>
                        <p className="text-slate-600 text-[11px] truncate mt-0.5">
                          Brgy. {inc.incidentLocation.barangay} · {inc.clientFullName} ({inc.clientPhoneNumber})
                        </p>
                        <p className="text-slate-400 text-[10px] font-mono">
                          {new Date(inc.dateTime).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedIncident(inc)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer shrink-0"
                    >
                      Details
                    </button>
                  </div>

                  {inc.alarmLog && (
                    <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200 font-mono space-y-0.5">
                      <div>Alarm: {new Date(inc.alarmLog.sirenActivationTime).toLocaleTimeString()}</div>
                      {inc.alarmLog.silencedByAdmin && (
                        <div className="text-emerald-800 font-bold">
                          Silenced By: {inc.alarmLog.silencedByAdmin} at{' '}
                          {inc.alarmLog.sirenStopTime ? new Date(inc.alarmLog.sirenStopTime).toLocaleTimeString() : 'N/A'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DEDICATED TAB 4: APP DETAILS */}
        {/* ========================================================================= */}
        {activeTab === 'app_details' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('all_features')}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  title="Back to All Features"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-emerald-950 uppercase tracking-tight">
                    4. App details
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    MDRRMO Carmen public hotline & emergency configuration
                  </p>
                </div>
              </div>
            </div>

            {saveSuccess && (
              <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-700" />
                <span>App Details saved and synchronized across all clients & admins!</span>
              </div>
            )}

            <form onSubmit={handleSaveAppDetails} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Application Name
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  required
                  className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  MDRRMO Contact Number (24/7 Hotline)
                </label>
                <input
                  type="text"
                  value={mdrrmoContactNumber}
                  onChange={(e) => setMdrrmoContactNumber(e.target.value)}
                  required
                  className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Office Details & Location
                </label>
                <textarea
                  value={officeDetails}
                  onChange={(e) => setOfficeDetails(e.target.value)}
                  rows={2}
                  required
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Emergency Instructions for Citizens
                </label>
                <textarea
                  value={emergencyInstructions}
                  onChange={(e) => setEmergencyInstructions(e.target.value)}
                  rows={3}
                  required
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save App Details</span>
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DEDICATED TAB 5: TURN OFF SIREN */}
        {/* ========================================================================= */}
        {activeTab === 'turn_off_siren' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('all_features')}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  title="Back to All Features"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-emerald-950 uppercase tracking-tight">
                    5. turn off Siren
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    Silence active municipal alarms and log administrator acknowledgement
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 sm:p-6 text-center space-y-4 shadow-sm">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                  isSirenActive
                    ? 'bg-red-100 text-red-600 animate-bounce ring-8 ring-red-50'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {isSirenActive ? <Volume2 className="w-8 h-8" /> : <VolumeX className="w-8 h-8" />}
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {isSirenActive ? 'EMERGENCY SIREN IS CURRENTLY ACTIVE' : 'Emergency Siren is Inactive'}
                </h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto mt-1">
                  {isSirenActive
                    ? 'Turning off the siren will silence the alarm on all Carmen Admin devices.'
                    : 'No active alarms. The siren automatically activates upon new citizen reports.'}
                </p>
              </div>

              {isSirenActive && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 max-w-sm mx-auto text-left space-y-0.5">
                  <div className="font-bold">Incident: {sirenTriggerIncident?.incidentNumber}</div>
                  <div>Category: {sirenTriggerIncident?.category}</div>
                  <div>Barangay: {sirenTriggerIncident?.incidentLocation.barangay}</div>
                </div>
              )}

              <div className="pt-1 flex flex-col items-center gap-3">
                {isSirenActive ? (
                  <button
                    type="button"
                    onClick={handleStopSiren}
                    className="w-full sm:w-auto px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-black shadow-lg uppercase tracking-wider cursor-pointer transform active:scale-98 transition-all flex items-center justify-center gap-2 mx-auto"
                  >
                    <VolumeX className="w-4 h-4" />
                    <span>turn off Siren now</span>
                  </button>
                ) : (
                  <div className="w-full max-w-md mx-auto space-y-3">
                    {isTestAlarmActive && (
                      <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-bold flex items-center justify-center gap-2 animate-pulse">
                        <Volume2 className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>Test emergency alarm is sounding now!</span>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleStartTestAlarm}
                        className="w-full sm:w-auto px-5 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Volume2 className="w-4 h-4 text-amber-700" />
                        <span>Test Alarm Sound</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleTurnOffTestAlarm}
                        className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-xs uppercase tracking-wider transition-all ${
                          isTestAlarmActive
                            ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse ring-4 ring-red-200'
                            : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                        }`}
                      >
                        <VolumeX className="w-4 h-4" />
                        <span>turn off test alarm</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-[10px] text-slate-400 font-mono">
                Admin: {currentAdmin.username} ({currentAdmin.fullName})
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* INCIDENT DETAIL MODAL (MOBILE FRIENDLY) */}
      {/* ======================================================== */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-emerald-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-emerald-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="font-mono text-emerald-300">{selectedIncident.incidentNumber}</span>
                <span>·</span>
                <span>{selectedIncident.category}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="text-emerald-200 hover:text-white p-1 rounded font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-xs text-slate-700">
              <div className="rounded-xl overflow-hidden bg-slate-100 border border-slate-200 aspect-video max-h-56">
                <img
                  src={selectedIncident.photoDataUrl}
                  alt={selectedIncident.category}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Barangay Jurisdiction
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      Brgy. {selectedIncident.incidentLocation.barangay}, Carmen
                    </span>
                  </div>
                  {selectedIncident.incidentLocation.aiIdentified && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span>✨ AI Identified</span>
                    </span>
                  )}
                </div>

                {selectedIncident.incidentLocation.completeAddress && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Complete Scene Address
                    </span>
                    <span className="font-semibold text-slate-800 text-xs block">
                      {selectedIncident.incidentLocation.completeAddress}
                    </span>
                  </div>
                )}

                {selectedIncident.incidentLocation.landmark && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Prominent Landmark
                    </span>
                    <span className="font-bold text-emerald-800 text-xs flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>{selectedIncident.incidentLocation.landmark}</span>
                    </span>
                  </div>
                )}

                {selectedIncident.incidentLocation.aiSceneSummary && (
                  <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-950">
                    <span className="font-bold block text-[10px] text-emerald-800 uppercase tracking-wider">
                      AI Scene Assessment:
                    </span>
                    {selectedIncident.incidentLocation.aiSceneSummary}
                  </div>
                )}

                <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-slate-600 border-t border-slate-200">
                  <span>GPS Fix:</span>
                  <span className="font-bold text-slate-900">
                    {selectedIncident.gpsCoordinates.latitude.toFixed(5)}, {selectedIncident.gpsCoordinates.longitude.toFixed(5)} (±{selectedIncident.gpsCoordinates.accuracyMeters || 8}m)
                  </span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 space-y-0.5">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Reporting Client Information
                </span>
                <div className="font-bold text-slate-900">{selectedIncident.clientFullName}</div>
                <div className="font-mono text-emerald-800 font-bold">{selectedIncident.clientPhoneNumber}</div>
                <div className="text-slate-500 text-[11px]">Resident of Brgy. {selectedIncident.clientBarangay}</div>
              </div>

              {/* Status Update Options */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-800 block text-xs">Update Status:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(['Pending', 'Responders Dispatched', 'On Scene', 'Resolved'] as IncidentStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          onUpdateIncidentStatus(
                            selectedIncident.id,
                            st,
                            `Status updated to ${st} by ${currentAdmin.username}`
                          );
                          setSelectedIncident(null);
                        }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer truncate ${
                          selectedIncident.status === st
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
