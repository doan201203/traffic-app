import styled from "styled-components";
export const WebcamBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
`;
export const Button = styled.button`
  background: #0074d9;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  margin-top: 12px;
  font-size: 1rem;
  cursor: pointer;
  &:hover {
    background: #005fa3;
  }
`;
