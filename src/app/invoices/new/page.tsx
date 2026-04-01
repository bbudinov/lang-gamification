"use client";

import { Card } from "@/components/ui/Card";
import { DEMO_CLIENTS } from "@/lib/demo-data";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface FormLineItem {
  description: string;
  quantity: string;
  unit_price: string;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<FormLineItem[]>([
    { description: "", quantity: "1", unit_price: "" },
  ]);

  const total = lineItems.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
  }, 0);

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: "1", unit_price: "" }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof FormLineItem, value: string) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: This currently does nothing — no actual persistence
    // In production, this should POST to an API route and store in Supabase
    // No validation, no error handling, no optimistic updates
    alert("Invoice created! (Demo only — not actually saved)");
    router.push("/invoices");
  };

  const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">New Invoice</h1>
        <p className="text-gray-400 text-sm mt-1">Create a new invoice for a client</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="space-y-6">
          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Client</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Select a client...</option>
              {DEMO_CLIENTS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company ? `${c.company} (${c.name})` : c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Website redesign — Phase 1"
              className={inputClass}
              required
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">Line Items</label>
              <button
                type="button"
                onClick={addLineItem}
                className="text-sm text-emerald-400 hover:text-emerald-300"
              >
                + Add item
              </button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(i, "description", e.target.value)}
                      placeholder="Description"
                      className={inputClass}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(i, "quantity", e.target.value)}
                      placeholder="Qty"
                      className={inputClass}
                      min="1"
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(i, "unit_price", e.target.value)}
                      placeholder="Price"
                      className={inputClass}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(i)}
                        className="text-gray-500 hover:text-red-400 text-lg"
                      >
                        x
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-end border-t border-gray-800 pt-4">
            <div className="text-right">
              <p className="text-sm text-gray-400">Total</p>
              <p className="text-2xl font-bold text-white">
                ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, additional notes..."
              className={inputClass + " h-20 resize-none"}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={() => router.push("/invoices")}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Create Invoice
            </button>
          </div>
        </Card>
      </form>
    </div>
  );
}
