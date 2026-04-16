import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function VillageMasterList() {
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [subdistricts, setSubdistricts] = useState([]);
  const [villages, setVillages] = useState([]);
  
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedSubdistrict, setSelectedSubdistrict] = useState('');
  const [searchVillage, setSearchVillage] = useState('');
  const [pageSize, setPageSize] = useState(500);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const token = localStorage.getItem('token');

  const headers = { 'Authorization': `Bearer ${token}` };

  // Fetch states on mount
  useEffect(() => {
    fetchStates();
  }, []);

  // Fetch districts when state is selected
  useEffect(() => {
    if (selectedState) {
      fetchDistricts();
      setSelectedDistrict('');
      setSelectedSubdistrict('');
      setVillages([]);
    }
  }, [selectedState]);

  // Fetch subdistricts when district is selected
  useEffect(() => {
    if (selectedDistrict) {
      fetchSubdistricts();
      setSelectedSubdistrict('');
      setVillages([]);
    }
  }, [selectedDistrict]);

  // Fetch villages when subdistrict is selected or filters change
  useEffect(() => {
    if (selectedSubdistrict) {
      fetchVillages();
    }
  }, [selectedSubdistrict, currentPage, pageSize, searchVillage]);

  const fetchStates = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/states`, { headers });
      setStates(response.data.data);
    } catch (err) {
      setError('Failed to fetch states');
    }
  };

  const fetchDistricts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/api/v1/states/${selectedState}/districts`,
        { headers }
      );
      setDistricts(response.data.data);
    } catch (err) {
      setError('Failed to fetch districts');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubdistricts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/api/v1/districts/${selectedDistrict}/subdistricts`,
        { headers }
      );
      setSubdistricts(response.data.data);
    } catch (err) {
      setError('Failed to fetch subdistricts');
    } finally {
      setLoading(false);
    }
  };

  const fetchVillages = async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/api/v1/subdistricts/${selectedSubdistrict}/villages`;
      url += `?page=${currentPage}&limit=${pageSize}`;
      if (searchVillage) url += `&search=${searchVillage}`;

      const response = await axios.get(url, { headers });
      setVillages(response.data.data);
      setTotalRecords(response.data.count);
      setError(null);
    } catch (err) {
      setError('Failed to fetch villages');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalRecords / pageSize);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-6">Village Master List Browser</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* State Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">State *</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select State</option>
              {states.map(state => (
                <option key={state.state_code} value={state.state_code}>
                  {state.state_name}
                </option>
              ))}
            </select>
          </div>

          {/* District Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">District</label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedState}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select District</option>
              {districts.map(district => (
                <option key={district.district_code} value={district.district_code}>
                  {district.district_name}
                </option>
              ))}
            </select>
          </div>

          {/* Subdistrict Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Sub-District</label>
            <select
              value={selectedSubdistrict}
              onChange={(e) => setSelectedSubdistrict(e.target.value)}
              disabled={!selectedDistrict}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select Sub-District</option>
              {subdistricts.map(subdistrict => (
                <option key={subdistrict.subdistrict_code} value={subdistrict.subdistrict_code}>
                  {subdistrict.subdistrict_name}
                </option>
              ))}
            </select>
          </div>

          {/* Page Size */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Page Size</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              disabled={!selectedSubdistrict}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value={500}>500</option>
              <option value={5000}>5,000</option>
              <option value={10000}>10,000</option>
            </select>
          </div>
        </div>

        {/* Village Search */}
        {selectedSubdistrict && (
          <div>
            <input
              type="text"
              placeholder="Search village name..."
              value={searchVillage}
              onChange={(e) => {
                setSearchVillage(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* Villages Table */}
      {selectedSubdistrict && (
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Village Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Village Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Sub-District</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">District</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {villages.map((village, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{village.village_code}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{village.label || village.village_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {subdistricts.find(s => s.subdistrict_code === selectedSubdistrict)?.subdistrict_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {districts.find(d => d.district_code === selectedDistrict)?.district_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {states.find(s => s.state_code === selectedState)?.state_name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Showing {villages.length} of {totalRecords} villages (Page {currentPage} of {totalPages})
                </span>
                <div className="space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm">
                    <input
                      type="number"
                      value={currentPage}
                      onChange={(e) => setCurrentPage(Math.min(totalPages, Math.max(1, parseInt(e.target.value) || 1)))}
                      min={1}
                      max={totalPages}
                      className="w-12 px-2 py-1 border rounded text-center"
                    />
                    {' of '} {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {!selectedSubdistrict && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center text-gray-600">
          Select a sub-district to view villages
        </div>
      )}
    </div>
  );
}
