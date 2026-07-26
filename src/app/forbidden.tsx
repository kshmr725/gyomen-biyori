import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="page-shell cms-access-page">
      <section className="paper-card cms-access-card">
        <p className="eyebrow">403 · CMS ACCESS RESTRICTED</p>
        <h1>這個帳號沒有內容管理權限</h1>
        <p>目前帳號可以使用一般網站功能，但需要 editor 或 admin 角色才能進入魚麵日和 CMS。</p>
        <Link className="button button-primary" href="/">
          返回魚麵日和
        </Link>
      </section>
    </main>
  );
}
