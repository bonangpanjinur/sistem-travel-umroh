import { PublicLayout } from "@/components/layout/PublicLayout";
import { BookingWizard } from "@/components/booking/BookingWizard";

export default function BookingPage() {
  return (
    <PublicLayout>
      <div className="container py-8 max-w-4xl">
        <BookingWizard />
      </div>
    </PublicLayout>
  );
}
