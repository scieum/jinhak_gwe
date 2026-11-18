// work/icons(lucide-static, ISC)에서 복사한 SVG를 글자 그대로 넣는다. stroke=currentColor라 색은 부모 color를 따른다.
const files = import.meta.glob('../assets/icons/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;
const ICONS: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, svg]) => [path.split('/').pop()!.replace('.svg', ''), svg]),
);

export function Icon({ name, size = 24, className }: { name: string; size?: number; className?: string }) {
  const svg = ICONS[name];
  if (!svg) throw new Error(`아이콘 없음: ${name} (src/assets/icons/${name}.svg)`);
  return (
    <span
      aria-hidden="true"
      className={['icon', className].filter(Boolean).join(' ')}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
