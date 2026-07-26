import { notFound } from "next/navigation";
import { requireCmsActor } from "@/lib/auth/cms-auth";
import { readVerificationWorkbench } from "@/lib/verification/server";
import { VerificationWorkbench } from "@/components/admin/verification-workbench";

export const dynamic = "force-dynamic";

export default async function StoreVerificationPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { storeId } = await params;
  const actor = await requireCmsActor(`/admin/stores/${storeId}/verification`);
  const data = await readVerificationWorkbench(actor.client, storeId, actor.role);
  if (!data) notFound();

  const { error } = await searchParams;
  return (
    <VerificationWorkbench
      key={`${data.store.id}:${data.store.checked_at ?? "draft"}:${data.requiredApproved}`}
      data={data}
      role={actor.role}
      initialError={error || null}
    />
  );
}
