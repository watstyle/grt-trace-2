import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { GlobalSidebar } from "./components/GlobalSidebar";
import { SidebarProvider } from "./components/SidebarContext";
import { ToastHost } from "./components/ToastHost";
import { EvalDetailPage } from "./pages/EvalDetailPage";
import { EntityDetailPage } from "./pages/EntityDetailPage";
import { ListViewPage } from "./pages/ListViewPage";
import { ThreadViewPage } from "./pages/ThreadViewPage";

function App() {
  return (
    <BrowserRouter>
      <SidebarProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/thread/t_1" replace />} />
          <Route path="/list/:view" element={<ListViewPage />} />
          <Route path="/thread/:threadId" element={<ThreadViewPage />} />
          <Route path="/entity/:entityType/:entityId" element={<EntityDetailPage />} />
          <Route path="/eval/:evalId" element={<EvalDetailPage />} />
          <Route path="*" element={<Navigate to="/thread/t_1" replace />} />
        </Routes>
        <GlobalSidebar />
        <ToastHost />
      </SidebarProvider>
    </BrowserRouter>
  );
}

export default App;
