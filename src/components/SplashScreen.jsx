import { useEffect, useState } from 'react';

const styles = {
  splash: {
    position: 'fixed',
    inset: 0,
    background: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    transition: 'opacity 0.3s ease',
  },
  logo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    animation: 'splashPop 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
  },
  name: {
    fontSize: '1.7rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#30d158',
  },
};

// Inject keyframe once
if (typeof document !== 'undefined' && !document.getElementById('splash-kf')) {
  const s = document.createElement('style');
  s.id = 'splash-kf';
  s.textContent = `@keyframes splashPop {
    from { transform: scale(0.65); opacity: 0; }
    to   { transform: scale(1);    opacity: 1; }
  }`;
  document.head.appendChild(s);
}

export default function SplashScreen({ onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(false), 600);
    const t2 = setTimeout(onDone, 900); // 600ms show + 300ms fade
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div style={{ ...styles.splash, opacity: visible ? 1 : 0, pointerEvents: 'none' }}>
      <div style={styles.logo}>
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <circle cx="36" cy="36" r="36" fill="#30d158" />
          <text x="36" y="50" textAnchor="middle" fontSize="34" fontWeight="bold" fill="white">E</text>
        </svg>
        <span style={styles.name}>Euexia</span>
      </div>
    </div>
  );
}
