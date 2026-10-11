import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { StatusBadge } from '../../components/common/StatusBadge';
import { User, Lock, Mail, Phone } from 'lucide-react';
import api from '../../services/api';

export const Profile: React.FC = () => {
  const { user, login, token } = useAuth();
  const { success, error: showError } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdatingProfile(true);
      const res = await api.put('/users/me/profile', { name, phone });
      if (token && res.data?.data) {
        login(token, res.data.data);
      }
      success('Profile updated successfully');
    } catch (err: any) {
      showError('Update Failed', err.response?.data?.error || 'Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showError('Validation Error', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      showError('Validation Error', 'Password must be at least 6 characters');
      return;
    }
    try {
      setUpdatingPassword(true);
      await api.put('/users/me/password', { currentPassword, newPassword });
      success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showError('Password Change Failed', err.response?.data?.error || 'Failed to change password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Account Profile & Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your personal credentials, contact details, and security.</p>
      </div>

      {/* Account Identity Card */}
      <Card className="border-slate-200">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-bold text-3xl shadow-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
                <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
                <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  {user?.role}
                </span>
                <StatusBadge status={user?.accountStatus || 'ACTIVE'} />
              </div>
              <p className="text-sm text-slate-500 flex items-center gap-1.5 justify-center sm:justify-start">
                <Mail size={14} />
                <span>{user?.email}</span>
              </p>
              {user?.phone && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5 justify-center sm:justify-start">
                  <Phone size={13} />
                  <span>{user.phone}</span>
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details Form */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User size={18} className="text-emerald-600" />
              <span>Personal Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <Input
                label="Full Name or Org"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Email (Read Only)"
                value={user?.email || ''}
                disabled
              />

              <Input
                label="Phone Number"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <Button
                type="submit"
                isLoading={updatingProfile}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password Form */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock size={18} className="text-emerald-600" />
              <span>Change Password</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />

              <Input
                label="New Password"
                type="password"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Min 6 characters"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <Button
                type="submit"
                isLoading={updatingPassword}
                variant="outline"
                className="w-full"
              >
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
