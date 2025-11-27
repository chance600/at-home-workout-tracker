
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, RefreshCw, CheckCircle2, X, Play, Square, Settings2, Info, ChevronDown, Cpu, Volume2, VolumeX, HelpCircle, VideoOff } from 'lucide-react';
import Layout from '../components/Layout';
import { EXERCISES } from '../constants';
import { ExerciseType, WorkoutSession, Keypoint, RepState } from '../types';
import { PoseEngine, THRESHOLDS } from '../services/ai/poseEngine';
import { StorageService } from '../services/storage';
import { ModelService } from '../services/ai/modelService';
import { AudioService } from '../services/audio';

const ActiveWorkout = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [activeExercise, setActiveExercise] = useState<ExerciseType>('SQUAT');
  const [isSetActive, setIsSetActive] = useState(false);
  const [reps, setReps] = useState(0);
  const [feedback, setFeedback] = useState("Initializing AI...");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showExerciseMenu, setShowExerciseMenu] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [weight, setWeight] = useState(0);
  const [currentSession, setCurrentSession] = useState<WorkoutSession | null>(null);
  const [debugAngle, setDebugAngle] = useState(0);
  const [useSimulation, setUseSimulation] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // New State for ROM Gauge
  const [romStats, setRomStats] = useState({ current: 180, targetLow: 90, targetHigh: 160, state: RepState.UP });
  
  const engineRef = useRef<PoseEngine | null>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    const init = async () => {
        const session = StorageService.createSession();
        setCurrentSession(session);
        engineRef.current = new PoseEngine(activeExercise);
        
        // Load Real AI Model
        setFeedback("Loading AI Model...");
        await ModelService.initialize();
        setModelReady(true);
        if (!permissionGranted) {
             setFeedback("Waiting for Camera...");
        } else {
             setFeedback("Position yourself in frame");
        }
    };
    init();
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Update engine when exercise changes
  useEffect(() => {
    engineRef.current = new PoseEngine(activeExercise);
    setReps(0);
    setFeedback("Get Ready...");
    setShowInstructions(true);
    
    // Update ROM target visuals immediately
    const t = THRESHOLDS[activeExercise];
    setRomStats(prev => ({ ...prev, targetLow: t.down, targetHigh: t.up }));

  }, [activeExercise]);

  const startCamera = async () => {
    setFeedback("Requesting Access...");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setFeedback("Camera API not available in this browser. Try Simulation.");
        console.error("navigator.mediaDevices not supported");
        return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'user', 
            width: { ideal: 640 }, 
            height: { ideal: 480 } 
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Use a promise to handle play() safely
        videoRef.current.onloadedmetadata = async () => {
            try {
                await videoRef.current?.play();
                setPermissionGranted(true);
                setFeedback("Video Stream Starting...");
            } catch (e) {
                console.error("Video play failed:", e);
                setFeedback("Autoplay blocked. Tap to start.");
            }
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      setFeedback("Permission denied. Using Simulation.");
      setUseSimulation(true);
      setPermissionGranted(true);
    }
  };

  // -----------------------------------------------------------------------
  // SIMULATION GENERATOR
  // -----------------------------------------------------------------------
  const generateSimulatedLandmarks = (exercise: ExerciseType, time: number, width: number, height: number): Keypoint[] => {
    const speed = 2.5;
    const t = time * speed;
    const cx = width * 0.5;
    const cy = height * 0.5;
    const scale = Math.min(width, height);

    // Simulation generates points in normal view (not mirrored yet)
    // We will mirror them in draw loop to match camera behavior
    switch(exercise) {
        case 'SQUAT': {
            const angle = 125 + 50 * Math.sin(t); 
            const rad = angle * Math.PI / 180;
            return [
                { name: 'left_hip', x: cx, y: cy },
                { name: 'left_knee', x: cx + 0.05*scale, y: cy + 0.2*scale },
                { name: 'left_ankle', x: cx + 0.05*scale + (Math.cos(rad)*0.2*scale), y: cy + 0.2*scale + (Math.sin(rad)*0.2*scale) }
            ];
        }
        case 'BICEP_CURL': {
             const angle = 100 + 65 * Math.sin(t);
             const rad = angle * Math.PI / 180;
             return [
                 { name: 'left_shoulder', x: cx, y: cy - 0.2*scale },
                 { name: 'left_elbow', x: cx, y: cy },
                 { name: 'left_wrist', x: cx + (Math.cos(rad)*0.15*scale), y: cy + (Math.sin(rad)*0.15*scale) }
             ];
        }
        case 'PUSHUP': {
             const angle = 115 + 60 * Math.sin(t);
             const rad = angle * Math.PI / 180;
             return [
                { name: 'left_shoulder', x: cx - 0.1*scale, y: cy - 0.1*scale },
                { name: 'left_elbow', x: cx, y: cy },
                { name: 'left_wrist', x: cx + 0.1*scale, y: cy + 0.1*scale }
             ];
        }
        case 'OVERHEAD_PRESS': {
             const angle = 115 - 60 * Math.sin(t);
             const rad = angle * Math.PI / 180;
             return [
                 { name: 'left_shoulder', x: cx, y: cy - 0.1*scale },
                 { name: 'left_elbow', x: cx + 0.15*scale, y: cy - 0.1*scale },
                 { name: 'left_wrist', x: (cx + 0.15*scale) + Math.cos(rad)*0.15*scale, y: (cy - 0.1*scale) - Math.sin(rad)*0.15*scale }
             ];
        }
        default: return [];
    }
  };

  const drawSkeleton = (ctx: CanvasRenderingContext2D, landmarks: Keypoint[], currentAngle: number) => {
      if (landmarks.length < 2) return;
      
      const primaryColor = '#4ade80'; // Aura green
      
      // Draw Connections
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 15;
      
      ctx.beginPath();
      ctx.moveTo(landmarks[0].x, landmarks[0].y);
      for(let i=1; i<landmarks.length; i++) {
          ctx.lineTo(landmarks[i].x, landmarks[i].y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow for other elements

      // Draw Joints
      ctx.fillStyle = '#ffffff';
      landmarks.forEach((p, idx) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, 2*Math.PI);
          ctx.fill();
          
          // Draw Angle Visualization on the middle joint (pivot)
          if (idx === 1 && currentAngle > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.beginPath();
            ctx.arc(p.x + 40, p.y - 40, 24, 0, 2*Math.PI);
            ctx.fill();
            
            ctx.fillStyle = '#4ade80';
            ctx.font = 'bold 16px "JetBrains Mono"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${Math.round(currentAngle)}°`, p.x + 40, p.y - 40);
          }
          ctx.fillStyle = '#ffffff'; // Reset
      });
  };

  const detectFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !engineRef.current) {
        requestRef.current = requestAnimationFrame(detectFrame);
        return;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Check if video has enough data to render
    // readyState 2 = HAVE_CURRENT_DATA (enough for one frame)
    const videoReady = videoRef.current.readyState >= 2;
    setIsVideoReady(videoReady);

    if (videoReady) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
    }
    
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;

    // Clear Screen
    ctx.clearRect(0,0,w,h);

    // 1. Draw Video or Placeholder
    ctx.save();
    if (!useSimulation && videoReady) {
         ctx.scale(-1, 1); // Flip horizontally
         ctx.drawImage(videoRef.current, -w, 0, w, h);
    } else {
         // Simulation background or Loading State
         ctx.fillStyle = '#18181b';
         ctx.fillRect(0,0,w,h);
         
         if (!useSimulation && permissionGranted) {
             ctx.fillStyle = '#52525b';
             ctx.font = '14px Inter';
             ctx.textAlign = 'center';
             ctx.fillText('Waiting for video stream...', w/2, h/2);
         }
    }
    ctx.restore();

    // 2. Generate/Detect Landmarks
    let landmarks: Keypoint[] = [];
    if (isSetActive) {
         if (useSimulation) {
            // Sim generates non-mirrored coordinates
            landmarks = generateSimulatedLandmarks(activeExercise, Date.now()/1000, w, h);
         } else if (modelReady && videoReady) {
            landmarks = await ModelService.estimatePoses(videoRef.current);
         }
    }

    // 3. Mirror Keypoints for Display
    // Since we drew the video mirrored, we must match the keypoints to that visual.
    // MoveNet returns coordinates relative to the original video source.
    const mirroredLandmarks = landmarks.map(kp => ({
          ...kp,
          x: w - kp.x // Flip X coordinate
    }));

    // 4. Process Pose (Use ORIGINAL landmarks for logic to avoid math confusion)
    const result = engineRef.current.processPose(landmarks);
    
    // Update local state for ROM Gauge
    const t = engineRef.current.getTargetThresholds();
    setRomStats({
          current: result.currentAngle,
          targetLow: t.down,
          targetHigh: t.up,
          state: result.repState
    });

    // 5. Update UI State
    if (result.isRep) {
          setReps(result.count);
          if (!isMuted) AudioService.speak(result.count.toString(), 'high');
    } else if (result.feedback && result.feedback !== feedback && isSetActive) {
          if (!isMuted) AudioService.speak(result.feedback, 'low');
    }
    
    if (result.feedback) setFeedback(result.feedback);
    setDebugAngle(Math.round(result.currentAngle));

    // 6. Draw Skeleton (using Mirrored Landmarks so it aligns with the flipped video)
    if (isSetActive && mirroredLandmarks.length > 0) {
        drawSkeleton(ctx, mirroredLandmarks, result.currentAngle);
    } else if (!isSetActive && videoReady && !useSimulation) {
        // Dim overlay when paused
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0,0,w,h);
    }

    requestRef.current = requestAnimationFrame(detectFrame);
  }, [isSetActive, activeExercise, useSimulation, modelReady, isMuted, feedback, permissionGranted]);

  useEffect(() => {
    if (permissionGranted) {
        requestRef.current = requestAnimationFrame(detectFrame);
    }
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
  }, [permissionGranted, detectFrame]);

  const toggleSet = () => {
    if (!isSetActive) {
        setIsSetActive(true);
        engineRef.current?.reset();
        setReps(0);
        setShowInstructions(false);
        if(!isMuted) AudioService.speak("Start", 'high');
    } else {
        setIsSetActive(false);
        setShowSaveModal(true);
        if(!isMuted) AudioService.speak("Set complete", 'high');
    }
  };

  const saveSet = () => {
    if (currentSession) {
        const exerciseIndex = currentSession.exercises.findIndex(e => e.exerciseId === activeExercise);
        const newSet = {
            id: crypto.randomUUID(),
            reps: reps,
            weight: weight,
            timestamp: Date.now()
        };

        const updatedSession = { ...currentSession };
        if (exerciseIndex >= 0) {
            updatedSession.exercises[exerciseIndex].sets.push(newSet);
        } else {
            updatedSession.exercises.push({
                exerciseId: activeExercise,
                sets: [newSet]
            });
        }
        setCurrentSession(updatedSession);
        StorageService.saveSession(updatedSession);
    }
    setShowSaveModal(false);
    setReps(0);
  };

  // ROM Gauge Helper
  const getGaugeHeight = (angle: number) => {
      const min = 40;
      const max = 180;
      const clamped = Math.max(min, Math.min(max, angle));
      return ((clamped - min) / (max - min)) * 100;
  };

  return (
    <Layout hideNav>
      <div className="relative h-screen w-full bg-black overflow-hidden flex flex-col">
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <button onClick={() => navigate('/')} className="pointer-events-auto p-2 bg-dark-800/50 backdrop-blur rounded-full text-white hover:bg-dark-700">
                <X size={20} />
            </button>
            <div className="flex flex-col items-end relative pointer-events-auto">
                 <button 
                    onClick={() => setShowExerciseMenu(!showExerciseMenu)}
                    className="flex items-center space-x-2 bg-dark-800/80 backdrop-blur px-4 py-2 rounded-full border border-aura-500/30 text-white"
                 >
                    <span className="text-xs font-bold text-aura-400 uppercase tracking-wide">{EXERCISES[activeExercise].name}</span>
                    <ChevronDown size={14} className={`text-zinc-400 transition-transform ${showExerciseMenu ? 'rotate-180' : ''}`} />
                 </button>
                 
                 {/* Exercise Dropdown */}
                 {showExerciseMenu && (
                     <div className="absolute top-full right-0 mt-2 w-56 bg-dark-800 border border-dark-700 rounded-xl shadow-xl overflow-hidden animate-fade-in z-30">
                        {Object.values(EXERCISES).map((ex) => (
                            <button
                                key={ex.id}
                                onClick={() => { setActiveExercise(ex.id); setShowExerciseMenu(false); }}
                                className={`w-full text-left px-4 py-3 text-sm hover:bg-dark-700 transition-colors ${activeExercise === ex.id ? 'text-aura-400 bg-aura-400/10' : 'text-zinc-300'}`}
                            >
                                {ex.name}
                            </button>
                        ))}
                     </div>
                 )}
            </div>
        </div>

        {/* Camera/Canvas */}
        <div className="flex-1 relative bg-dark-900 flex flex-col items-center justify-center">
             {!permissionGranted ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 p-6 z-10">
                    <div className="w-20 h-20 rounded-full bg-dark-800 flex items-center justify-center animate-pulse border border-dark-700">
                        <Camera size={32} className="text-zinc-500" />
                    </div>
                    <p className="text-zinc-400 text-center text-sm max-w-xs">Allow camera access to enable AI rep counting.</p>
                    <button onClick={startCamera} className="bg-gradient-to-r from-aura-600 to-aura-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-aura-500/20 transform hover:scale-105 transition-all">
                        Enable Camera
                    </button>
                    <button onClick={() => { setUseSimulation(true); setPermissionGranted(true); }} className="text-xs text-zinc-500 underline mt-4">
                        Try Simulation Mode
                    </button>
                    <div className="text-xs text-red-500 mt-2 h-4">{feedback.includes("error") || feedback.includes("denied") ? feedback : ""}</div>
                 </div>
             ) : (
                <>
                    <video ref={videoRef} playsInline muted className="hidden" />
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
                    
                    {/* ROM Gauge (Right Side) */}
                    {isSetActive && (
                        <div className="absolute right-4 top-1/4 bottom-32 w-2 bg-dark-800/50 rounded-full overflow-hidden backdrop-blur border border-white/10 z-10">
                            {/* Target Zones */}
                            <div 
                                className="absolute w-full bg-red-500/30" 
                                style={{ bottom: '0%', height: `${getGaugeHeight(romStats.targetLow)}%` }} 
                            />
                            <div 
                                className="absolute w-full bg-aura-500/20" 
                                style={{ top: `${100 - getGaugeHeight(romStats.targetHigh)}%`, height: `${getGaugeHeight(romStats.targetHigh) - getGaugeHeight(romStats.targetLow)}%` }} 
                            />
                            
                            {/* Current Value Indicator */}
                            <div 
                                className="absolute w-full aspect-square rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-75 ease-out"
                                style={{ bottom: `${getGaugeHeight(romStats.current)}%` }}
                            />
                        </div>
                    )}

                    {/* Feedback Overlay */}
                    {isSetActive && (
                        <div className="absolute bottom-24 left-0 right-0 flex flex-col items-center pointer-events-none animate-in fade-in zoom-in duration-300 z-10">
                             <div className="text-8xl font-black text-white drop-shadow-2xl tabular-nums tracking-tighter stroke-black">
                                {reps}
                             </div>
                             <div className={`text-sm font-bold px-4 py-1.5 rounded-full mt-2 backdrop-blur-md shadow-lg transition-colors duration-300 ${
                                 feedback.includes("complete") || feedback.includes("Good") || feedback.includes("Up")
                                 ? 'bg-aura-500/90 text-white' 
                                 : 'bg-zinc-800/80 text-aura-400'
                             }`}>
                                {feedback.toUpperCase()}
                             </div>
                        </div>
                    )}
                </>
             )}
        </div>

        {/* Instructions Modal */}
        {showInstructions && permissionGranted && !isSetActive && (
             <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8">
                 <div className="bg-dark-900 border border-dark-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
                     <div className="flex justify-between items-start mb-4">
                         <div className="bg-aura-500/20 p-3 rounded-full">
                            <Info className="text-aura-400" size={24} />
                         </div>
                         <button onClick={() => setShowInstructions(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                     </div>
                     <h3 className="text-xl font-bold text-white mb-2">{EXERCISES[activeExercise].name}</h3>
                     <p className="text-zinc-400 text-sm mb-6">{EXERCISES[activeExercise].description}</p>
                     
                     <div className="bg-dark-800 rounded-xl p-4 mb-6 border border-dark-700">
                         <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">How to place camera</p>
                         <p className="text-white text-sm font-medium">{THRESHOLDS[activeExercise].instruction}</p>
                     </div>

                     <button onClick={() => setShowInstructions(false)} className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors">
                         Got it
                     </button>
                 </div>
             </div>
        )}

        {/* Bottom Controls */}
        <div className="bg-dark-900/95 backdrop-blur border-t border-dark-800 p-6 pb-8 flex items-center justify-between z-20">
             <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Weight</span>
                <span className="text-white font-bold text-xl">{weight} <span className="text-sm text-zinc-500 font-normal">lbs</span></span>
             </div>

             <div className="flex items-center space-x-6">
                <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-3 rounded-full bg-dark-800 text-zinc-400 hover:text-white transition-colors"
                >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>

                <button 
                    onClick={toggleSet}
                    disabled={!permissionGranted}
                    className={`h-20 w-20 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-2xl ${
                        isSetActive 
                        ? 'bg-red-500 hover:bg-red-600 shadow-red-500/40' 
                        : 'bg-gradient-to-tr from-aura-500 to-emerald-400 shadow-aura-500/40'
                    } ${!permissionGranted ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                >
                    {isSetActive ? <Square fill="currentColor" size={28} className="text-white" /> : <Play fill="currentColor" size={32} className="text-white ml-2" />}
                </button>
                
                <button onClick={() => setShowSaveModal(true)} className="p-3 rounded-full bg-dark-800 text-zinc-400 hover:text-white transition-colors">
                    <Settings2 size={20} />
                </button>
             </div>
        </div>

        {/* Save Set Modal */}
        {showSaveModal && (
            <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
                <div className="bg-dark-800 w-full max-w-xs rounded-3xl p-6 border border-dark-700 shadow-2xl scale-100">
                    <h3 className="text-2xl font-bold text-white mb-1">Log Set</h3>
                    <p className="text-sm text-zinc-400 mb-6">Confirm your performance</p>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-dark-900/50 p-4 rounded-2xl border border-dark-700">
                            <span className="text-zinc-400 text-sm font-medium">Reps</span>
                            <div className="flex items-center space-x-4">
                                <button onClick={() => setReps(Math.max(0, reps-1))} className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-dark-700 transition-colors">-</button>
                                <span className="text-2xl font-bold w-8 text-center tabular-nums text-white">{reps}</span>
                                <button onClick={() => setReps(reps+1)} className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-dark-700 transition-colors">+</button>
                            </div>
                        </div>

                        <div className="flex justify-between items-center bg-dark-900/50 p-4 rounded-2xl border border-dark-700">
                            <span className="text-zinc-400 text-sm font-medium">Lbs</span>
                            <div className="flex items-center space-x-4">
                                <button onClick={() => setWeight(Math.max(0, weight-5))} className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-dark-700 transition-colors">-</button>
                                <span className="text-2xl font-bold w-8 text-center tabular-nums text-white">{weight}</span>
                                <button onClick={() => setWeight(weight+5)} className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-dark-700 transition-colors">+</button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex space-x-3">
                        <button onClick={() => setShowSaveModal(false)} className="flex-1 py-4 rounded-xl font-bold text-zinc-400 hover:bg-dark-700 hover:text-white transition-colors">Discard</button>
                        <button onClick={saveSet} className="flex-1 py-4 rounded-xl font-bold bg-gradient-to-r from-aura-600 to-aura-500 text-white shadow-lg shadow-aura-500/20 hover:brightness-110 transition-all">Save Set</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </Layout>
  );
};

export default ActiveWorkout;
