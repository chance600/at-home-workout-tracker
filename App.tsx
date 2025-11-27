import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ActiveWorkout from './pages/ActiveWorkout';
import History from './pages/History';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/workout" element={<ActiveWorkout />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </Router>
  );
};

export default App;
