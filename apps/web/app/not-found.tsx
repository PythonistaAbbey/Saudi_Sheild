import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="wrap page-head">
      <h1 className="h1">Page not found · الصفحة غير موجودة</h1>
      <p className="lead" style={{ marginTop: 16 }}><Link href="/">Home · الرئيسية</Link></p>
    </div>
  );
}
