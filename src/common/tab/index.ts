import styled from "styled-components";

export const TabContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: #f0f4f9;
  border-radius: 30px;
  padding: 5px 5px;
  width: 100%;
  gap: 5px;
  box-sizing: border-box;
`;

export const TabButton = styled.div<{ active: boolean }>`
  width: 100%;
  height: 30px;
  min-width: 100px;
  box-shadow: ${(props) => (props.active ? "rgba(0, 0, 0, 0.1) 0px 4px 12px" : "")};
  background: ${(props) => (props.active ? "#fff" : "#f0f4f9")};
  border-radius: 30px;
  color: ${(props) => (props.active ? "#000" : "#4F5D75")};
  cursor: pointer;
  font-style: normal;
  font-weight: 700;
  font-size: 11px;
  padding: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
`;

export const TabPanel = styled.div<{ active: boolean }>`
  display: ${(props) => (props.active ? "block" : "none")};
`;
