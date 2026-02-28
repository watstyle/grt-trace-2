import { EntityType, ThreadEvent, getAllEventsForThread } from "./threadViewData";

export type EvalStatus = "PASS" | "FAIL" | "UNKNOWN" | "MAPPED" | "MATCHED";

export type EvalRecord = {
  id: string;
  lineItem: string;
  checkType: "MAP-1" | "MATCH-1" | "LINE-2" | "TOTAL-1" | "RULE-7";
  expectedValue: string;
  observedValue: string;
  delta: string;
  status: EvalStatus;
  reasonCodes: string[];
  raw: Record<string, unknown>;
};

export type EventSnapshot = {
  metadata: Record<string, unknown>;
  canonicalState: Record<string, unknown>;
  evals: EvalRecord[];
};

export type EntityRecord = {
  entityType: EntityType;
  entityId: string;
  metadata: Record<string, unknown>;
  canonicalState: Record<string, unknown>;
  eventLog: ThreadEvent[];
  evals: EvalRecord[];
  eventSnapshots: Record<string, EventSnapshot>;
};

const threadEventMap = new Map<string, ThreadEvent>(
  getAllEventsForThread("t_1").map((event) => [event.id, event]),
);

function pickEvents(eventIds: string[]): ThreadEvent[] {
  return eventIds
    .map((id) => threadEventMap.get(id))
    .filter((event): event is ThreadEvent => Boolean(event))
    .sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime());
}

function evalRecord(
  id: string,
  lineItem: string,
  checkType: EvalRecord["checkType"],
  expectedValue: string,
  observedValue: string,
  delta: string,
  status: EvalStatus,
  reasonCodes: string[],
  raw: Record<string, unknown>,
): EvalRecord {
  return {
    id,
    lineItem,
    checkType,
    expectedValue,
    observedValue,
    delta,
    status,
    reasonCodes,
    raw,
  };
}

const baseLoadEvals: EvalRecord[] = [
  evalRecord(
    "eval_ld_1",
    "fuel_surcharge",
    "MAP-1",
    "Charge code FSC mapped to standard fuel_surcharge",
    "Mapped charge c_10 -> fuel_surcharge",
    "0",
    "PASS",
    ["CHARGE_CODE_MAPPED"],
    {
      mapper: "charge-code-v3",
      sourceCode: "FSC",
      mappedCode: "fuel_surcharge",
      confidence: 0.98,
    },
  ),
  evalRecord(
    "eval_ld_2",
    "linehaul_total",
    "MATCH-1",
    "2060.00",
    "2088.00",
    "+28.00",
    "FAIL",
    ["MATCHED_CHARGES", "AMOUNT_OVERBILL"],
    {
      components: {
        linehaul: 1850,
        fuelSurcharge: 238,
      },
      expectedTotal: 2060,
      observedTotal: 2088,
      tolerance: 0,
    },
  ),
  evalRecord(
    "eval_ld_3",
    "lumper_policy",
    "RULE-7",
    "No pre-bill lumper allowed",
    "Rejected pre-bill in ev_107",
    "0",
    "PASS",
    ["POLICY_COMPLIANT"],
    {
      rule: "receipt_required_before_reimbursement",
      evidenceEventId: "ev_107",
      outcome: "compliant",
    },
  ),
  evalRecord(
    "eval_ld_4",
    "appointment_alignment",
    "LINE-2",
    "Pickup between 09:00-11:00 local",
    "Pickup fixed at 10:00 local",
    "0",
    "PASS",
    ["WINDOW_CONSTRAINED"],
    {
      requestedWindowLocal: ["09:00", "11:00"],
      selectedPickupLocal: "10:00",
      timezone: "America/Chicago",
    },
  ),
  evalRecord(
    "eval_ld_5",
    "withdrawn_charge_cleanup",
    "TOTAL-1",
    "Withdrawn charge c_09 excluded",
    "c_09 removed, c_10 active",
    "0",
    "PASS",
    ["WITHDRAW_HANDLED"],
    {
      withdrawnChargeId: "c_09",
      replacementChargeId: "c_10",
      activeCharges: ["c_10"],
    },
  ),
  evalRecord(
    "eval_ld_6",
    "carrier_docs_complete",
    "RULE-7",
    "Carrier submitted POD + lumper receipt",
    "POD present, lumper receipt pending",
    "N/A",
    "UNKNOWN",
    ["AWAITING_RECEIPT"],
    {
      requiredDocs: ["pod", "lumper_receipt"],
      receivedDocs: ["pod"],
      pendingDocs: ["lumper_receipt"],
    },
  ),
];

const loadBaseMetadata = {
  lane: [
    {
      stop: "pickup",
      location: "Dallas, TX",
      window: {
        start: "2026-02-20T09:00:00-06:00",
        end: "2026-02-20T11:00:00-06:00",
      },
    },
    {
      stop: "delivery",
      location: "Phoenix, AZ",
      window: {
        start: "2026-02-21T09:00:00-07:00",
        end: "2026-02-21T12:00:00-07:00",
      },
    },
  ],
  proof_text:
    "Shipper requested LD-8219 with 53ft dry van and same-day quote confirmation. Billing requires explicit rejection of pre-billed lumper.",
  constraints: [
    "equipment=53ft_dry_van",
    "detention_policy=carrier_terms_v2",
    "lumper=receipt_required",
    "pricing_currency=USD",
  ],
  references: {
    threadId: "t_1",
    primaryQuoteId: "q_31",
    activeChargeIds: ["c_10"],
  },
};

const loadBaseState = {
  loadId: "ld_8219",
  status: "confirmed",
  lane: {
    origin: "DAL",
    destination: "PHX",
  },
  appointment: {
    pickupAt: "2026-02-20T16:00:00Z",
    timezone: "America/Chicago",
  },
  selectedQuoteId: "q_31",
  chargeIds: ["c_10"],
  policy: {
    lumper: "receipt_required",
    fuelSurchargeMode: "index_linked",
  },
  updatedAt: "2026-02-17T12:08:22Z",
};

export const entityViewDataByKey: Record<string, EntityRecord> = {
  "load:ld_8219": {
    entityType: "load",
    entityId: "ld_8219",
    metadata: loadBaseMetadata,
    canonicalState: loadBaseState,
    eventLog: pickEvents(["ev_101", "ev_102", "ev_103", "ev_104", "ev_105", "ev_106", "ev_107", "ev_108"]),
    evals: baseLoadEvals,
    eventSnapshots: {
      ev_101: {
        metadata: {
          ...loadBaseMetadata,
          proof_text: "Initial shipper request captured. No quote selected yet.",
          references: {
            threadId: "t_1",
            primaryQuoteId: null,
            activeChargeIds: [],
          },
        },
        canonicalState: {
          ...loadBaseState,
          status: "requested",
          selectedQuoteId: null,
          chargeIds: [],
          updatedAt: "2026-02-17T09:04:14Z",
        },
        evals: [
          evalRecord(
            "eval_ld_101_1",
            "request_parse",
            "MAP-1",
            "Parse lane + equipment",
            "Lane/equipment parsed",
            "0",
            "PASS",
            ["REQUEST_PARSED"],
            {
              sourceEventId: "ev_101",
              parsedFields: ["lane", "pickupWindow", "equipment"],
            },
          ),
        ],
      },
      ev_102: {
        metadata: {
          ...loadBaseMetadata,
          proof_text: "Quote q_31 offered with initial fuel estimate 210.",
          references: {
            threadId: "t_1",
            primaryQuoteId: "q_31",
            activeChargeIds: ["c_09"],
          },
        },
        canonicalState: {
          ...loadBaseState,
          status: "offered",
          selectedQuoteId: "q_31",
          chargeIds: ["c_09"],
          updatedAt: "2026-02-17T09:36:26Z",
        },
        evals: [
          evalRecord(
            "eval_ld_102_1",
            "offer_total",
            "MATCH-1",
            "2060.00",
            "2060.00",
            "0",
            "PASS",
            ["MATCHED_CHARGES"],
            {
              sourceEventId: "ev_102",
              expected: 2060,
              observed: 2060,
            },
          ),
        ],
      },
      ev_103: {
        metadata: {
          ...loadBaseMetadata,
          proof_text: "Charge c_09 attached as fuel surcharge line item.",
          references: {
            threadId: "t_1",
            primaryQuoteId: "q_31",
            activeChargeIds: ["c_09"],
          },
        },
        canonicalState: {
          ...loadBaseState,
          status: "offered",
          selectedQuoteId: "q_31",
          chargeIds: ["c_09"],
          updatedAt: "2026-02-17T09:36:26Z",
        },
        evals: [
          evalRecord(
            "eval_ld_103_1",
            "charge_link",
            "LINE-2",
            "Charge links to load",
            "c_09 linked",
            "0",
            "PASS",
            ["LINKED_TO_LOAD"],
            {
              sourceEventId: "ev_103",
              chargeId: "c_09",
              loadId: "ld_8219",
            },
          ),
        ],
      },
      ev_104: {
        metadata: {
          ...loadBaseMetadata,
          proof_text: "Shipper confirmed appointment and selected q_31.",
          references: {
            threadId: "t_1",
            primaryQuoteId: "q_31",
            activeChargeIds: ["c_09"],
          },
        },
        canonicalState: {
          ...loadBaseState,
          status: "confirmed",
          selectedQuoteId: "q_31",
          chargeIds: ["c_09"],
          updatedAt: "2026-02-17T10:12:42Z",
        },
        evals: [
          evalRecord(
            "eval_ld_104_1",
            "confirmation",
            "RULE-7",
            "Explicit confirmation required",
            "Confirmed in ev_104",
            "0",
            "PASS",
            ["EXPLICIT_CONFIRMATION"],
            {
              sourceEventId: "ev_104",
              confirmer: "SHIPPER",
            },
          ),
        ],
      },
      ev_105: {
        metadata: {
          ...loadBaseMetadata,
          proof_text: "Charge c_09 withdrawn due to index recalc.",
          references: {
            threadId: "t_1",
            primaryQuoteId: "q_31",
            activeChargeIds: [],
          },
        },
        canonicalState: {
          ...loadBaseState,
          status: "re-rating",
          selectedQuoteId: "q_31",
          chargeIds: [],
          updatedAt: "2026-02-17T10:41:17Z",
        },
        evals: [
          evalRecord(
            "eval_ld_105_1",
            "withdraw_cleanup",
            "TOTAL-1",
            "Withdrawn charge removed",
            "c_09 removed",
            "0",
            "PASS",
            ["WITHDRAW_HANDLED"],
            {
              sourceEventId: "ev_105",
              removedChargeId: "c_09",
            },
          ),
        ],
      },
      ev_106: {
        metadata: {
          ...loadBaseMetadata,
          proof_text: "Replacement charge c_10 added at 238.",
          references: {
            threadId: "t_1",
            primaryQuoteId: "q_31",
            activeChargeIds: ["c_10"],
          },
        },
        canonicalState: {
          ...loadBaseState,
          status: "rated",
          selectedQuoteId: "q_31",
          chargeIds: ["c_10"],
          updatedAt: "2026-02-17T10:41:23Z",
        },
        evals: [
          evalRecord(
            "eval_ld_106_1",
            "linehaul_total",
            "MATCH-1",
            "2060.00",
            "2088.00",
            "+28.00",
            "FAIL",
            ["AMOUNT_OVERBILL"],
            {
              sourceEventId: "ev_106",
              expected: 2060,
              observed: 2088,
              components: { linehaul: 1850, fuel: 238 },
            },
          ),
        ],
      },
      ev_107: {
        metadata: {
          ...loadBaseMetadata,
          proof_text: "Billing policy update rejects all lumper pre-bills.",
          constraints: [...loadBaseMetadata.constraints, "lumper_prebill=reject"],
        },
        canonicalState: {
          ...loadBaseState,
          status: "policy-updated",
          selectedQuoteId: "q_31",
          chargeIds: ["c_10"],
          updatedAt: "2026-02-17T11:05:14Z",
        },
        evals: [
          evalRecord(
            "eval_ld_107_1",
            "lumper_policy",
            "RULE-7",
            "No pre-bill lumper allowed",
            "Rejected pre-bill in ev_107",
            "0",
            "PASS",
            ["POLICY_COMPLIANT"],
            {
              sourceEventId: "ev_107",
              outcome: "compliant",
            },
          ),
        ],
      },
      ev_108: {
        metadata: loadBaseMetadata,
        canonicalState: loadBaseState,
        evals: baseLoadEvals,
      },
    },
  },
  "quote:q_31": {
    entityType: "quote",
    entityId: "q_31",
    metadata: {
      lane: [
        { stop: "pickup", location: "Dallas, TX" },
        { stop: "delivery", location: "Phoenix, AZ" },
      ],
      proof_text: "Carrier offered quote q_31 and shipper confirmed it as primary.",
      constraints: ["currency=USD", "carrier_terms=detention_policy_v2"],
    },
    canonicalState: {
      quoteId: "q_31",
      status: "selected",
      linehaul: 1850,
      fuelSurcharge: 238,
      total: 2088,
      selectedByEventId: "ev_104",
      lastUpdatedAt: "2026-02-17T12:08:22Z",
    },
    eventLog: pickEvents(["ev_102", "ev_104", "ev_108"]),
    evals: [
      evalRecord(
        "eval_q_1",
        "quote_total",
        "MATCH-1",
        "2060.00",
        "2088.00",
        "+28.00",
        "FAIL",
        ["AMOUNT_OVERBILL"],
        {
          quoteId: "q_31",
          expected: 2060,
          observed: 2088,
        },
      ),
      evalRecord(
        "eval_q_2",
        "selection",
        "RULE-7",
        "must have explicit shipper confirmation",
        "confirmed in ev_104",
        "0",
        "PASS",
        ["EXPLICIT_CONFIRMATION"],
        {
          confirmationEventId: "ev_104",
          confirmer: "SHIPPER",
        },
      ),
    ],
    eventSnapshots: {
      ev_102: {
        metadata: {
          lane: [
            { stop: "pickup", location: "Dallas, TX" },
            { stop: "delivery", location: "Phoenix, AZ" },
          ],
          proof_text: "Initial quote submitted with fuel 210.",
          constraints: ["currency=USD"],
        },
        canonicalState: {
          quoteId: "q_31",
          status: "offered",
          linehaul: 1850,
          fuelSurcharge: 210,
          total: 2060,
          lastUpdatedAt: "2026-02-17T09:36:18Z",
        },
        evals: [
          evalRecord(
            "eval_q_102_1",
            "quote_total",
            "MATCH-1",
            "2060.00",
            "2060.00",
            "0",
            "PASS",
            ["MATCHED_CHARGES"],
            {
              sourceEventId: "ev_102",
            },
          ),
        ],
      },
      ev_104: {
        metadata: {
          lane: [
            { stop: "pickup", location: "Dallas, TX" },
            { stop: "delivery", location: "Phoenix, AZ" },
          ],
          proof_text: "Quote selected by shipper in confirmation email.",
          constraints: ["currency=USD", "selected=true"],
        },
        canonicalState: {
          quoteId: "q_31",
          status: "selected",
          linehaul: 1850,
          fuelSurcharge: 210,
          total: 2060,
          selectedByEventId: "ev_104",
          lastUpdatedAt: "2026-02-17T10:12:42Z",
        },
        evals: [
          evalRecord(
            "eval_q_104_1",
            "selection",
            "RULE-7",
            "must have explicit shipper confirmation",
            "confirmed in ev_104",
            "0",
            "PASS",
            ["EXPLICIT_CONFIRMATION"],
            {
              sourceEventId: "ev_104",
            },
          ),
        ],
      },
      ev_108: {
        metadata: {
          lane: [
            { stop: "pickup", location: "Dallas, TX" },
            { stop: "delivery", location: "Phoenix, AZ" },
          ],
          proof_text: "Final bundle references updated fuel 238.",
          constraints: ["currency=USD", "selected=true", "bundle=final"],
        },
        canonicalState: {
          quoteId: "q_31",
          status: "selected",
          linehaul: 1850,
          fuelSurcharge: 238,
          total: 2088,
          selectedByEventId: "ev_104",
          lastUpdatedAt: "2026-02-17T12:08:22Z",
        },
        evals: [
          evalRecord(
            "eval_q_108_1",
            "quote_total",
            "MATCH-1",
            "2060.00",
            "2088.00",
            "+28.00",
            "FAIL",
            ["AMOUNT_OVERBILL"],
            {
              sourceEventId: "ev_108",
            },
          ),
        ],
      },
    },
  },
  "charge:c_10": {
    entityType: "charge",
    entityId: "c_10",
    metadata: {
      lane: [
        { stop: "pickup", location: "Dallas, TX" },
        { stop: "delivery", location: "Phoenix, AZ" },
      ],
      proof_text: "Charge c_10 replaced withdrawn fuel estimate c_09 and is currently active.",
      constraints: ["charge_type=fuel_surcharge", "requires_source_model"],
    },
    canonicalState: {
      chargeId: "c_10",
      type: "fuel_surcharge",
      amount: 238,
      status: "active",
      sourceModel: "rate-v4.2",
      replacementFor: "c_09",
      updatedAt: "2026-02-17T11:05:14Z",
    },
    eventLog: pickEvents(["ev_105", "ev_106", "ev_107", "ev_108"]),
    evals: [
      evalRecord(
        "eval_c_1",
        "charge_mapping",
        "MAP-1",
        "fuel_surcharge",
        "fuel_surcharge",
        "0",
        "PASS",
        ["CHARGE_CODE_MAPPED"],
        {
          chargeId: "c_10",
          mappedTo: "fuel_surcharge",
        },
      ),
      evalRecord(
        "eval_c_2",
        "charge_policy",
        "LINE-2",
        "No lumper pre-bill",
        "lumper pre-bill rejected",
        "0",
        "PASS",
        ["MATCHED_CHARGES"],
        {
          policyEventId: "ev_107",
          enforcement: "applied",
        },
      ),
    ],
    eventSnapshots: {
      ev_105: {
        metadata: {
          lane: [
            { stop: "pickup", location: "Dallas, TX" },
            { stop: "delivery", location: "Phoenix, AZ" },
          ],
          proof_text: "Legacy charge c_09 withdrawn before c_10 creation.",
          constraints: ["charge_type=fuel_surcharge"],
        },
        canonicalState: {
          chargeId: "c_10",
          status: "pending_create",
          replacementFor: "c_09",
          updatedAt: "2026-02-17T10:41:17Z",
        },
        evals: [
          evalRecord(
            "eval_c_105_1",
            "withdraw_transition",
            "TOTAL-1",
            "prepare replacement",
            "replacement pending",
            "0",
            "PASS",
            ["WITHDRAW_HANDLED"],
            {
              sourceEventId: "ev_105",
            },
          ),
        ],
      },
      ev_106: {
        metadata: {
          lane: [
            { stop: "pickup", location: "Dallas, TX" },
            { stop: "delivery", location: "Phoenix, AZ" },
          ],
          proof_text: "Replacement charge c_10 created from model v4.2.",
          constraints: ["charge_type=fuel_surcharge", "requires_source_model"],
        },
        canonicalState: {
          chargeId: "c_10",
          type: "fuel_surcharge",
          amount: 238,
          status: "active",
          sourceModel: "rate-v4.2",
          replacementFor: "c_09",
          updatedAt: "2026-02-17T10:41:23Z",
        },
        evals: [
          evalRecord(
            "eval_c_106_1",
            "charge_mapping",
            "MAP-1",
            "fuel_surcharge",
            "fuel_surcharge",
            "0",
            "PASS",
            ["CHARGE_CODE_MAPPED"],
            {
              sourceEventId: "ev_106",
            },
          ),
        ],
      },
      ev_107: {
        metadata: {
          lane: [
            { stop: "pickup", location: "Dallas, TX" },
            { stop: "delivery", location: "Phoenix, AZ" },
          ],
          proof_text: "Policy enforcement event confirms lumper pre-bill rejection.",
          constraints: ["charge_type=fuel_surcharge", "lumper_prebill=reject"],
        },
        canonicalState: {
          chargeId: "c_10",
          type: "fuel_surcharge",
          amount: 238,
          status: "active",
          sourceModel: "rate-v4.2",
          replacementFor: "c_09",
          policyAppliedAt: "2026-02-17T11:05:14Z",
          updatedAt: "2026-02-17T11:05:14Z",
        },
        evals: [
          evalRecord(
            "eval_c_107_1",
            "charge_policy",
            "LINE-2",
            "No lumper pre-bill",
            "lumper pre-bill rejected",
            "0",
            "PASS",
            ["MATCHED_CHARGES"],
            {
              sourceEventId: "ev_107",
            },
          ),
        ],
      },
      ev_108: {
        metadata: {
          lane: [
            { stop: "pickup", location: "Dallas, TX" },
            { stop: "delivery", location: "Phoenix, AZ" },
          ],
          proof_text: "Final bundle contains active charge c_10.",
          constraints: ["charge_type=fuel_surcharge", "bundle=final"],
        },
        canonicalState: {
          chargeId: "c_10",
          type: "fuel_surcharge",
          amount: 238,
          status: "active",
          sourceModel: "rate-v4.2",
          replacementFor: "c_09",
          updatedAt: "2026-02-17T12:08:22Z",
        },
        evals: [
          evalRecord(
            "eval_c_108_1",
            "bundle_consistency",
            "MATCH-1",
            "charge exists in final bundle",
            "present in ev_108",
            "0",
            "PASS",
            ["MATCHED_CHARGES"],
            {
              sourceEventId: "ev_108",
            },
          ),
        ],
      },
    },
  },
};

export function getEntityRecord(entityType: EntityType, entityId: string): EntityRecord | undefined {
  return entityViewDataByKey[`${entityType}:${entityId}`];
}

export function getEntityTopLabel(entityType: EntityType): string {
  if (entityType === "load") {
    return "Proto_load_uid";
  }
  if (entityType === "quote") {
    return "Quote_uid";
  }
  return "Charge_uid";
}

export function getEvalById(record: EntityRecord, evalId: string): EvalRecord | undefined {
  return record.evals.find((entry) => entry.id === evalId);
}

export function getEventById(record: EntityRecord, eventId: string): ThreadEvent | undefined {
  return record.eventLog.find((event) => event.id === eventId);
}
