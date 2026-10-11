import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const DashboardLayout = () => {
  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar />
      <main className="flex-1 bg-slate-50 p-6 overflow-auto min-h-[calc(100vh-4rem)]">
        <Outlet />
      </main>
    </div>
  );
};
