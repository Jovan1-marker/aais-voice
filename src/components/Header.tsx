import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import logo from "@/assets/aais_logo.jpg";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard";

  const handleSignOut = () => {
    sessionStorage.removeItem("isAdmin");
    navigate("/");
  };

  return (
    <header className="bg-header border-b border-primary/20 px-4 py-3 shadow-sm">
      <div className="container mx-auto flex items-center justify-between">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <img src={logo} alt="AAIS Logo" className="h-12 w-12 rounded-full object-cover" />
          <div>
            <h1 className="text-lg font-bold text-primary leading-tight">Army's Angels Integrated School</h1>
            <p className="text-xs text-muted-foreground leading-tight hidden sm:block">
              {!isDashboard && <span className="block">Anonymous Suggestion Website</span>}
              {isDashboard && <span className="block">Admin Dashboard</span>}
            </p>
          </div>
        </div>
        <div>
          {isDashboard ? (
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-1 h-4 w-4" /> Sign out
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
