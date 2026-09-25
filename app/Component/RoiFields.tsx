
// Shared by the /app/roi-calculator page and the onboarding popup on /app.
// Renders only the inputs; the parent supplies the <form> and its buttons.
export default function RoiFields() {
  return (
    <>
      <label>
        Reporting period
        <select className="custom-select" name="periodDays" defaultValue="28">
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="28">Last 28 days</option>
        </select>
      </label>

      <label>
        Gross Sales
        <input className="custom-input" name="grossSales" type="number" min="0" step="0.01" inputMode="decimal" placeholder="For example: 250000" />
      </label>
      <label>
        Orders
        <input className="custom-input" name="orders" type="number" min="0" step="1" inputMode="numeric" placeholder="For example: 500" />
      </label>
      <label>
        New Customers
        <input className="custom-input" name="newCustomers" type="number" min="0" step="1" inputMode="numeric" placeholder="For example: 180" />
      </label>
      <label>
        Total Sessions
        <input className="custom-input" name="totalSessions" type="number" min="0" step="1" inputMode="numeric" placeholder="For example: 12000" />
      </label>
      <label>
        <div>
          Spends <span className="custom-required" aria-hidden="true">*</span>
        </div>
        <input className="custom-input" name="spends" type="number" min="0" step="0.01" inputMode="decimal" placeholder="For example: 50000" required />
      </label>
    </>
  );
}
