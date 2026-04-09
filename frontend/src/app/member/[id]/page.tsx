import { notFound } from "next/navigation";

type PublicMemberResponse = {
  member?: {
    id: number;
    member_code?: string | null;
    full_name?: string | null;
    status?: string | null;
    is_active?: boolean;
    city?: string | null;
    province?: string | null;
    membership_expiry?: string | null;
  };
};

const resolveApiBaseUrl = () => {
  const envUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080/api/v1";
  return envUrl.replace(/\/$/, "");
};

const formatStatus = (isActive: boolean) =>
  isActive ? "AKTIF" : "TIDAK AKTIF";

const formatExpiry = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default async function PublicMemberVerificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/members/public/${id}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    notFound();
  }

  const payload = (await response.json()) as PublicMemberResponse;
  const member = payload.member;

  if (!member) {
    notFound();
  }

  const isActive = Boolean(member.is_active);
  const location = [member.city, member.province].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white px-4 py-12">
      <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">
              Verifikasi Member
            </h1>
            <p className="text-sm text-gray-500">LUMBUNG INFORMASI RAKYAT</p>
          </div>
          <span
            className={`rounded-full px-4 py-1 text-xs font-bold tracking-wide ${
              isActive
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {formatStatus(isActive)}
          </span>
        </div>

        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-400">
              Nama
            </p>
            <p className="text-lg font-bold text-gray-900">
              {member.full_name || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-gray-400">
              ID Member
            </p>
            <p className="font-semibold text-gray-900">
              {member.member_code || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-gray-400">
              Lokasi
            </p>
            <p className="font-medium text-gray-800">{location || "-"}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-gray-400">
              Masa Berlaku
            </p>
            <p className="font-medium text-gray-800">
              {formatExpiry(member.membership_expiry)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
