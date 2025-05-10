import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardHome from './components/DashboardHome';
import SensorHistory from './components/SensorHistory';
import AccidentLog from './components/AccidentLog';
import MapPage from './components/MapPage';
import StatsPage from './components/StatsPage';
import DownloadPage from './components/DownloadPage';
import './App.css';

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Layout />,
      children: [
        { path: '/', element: <DashboardHome /> },
        { path: '/history', element: <SensorHistory /> },
        { path: '/accidents', element: <AccidentLog /> },
        { path: '/map', element: <MapPage /> },
        { path: '/stats', element: <StatsPage /> },
        { path: '/download', element: <DownloadPage /> },
      ],
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

function App() {
  return (
    <RouterProvider router={router} />
  );
}

export default App;
