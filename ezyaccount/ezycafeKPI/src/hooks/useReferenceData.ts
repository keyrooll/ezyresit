import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Branch, Department, Shift, Position } from '@/types';

interface ReferenceData {
  branches: Branch[];
  departments: Department[];
  shifts: Shift[];
  positions: Position[];
  loading: boolean;
}

export function useReferenceData(): ReferenceData {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [b, d, s, p] = await Promise.all([
        supabase.from('branches').select('*').eq('is_active', true).order('name'),
        supabase.from('departments').select('*').eq('is_active', true).order('name'),
        supabase.from('shifts').select('*').eq('is_active', true).order('name'),
        supabase.from('positions').select('*').order('title'),
      ]);
      if (b.data) setBranches(b.data as Branch[]);
      if (d.data) setDepartments(d.data as Department[]);
      if (s.data) setShifts(s.data as Shift[]);
      if (p.data) setPositions(p.data as Position[]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  return { branches, departments, shifts, positions, loading };
}
