import { success, failure, notApplicable, formatCurrency, formatDate, formatPct } from "../../helpers.js";
import { PRODUCT_RULES } from "../../config/rules/bajajfinserv-in-products.js";
import { getCustomer } from "../../data/customers.js";

export const handlers = {
  get_loan_summary: async ({ customerId }) => {
    try {
      const c = await getCustomer(customerId);
      return success({
        "Product Description": c.prodDesc,
        "Customer Name": c.customer_Name,
        "Product Category": c.prodCategory,
        "Relationship Status": c.relStatus,
        "Relationship Amount": formatCurrency(c.relAmount),
        "Disbursement Date": formatDate(c.disbDate),
        "Loan Expiry Date": formatDate(c.loanExpiryDate),
      });
    } catch (err) {
      return failure(err.message);
    }
  },

  get_emi_details: async ({ customerId }) => {
    try {
      const c = await getCustomer(customerId);
      const rules = PRODUCT_RULES[c.prodCategory];
      if (!rules?.emi?.applicable) {
        return notApplicable(
          rules?.emi?.message ??
            `EMI details are not applicable for ${c.prodDesc}.`
        );
      }
      return success({
        "Next EMI Amount": formatCurrency(c.nextEMIAmount),
        "Next EMI Date": formatDate(c.nextEmiDate),
        "Missed EMI": c.missedEmi,
        "Flexi Flag": c.flexiFlag,
        "Is Miles Flag": c.isMilesFlag,
      });
    } catch (err) {
      return failure(err.message);
    }
  },

  get_outstanding_balance: async ({ customerId }) => {
    try {
      const c = await getCustomer(customerId);
      return success({
        "Outstanding Principal (POS)": formatCurrency(c.pos),
        "Total Overdue": formatCurrency(c.totalOverDue),
        "AMC Charges": formatCurrency(c.amcCharges),
      });
    } catch (err) {
      return failure(err.message);
    }
  },

  get_tenure_details: async ({ customerId }) => {
    try {
      const c = await getCustomer(customerId);
      const rules = PRODUCT_RULES[c.prodCategory];
      if (!rules?.emi?.applicable) {
        return notApplicable(
          rules?.emi?.message ??
            `Tenure details are not applicable for ${c.prodDesc}.`
        );
      }
      return success({
        "Gross Tenure (months)": c.grossTenure,
        "Net Tenure (months)": c.netTenure,
        "Balance Tenure (months)": c.balanceTenure,
      });
    } catch (err) {
      return failure(err.message);
    }
  },

  get_interest_and_charges: async ({ customerId }) => {
    try {
      const c = await getCustomer(customerId);
      return success({
        "Rate of Interest": formatPct(c.roi),
        "AMC Charges": formatCurrency(c.amcCharges),
        "Flexi Flag": c.flexiFlag,
      });
    } catch (err) {
      return failure(err.message);
    }
  },

  get_flexi_limit_details: async ({ customerId }) => {
    try {
      const c = await getCustomer(customerId);
      const rules = PRODUCT_RULES[c.prodCategory];
      if (!rules?.flexi?.applicable) {
        return notApplicable(
          rules?.flexi?.message ??
            `Flexi limit details are not applicable for ${c.prodDesc}.`
        );
      }
      return success({
        "Amount Drawn / Limit": formatCurrency(c.amountDrawnLimit),
        "Flexi Flag": c.flexiFlag,
        "Outstanding Principal (POS)": formatCurrency(c.pos),
      });
    } catch (err) {
      return failure(err.message);
    }
  },
};