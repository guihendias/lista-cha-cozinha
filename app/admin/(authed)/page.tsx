import { getGifts } from "../../lib/db";
import { AdminTable } from "./admin-table";

// revalidatePath("/admin") is called after every admin mutation — no need to bypass cache
export default async function AdminDashboard() {
  const gifts = await getGifts();
  return <AdminTable gifts={gifts} />;
}
