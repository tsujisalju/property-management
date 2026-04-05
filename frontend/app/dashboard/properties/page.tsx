import RoleGuard from "@/components/ui/auth/role-guard";

export default function PropertiesPage() {
  return (
    <RoleGuard allowedRoles={["manager"]}>
      <></>
    </RoleGuard>
  );
}
