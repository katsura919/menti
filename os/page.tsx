'use client';

import EventOS from './EventOS';

export default function EventOSPage() {
  // Fixed full-viewport overlay so the global header/footer/cookie banner are hidden
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      <EventOS />
    </div>
  );
}
