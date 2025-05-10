import React from 'react';
import { Box } from '@mui/material';

export default function HeartPulse({ bpm = 72 }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      sx={{
        background: 'linear-gradient(135deg,#232526 0%,#2c5364 100%)',
        borderRadius: 4,
        boxShadow: 8,
        minWidth: 220,
        minHeight: 180,
        p: 3,
        m: 'auto',
        transition: 'transform 0.35s cubic-bezier(.25,1.25,.5,1.1), box-shadow 0.35s',
        ':hover': {
          transform: 'scale(1.07) rotate(-2deg)',
          boxShadow: '0 8px 32px #0f2027cc',
          background: 'linear-gradient(135deg,#2c5364 0%,#232526 100%)',
        },
      }}
    >
      <Box display="flex" alignItems="center" gap={1}>
        <svg width="46" height="46" viewBox="0 0 46 46" style={{marginRight: 10}}>
          <g>
            <path
              d="M23 42s-11.5-10-16.5-16.2C2.1 21.7 1 18.4 1 15.2 1 8.7 7.7 3 15.2 3c3.9 0 7.6 1.8 9.3 4.7C27.2 4.8 31.1 3 35 3 42.3 3 49 8.7 49 15.2c0 3.2-1.1 6.5-5.5 10.6C34.5 32 23 42 23 42z"
              fill="#e53935"
              stroke="#b71c1c"
              strokeWidth="2"
            >
              <animate
                attributeName="d"
                values="M23 42s-11.5-10-16.5-16.2C2.1 21.7 1 18.4 1 15.2 1 8.7 7.7 3 15.2 3c3.9 0 7.6 1.8 9.3 4.7C27.2 4.8 31.1 3 35 3 42.3 3 49 8.7 49 15.2c0 3.2-1.1 6.5-5.5 10.6C34.5 32 23 42 23 42z;M23 44s-11.5-12-16.5-18.2C2.1 21.7 1 18.4 1 15.2 1 8.7 7.7 3 15.2 3c3.9 0 7.6 1.8 9.3 4.7C27.2 4.8 31.1 3 35 3 42.3 3 49 8.7 49 15.2c0 3.2-1.1 6.5-5.5 10.6C34.5 34 23 44 23 44z;M23 42s-11.5-10-16.5-16.2C2.1 21.7 1 18.4 1 15.2 1 8.7 7.7 3 15.2 3c3.9 0 7.6 1.8 9.3 4.7C27.2 4.8 31.1 3 35 3 42.3 3 49 8.7 49 15.2c0 3.2-1.1 6.5-5.5 10.6C34.5 32 23 42 23 42z"
                dur="0.8s"
                repeatCount="indefinite"
              />
            </path>
          </g>
        </svg>
        <Box>
          <span style={{fontWeight: 'bold', color: '#e53935', fontSize: 32, letterSpacing: 1}}>{bpm} bpm</span>
          <div style={{color:'#b0bec5',fontSize:16,marginTop:2}}>Driver Heart Rate</div>
        </Box>
      </Box>
      <Box mt={2} color="#b0bec5" fontSize={15} textAlign="center">
        <span>Continuous heart rate monitoring helps detect driver fatigue and health emergencies in real time.</span>
      </Box>
    </Box>
  );
}
