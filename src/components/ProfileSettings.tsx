import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { auth } from '../firebase';
import { multiFactor, PhoneAuthProvider, PhoneMultiFactorGenerator, RecaptchaVerifier } from 'firebase/auth';
import { Shield, Smartphone, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ProfileSettings() {
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [step, setStep] = useState<'initial' | 'verify'>('initial');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isMfaEnabled, setIsMfaEnabled] = useState(false);

  useEffect(() => {
    if (user) {
      const enrolledFactors = multiFactor(user).enrolledFactors;
      setIsMfaEnabled(enrolledFactors.length > 0);
    }
    
    return () => {
      if ((window as any).recaptchaVerifierEnroll) {
        (window as any).recaptchaVerifierEnroll.clear();
        (window as any).recaptchaVerifierEnroll = null;
      }
    };
  }, [user]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !phoneNumber) return;

    setError('');
    setSuccess('');
    setEnrolling(true);

    try {
      if (!(window as any).recaptchaVerifierEnroll) {
        (window as any).recaptchaVerifierEnroll = new RecaptchaVerifier(auth, 'recaptcha-container-enroll', {
          size: 'invisible',
        });
      }

      const multiFactorSession = await multiFactor(user).getSession();
      const phoneInfoOptions = {
        phoneNumber,
        session: multiFactorSession
      };

      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const vId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, (window as any).recaptchaVerifierEnroll);
      
      setVerificationId(vId);
      setStep('verify');
      setSuccess('Verification code sent to your phone.');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for phone authentication. Please add it in the Firebase Console.');
      } else if (err.code === 'auth/billing-not-enabled') {
        setError('Multi-Factor Authentication requires the Firebase project to be on the Blaze (pay-as-you-go) plan with Identity Platform enabled.');
      } else {
        setError(err.message || 'Failed to send verification code.');
      }
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !verificationCode || !verificationId) return;

    setError('');
    setSuccess('');
    setEnrolling(true);

    try {
      const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
      
      await multiFactor(user).enroll(multiFactorAssertion, 'Personal Phone');
      
      setIsMfaEnabled(true);
      setStep('initial');
      setPhoneNumber('');
      setVerificationCode('');
      setSuccess('Two-Factor Authentication successfully enabled!');
    } catch (err: any) {
      setError(err.message || 'Invalid verification code.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleUnenroll = async () => {
    if (!user) return;
    
    if (!window.confirm('Are you sure you want to disable Two-Factor Authentication? This will reduce your account security.')) {
      return;
    }

    setError('');
    setSuccess('');
    setEnrolling(true);

    try {
      const enrolledFactors = multiFactor(user).enrolledFactors;
      if (enrolledFactors.length > 0) {
        await multiFactor(user).unenroll(enrolledFactors[0]);
        setIsMfaEnabled(false);
        setSuccess('Two-Factor Authentication has been disabled.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to disable 2FA.');
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
        <Shield className="text-indigo-600 dark:text-indigo-400" size={24} />
        <div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Security Settings</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your account security and authentication methods</p>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/30 rounded-lg flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30 rounded-lg flex items-start gap-3">
            <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{success}</p>
          </div>
        )}

        <div className="max-w-xl">
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Two-Factor Authentication (2FA)</h3>
          
          {isMfaEnabled ? (
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-2 rounded-full">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">2FA is currently enabled</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Your account is protected with an extra layer of security.</p>
                </div>
              </div>
              <button
                onClick={handleUnenroll}
                disabled={enrolling}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {enrolling ? 'Disabling...' : 'Disable 2FA'}
              </button>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Add an extra layer of security to your account. Once enabled, you'll be prompted to enter a verification code sent to your phone whenever you sign in.
              </p>

              {step === 'initial' ? (
                <form onSubmit={handleSendCode} className="space-y-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Smartphone className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        id="phone"
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1 234 567 8900"
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 dark:border-slate-600 rounded-lg py-2 border bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400"
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                      Include your country code (e.g., +1 for US).
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={enrolling || !phoneNumber}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {enrolling ? 'Sending...' : 'Send Verification Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div>
                    <label htmlFor="code" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Verification Code
                    </label>
                    <input
                      id="code"
                      type="text"
                      required
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="123456"
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 border bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={enrolling || !verificationCode}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {enrolling ? 'Verifying...' : 'Verify & Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('initial');
                        setVerificationCode('');
                        setError('');
                        setSuccess('');
                      }}
                      disabled={enrolling}
                      className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
          <div id="recaptcha-container-enroll"></div>
        </div>
      </div>
    </div>
  );
}
