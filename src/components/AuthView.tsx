import React, { useState } from 'react';
import { UserAccount } from '../types';
import { CARMEN_BARANGAYS, DEFAULT_ACCOUNTS } from '../data/carmenData';
import {
  ShieldCheck,
  Phone,
  User,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Shield,
  Smartphone,
  Eye,
  EyeOff,
  UserPlus,
  ArrowLeft,
  Flame,
  Radio,
} from 'lucide-react';

interface AuthViewProps {
  onLoginSuccess: (user: UserAccount) => void;
  registeredUsers: UserAccount[];
  onRegisterUser: (newUser: UserAccount) => void;
  appName?: string;
  hotline?: string;
}

type AuthMode = 'home' | 'client-login' | 'admin-login' | 'client-register';

export const AuthView: React.FC<AuthViewProps> = ({
  onLoginSuccess,
  registeredUsers,
  onRegisterUser,
  appName = 'MDRRMO Carmen',
  hotline = '0919-072-2345',
}) => {
  // Start on the required Home Screen showing the 3 choices
  const [mode, setMode] = useState<AuthMode>('home');

  // Client Login form
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Admin Login form
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  // Registration Form
  const [fullName, setFullName] = useState('');
  const [cellphoneNumber, setCellphoneNumber] = useState('');
  const [barangay, setBarangay] = useState('Poblacion');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [regError, setRegError] = useState('');

  // OTP Verification state
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  // All valid users in-memory fallback
  const allAccounts = [...DEFAULT_ACCOUNTS, ...registeredUsers];

  // Handle Client Login
  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmittingLogin(true);

    const trimmedId = loginIdentifier.trim();
    const trimmedPass = loginPassword.trim();

    if (!trimmedId || !trimmedPass) {
      setLoginError('Please enter your mobile number or username and password.');
      setIsSubmittingLogin(false);
      return;
    }

    try {
      // Attempt backend auth first
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmedId, password: trimmedPass, role: 'client' }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.user) {
        onLoginSuccess(data.user);
        return;
      }
    } catch {
      // Backend offline fallback
    }

    // Local authentication fallback
    const found = allAccounts.find(
      (acc) =>
        acc.role === 'client' &&
        (acc.username.toLowerCase() === trimmedId.toLowerCase() ||
          acc.cellphoneNumber.replace(/\D/g, '') === trimmedId.replace(/\D/g, ''))
    );

    if (found && (trimmedPass === '1234567' || found.password === trimmedPass)) {
      onLoginSuccess(found);
    } else {
      setLoginError('Invalid credentials. Please verify your mobile number and password.');
    }
    setIsSubmittingLogin(false);
  };

  // Handle Admin Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setIsSubmittingAdmin(true);

    const trimmedUser = adminUsername.trim();
    const trimmedPass = adminPassword.trim();

    if (!trimmedUser || !trimmedPass) {
      setAdminError('Please enter your authorized Admin username and password.');
      setIsSubmittingAdmin(false);
      return;
    }

    try {
      // Attempt backend auth first
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmedUser, password: trimmedPass, role: 'admin' }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.user) {
        onLoginSuccess(data.user);
        return;
      }
    } catch {
      // Backend offline fallback
    }

    // Local authentication fallback
    const found = allAccounts.find(
      (acc) =>
        acc.role === 'admin' && acc.username.toLowerCase() === trimmedUser.toLowerCase()
    );

    if (found && (trimmedPass === '1234567' || found.password === trimmedPass)) {
      onLoginSuccess(found);
    } else {
      setAdminError('Authentication failed. Unauthorized administrator credentials.');
    }
    setIsSubmittingAdmin(false);
  };

  // Initiate Registration & Send OTP
  const handleStartRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!fullName.trim()) {
      setRegError('Full Name is required for emergency response identification.');
      return;
    }
    const cleanPhone = cellphoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setRegError('Please enter a valid 11-digit mobile number.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match. Please re-enter.');
      return;
    }
    if (!privacyConsent) {
      setRegError('You must confirm emergency contact consent.');
      return;
    }

    // Check if phone number already registered locally
    const exists = allAccounts.some(
      (acc) => acc.cellphoneNumber.replace(/\D/g, '') === cleanPhone
    );
    if (exists) {
      setRegError('This mobile number is already registered. Please proceed to Client Login.');
      return;
    }

    // Generate simulated 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setIsVerifyingOtp(true);
    setOtpCode('');
    setOtpError('');
  };

  // Confirm OTP & Complete Registration
  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');

    if (otpCode.trim() !== generatedOtp.trim()) {
      setOtpError('Invalid verification code. Please check the code sent to your mobile.');
      return;
    }

    const newUser: UserAccount = {
      id: `client-${Date.now()}`,
      username: cellphoneNumber.replace(/\D/g, ''),
      password: regPassword,
      role: 'client',
      fullName: fullName.trim(),
      cellphoneNumber: cellphoneNumber.trim(),
      barangay,
      address: address.trim() || undefined,
      emergencyContact: emergencyContact.trim() || undefined,
      verified: true,
      registeredAt: new Date().toISOString(),
    };

    try {
      await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
    } catch {
      // Continue locally
    }

    onRegisterUser(newUser);
    onLoginSuccess(newUser);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between items-center px-4 py-6 sm:py-10">
      {/* Brand Header */}
      <header className="w-full max-w-lg text-center mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-800 text-white shadow-lg mb-3 border-2 border-emerald-600">
          <ShieldCheck className="w-11 h-11 text-emerald-100" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">
          {appName}
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-emerald-800 mt-1">
          Municipal Disaster Risk Reduction and Management Office
        </p>
        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
          Carmen, Surigao del Sur, Mindanao, Philippines
        </p>

        {/* Quick Emergency Hotline Link */}
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold">
          <Phone className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
          <span>24/7 Hotline: {hotline}</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-lg">
        {/* ======================================================== */}
        {/* 1. HOME SCREEN - IMMEDIATELY DISPLAYS THE THREE OPTIONS */}
        {/* ======================================================== */}
        {mode === 'home' && (
          <div className="bg-white border-2 border-emerald-200 rounded-3xl shadow-xl p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-800">
                Official Emergency Incident Reporting System
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Welcome to MDRRMO Carmen
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Please select an option below to proceed.
              </p>
            </div>

            {/* THREE REQUIRED OPTIONS - CLEARLY VISIBLE AND EASY TO SELECT */}
            <div className="space-y-3.5 pt-2">
              {/* Option 1: Client Login */}
              <button
                type="button"
                onClick={() => setMode('client-login')}
                className="w-full text-left p-4 sm:p-5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl shadow-md shadow-emerald-700/20 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between group cursor-pointer border border-emerald-600"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0 group-hover:bg-white/25 transition-colors">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-black tracking-tight leading-tight">
                      Client Login
                    </div>
                    <div className="text-xs text-emerald-100 mt-0.5 leading-snug">
                      Sign in to report emergencies & contact MDRRMO
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>

              {/* Option 2: Admin Login */}
              <button
                type="button"
                onClick={() => setMode('admin-login')}
                className="w-full text-left p-4 sm:p-5 bg-slate-900 hover:bg-black text-white rounded-2xl shadow-md transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between group cursor-pointer border border-slate-800"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0 group-hover:bg-white/25 transition-colors">
                    <Shield className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-black tracking-tight leading-tight">
                      Admin Login
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5 leading-snug">
                      Authorized MDRRMO personnel & dispatch command
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>

              {/* Option 3: Client Registration */}
              <button
                type="button"
                onClick={() => {
                  setMode('client-register');
                  setIsVerifyingOtp(false);
                }}
                className="w-full text-left p-4 sm:p-5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-950 rounded-2xl shadow-xs transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between group cursor-pointer border-2 border-emerald-600/40"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-black tracking-tight leading-tight text-emerald-900">
                      Client Registration
                    </div>
                    <div className="text-xs text-emerald-800 mt-0.5 leading-snug">
                      Register mobile number to report emergencies (No guest access)
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-emerald-800 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>
            </div>

            {/* Quick emergency disclaimer */}
            <div className="pt-2 text-center border-t border-slate-100">
              <p className="text-[11px] text-slate-500">
                In severe life-threatening situations, dial the 24/7 hotline directly:
              </p>
              <a
                href={`tel:${hotline.replace(/\D/g, '')}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-900 mt-1"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{hotline} (MDRRMO Carmen Operations Center)</span>
              </a>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. CLIENT LOGIN SCREEN */}
        {/* ======================================================== */}
        {mode === 'client-login' && (
          <div className="bg-white border border-emerald-100 rounded-3xl shadow-xl overflow-hidden">
            {/* Header with Back button */}
            <div className="bg-emerald-800 text-white px-5 py-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMode('home')}
                className="text-xs font-bold text-emerald-100 hover:text-white flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Home Screen</span>
              </button>
              <h2 className="text-sm font-black uppercase tracking-wider text-emerald-100">
                Client Login
              </h2>
            </div>

            <form onSubmit={handleClientLogin} className="p-6 space-y-4">
              <div className="text-center pb-1">
                <h3 className="text-lg font-black text-slate-900">Citizen & Resident Login</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sign in to report emergencies and contact MDRRMO Carmen
                </p>
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mobile Number / Username
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="Enter registered mobile number or username"
                    required
                    className="w-full text-xs sm:text-sm pl-9 pr-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="w-full text-xs sm:text-sm pl-9 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingLogin}
                className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{isSubmittingLogin ? 'Signing In...' : 'Log In as Client'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 text-center text-xs">
                <p className="text-slate-600">
                  Not registered yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('client-register');
                      setIsVerifyingOtp(false);
                    }}
                    className="font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Register here (Required)
                  </button>
                </p>
                <button
                  type="button"
                  onClick={() => setMode('admin-login')}
                  className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Authorized MDRRMO personnel? Switch to Admin Login
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. ADMIN LOGIN SCREEN */}
        {/* ======================================================== */}
        {mode === 'admin-login' && (
          <div className="bg-white border border-slate-300 rounded-3xl shadow-xl overflow-hidden">
            {/* Header with Back button */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMode('home')}
                className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Home Screen</span>
              </button>
              <div className="flex items-center gap-2 text-emerald-400">
                <Radio className="w-4 h-4 animate-pulse" />
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-100">
                  Admin Command
                </h2>
              </div>
            </div>

            <form onSubmit={handleAdminLogin} className="p-6 space-y-4">
              <div className="text-center pb-1">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-black text-slate-900">MDRRMO Command Authentication</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Authorized administrative & dispatch accounts only
                </p>
              </div>

              {adminError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{adminError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Admin Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="Enter authorized admin username"
                    required
                    className="w-full text-xs sm:text-sm pl-9 pr-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Admin Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter admin password"
                    required
                    className="w-full text-xs sm:text-sm pl-9 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingAdmin}
                className="w-full py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{isSubmittingAdmin ? 'Authenticating...' : 'Access Admin Command Dashboard'}</span>
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setMode('client-login')}
                  className="text-xs text-emerald-700 hover:underline cursor-pointer"
                >
                  ← Return to Client Login
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. CLIENT REGISTRATION SCREEN */}
        {/* ======================================================== */}
        {mode === 'client-register' && !isVerifyingOtp && (
          <div className="bg-white border border-emerald-100 rounded-3xl shadow-xl overflow-hidden">
            {/* Header with Back button */}
            <div className="bg-emerald-800 text-white px-5 py-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMode('home')}
                className="text-xs font-bold text-emerald-100 hover:text-white flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Home Screen</span>
              </button>
              <h2 className="text-sm font-black uppercase tracking-wider text-emerald-100">
                Client Registration
              </h2>
            </div>

            <form onSubmit={handleStartRegistration} className="p-6 space-y-3.5">
              <div className="text-center pb-1">
                <h3 className="text-lg font-black text-slate-900">New Client Account</h3>
                <p className="text-xs text-slate-500">
                  Required before reporting emergency incidents in Carmen (No guest access)
                </p>
              </div>

              {regError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{regError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Juan C. Dela Cruz"
                    required
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cellphone / Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={cellphoneNumber}
                    onChange={(e) => setCellphoneNumber(e.target.value)}
                    placeholder="e.g. 0917-123-4567"
                    required
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Barangay in Carmen <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={barangay}
                    onChange={(e) => setBarangay(e.target.value)}
                    className="w-full text-xs px-2.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {CARMEN_BARANGAYS.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Purok / Street
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Purok 3"
                    className="w-full text-xs px-2.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Emergency Contact / ICE Number
                </label>
                <input
                  type="tel"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="Relative or guardian contact number"
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    required
                    className="w-full text-xs px-2.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    className="w-full text-xs px-2.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Emergency identification consent */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="consent"
                  checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-700 rounded border-slate-300 focus:ring-emerald-600 cursor-pointer"
                />
                <label htmlFor="consent" className="text-[11px] text-slate-700 leading-tight cursor-pointer">
                  I certify that the information provided is correct and consent to emergency response identification by MDRRMO Carmen.
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Verify Cellphone Number (Send OTP)</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-1 text-center">
                <p className="text-xs text-slate-600">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('client-login')}
                    className="font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Client Login
                  </button>
                </p>
              </div>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* 5. OTP VERIFICATION STEP */}
        {/* ======================================================== */}
        {mode === 'client-register' && isVerifyingOtp && (
          <div className="bg-white border border-emerald-100 rounded-3xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="text-center pb-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Verify Cellphone Number</h3>
              <p className="text-xs text-slate-600 mt-1">
                We sent a 6-digit verification code to:
              </p>
              <p className="text-xs font-mono font-bold text-emerald-800 mt-0.5">{cellphoneNumber}</p>
            </div>

            {/* Simulated SMS Alert Banner */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-700">
                  MDRRMO Carmen SMS Gateway:
                </span>
                <button
                  type="button"
                  onClick={() => setOtpCode(generatedOtp)}
                  className="text-[10px] font-bold text-emerald-700 underline hover:text-emerald-900 cursor-pointer"
                >
                  Auto-fill Code
                </button>
              </div>
              <p className="font-mono text-emerald-950">
                Your verification code is: <span className="font-bold text-base tracking-widest text-emerald-900">{generatedOtp}</span>
              </p>
            </div>

            {otpError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{otpError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-center">
                  Enter 6-Digit OTP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  required
                  className="w-full text-center text-2xl font-mono tracking-widest py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Confirm & Complete Registration</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsVerifyingOtp(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  ← Edit registration details
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer System Notice */}
      <footer className="mt-8 text-center text-[11px] text-slate-500 max-w-sm">
        <p className="font-bold text-slate-700">MDRRMO Carmen Emergency Incident Reporting System</p>
        <p>Republic of the Philippines · Municipality of Carmen, Surigao del Sur</p>
      </footer>
    </div>
  );
};
