import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { Leaf, Eye, EyeOff, ShieldCheck, User, HeartHandshake, Truck, Gift } from 'lucide-react';
import api from '../../services/api';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    }
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setErrorMsg('');
      const response = await api.post('/auth/login', data);
      login(response.data.token, response.data.user);
      success(`Welcome back, ${response.data.user.name}!`);
      if (response.data.user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Login failed. Please check your credentials.';
      setErrorMsg(msg);
      showError('Authentication Failed', msg);
    }
  };

  const fillDemoAccount = (email: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', 'password123', { shouldValidate: true });
    setErrorMsg('');
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSent(true);
    setTimeout(() => {
      setForgotSent(false);
      setForgotModalOpen(false);
      success('Password reset link sent to ' + forgotEmail);
    }, 1500);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-slate-50/50">
      <div className="w-full max-w-md space-y-6">
        <Card className="shadow-lg border-slate-200">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-emerald-100 text-emerald-700 w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
              <Leaf className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">Sign in to EarthSync</CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Enter your credentials or click a demo account below
            </p>
          </CardHeader>

          <CardContent className="pt-4">
            {errorMsg && (
              <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                error={errors.email?.message}
              />

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  error={errors.password?.message}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                  <input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => { setForgotEmail(''); setForgotModalOpen(true); }}
                  className="text-emerald-600 hover:text-emerald-700 font-semibold"
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5" isLoading={isSubmitting}>
                Sign In
              </Button>
            </form>

            {/* Quick Demo Fill Buttons */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center mb-3">
                Quick 1-Click Demo Accounts
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => fillDemoAccount('citizen@earthsync.local')}
                  className="p-2 border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-colors flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <strong className="block text-slate-800">Citizen</strong>
                    <span className="text-[10px] text-slate-500">Elena Rostova</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount('donor@earthsync.local')}
                  className="p-2 border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-colors flex items-center gap-2"
                >
                  <Gift className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <strong className="block text-slate-800">Donor</strong>
                    <span className="text-[10px] text-slate-500">Marcus Vance</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount('recipient@earthsync.local')}
                  className="p-2 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50/50 text-left transition-colors flex items-center gap-2"
                >
                  <HeartHandshake className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <strong className="block text-slate-800">Recipient</strong>
                    <span className="text-[10px] text-slate-500">Hope Center</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount('provider@earthsync.local')}
                  className="p-2 border border-slate-200 rounded-lg hover:border-amber-500 hover:bg-amber-50/50 text-left transition-colors flex items-center gap-2"
                >
                  <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <strong className="block text-slate-800">Provider</strong>
                    <span className="text-[10px] text-slate-500">EcoClean Services</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount('admin@earthsync.local')}
                  className="col-span-2 p-2 border border-red-200 rounded-lg hover:border-red-500 hover:bg-red-50/50 text-left transition-colors flex items-center justify-center gap-2 bg-red-50/30"
                >
                  <ShieldCheck className="w-4 h-4 text-red-600 shrink-0" />
                  <div className="text-center">
                    <strong className="text-slate-900 text-xs">Admin Account: </strong>
                    <span className="text-[11px] text-red-700 font-medium">admin@earthsync.local</span>
                  </div>
                </button>
              </div>
            </div>

            <p className="text-center text-sm text-slate-600 mt-6">
              Don't have an account yet?{' '}
              <Link to="/register" className="text-emerald-600 font-semibold hover:underline">
                Register here
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        title="Reset Your Password"
      >
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <p className="text-sm text-slate-600">
            Enter your registered email address and we'll send you instructions to reset your password.
          </p>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setForgotModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={forgotSent}>
              Send Reset Link
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
