import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput, AdminSelect, AdminTextarea } from "@/components/admin/ui/AdminInput";

export default function UITestPage() {
  return (
    <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "2rem", maxWidth: 600 }}>
      <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>AdminButton variants</h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
        <AdminButton variant="primary" size="sm">Primary SM</AdminButton>
        <AdminButton variant="primary" size="md">Primary MD</AdminButton>
        <AdminButton variant="primary" size="lg">Primary LG</AdminButton>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
        <AdminButton variant="secondary">Secondary</AdminButton>
        <AdminButton variant="danger">Danger</AdminButton>
        <AdminButton variant="ghost">Ghost</AdminButton>
        <AdminButton variant="soft">Soft pill</AdminButton>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
        <AdminButton variant="primary" disabled>Disabled</AdminButton>
        <AdminButton variant="secondary" disabled>Disabled</AdminButton>
        <AdminButton variant="primary" fullWidth>Full Width</AdminButton>
      </div>

      <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>AdminInput / Select / Textarea</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div className="admin-field">
          <label className="admin-field__label">Small input</label>
          <AdminInput fieldSize="sm" placeholder="Small..." />
        </div>
        <div className="admin-field">
          <label className="admin-field__label">Medium input (default)</label>
          <AdminInput placeholder="Medium..." />
        </div>
        <div className="admin-field">
          <label className="admin-field__label">Large input</label>
          <AdminInput fieldSize="lg" placeholder="Large..." />
        </div>
        <div className="admin-field">
          <label className="admin-field__label">Error state</label>
          <AdminInput error placeholder="Something wrong..." />
          <span className="admin-field__error">This field is required</span>
        </div>
        <div className="admin-field">
          <label className="admin-field__label">Select</label>
          <AdminSelect>
            <option>Option A</option>
            <option>Option B</option>
            <option>Option C</option>
          </AdminSelect>
        </div>
        <div className="admin-field">
          <label className="admin-field__label">Textarea</label>
          <AdminTextarea placeholder="Write something..." rows={3} />
        </div>
      </div>
    </div>
  );
}
