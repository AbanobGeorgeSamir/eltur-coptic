import AdminPostManager from '../components/AdminPostManager';

export default function AdminGallery({ showToast }) {
  return (
    <AdminPostManager
      type="gallery"
      title="إدارة معرض الصور"
      description="أضف صور أنشطة الكنيسة وعدّلها أو احذفها. تظهر الصور المنشورة مباشرةً في معرض المستخدمين."
      showToast={showToast}
    />
  );
}
