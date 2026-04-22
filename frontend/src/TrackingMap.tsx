import React from 'react';
import type { Checkpoint } from './trackingService';

/**
 * Props for the TrackingMap component.
 * @param checkpoints An array of checkpoint objects representing the asset's history.
 */
interface TrackingMapProps {
  checkpoints: Checkpoint[];
}

/**
 * A component to render a visual timeline of an asset's journey
 * based on its checkpoint history.
 */
const TrackingMap: React.FC<TrackingMapProps> = ({ checkpoints }) => {

  // Sort checkpoints by timestamp, most recent first.
  const sortedCheckpoints = [...checkpoints].sort((a, b) =>
    new Date(b.eventTimestamp).getTime() - new Date(a.eventTimestamp).getTime()
  );

  const renderStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'MANUFACTURED':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path></svg>
        );
      case 'IN_TRANSIT':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="15" height="13" x="1" y="4"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
        );
      case 'CUSTOMS_INSPECTION':
      case 'CUSTOMS_CLEARED':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        );
      case 'DELIVERED':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        );
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Tracking History</h2>
      {sortedCheckpoints.length === 0 ? (
        <p style={styles.emptyState}>No tracking information available yet.</p>
      ) : (
        <div style={styles.timeline}>
          {sortedCheckpoints.map((checkpoint, index) => (
            <div key={checkpoint.contractId || index} style={styles.timelineItem}>
              <div style={styles.timelineIconContainer}>
                {renderStatusIcon(checkpoint.status)}
                <div style={styles.timelineDot}></div>
              </div>
              <div style={styles.timelineContent}>
                <h3 style={styles.location}>{checkpoint.location}</h3>
                <span style={styles.statusBadge}>{checkpoint.status.replace(/_/g, ' ')}</span>
                <p style={styles.operator}>
                  <strong>Operator:</strong> {checkpoint.operator}
                </p>
                <time style={styles.timestamp} dateTime={checkpoint.eventTimestamp}>
                  {new Date(checkpoint.eventTimestamp).toLocaleString()}
                </time>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    backgroundColor: '#f9fafb',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  },
  header: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '24px',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '12px',
  },
  emptyState: {
    color: '#6b7280',
    textAlign: 'center',
    padding: '32px 0',
  },
  timeline: {
    position: 'relative',
    paddingLeft: '48px',
    borderLeft: '2px solid #d1d5db',
  },
  timelineItem: {
    position: 'relative',
    marginBottom: '32px',
  },
  timelineIconContainer: {
    position: 'absolute',
    left: '-61px',
    top: '0px',
    backgroundColor: '#ffffff',
    borderRadius: '50%',
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #d1d5db',
    color: '#4b5563',
  },
  timelineDot: {
    position: 'absolute',
    left: '58px',
    top: '22px',
    height: '10px',
    width: '10px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    border: '2px solid #d1d5db',
  },
  timelineContent: {
    backgroundColor: '#ffffff',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  location: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 8px 0',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    textTransform: 'capitalize',
    marginBottom: '12px',
  },
  operator: {
    fontSize: '14px',
    color: '#4b5563',
    margin: '0 0 4px 0',
  },
  timestamp: {
    fontSize: '12px',
    color: '#6b7280',
  },
};

export default TrackingMap;