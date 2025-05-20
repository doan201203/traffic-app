import styled from "styled-components";

export const NotificationBox = styled.div`
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #fff;
  color: #003a53;
  border-radius: 14px;
  padding: 8px 16px;
  font-size: 1rem;
  font-weight: 500;
  box-shadow: 0 2px 8px #0002;

  width: auto;
  max-width: 95%;

  text-align: center;
  z-index: 9999;
  overflow-wrap: break-word;
  box-sizing: border-box;
  white-space: pre-line;
  opacity: 1;
  transition: opacity 0.3s;

  @media (max-width: 600px) {
    font-size: 0.8rem;
    padding: 2px 4px;
    max-width: 95%;
  }
`;
