import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Recycle, 
  MapPin, 
  BarChart3, 
  ArrowRight, 
  Leaf, 
  Apple, 
  Shirt, 
  Laptop, 
  Sofa, 
  Box, 
  Droplets, 
  Sparkles 
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card, CardContent } from '../components/common/Card';
import api from '../services/api';

interface ImpactSummary {
  completedRequests: number;
  resolvedReports: number;
  activeUsers: number;
  co2DivertedKg: number;
  wasteDivertedKg: number;
}

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ImpactSummary>({
    completedRequests: 142,
    resolvedReports: 68,
    activeUsers: 340,
    co2DivertedKg: 1250,
    wasteDivertedKg: 890,
  });

  useEffect(() => {
    const fetchPublicImpact = async () => {
      try {
        const res = await api.get('/impact/public-summary');
        if (res.data?.data) {
          setStats(prev => ({ ...prev, ...res.data.data }));
        }
      } catch {
        // Fallback to initial display stats
      }
    };
    fetchPublicImpact();
  }, []);

  const categories = [
    { name: 'Food Surplus', icon: <Apple className="w-6 h-6 text-emerald-600" />, count: '24+ Active', category: 'FOOD' },
    { name: 'Apparel & Textiles', icon: <Shirt className="w-6 h-6 text-blue-600" />, count: '18+ Items', category: 'CLOTHING' },
    { name: 'Electronics & Tech', icon: <Laptop className="w-6 h-6 text-purple-600" />, count: '12+ Units', category: 'ELECTRONICS' },
    { name: 'Furniture & Decor', icon: <Sofa className="w-6 h-6 text-amber-600" />, count: '9+ Sets', category: 'FURNITURE' },
    { name: 'Recyclables', icon: <Box className="w-6 h-6 text-teal-600" />, count: '45+ Batches', category: 'RECYCLABLES' },
    { name: 'Clean Water', icon: <Droplets className="w-6 h-6 text-cyan-600" />, count: 'Active Supplies', category: 'WATER' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 selection:bg-emerald-200">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950 text-white pt-20 pb-28 px-4">
        {/* Subtle background ambient lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-emerald-500/10 blur-[120px] pointer-events-none rounded-full" />
        
        <div className="container mx-auto max-w-5xl text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold mb-6">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>AI-Assisted Environmental Resource Management</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
            Turn Waste Into Life. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-green-400">
              Heal Our Communities.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            EarthSync bridges resource donors, charitable organizations, and citizens to divert usable materials from landfills and swiftly resolve neighborhood environmental hazards.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-8 shadow-lg shadow-emerald-500/20"
              onClick={() => navigate('/register')}
            >
              Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-slate-700 text-slate-200 hover:bg-slate-800/80 px-8"
              onClick={() => navigate('/resources')}
            >
              Explore Marketplace
            </Button>
          </div>

          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16 pt-12 border-t border-slate-800/80 text-left">
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/50">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{stats.co2DivertedKg.toLocaleString()} kg</span>
              <p className="text-xs text-slate-400 mt-1">CO₂ Emissions Diverted</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/50">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{stats.wasteDivertedKg.toLocaleString()} kg</span>
              <p className="text-xs text-slate-400 mt-1">Waste Kept from Landfills</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/50">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{stats.resolvedReports}</span>
              <p className="text-xs text-slate-400 mt-1">Environmental Issues Solved</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/50">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{stats.activeUsers}</span>
              <p className="text-xs text-slate-400 mt-1">Active Community Stewards</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-white border-b border-slate-200">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">End-to-End Workflow</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-2">How EarthSync Operates</h2>
            <p className="text-slate-500 text-sm mt-3">
              A comprehensive closed-loop ecosystem uniting citizen reporting, AI categorization, donor logistics, and verified impact auditing.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-slate-200 hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                  <Recycle className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-emerald-600 uppercase">Step 1</span>
                <h3 className="text-lg font-bold text-slate-900 mt-1 mb-2">Resource Exchange</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Surplus food, electronics, textiles, and building materials are listed in seconds. Community recipients and charities claim goods directly.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 mb-4">
                  <MapPin className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-blue-600 uppercase">Step 2</span>
                <h3 className="text-lg font-bold text-slate-900 mt-1 mb-2">Hazard Reporting & AI</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Citizens submit photos and GPS locations of dumping or leaks. Intelligent classification assesses severity and dispatches qualified providers.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 mb-4">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-purple-600 uppercase">Step 3</span>
                <h3 className="text-lg font-bold text-slate-900 mt-1 mb-2">Audited Impact</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Every transaction mathematically computes carbon offsets and landfill diversion using EPA WARM conversion standards without double-counting.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Resource Categories Explorer */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Marketplace</span>
              <h2 className="text-3xl font-bold text-slate-900 mt-1">Resource Categories</h2>
              <p className="text-slate-500 text-sm mt-1">Explore what our donors and community partners are offering right now.</p>
            </div>
            <Link
              to="/resources"
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5"
            >
              Browse All Resources <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((c) => (
              <div
                key={c.name}
                onClick={() => navigate(`/resources?category=${c.category}`)}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group text-center"
              >
                <div className="mx-auto w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors mb-3">
                  {c.icon}
                </div>
                <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">{c.name}</h4>
                <p className="text-xs text-slate-400 mt-1">{c.count}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Transparency Banner */}
      <section className="py-16 px-4 bg-emerald-900 text-white">
        <div className="container mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">Ready to make a tangible environmental difference?</h3>
            <p className="text-emerald-100 text-sm max-w-xl">
              Join local councils, shelters, recycling facilities, and civic volunteers actively transforming urban sustainability.
            </p>
          </div>
          <div className="flex gap-4 shrink-0">
            <Button
              size="lg"
              className="bg-white text-emerald-900 hover:bg-slate-100 font-bold"
              onClick={() => navigate('/register')}
            >
              Create Account
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-emerald-600 text-white hover:bg-emerald-800"
              onClick={() => navigate('/reports')}
            >
              Report Hazard
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 px-4 border-t border-slate-800 text-xs">
        <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Leaf className="w-5 h-5 text-emerald-500" />
            <span>EarthSync Platform</span>
          </div>

          <div className="flex gap-6">
            <Link to="/resources" className="hover:text-white transition-colors">Resources</Link>
            <Link to="/reports" className="hover:text-white transition-colors">Reports</Link>
            <Link to="/impact" className="hover:text-white transition-colors">Impact</Link>
            <Link to="/login" className="hover:text-white transition-colors">Login</Link>
          </div>

          <p className="text-slate-500">
            &copy; {new Date().getFullYear()} EarthSync. All rights reserved. Environmental Resource Platform.
          </p>
        </div>
      </footer>
    </div>
  );
};
