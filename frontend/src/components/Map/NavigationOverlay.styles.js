import styled from "styled-components";

export const OverlayContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Chính OverlayContainer không nhận sự kiện chuột */
  z-index: 2;
  padding: 0;

  /* @media (max-width: 600px) {
    padding-top: 20px; // Xem xét lại padding này nếu TopBar và BottomBar có vẻ quá sát mép bản đồ
    padding-bottom: 20px;
  } */
`;

export const BarBase = styled.div`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  background: #fff;
  color: #003a53;
  border-radius: 14px;
  padding: 8px 16px;
  font-size: 1rem;
  font-weight: 500;
  box-shadow: 0 2px 8px #0002;
  
  width: auto; /* Để thanh co giãn theo nội dung */
  max-width: 95%; /* Giới hạn tối đa là 90% chiều rộng của OverlayContainer */

  text-align: center;
  z-index: 10;
  overflow-wrap: break-word;
  box-sizing: border-box;
  max-height: 15vh; /* Giới hạn chiều cao để tránh quá dài */
  overflow-y: auto; /* Cho phép cuộn nếu nội dung quá dài */
  white-space: pre-line; /* Giữ các ký tự xuống dòng trong text */
  pointer-events: auto; /* Các thanh này có thể nhận sự kiện nếu cần */

  @media (max-width: 600px) {
    font-size: 0.8rem;
    padding: 2px 4px;
    max-height: 10vh; /* Điều chỉnh lại max-height cho mobile nếu cần */
    /* max-width có thể giữ nguyên 90% hoặc điều chỉnh nếu muốn, ví dụ: 95% */
    max-width: 95%;
  }
`;

export const TopBar = styled(BarBase)`
  top: 8px;
  @media (max-width: 600px) {
    top: 10px; /* Điều chỉnh vị trí nếu padding của OverlayContainer được thêm lại */
  }
`;

export const BottomBar = styled(BarBase)`
  bottom: 8px;
  @media (max-width: 600px) {
    bottom: 10px; /* Điều chỉnh vị trí */
  }
`;

export const SpeedPanel = styled.div`
  position: absolute;
  left: 50%;
  top: 8px;
  transform: translateX(-50%);
  background: #fff;
  color: #222;
  border-radius: 16px;
  box-shadow: 0 2px 8px #0002;
  padding: 10px 16px;
  min-width: 60px;
  max-width: 95vw;
  display: flex;
  flex-direction: row;
  align-items: center;
  pointer-events: auto;
  font-size: 0.95rem;
  z-index: 10;
  gap: 8px; // Giảm khoảng cách giữa các item

  @media (max-width: 600px) {
    top: 4px;
    padding: 6px 4px;
    font-size: 0.85rem;
    max-width: 98vw; // Đảm bảo không tràn lề
    gap: 4px;
    overflow-x: auto; // Cho phép cuộn ngang nếu cần
    justify-content: flex-start; // Để các item bắt đầu từ bên trái khi cuộn
    &::-webkit-scrollbar { // Ẩn thanh cuộn nếu muốn
      display: none;
    }
    -ms-overflow-style: none;  // IE and Edge
    scrollbar-width: none;  // Firefox
  }
`;

export const WarningItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 0;
`;

export const SpeedLimit = styled.div`
  background: #e53935;
  color: #fff;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  font-weight: bold;
  margin-bottom: 8px;
  border: 4px solid #fff;
  box-shadow: 0 1px 4px #0002;

  @media (max-width: 600px) {
    width: 40px;
    height: 40px;
    font-size: 1.1rem;
  }
`;

export const InfoText = styled.div`
  font-size: 0.95rem;
  margin-bottom: 2px;

  @media (max-width: 600px) {
    font-size: 0.8rem;
  }
`;

export const CameraIndicator = styled.span`
  background: #4caf50;
  color: white;
  border-radius: 4px;
  padding: 2px 6px;
  margin-left: 8px;
  font-size: 0.8rem;
`;