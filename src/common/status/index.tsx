import { capitalizeFirstLetter } from "@/utils/helper";
import React from "react";
import styled from "styled-components";

export type StatusType =
  | "active"
  | "approved"
  | "not approved"
  | "verified"
  | "not verify"
  | "inactive"
  | "pending"
  | "completed"
  | "buyer"
  | "seller"
  | "company"
  | "individual"
  | "country_admin"
  | "unassigned"
  | boolean;

interface StatusIndicatorProps {
  status?: StatusType;
  pale?: boolean;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status = "completed",
  pale = false,
}) => {
  let displayStatus: Exclude<StatusType, boolean>;
  if (typeof status === "boolean") {
    displayStatus = status ? "completed" : "pending";
  } else {
    displayStatus = status;
  }
  return (
    <StatusPill status={displayStatus} pale={pale}>
      {capitalizeFirstLetter(displayStatus)}
    </StatusPill>
  );
};

const StatusPill = styled.div<{
  status: Exclude<StatusType, boolean>;
  pale?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  width: fit-content;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;

  &::before {
    content: "";
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-right: 6px;
  }

  ${({ status, pale }) => {
    switch (status) {
      case "completed":
      case "active":
      case "approved":
      case "verified":
        return `
          background: ${pale ? "#E6F7F2" : "#ECF9F6"};
          color: #0B815A;
          &::before { background: #0B815A; }
        `;

      case "inactive":
      case "not verify":
      case "not approved":
      case "unassigned":
        return `
          background: ${pale ? "#FEEAEE" : "#FEE7EB"};
          color: #E11D48;
          &::before { background: #E11D48; }
        `;

      case "pending":
        return `
          background: ${pale ? "#FFF8E6" : "#FFF4CC"};
          color: #B45309;
          &::before { background: #B45309; }
        `;

      case "buyer":
        return `
          background: ${pale ? "#E7F9EE" : "#dcfce7"};
          color: #166534;
          &::before { background: #166534; }
        `;

      case "seller":
        return `
          background: ${pale ? "#E9F1FF" : "#dbeafe"};
          color: #1e3a8a;
          &::before { background: #1e3a8a; }
        `;

      case "country_admin":
        return `
          background: ${pale ? "#F2EBFF" : "#EFE1FF"};
          color: #6D28D9;
          &::before { background: #6D28D9; }
        `;

      case "company":
        return `
          background: ${pale ? "#F2EBFF" : "#EFE1FF"};
          color: #6D28D9;
          &::before { background: #6D28D9; }
        `;

      case "individual":
        return `
          background: ${pale ? "#E9F6FF" : "#DCF0FF"};
          color: #0369A1;
          &::before { background: #0369A1; }
        `;

      default:
        return `
          background: ${pale ? "#F7F7F7" : "#F1F1F1"};
          color: #4B5563;
          &::before { background: #6B7280; }
        `;
    }
  }}
`;

export default StatusIndicator;
