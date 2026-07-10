import { useState, useEffect } from 'react';
import { api } from '../api/axios';
import { History } from 'lucide-react';

export default function Activity() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api('/activity').then(setLogs).catch(() => setLogs([]));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-foreground">Activity Log</h1>
      <div className="card">
        {logs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No recent activity</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                  <th className="text-left pb-3 font-semibold">Action</th>
                  <th className="text-left pb-3 font-semibold">Details</th>
                  <th className="text-right pb-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3 pr-4">
                      <span className="badge badge-pending text-xs">{log.action}</span>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs">{log.details}</td>
                    <td className="py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}