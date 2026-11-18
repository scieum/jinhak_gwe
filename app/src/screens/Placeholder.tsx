// 시안 전 화면 자리. 셸이 제목을 보여주므로 본문만 둔다.
export function Placeholder({ title, slug }: { title: string; slug: string }) {
  return (
    <section className="placeholder" data-slug={slug}>
      <h2 className="t-heading-2">{title}</h2>
      <p className="t-body-sm text-muted">준비 중이에요.</p>
    </section>
  );
}
