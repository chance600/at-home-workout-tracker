import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, TrendingUp, Calendar, Zap, ChevronRight, Dumbbell } from 'lucide-react';
import Layout from '../components/Layout';
import { StorageService } from '../services/storage';
import { WorkoutSession } from '../types';
import { EXERCISES } from '../constants';

// Recharts
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [totalReps, setTotalReps] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const data = StorageService.getSessions();
    setSessions(data);

    // Calculate basic stats
    let reps = 0;
    data.forEach(s => {
      s.exercises.forEach(e => {
        e.sets.forEach(set => reps += set.reps);
      });
    });
    setTotalReps(reps);
    setStreak(data.length > 0 ? 3 : 0); // Mock streak logic
  }, []);

  const chartData = sessions.slice(0, 7).map((s, i) => ({
    name: new Date(s.startTime).toLocaleDateString(undefined, { weekday: 'short' }),
    reps: s.exercises.reduce((acc, ex) => acc + ex.sets.reduce((sAcc, st) => sAcc + st.reps, 0), 0)
  })).reverse();

  return (
    <Layout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center mt-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Hello, <span className="text-aura-400">Athlete</span>
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Ready to crush your goals?</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
             <span className="font-bold text-aura-500">A</span>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Activity size={48} className="text-aura-500" />
            </div>
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Total Reps</p>
            <p className="text-2xl font-bold text-white mt-1">{totalReps}</p>
          </div>
          <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap size={48} className="text-amber-500" />
            </div>
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Streak</p>
            <p className="text-2xl font-bold text-white mt-1">{streak} Days</p>
          </div>
        </div>

        {/* Activity Chart */}
        <div className="bg-dark-800 p-5 rounded-2xl border border-dark-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-zinc-200">Activity</h3>
            <div className="flex items-center space-x-1 text-xs text-aura-400 bg-aura-400/10 px-2 py-1 rounded-full">
              <TrendingUp size={12} />
              <span>+12%</span>
            </div>
          </div>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorReps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#71717a'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: '#4ade80' }}
                />
                <Area type="monotone" dataKey="reps" stroke="#4ade80" strokeWidth={2} fillOpacity={1} fill="url(#colorReps)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Workouts */}
        <div>
          <div className="flex justify-between items-end mb-4">
             <h3 className="font-semibold text-zinc-200">Recent Workouts</h3>
             <Link to="/history" className="text-xs text-aura-400 hover:text-aura-300">View All</Link>
          </div>
          <div className="space-y-3">
            {sessions.length === 0 ? (
               <div className="text-center py-8 text-zinc-500 text-sm bg-dark-800/50 rounded-xl border border-dashed border-dark-700">
                  No workouts yet. Start one now!
               </div>
            ) : (
              sessions.slice(0, 3).map((s) => (
                <div key={s.id} className="bg-dark-800 p-4 rounded-xl border border-dark-700 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-dark-700 flex items-center justify-center text-zinc-400">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-200 text-sm">{s.name}</p>
                      <p className="text-xs text-zinc-500">{new Date(s.startTime).toDateString()}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-zinc-600" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Start Button Area (Spacer) */}
        <div className="h-20"></div>
      </div>
      
      {/* Floating Action Button (FAB) Style Integration in Bottom Nav logic or here */}
      <div className="fixed bottom-20 left-0 right-0 px-6 pointer-events-none flex justify-center z-40">
        <Link to="/workout" className="pointer-events-auto shadow-xl shadow-aura-500/20 bg-gradient-to-r from-aura-500 to-emerald-600 text-white font-bold py-4 px-8 rounded-full flex items-center space-x-2 transform active:scale-95 transition-all hover:brightness-110">
          <Dumbbell size={20} />
          <span>Start Workout</span>
        </Link>
      </div>
    </Layout>
  );
};

export default Dashboard;