import { Outlet } from 'react-router-dom';

export function MemorizationLayout() {
  return (
    <div className="min-h-screen bg-white text-gray-800 selection:bg-primary-100 selection:text-primary-900 transition-colors duration-500 ease-in-out">
      <Outlet />
    </div>
  );
}

export default MemorizationLayout;
