import { createContext, useReducer, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

export const ShiftContext = createContext();

const initialState = {
  currentShift: null,
  shiftHistory: [],
  status: 'INACTIVE', // INACTIVE, ACTIVE, BREAK
  breakType: null, // LUNCH, SHORT
  isLoading: false,
  error: null,
  totalHoursToday: 0,
  stats: {
    weekly: 0,
    monthly: 0
  }
};

const shiftReducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_CURRENT_SHIFT_START':
    case 'START_SHIFT_START':
    case 'END_SHIFT_START':
    case 'BREAK_START_START':
    case 'BREAK_END_START':
    case 'FETCH_HISTORY_START':
    case 'FETCH_STATS_START':
      return {
        ...state,
        isLoading: true,
        error: null
      };
    case 'FETCH_CURRENT_SHIFT_SUCCESS':
      return {
        ...state,
        currentShift: action.payload,
        status: action.payload ? 
                (action.payload.endTime ? 'INACTIVE' : 
                  (action.payload.onBreak ? 'BREAK' : 'ACTIVE')) 
                : 'INACTIVE',
        breakType: action.payload?.breakType || null,
        isLoading: false
      };
    case 'START_SHIFT_SUCCESS':
      return {
        ...state,
        currentShift: action.payload,
        status: 'ACTIVE',
        isLoading: false
      };
    case 'END_SHIFT_SUCCESS':
      return {
        ...state,
        currentShift: action.payload,
        status: 'INACTIVE',
        breakType: null,
        isLoading: false
      };
    case 'BREAK_START_SUCCESS':
      return {
        ...state,
        currentShift: action.payload,
        status: 'BREAK',
        breakType: action.payload.breakType,
        isLoading: false
      };
    case 'BREAK_END_SUCCESS':
      return {
        ...state,
        currentShift: action.payload,
        status: 'ACTIVE',
        breakType: null,
        isLoading: false
      };
    case 'FETCH_HISTORY_SUCCESS':
      return {
        ...state,
        shiftHistory: action.payload,
        isLoading: false
      };
    case 'FETCH_STATS_SUCCESS':
      return {
        ...state,
        totalHoursToday: action.payload.today,
        stats: {
          weekly: action.payload.weekly,
          monthly: action.payload.monthly
        },
        isLoading: false
      };
    case 'FETCH_CURRENT_SHIFT_FAILURE':
    case 'START_SHIFT_FAILURE':
    case 'END_SHIFT_FAILURE':
    case 'BREAK_START_FAILURE':
    case 'BREAK_END_FAILURE':
    case 'FETCH_HISTORY_FAILURE':
    case 'FETCH_STATS_FAILURE':
      return {
        ...state,
        isLoading: false,
        error: action.payload
      };
    default:
      return state;
  }
};

export const ShiftProvider = ({ children }) => {
  const [state, dispatch] = useReducer(shiftReducer, initialState);
  const { isAuthenticated } = useContext(AuthContext);

  // Fetch current shift when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchCurrentShift();
      fetchShiftStats();
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch current active shift
  const fetchCurrentShift = async () => {
    if (!isAuthenticated) return;
    
    dispatch({ type: 'FETCH_CURRENT_SHIFT_START' });
    try {
      const response = await axios.get('/api/shifts/current');
      dispatch({ 
        type: 'FETCH_CURRENT_SHIFT_SUCCESS', 
        payload: response.data 
      });
    } catch (error) {
      dispatch({
        type: 'FETCH_CURRENT_SHIFT_FAILURE',
        payload: error.response?.data?.message || 'Failed to fetch current shift'
      });
    }
  };

  // Start a new shift
  const startShift = async () => {
    dispatch({ type: 'START_SHIFT_START' });
    try {
      // Get current location
      const position = await tryGetPosition();
      
      const shiftData = {
        location: position
      };
      
      const response = await axios.post('/api/shifts/start', shiftData);
      dispatch({ 
        type: 'START_SHIFT_SUCCESS', 
        payload: response.data 
      });
      
      // Update stats after starting shift
      fetchShiftStats();
      
      return response.data;
    } catch (error) {
      dispatch({
        type: 'START_SHIFT_FAILURE',
        payload: error.response?.data?.message || 'Failed to start shift'
      });
      throw error;
    }
  };

  // End current shift
  const endShift = async () => {
    dispatch({ type: 'END_SHIFT_START' });
    try {
      // Get current location
      const position = await tryGetPosition();
      
      const shiftData = {
        location: position
      };
      
      const response = await axios.post('/api/shifts/end', shiftData);
      dispatch({ 
        type: 'END_SHIFT_SUCCESS', 
        payload: response.data 
      });
      
      // Update stats after ending shift
      fetchShiftStats();
      
      return response.data;
    } catch (error) {
      dispatch({
        type: 'END_SHIFT_FAILURE',
        payload: error.response?.data?.message || 'Failed to end shift'
      });
      throw error;
    }
  };

  // Start a break
  const startBreak = async (breakType) => {
    dispatch({ type: 'BREAK_START_START' });
    try {
      // Get current location
      const position = await tryGetPosition();
      
      const breakData = {
        type: breakType,
        location: position
      };
      
      const response = await axios.post('/api/shifts/break/start', breakData);
      dispatch({ 
        type: 'BREAK_START_SUCCESS', 
        payload: response.data 
      });
      return response.data;
    } catch (error) {
      dispatch({
        type: 'BREAK_START_FAILURE',
        payload: error.response?.data?.message || 'Failed to start break'
      });
      throw error;
    }
  };

  // End a break
  const endBreak = async () => {
    dispatch({ type: 'BREAK_END_START' });
    try {
      // Get current location
      const position = await tryGetPosition();
      
      const breakData = {
        location: position
      };
      
      const response = await axios.post('/api/shifts/break/end', breakData);
      dispatch({ 
        type: 'BREAK_END_SUCCESS', 
        payload: response.data 
      });
      return response.data;
    } catch (error) {
      dispatch({
        type: 'BREAK_END_FAILURE',
        payload: error.response?.data?.message || 'Failed to end break'
      });
      throw error;
    }
  };

  // Fetch shift history
  const fetchShiftHistory = async (page = 1, limit = 10) => {
    dispatch({ type: 'FETCH_HISTORY_START' });
    try {
      const response = await axios.get(`/api/shifts/history?page=${page}&limit=${limit}`);
      dispatch({ 
        type: 'FETCH_HISTORY_SUCCESS', 
        payload: response.data 
      });
      return response.data;
    } catch (error) {
      dispatch({
        type: 'FETCH_HISTORY_FAILURE',
        payload: error.response?.data?.message || 'Failed to fetch shift history'
      });
      throw error;
    }
  };

  // Fetch shift statistics
  // Period boundaries are computed here, in the employee's own timezone
  const fetchShiftStats = async () => {
    dispatch({ type: 'FETCH_STATS_START' });
    try {
      const now = new Date();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(dayStart);
      weekStart.setDate(dayStart.getDate() - ((dayStart.getDay() + 6) % 7)); // Monday
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const response = await axios.get('/api/shifts/stats', {
        params: {
          dayStart: dayStart.toISOString(),
          weekStart: weekStart.toISOString(),
          monthStart: monthStart.toISOString()
        }
      });
      dispatch({ 
        type: 'FETCH_STATS_SUCCESS', 
        payload: response.data 
      });
      return response.data;
    } catch (error) {
      dispatch({
        type: 'FETCH_STATS_FAILURE',
        payload: error.response?.data?.message || 'Failed to fetch shift statistics'
      });
      throw error;
    }
  };

  // Helper function to get current position
  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            });
          },
          (error) => {
            reject(new Error(`Unable to retrieve your location: ${error.message}`));
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
        );
      }
    });
  };

  // Location for shift actions: null if unavailable or denied, so clocking
  // in still works; the server rejects it only when REQUIRE_LOCATION is on
  const tryGetPosition = async () => {
    try {
      return await getCurrentPosition();
    } catch {
      return null;
    }
  };

  // Return values
  const value = {
    currentShift: state.currentShift,
    shiftHistory: state.shiftHistory,
    status: state.status,
    breakType: state.breakType,
    isLoading: state.isLoading,
    error: state.error,
    totalHoursToday: state.totalHoursToday,
    weeklyHours: state.stats.weekly,
    monthlyHours: state.stats.monthly,
    startShift,
    endShift,
    startBreak,
    endBreak,
    fetchCurrentShift,
    fetchShiftHistory,
    fetchShiftStats,
    getCurrentPosition
  };

  return (
    <ShiftContext.Provider value={value}>
      {children}
    </ShiftContext.Provider>
  );
};

export default ShiftProvider;