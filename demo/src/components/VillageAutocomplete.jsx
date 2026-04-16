import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

export default function VillageAutocomplete({ onVillageSelect }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedVillage, setSelectedVillage] = useState(null);
  const dropdownRef = useRef(null);
  const timeoutRef = useRef(null);

  // Fetch suggestions
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);

    timeoutRef.current = setTimeout(async () => {
      try {
        const response = await axios.get(`${API_URL}/search`, {
          params: {
            q: query,
            hierarchyLevel: 'village',
            limit: 10
          },
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'X-API-Key': API_KEY
          }
        });

        setSuggestions(response.data.data || []);
        setShowDropdown(true);
      } catch (error) {
        console.error('Error fetching villages:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleVillageSelect = (village) => {
    setSelectedVillage(village);
    setQuery(village.label);
    setShowDropdown(false);
    onVillageSelect({
      village: village.village,
      subDistrict: village.subdistrict_name,
      district: village.district_name,
      state: village.state_name,
      country: 'India',
      fullAddress: village.fullAddress
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && setShowDropdown(true)}
        placeholder="Type village name (min 2 characters)..."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
      />

      {loading && (
        <div className="absolute right-3 top-2">
          <div className="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full"></div>
        </div>
      )}

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {suggestions.map((village, idx) => (
            <div
              key={idx}
              onClick={() => handleVillageSelect(village)}
              className="px-4 py-3 hover:bg-primary-50 cursor-pointer border-b last:border-b-0 transition"
            >
              <div className="font-medium text-gray-900">{village.label}</div>
              <div className="text-sm text-gray-600">
                {village.subdistrict_name}, {village.district_name}, {village.state_name}
              </div>
            </div>
          ))}
        </div>
      )}

      {showDropdown && query.length >= 2 && suggestions.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4 text-center text-gray-500">
          No villages found
        </div>
      )}
    </div>
  );
}
