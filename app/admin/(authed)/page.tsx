import { getGifts } from "../../lib/db";
import { AdminTable } from "./admin-table";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const gifts = await getGifts();
  return <AdminTable gifts={gifts} />;
}
