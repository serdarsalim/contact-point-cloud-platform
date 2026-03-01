import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <div className="card">
        <h1>Contact Point Cloud Platform</h1>
        <p>
          Centralized template management for Contact Point Chrome extension.
          Local extension templates remain untouched and editable in-extension.
        </p>
        <p>
          Cloud templates are managed here and consumed read-only from extension
          token APIs.
        </p>
        <Link href="/admin/login">Go to Admin Login</Link>
      </div>
    </main>
  );
}
