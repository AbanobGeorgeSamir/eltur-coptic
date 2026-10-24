import AdminPostManager from '../components/AdminPostManager';

export default function AdminLiturgy({ showToast }) {
  return (
    <AdminPostManager
      type="liturgy"
      title="إدارة مواعيد القداسات"
      description="أضف قداساً دائماً بوقتَي البدء والانتهاء فقط، أو قداساً مؤقتاً بتاريخه ووقتَي البدء والانتهاء ليختفي تلقائياً بعد انتهائه."
      showToast={showToast}
    />
  );
}
