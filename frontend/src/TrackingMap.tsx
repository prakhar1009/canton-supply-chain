import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getAssetHistory, AssetHistory } from './trackingService';

// --- Leaflet Icon Fix ---
// This is a common workaround for a known issue with react-leaflet and webpack,
// where the default marker icons don't appear correctly.
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41], // point of the icon which will correspond to marker's location
    popupAnchor: [1, -34], // point from which the popup should open relative to the iconAnchor
});

L.Marker.prototype.options.icon = DefaultIcon;
// --- End Leaflet Icon Fix ---

interface TrackingMapProps {
  assetId: string;
  party: string;
  token: string;
  ledgerUrl: string;
}

const containerStyle: React.CSSProperties = {
  fontFamily: 'Arial, sans-serif',
  padding: '20px',
  border: '1px solid #ddd',
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  backgroundColor: '#f9f9f9',
};

const layoutStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  gap: '20px',
  marginTop: '20px',
};

const timelineStyle: React.CSSProperties = {
  flex: 1,
  maxHeight: '500px',
  overflowY: 'auto',
  borderRight: '1px solid #eee',
  paddingRight: '20px',
};

const mapContainerStyle: React.CSSProperties = {
  flex: 2,
  height: '500px',
  borderRadius: '8px',
  overflow: 'hidden',
};

const timelineItemStyle: React.CSSProperties = {
  listStyle: 'none',
  position: 'relative',
  padding: '10px 0 10px 25px',
  borderLeft: '2px solid #007bff',
  marginLeft: '10px',
};

const timelineDotStyle: React.CSSProperties = {
  position: 'absolute',
  left: '-9px',
  top: '12px',
  width: '16px',
  height: '16px',
  borderRadius: '50%',
  backgroundColor: '#007bff',
  border: '2px solid #fff',
};

const LoadingState: React.FC = () => (
  <div style={{ ...containerStyle, textAlign: 'center' }}>
    <p>Loading tracking history...</p>
  </div>
);

const ErrorState: React.FC<{ message: string }> = ({ message }) => (
  <div style={{ ...containerStyle, color: 'red', textAlign: 'center' }}>
    <h3>Error</h3>
    <p>{message}</p>
  </div>
);

const EmptyState: React.FC = () => (
  <div style={containerStyle}>
    <h3>No Tracking History</h3>
    <p>No location history has been recorded for this asset yet.</p>
  </div>
);


const TrackingMap: React.FC<TrackingMapProps> = ({ assetId, party, token, ledgerUrl }) => {
  const [history, setHistory] = useState<AssetHistory | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!assetId || !party || !token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await getAssetHistory(assetId, party, token, ledgerUrl);
        // Sort history chronologically just in case it's not ordered
        data.history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setHistory(data);
      } catch (err) {
        console.error("Failed to fetch asset history:", err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [assetId, party, token, ledgerUrl]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!history || history.history.length === 0) {
    return <EmptyState />;
  }

  const positions: LatLngExpression[] = history.history.map(event => [event.latitude, event.longitude]);
  const initialCenter: LatLngExpression = positions.length > 0 ? positions[0] : [51.505, -0.09];
  const initialZoom = positions.length > 0 ? 5 : 2;

  return (
    <div style={containerStyle}>
      <h2>Shipment Tracking: {history.description}</h2>
      <p><strong>Asset ID:</strong> {history.assetId}</p>

      <div style={layoutStyle}>
        <div style={timelineStyle}>
          <h3>Route History</h3>
          <ul style={{ padding: 0 }}>
            {history.history.map((event, index) => (
              <li key={index} style={timelineItemStyle}>
                <div style={timelineDotStyle}></div>
                <div>
                  <strong>{event.locationName}</strong>
                </div>
                <div>Custodian: {event.custodian.split('::')[0]}</div>
                <div style={{ color: '#666', fontSize: '0.9em' }}>
                  {new Date(event.timestamp).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div style={mapContainerStyle}>
          <MapContainer center={initialCenter} zoom={initialZoom} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {history.history.map((event, index) => (
              <Marker key={index} position={[event.latitude, event.longitude]}>
                <Popup>
                  <strong>{index + 1}. {event.locationName}</strong><br />
                  Custodian: {event.custodian.split('::')[0]}<br />
                  Time: {new Date(event.timestamp).toLocaleTimeString()}
                </Popup>
              </Marker>
            ))}
            {positions.length > 1 && <Polyline pathOptions={{ color: 'blue' }} positions={positions} />}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default TrackingMap;