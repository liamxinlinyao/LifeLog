import { useState, useEffect } from 'react';
import { Schedule } from '../types';

const STORAGE_KEY = 'lifelog_schedules';

export function useSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
  }, [schedules]);

  const addSchedule = (schedule: Omit<Schedule, 'id' | 'isCompleted' | 'notified'>) => {
    const newSchedule: Schedule = {
      ...schedule,
      id: crypto.randomUUID(),
      isCompleted: false,
      notified: false,
    };
    setSchedules(prev => [...prev, newSchedule]);
  };

  const updateSchedule = (id: string, updates: Partial<Schedule>) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSchedule = (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  const toggleComplete = (id: string) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, isCompleted: !s.isCompleted } : s));
  };

  return { schedules, addSchedule, updateSchedule, deleteSchedule, toggleComplete };
}
