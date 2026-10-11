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
import { Leaf, User, Gift, HeartHandshake, Truck, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';
import type { Role } from '../../types';

const registerSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  role: z.enum(['CITIZEN', 'DONOR', 'RECIPIENT', 'PROVIDER']),
});

type RegisterForm = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const { login } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'CITIZEN',
      name: '',
      email: '',
      password: '',
      phone: '',
    }
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterForm) => {
    try {
      setErrorMsg('');
      const response = await api.post('/auth/register', data);
      login(response.data.token, response.data.user);
      success('Account created successfully! Welcome to EarthSync.');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to create account.';
      setErrorMsg(msg);
      showError('Registration Failed', msg);
    }
  };

  const roleOptions: { role: Role; title: string; desc: string; icon: React.ReactNode }[] = [
    {
      role: 'CITIZEN',
      title: 'Citizen',
      desc: 'Report environmental hazards and explore local sustainability initiatives.',
      icon: <User className="w-5 h-5 text-emerald-600" />
    },
    {
      role: 'DONOR',
      title: 'Resource Donor',
      desc: 'Donate surplus food, equipment, textiles, or materials to community programs.',
      icon: <Gift className="w-5 h-5 text-emerald-600" />
    },
    {
      role: 'RECIPIENT',
      title: 'Resource Recipient',
      desc: 'Charities, shelters, or schools requesting and receiving essential resources.',
      icon: <HeartHandshake className="w-5 h-5 text-blue-600" />
    },
    {
      role: 'PROVIDER',
      title: 'Service Provider',
      desc: 'Municipal contractors and green teams handling cleanup and incident resolution.',
      icon: <Truck className="w-5 h-5 text-amber-600" />
    },
  ];

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-slate-50/50">
      <Card className="w-full max-w-xl shadow-lg border-slate-200">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-emerald-100 text-emerald-700 w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
            <Leaf className="h-8 w-8 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Create your EarthSync Account</CardTitle>
          <p className="text-sm text-slate-500 mt-1">Join the community driving actionable ecological sustainability</p>
        </CardHeader>

        <CardContent className="pt-4">
          {errorMsg && (
            <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name or Organization"
                placeholder="Jane Doe"
                {...register('name')}
                error={errors.name?.message}
              />

              <Input
                label="Email address"
                type="email"
                placeholder="you@domain.org"
                {...register('email')}
                error={errors.email?.message}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  {...register('password')}
                  error={errors.password?.message}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <Input
                label="Phone (optional)"
                placeholder="+1 (555) 000-0000"
                {...register('phone')}
                error={errors.phone?.message}
              />
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Select your account role:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {roleOptions.map((opt) => (
                  <div
                    key={opt.role}
                    onClick={() => setValue('role', opt.role as any, { shouldValidate: true })}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      selectedRole === opt.role
                        ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {opt.icon}
                      <span className="font-semibold text-sm text-slate-900">{opt.title}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-snug">{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 mt-2"
              isLoading={isSubmitting}
            >
              Register & Continue
            </Button>

            <p className="text-center text-sm text-slate-600 mt-4">
              Already have an account?{' '}
              <Link to="/login" className="text-emerald-600 font-semibold hover:underline">
                Sign in here
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
