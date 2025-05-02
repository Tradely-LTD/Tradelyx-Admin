import styled from "styled-components";

function Logo() {
  return (
    <LogoWrapper>
      <p className="text-4xl font-mono">Tradely</p>
    </LogoWrapper>
  );
}

export default Logo;

const LogoWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;
