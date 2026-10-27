import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doctorApi } from '../services/doctorApi';

const DoctorAuthContext = createContext(null);

export const DoctorAuthProvider = ({ children }) => {
  const [doctor, setDoctor] = useState(() => doctorApi.getActiveDoctor());
  const [authLoading, setAuthLoading] = useState(Boolean(doctorApi.getAccessToken()));
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      if (!doctorApi.getAccessToken()) {
        setAuthLoading(false);
        return;
      }
      try {
        const restoredDoctor = await doctorApi.getCurrentProfile();
        if (!cancelled) setDoctor(restoredDoctor);
      } catch (restoreError) {
        doctorApi.clearActiveDoctor();
        if (!cancelled) setDoctor(null);
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }
    restoreSession();
    return () => { cancelled = true; };
  }, []);

  const refreshQueue = useCallback(async () => {
    if (!doctor || (!doctor._id && !doctor.id)) return;
    try {
      const docId = doctor._id || doctor.id;
      const q = await doctorApi.getDoctorQueue(docId);
      setQueue(q);
    } catch (err) {
      console.error('Queue poll error:', err);
    }
  }, [doctor]);

  useEffect(() => {
    if (doctor) {
      refreshQueue();
      // Poll the live consultation queue every 3 seconds.
      const interval = setInterval(() => {
        refreshQueue();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [doctor, refreshQueue]);

  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const doc = await doctorApi.loginDoctor(credentials);
      setDoctor(doc);
      return doc;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const doc = await doctorApi.registerDoctor(data);
      setDoctor(doc);
      return doc;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    doctorApi.clearActiveDoctor();
    setDoctor(null);
    setQueue([]);
  };

  return (
    <DoctorAuthContext.Provider
      value={{
        doctor,
        queue,
        refreshQueue,
        login,
        register,
        logout,
         loading,
         authLoading,
        error,
      }}
    >
      {children}
    </DoctorAuthContext.Provider>
  );
};

export const useDoctorAuth = () => {
  const context = useContext(DoctorAuthContext);
  if (!context) {
    throw new Error('useDoctorAuth must be used within a DoctorAuthProvider');
  }
  return context;
};
