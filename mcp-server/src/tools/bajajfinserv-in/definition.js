import RESPONSE_RULES from "../../../config/tools.js";
import PROBING_RULES from "../../../config/probing.js";

export const tools = [
  {
    name: "get_loan_summary",
    description: `Returns a summary of the customer's loan including product type, customer name, loan status, loan amount, disbursement date, and loan expiry date. Use this tool when the user asks what loan they have, what their loan status is, or wants a general overview of their loan.

${RESPONSE_RULES}`,
    inputSchema: {
      type: "object",
      properties: {
        customerId: {
          type: "string",
          description: "The unique identifier of the customer."
        },
        loanAccountNumber: {
          type: "string",
          description: "The loan account or agreement number for the customer."
        }
      },
      required: ["customerId", "loanAccountNumber"]
    }
  },
  {
    name: "get_emi_details",
    description: `Returns EMI-related details for the customer's loan including the next EMI amount, next EMI due date, number of missed EMIs, flexi flag, and miles flag. Use this tool when the user asks about their EMI amount, next due date, or missed payments.

Applicable products: PERSONAL LOAN, PROFESSIONAL LOAN, BUSINESS LOAN. Not applicable for GOLD LOAN (bullet repayment structure — no periodic EMI schedule applicable).

${PROBING_RULES}

${RESPONSE_RULES}`,
    inputSchema: {
      type: "object",
      properties: {
        customerId: {
          type: "string",
          description: "The unique identifier of the customer."
        },
        loanAccountNumber: {
          type: "string",
          description: "The loan account or agreement number for the customer."
        }
      },
      required: ["customerId", "loanAccountNumber"]
    }
  },
  {
    name: "get_outstanding_balance",
    description: `Returns the outstanding balance details for the customer's loan including principal outstanding (POS), total overdue amount, and AMC charges. Use this tool when the user asks how much they still owe, what their outstanding balance is, or whether they have any overdue amount.

${RESPONSE_RULES}`,
    inputSchema: {
      type: "object",
      properties: {
        customerId: {
          type: "string",
          description: "The unique identifier of the customer."
        },
        loanAccountNumber: {
          type: "string",
          description: "The loan account or agreement number for the customer."
        }
      },
      required: ["customerId", "loanAccountNumber"]
    }
  },
  {
    name: "get_tenure_details",
    description: `Returns tenure breakdown for the customer's loan including gross tenure, net tenure, and balance tenure remaining. Use this tool when the user asks how much of their loan tenure is left, how many EMIs remain, or details about their loan term.

Applicable products: PERSONAL LOAN, PROFESSIONAL LOAN, BUSINESS LOAN. Not applicable for GOLD LOAN (Gold Loan uses a bullet/lump-sum repayment model — tenure breakdown in EMI terms is not applicable).

${RESPONSE_RULES}`,
    inputSchema: {
      type: "object",
      properties: {
        customerId: {
          type: "string",
          description: "The unique identifier of the customer."
        },
        loanAccountNumber: {
          type: "string",
          description: "The loan account or agreement number for the customer."
        }
      },
      required: ["customerId", "loanAccountNumber"]
    }
  },
  {
    name: "get_interest_and_charges",
    description: `Returns interest rate and charge details for the customer's loan including rate of interest, AMC charges, and flexi flag. Use this tool when the user asks about their interest rate, what charges apply to their loan, or their annual maintenance charges.

${RESPONSE_RULES}`,
    inputSchema: {
      type: "object",
      properties: {
        customerId: {
          type: "string",
          description: "The unique identifier of the customer."
        },
        loanAccountNumber: {
          type: "string",
          description: "The loan account or agreement number for the customer."
        }
      },
      required: ["customerId", "loanAccountNumber"]
    }
  },
  {
    name: "get_flexi_limit_details",
    description: `Returns flexi loan limit and utilisation details including amount drawn limit, flexi flag, and principal outstanding (POS). Use this tool when the user asks about their flexi loan limit, how much they have drawn, or their available flexi balance.

Applicable products: PERSONAL LOAN (FLEXI), BUSINESS LOAN (FLEXI). Not applicable for GOLD LOAN (Flexi facility not available on Gold Loan) or non-flexi loans (amountDrawnLimit and flexiFlag are not meaningful when flexiFlag indicates a non-flexi product).

${RESPONSE_RULES}`,
    inputSchema: {
      type: "object",
      properties: {
        customerId: {
          type: "string",
          description: "The unique identifier of the customer."
        },
        loanAccountNumber: {
          type: "string",
          description: "The loan account or agreement number for the customer."
        }
      },
      required: ["customerId", "loanAccountNumber"]
    }
  }
];