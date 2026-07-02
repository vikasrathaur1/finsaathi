import { notApplicable } from '../helpers/index.js';

export const PRODUCT_RULES = {
  "PERSONAL LOAN": {
    emi: {
      applicable: false,
      message: "EMI details are not applicable for Personal Loan.",
      conditions: []
    },
    flexi: {
      applicable: false,
      message: "Flexi facility is not applicable for Personal Loan.",
      conditions: []
    },
    foreclosure: {
      applicable: false,
      message: "Foreclosure is not applicable for Personal Loan.",
      conditions: []
    },
    prepayment: {
      applicable: false,
      message: "Prepayment is not applicable for Personal Loan.",
      conditions: []
    },
    topup: {
      applicable: false,
      message: "Top-up is not applicable for Personal Loan.",
      conditions: []
    },
    bt: {
      applicable: false,
      message: "Balance transfer is not applicable for Personal Loan.",
      conditions: []
    }
  },
  "GOLD LOAN": {
    emi: {
      applicable: false,
      message: "Bullet repayment structure — no periodic EMI schedule applicable for Gold Loan.",
      conditions: []
    },
    flexi: {
      applicable: false,
      message: "Flexi facility is not available on Gold Loan.",
      conditions: []
    },
    foreclosure: {
      applicable: false,
      message: "Foreclosure is not applicable for Gold Loan.",
      conditions: []
    },
    prepayment: {
      applicable: false,
      message: "Prepayment is not applicable for Gold Loan.",
      conditions: []
    },
    topup: {
      applicable: false,
      message: "Top-up is not applicable for Gold Loan.",
      conditions: []
    },
    bt: {
      applicable: false,
      message: "Balance transfer is not applicable for Gold Loan.",
      conditions: []
    }
  },
  "HOME LOAN": {
    emi: {
      applicable: false,
      message: "EMI details are not applicable for Home Loan.",
      conditions: []
    },
    flexi: {
      applicable: false,
      message: "Flexi facility is not applicable for Home Loan.",
      conditions: []
    },
    foreclosure: {
      applicable: false,
      message: "Foreclosure is not applicable for Home Loan.",
      conditions: []
    },
    prepayment: {
      applicable: false,
      message: "Prepayment is not applicable for Home Loan.",
      conditions: []
    },
    topup: {
      applicable: false,
      message: "Top-up is not applicable for Home Loan.",
      conditions: []
    },
    bt: {
      applicable: false,
      message: "Balance transfer is not applicable for Home Loan.",
      conditions: []
    }
  }
};