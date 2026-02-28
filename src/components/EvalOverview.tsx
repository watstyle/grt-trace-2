import { useState } from "react";
import { CopyIconButton } from "./CopyIconButton";
import { EvalViewRecord } from "../mock/evalViewData";

type EvalOverviewProps = {
  evaluation: EvalViewRecord;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function EvalOverview({ evaluation }: EvalOverviewProps) {
  const [showOrderDetails, setShowOrderDetails] = useState(true);

  return (
    <div className="space-y-4">
      <section className="-mx-4 overflow-hidden rounded-card border border-borderSubtle bg-panelMuted shadow-soft">
        <div className="flex items-center justify-between border-b border-borderSubtle px-4 py-2.5">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-300">Order Details</h4>
          <button
            type="button"
            onClick={() => setShowOrderDetails((current) => !current)}
            className="text-[11px] text-zinc-400 transition hover:text-zinc-200"
          >
            {showOrderDetails ? "See Less" : "See More"}
          </button>
        </div>

        {showOrderDetails ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-3">
            <div>
              <p className="text-[11px] text-zinc-500">Order ID</p>
              <p className="inline-flex items-center gap-2 text-[13px] text-zinc-100">
                {evaluation.orderDetails.orderId}
                <CopyIconButton value={evaluation.orderDetails.orderId} label="Order ID" />
              </p>
            </div>
            <div>
              <p className="text-[11px] text-zinc-500">Cust Ship ID</p>
              <p className="inline-flex items-center gap-2 text-[13px] text-zinc-100">
                {evaluation.orderDetails.custShipId}
                <CopyIconButton value={evaluation.orderDetails.custShipId} label="Cust Ship ID" />
              </p>
            </div>

            <div>
              <p className="text-[11px] text-zinc-500">Account</p>
              <p className="text-[13px] text-zinc-100">{evaluation.orderDetails.accountName}</p>
            </div>
            <div>
              <p className="text-[11px] text-zinc-500">Bill-to-code</p>
              <p className="inline-flex items-center gap-2 text-[13px] text-zinc-100">
                {evaluation.orderDetails.billToCode}
                <CopyIconButton value={evaluation.orderDetails.billToCode} label="Bill-to-code" />
              </p>
            </div>

            <div>
              <p className="text-[11px] text-zinc-500">Origin</p>
              <p className="text-[13px] text-zinc-100">
                {evaluation.orderDetails.origin.city}, {evaluation.orderDetails.origin.state}
              </p>
              <p className="text-[12px] text-zinc-400">{evaluation.orderDetails.origin.code}</p>
            </div>
            <div>
              <p className="text-[11px] text-zinc-500">Destination</p>
              <p className="text-[13px] text-zinc-100">
                {evaluation.orderDetails.destination.city}, {evaluation.orderDetails.destination.state}
              </p>
              <p className="text-[12px] text-zinc-400">{evaluation.orderDetails.destination.code}</p>
            </div>

            <div>
              <p className="text-[11px] text-zinc-500">Tender</p>
              <p className="text-[13px] text-zinc-100">{evaluation.orderDetails.tenderDate}</p>
            </div>
            <div>
              <p className="text-[11px] text-zinc-500">Pickup</p>
              <p className="text-[13px] text-zinc-100">{evaluation.orderDetails.pickupDate}</p>
            </div>

            <div className="col-span-2">
              <p className="text-[11px] text-zinc-500">Delivery</p>
              <p className="text-[13px] text-zinc-100">{evaluation.orderDetails.deliveryDate}</p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="-mx-4 overflow-hidden rounded-card border border-borderSubtle bg-panelMuted shadow-soft">
        <div className="border-b border-borderSubtle px-4 py-2.5">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-300">Exception Details</h4>
        </div>

        <div className="px-4 py-3">
          <div className="mb-3 rounded-lg border border-rose-500/45 bg-rose-500/10 px-3 py-2 text-[13px] font-medium text-rose-200">
            ⚠ {evaluation.exception.title}
          </div>

          <div className="overflow-hidden rounded-lg border border-borderSubtle bg-[#0f1218]">
            <table className="w-full border-collapse text-left text-[12px]">
              <thead className="bg-[#121722] text-zinc-400">
                <tr>
                  <th className="border-b border-borderSubtle px-3 py-2 font-medium">Charge</th>
                  <th className="border-b border-borderSubtle px-3 py-2 font-medium">Billed (TMS)</th>
                  <th className="border-b border-borderSubtle px-3 py-2 font-medium text-zinc-200">Expected</th>
                  <th className="border-b border-borderSubtle px-3 py-2 font-medium">Variance</th>
                </tr>
              </thead>
              <tbody>
                {evaluation.lineItems.map((item) => (
                  <tr key={item.chargeCode} className="text-zinc-200">
                    <td className="border-b border-borderSubtle px-3 py-2.5">{item.chargeCode}</td>
                    <td className="border-b border-borderSubtle px-3 py-2.5">{formatCurrency(item.billed)}</td>
                    <td className="border-b border-borderSubtle px-3 py-2.5 text-zinc-200">
                      {formatCurrency(item.expected)}
                    </td>
                    <td
                      className={`border-b border-borderSubtle px-3 py-2.5 ${
                        item.variance < 0 ? "text-zinc-200" : "text-zinc-200"
                      }`}
                    >
                      {item.variance < 0
                        ? `(${formatCurrency(Math.abs(item.variance))})`
                        : formatCurrency(item.variance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
