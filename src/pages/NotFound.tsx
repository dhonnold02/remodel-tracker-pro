import { Link } from "react-router-dom";
import SightlineLogo from "@/components/SightlineLogo";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <div className="flex flex-col items-center gap-3">
          <SightlineLogo size={48} />
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Every job, start to finish.
          </p>
        </div>
        <h1 className="font-heading text-5xl font-bold text-foreground">404</h1>
        <p className="text-base text-muted-foreground">Oops! Page not found</p>
        <Link to="/" className="inline-block text-sm text-primary underline hover:text-primary/90">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
