import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Movies from './pages/Movies';
import Login from './pages/Login';
import Register from './pages/Register';
import Player from './pages/Player';
import Dashboard from './pages/Dashboard';
import Credits from './pages/Credits';
import AnimeInfo from './pages/AnimeInfo';
import Watch from './pages/Watch';
import Search from './pages/Search';
import AnimeCategory from './pages/AnimeCategory';
import InfoPage from './pages/InfoPage';
import WatchlistPage from './pages/WatchlistPage';
import AdSettings from './pages/AdSettings';
import './App.css';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <div className="page-transition" key={location.pathname}>
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/credits" element={<Credits />} />
        <Route path="/search" element={<Search />} />

        {/* Movies page — TMDB discover */}
        <Route path="/movies" element={<Movies />} />

        {/* Content info — type-based routing */}
        <Route path="/info/:type/:slug" element={<InfoPage />} />
        <Route path="/info/:id" element={<InfoPage />} />

        {/* Watch routes — type-based */}
        <Route path="/watch/movie/:slug" element={<Watch />} />
        <Route path="/watch/tv/:slug" element={<Watch />} />
        <Route path="/watch/series/:slug" element={<Watch />} />

        {/* Anime routes */}
        <Route path="/anime" element={<Home />} />
        <Route path="/anime/info/:id" element={<AnimeInfo />} />
        <Route path="/anime/watch/:episodeId" element={<Watch />} />
        <Route path="/anime/category/:type/*" element={<AnimeCategory />} />
        <Route path="/anime/movies" element={<AnimeCategory />} />

        {/* Legacy anime watch (episodeId directly) */}
        <Route path="/watch/:episodeId" element={<Watch />} />

        {/* Movie player (HLS/MP4) */}
        <Route path="/player/:id" element={<Player />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/watchlist"
          element={
            <ProtectedRoute>
              <WatchlistPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/ads"
          element={
            <ProtectedRoute>
              <AdSettings />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Navbar />
          <AnimatedRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
