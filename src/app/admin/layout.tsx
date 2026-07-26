import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { requireCmsActor } from "@/lib/auth/cms-auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireCmsActor("/admin");

  return (
    <div className="admin-shell page-shell">
      <header className="admin-header">
        <div>
          <span className="eyebrow">GYOMEN CMS CONTROL PLANE</span>
          <h1>魚麵日和 · 店家內容管理系統</h1>
          <p>
            {actor.user.email} · <strong>{actor.role}</strong>
          </p>
        </div>
        <nav aria-label="CMS navigation">
          <Link className="button button-ghost" href="/admin">
            CMS Dashboard
          </Link>
          <Link className="button button-ghost" href="/admin/stores">
            店家總覽
          </Link>
          <Link className="button button-primary" href="/admin/stores/new">
            新增草稿
          </Link>
          <AuthButton />
        </nav>
      </header>
      <main className="admin-main-content">{children}</main>
    </div>
  );
}
