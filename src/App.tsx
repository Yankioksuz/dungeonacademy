import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Game } from './components/Game';
import { TestPage } from './components/TestPage';
import { GameProvider } from './contexts/GameContext';
import './i18n';
import './App.css';

function App() {
  return (
    <GameProvider>
      <Router>
        <div className="min-h-screen bg-fantasy-dark-bg">
          <Navigation />
          <Routes>
            <Route path="/" element={<Game />} />
            <Route path="/test" element={<TestPage />} />
          </Routes>
        </div>
      </Router>
    </GameProvider>
  );
}

export default App;
