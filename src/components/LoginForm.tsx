import React, { useState } from 'react';
import { Lock, Mail, Building2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { AdminUser } from '../types';

interface LoginFormProps {
  onLoginSuccess: (user: AdminUser, token: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('wallpenkorea@gmail.com');
  const [password, setPassword] = useState('admin1234');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
        return;
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMsg('서버와 통신 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('wallpenkorea@gmail.com');
    setPassword('admin1234');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Logo & Title */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          월펜 현장 견적 관리
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          벽면프린트 시공 엑셀 견적서 & 현장 공정 통합 관리 시스템
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200/80 sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {errorMsg && (
              <div
                id="login-error-alert"
                className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-3 text-rose-800 text-sm animate-shake"
              >
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-snug">{errorMsg}</div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                관리자 이메일
              </label>
              <div className="mt-1.5 relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@wallpen.co.kr"
                  className="block w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                  비밀번호
                </label>
              </div>
              <div className="mt-1.5 relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
                />
              </div>
            </div>

            <div>
              <button
                id="login-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 active:scale-[0.99] transition disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    로그인 중...
                  </>
                ) : (
                  <>
                    관리자 로그인
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Assist */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>체험용 기본 계정: <strong>admin1234</strong></span>
              </div>
              <button
                type="button"
                onClick={handleFillDemo}
                className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2"
              >
                자동 입력
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          © 2026 WallPen Korea. All rights reserved.
        </div>
      </div>
    </div>
  );
};
