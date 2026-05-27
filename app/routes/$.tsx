import { Link, useLocation } from "react-router";

// Keep this header to prevent analytics from running on 404 pages.
export function headers() {
  return {
    "x-upstart-no-analytics": "1",
    "x-upstart-status": "404",
  };
}

// 404 Page
export default function NotFound() {
  const location = useLocation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-base-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-base-content">404</h1>
        <p className="mt-4 text-xl text-base-content/80">Page Not Found</p>
        <p className="mt-2 text-sm text-base-content/60">
          The path{" "}
          <code className="rounded px-2 py-1">{location.pathname}</code> doesn't
          exist.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded bg-primary-600 px-6 py-3 text-primary-content hover:bg-primary-700"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
