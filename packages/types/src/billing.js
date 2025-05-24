// Path: packages/types/src/billing.ts
// 1️⃣ — ENUMS
export var BillingCurrency;
(function (BillingCurrency) {
    BillingCurrency["EUR"] = "EUR";
    BillingCurrency["USD"] = "USD";
    BillingCurrency["VND"] = "VND";
    BillingCurrency["GBP"] = "GBP";
    // Add more as needed
})(BillingCurrency || (BillingCurrency = {}));
export var BillingStatus;
(function (BillingStatus) {
    BillingStatus["DRAFT"] = "DRAFT";
    BillingStatus["SENT"] = "SENT";
    BillingStatus["ACCEPTED"] = "ACCEPTED";
    BillingStatus["PAID"] = "PAID";
    BillingStatus["CANCELLED"] = "CANCELLED";
    BillingStatus["OVERDUE"] = "OVERDUE";
})(BillingStatus || (BillingStatus = {}));
export var BillingType;
(function (BillingType) {
    BillingType["QUOTE"] = "QUOTE";
    BillingType["RECEIPT"] = "RECEIPT";
    BillingType["INVOICE"] = "INVOICE";
})(BillingType || (BillingType = {}));
