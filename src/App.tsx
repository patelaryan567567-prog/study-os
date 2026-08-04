import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "@/components/ui/Toast";
import { AppRoutes } from "@/routes";
import { AuthProvider } from "@/providers/AuthProvider";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer />
      </AuthProvider>
    </BrowserRouter>
  );
}
