import { logoutAction } from "@/app/(auth)/actions";

export function AdminLogoutControl() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="flex min-h-11 w-full cursor-pointer items-center justify-center rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-white hover:border-slate-400 hover:bg-slate-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
      >
        Keluar
      </button>
    </form>
  );
}
