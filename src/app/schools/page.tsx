'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { GraduationCap, Users } from 'lucide-react';

interface School {
  id: string;
  name: string;
  _count: {
    teachers: number;
  };
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const res = await fetch('/api/schools');
      const json = await res.json();
      if (json.success) setSchools(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-content">
        <div className="page-header">
          <h1 className="page-title">Schools Directory</h1>
          <p className="page-description">Platform adoption distributed across registered educational institutions.</p>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: '1.5rem', marginBottom: 0, borderBottom: '1px solid var(--card-border)' }}>
            <div className="card-title">
              <GraduationCap size={20} />
              Partner Schools (Ranked by adoption)
            </div>
          </div>
          
          <div className="table-container">
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Loading...</div>
            ) : schools.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>No schools found.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>School Name</th>
                    <th style={{ textAlign: 'right' }}>Total Instructors</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((school) => (
                    <tr key={school.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '1rem' }}>{school.name}</div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="badge badge-primary" style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}>
                          <Users size={14} style={{ marginRight: '0.375rem' }} />
                          {school._count.teachers}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
