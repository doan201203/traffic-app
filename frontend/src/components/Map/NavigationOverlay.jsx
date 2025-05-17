// file 1: NavigationOverlay.js
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import {useGeocode} from '../../hooks/useGeocode';
import {useGeolocation} from '../../hooks/useGeolocation';

// responsiveBar CSS không còn cần thiết và sẽ được tích hợp trực tiếp hoặc bỏ qua

const OverlayContainer = styled.div`
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

const BarBase = styled.div` // Tạo một style cơ sở cho cả TopBar và BottomBar
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
  max-width: 90%; /* Giới hạn tối đa là 90% chiều rộng của OverlayContainer */
  /* Bạn cũng có thể thêm một giới hạn pixel cụ thể nếu muốn, ví dụ:
     max-width: min(400px, 90%); 
     Điều này có nghĩa là: rộng tối đa 90% của cha, nhưng không bao giờ vượt quá 400px.
  */

  text-align: center;
  z-index: 10;
  overflow-wrap: break-word;
  box-sizing: border-box;
  max-height: 15vh; /* Giới hạn chiều cao để tránh quá dài */
  overflow-y: auto; /* Cho phép cuộn nếu nội dung quá dài */
  white-space: pre-line; /* Giữ các ký tự xuống dòng trong text */
  pointer-events: auto; /* Các thanh này có thể nhận sự kiện nếu cần (mặc dù hiện tại không có) */

  @media (max-width: 600px) {
    font-size: 0.8rem;
    padding: 4px 8px;
    max-height: 10vh; /* Điều chỉnh lại max-height cho mobile nếu cần */
    /* max-width có thể giữ nguyên 90% hoặc điều chỉnh nếu muốn, ví dụ: 95% */
    /* max-width: 95%; */
  }
`;

const TopBar = styled(BarBase)`
  top: 8px;
  @media (max-width: 600px) {
    top: 10px; /* Điều chỉnh vị trí nếu padding của OverlayContainer được thêm lại */
  }
`;

const BottomBar = styled(BarBase)`
  bottom: 8px;
  @media (max-width: 600px) {
    bottom: 10px; /* Điều chỉnh vị trí */
  }
`;


const SpeedPanel = styled.div`
  position: absolute;
  left: 8px;
  top: 60px; // Sẽ cần điều chỉnh nếu TopBar cao hơn
  background: #fff;
  color: #222;
  border-radius: 16px;
  box-shadow: 0 2px 8px #0002;
  padding: 10px 12px;
  min-width: 60px;
  // max-width: 40vw; // Thay thế bằng max-width pixel cố định nếu muốn
  max-width: 150px; 
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: auto;
  font-size: 0.95rem;
  z-index: 5; // Đảm bảo nó nằm trên bản đồ nhưng dưới TopBar/BottomBar nếu chúng có thể chồng chéo

  @media (max-width: 600px) {
    top: 50px; // Điều chỉnh lại vị trí
    padding: 8px 10px;
    font-size: 0.85rem;
    max-width: 120px;
  }
`;

const SpeedLimit = styled.div`
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

const InfoText = styled.div`
  font-size: 0.95rem;
  margin-bottom: 2px;

  @media (max-width: 600px) {
    font-size: 0.8rem;
  }
`;


export default function NavigationOverlay({ notification, coords, speedImage }) {
  const speedLimit = 49; // Giả sử đây là dữ liệu động
  const info = { // Giả sử đây là dữ liệu động
    eta: "17:48",
    time: "0:03",
    distance: "1.4 km",
  };

  const [address, setAddress] = useState(null); // Giả sử đây là dữ liệu động

  const [visible, setVisible] = useState(!!notification);

  useEffect(() => {
    if (notification) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000); // Thông báo tự ẩn sau 3s
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [notification]);
  
  // address
  useEffect(() => {
    console.log("coord:", coords)
    if (!coords) return

    const fetchAddress = async () => {
      try {
        const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?access_token=${process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}`)
        const data = await response.json()

        if (data.features && data.features.length > 0) {
          setAddress(data.features[0].place_name)
        }
      } catch (error) {
        console.error("Error fetching address:", error)
      }
    };
    
    fetchAddress();
    const id = setInterval(() => {
      fetchAddress()
    }, 10000)
    
    return () => {
      clearInterval(id)
    }
  }, [coords]);

  return (
    <OverlayContainer>
      {notification && visible && (
        <TopBar>
          {notification}
        </TopBar>
      )}
      <SpeedPanel>
        {speedImage && (
          <img
            src={`data:image/jpeg;base64,${speedImage}`}
            alt="Cảnh báo"
            style={{
              width: 48,
              height: 48,
              objectFit: "cover",
              borderRadius: 8,
              marginBottom: 8,
              border: "2px solid #eee"
            }}
          />
        )}
        <SpeedLimit>{speedLimit}</SpeedLimit>
        <InfoText>{info.eta} ETA</InfoText>
        <InfoText>{info.time} min</InfoText>
        <InfoText>{info.distance}</InfoText>
      </SpeedPanel>
      <BottomBar>
        {address}
      </BottomBar>
    </OverlayContainer>
  );
}