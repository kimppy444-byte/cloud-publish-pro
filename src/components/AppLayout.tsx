import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-[240px] min-h-screen transition-all duration-200">
        <div className="bg-gradient-glow pointer-events-none fixed inset-x-0 top-0 h-64 z-0" />
        <div className="relative z-10 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
