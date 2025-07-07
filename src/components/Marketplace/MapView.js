import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create a custom icon for better visibility
const customIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapView({ location, cardName, price }) {
  const [coordinates, setCoordinates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const geocodeLocation = async () => {
      if (!location) {
        setError('No location provided');
        setLoading(false);
        return;
      }

      try {
        // Use Nominatim API (OpenStreetMap's geocoding service)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
          {
            headers: {
              'User-Agent': 'Pokemon-Card-Tracker/1.0'
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to geocode location');
        }

        const data = await response.json();
        
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          setCoordinates([parseFloat(lat), parseFloat(lon)]);
        } else {
          setError('Location not found');
        }
      } catch (err) {
        console.error('Geocoding error:', err);
        setError('Failed to load map');
      } finally {
        setLoading(false);
      }
    };

    geocodeLocation();
  }, [location]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
        <div className="text-center">
          <div className="mx-auto mb-2 size-8 animate-spin rounded-full border-b-2 border-purple-600"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error || !coordinates) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
        <div className="text-center">
          <span className="material-icons mb-2 text-4xl text-gray-400">location_on</span>
          <p className="text-gray-600 dark:text-gray-400">{location}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
            {error || 'Map unavailable'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <MapContainer
        center={coordinates}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={coordinates} icon={customIcon}>
          <Popup>
            <div className="text-center">
              <p className="font-semibold">{cardName}</p>
              <p className="text-lg font-bold">${price}</p>
              <p className="text-sm text-gray-600">{location}</p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default MapView;
