import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import HistoryIcon from '@mui/icons-material/History';
import ReportIcon from '@mui/icons-material/Report';
import MapIcon from '@mui/icons-material/Map';
import BarChartIcon from '@mui/icons-material/BarChart';
import DownloadIcon from '@mui/icons-material/Download';

export default function Layout() {
  const linkStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    color: 'inherit',
    textDecoration: 'none',
    fontWeight: '500',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    padding: '0.5rem 0',
  };

  return (
    <div className="app-container">
      <nav className="navbar">
        <NavLink to="/" style={linkStyle} className={({ isActive }) => isActive ? 'active' : undefined} end>
          <HomeIcon fontSize="small" />
          Home
        </NavLink>
        <NavLink to="/history" style={linkStyle} className={({ isActive }) => isActive ? 'active' : undefined}>
          <HistoryIcon fontSize="small" />
          Sensor History
        </NavLink>
        <NavLink to="/accidents" style={linkStyle} className={({ isActive }) => isActive ? 'active' : undefined}>
          <ReportIcon fontSize="small" />
          Accident Log
        </NavLink>
        <NavLink to="/map" style={linkStyle} className={({ isActive }) => isActive ? 'active' : undefined}>
          <MapIcon fontSize="small" />
          Map
        </NavLink>
        <NavLink to="/stats" style={linkStyle} className={({ isActive }) => isActive ? 'active' : undefined}>
          <BarChartIcon fontSize="small" />
          Stats
        </NavLink>
        <NavLink to="/download" style={linkStyle} className={({ isActive }) => isActive ? 'active' : undefined}>
          <DownloadIcon fontSize="small" />
          Download
        </NavLink>
      </nav>
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}
