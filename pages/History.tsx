import React, { useEffect, useState } from 'react';
import { Calendar, ChevronDown, Trophy, Trash2, BrainCircuit } from 'lucide-react';
import Layout from '../components/Layout';
import { StorageService } from '../services/storage';
import { WorkoutSession } from '../types';
import { EXERCISES } from '../constants';
import { GoogleGenAI } from "@google/genai";

const History = () => {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    setSessions(StorageService.getSessions());
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this workout?")) {
      StorageService.deleteSession(id);
      setSessions(StorageService.getSessions());
    }
  };

  const getSessionVolume = (s: WorkoutSession) => {
    return s.exercises.reduce((acc, ex) => 
        acc + ex.sets.reduce((sAcc, set) => sAcc + (set.reps * (set.weight || 1)), 0)
    , 0);
  };

  const analyzeWithGemini = async () => {
    if (!process.env.API_KEY) {
        alert("Gemini API Key missing in environment.");
        return;
    }

    setAnalyzing(true);
    setAiAnalysis(null);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Prepare data summary for the AI
        const summary = sessions.slice(0, 5).map(s => {
            return `Date: ${new Date(s.startTime).toLocaleDateString()}, Volume: ${getSessionVolume(s)}, Exercises: ${s.exercises.map(e => EXERCISES[e.exerciseId].name).join(', ')}`;
        }).join('\n');

        const prompt = `Analyze my recent workout history and give me 3 short, bulleted tips for progress based on this data:\n${summary}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        setAiAnalysis(response.text);
    } catch (e) {
        console.error(e);
        setAiAnalysis("Could not connect to AI Coach. Ensure you are online.");
    } finally {
        setAnalyzing(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 pb-24">
        <h1 className="text-2xl font-bold text-white mb-6">Workout History</h1>
        
        {/* AI Insight Button */}
        <div className="mb-8">
            <button 
                onClick={analyzeWithGemini}
                disabled={analyzing}
                className="w-full bg-gradient-to-r from-indigo-900 to-purple-900 border border-indigo-700/50 p-4 rounded-xl flex items-center justify-center space-x-2 text-indigo-100 hover:brightness-110 transition-all"
            >
                <BrainCircuit size={20} className={analyzing ? "animate-spin" : ""} />
                <span>{analyzing ? "AI is Thinking..." : "Ask AI Coach for Insights"}</span>
            </button>
            {aiAnalysis && (
                <div className="mt-4 bg-indigo-950/50 p-4 rounded-xl border border-indigo-500/20 text-sm text-indigo-200 leading-relaxed animate-fade-in">
                    <div className="font-bold text-indigo-400 mb-2">Coach's Feedback:</div>
                    <div className="whitespace-pre-wrap">{aiAnalysis}</div>
                </div>
            )}
        </div>

        <div className="space-y-4">
          {sessions.length === 0 ? (
             <div className="text-zinc-500 text-center mt-10">No history yet.</div>
          ) : (
            sessions.map((session) => (
                <div 
                    key={session.id} 
                    onClick={() => toggleExpand(session.id)}
                    className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden transition-all duration-200 active:scale-[0.99]"
                >
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="bg-dark-700 p-2 rounded-lg text-zinc-400">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-zinc-200">{session.name}</h3>
                                <p className="text-xs text-zinc-500">{new Date(session.startTime).toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                             <div className="text-right hidden sm:block">
                                <p className="text-xs text-zinc-500 uppercase">Volume</p>
                                <p className="font-mono text-aura-400 font-bold">{getSessionVolume(session)}</p>
                             </div>
                             <ChevronDown size={16} className={`text-zinc-500 transition-transform ${expandedId === session.id ? 'rotate-180' : ''}`} />
                        </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedId === session.id && (
                        <div className="bg-dark-900/50 p-4 border-t border-dark-700 space-y-4">
                            {session.exercises.map((ex, idx) => (
                                <div key={idx} className="text-sm">
                                    <div className="flex justify-between text-zinc-300 font-medium mb-2">
                                        <span>{EXERCISES[ex.exerciseId]?.name || ex.exerciseId}</span>
                                    </div>
                                    <div className="space-y-1 pl-2 border-l-2 border-dark-700">
                                        {ex.sets.map((set, sIdx) => (
                                            <div key={set.id} className="flex justify-between text-zinc-500 text-xs">
                                                <span>Set {sIdx + 1}</span>
                                                <span className="text-zinc-300">{set.reps} reps @ {set.weight} lbs</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="pt-2 flex justify-end">
                                <button 
                                    onClick={(e) => handleDelete(session.id, e)}
                                    className="flex items-center space-x-1 text-red-500 text-xs hover:text-red-400 px-3 py-2 rounded hover:bg-red-500/10 transition-colors"
                                >
                                    <Trash2 size={14} />
                                    <span>Delete Workout</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default History;
